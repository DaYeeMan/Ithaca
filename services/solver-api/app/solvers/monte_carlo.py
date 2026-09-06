from __future__ import annotations

from math import exp, sqrt
from statistics import NormalDist
from time import perf_counter

import numpy as np

from app.solvers.black_scholes import MarketInputs, OptionSide


def _normal_samples(paths: int, steps: int, seed: int, antithetic: bool) -> np.ndarray:
    generator = np.random.default_rng(seed)
    base_count = paths // 2 if antithetic else paths
    totals = np.zeros(base_count, dtype=float)
    for _ in range(steps):
        totals += generator.standard_normal(base_count)
    normals = totals / sqrt(steps)
    if not antithetic:
        return normals
    paired = np.empty(paths, dtype=float)
    paired[0::2] = normals
    paired[1::2] = -normals
    return paired


def _mean_and_error(samples: np.ndarray, antithetic: bool) -> tuple[np.ndarray, np.ndarray]:
    independent = (samples[0::2] + samples[1::2]) * 0.5 if antithetic else samples
    mean = np.mean(independent, axis=0)
    standard_error = np.std(independent, axis=0, ddof=1) / sqrt(independent.shape[0])
    return np.asarray(mean), np.asarray(standard_error)


def _discounted_payoffs(
    inputs: MarketInputs,
    side: OptionSide,
    tau: float,
    starting_spots: np.ndarray,
    normals: np.ndarray,
) -> np.ndarray:
    growth = np.exp(
        (inputs.rate - inputs.dividend - 0.5 * inputs.volatility**2) * tau
        + inputs.volatility * sqrt(tau) * normals
    )
    terminal = growth[:, None] * starting_spots[None, :]
    intrinsic = terminal - inputs.strike
    payoff = np.maximum(intrinsic, 0.0) if side == "call" else np.maximum(-intrinsic, 0.0)
    return exp(-inputs.rate * tau) * payoff


def _convergence_counts(paths: int, antithetic: bool) -> list[int]:
    counts = {paths}
    for divisor in (16, 8, 4, 2):
        count = max(1_000, paths // divisor)
        count = min(count, paths)
        if antithetic and count % 2:
            count -= 1
        if count >= 2:
            counts.add(count)
    return sorted(counts)


def _sample_paths(inputs: MarketInputs, paths: int, steps: int, seed: int) -> list[dict[str, list[float]]]:
    displayed_paths = min(paths, 12)
    generator = np.random.default_rng(seed + 1)
    delta_t = inputs.maturity / steps
    increments = generator.standard_normal((displayed_paths, steps))
    log_steps = (
        (inputs.rate - inputs.dividend - 0.5 * inputs.volatility**2) * delta_t
        + inputs.volatility * sqrt(delta_t) * increments
    )
    prices = np.empty((displayed_paths, steps + 1), dtype=float)
    prices[:, 0] = inputs.spot
    prices[:, 1:] = inputs.spot * np.exp(np.cumsum(log_steps, axis=1))
    times = np.linspace(0.0, inputs.maturity, steps + 1).tolist()
    return [{"times": times, "spots": row.tolist()} for row in prices]


def solve_monte_carlo(
    inputs: MarketInputs,
    side: OptionSide,
    surface_spot_min: float,
    surface_spot_max: float,
    surface_spot_steps: int,
    surface_time_steps: int,
    paths: int,
    steps: int,
    seed: int,
    antithetic: bool,
    confidence_level: float,
) -> dict[str, object]:
    started_at = perf_counter()
    normals = _normal_samples(paths, steps, seed, antithetic)
    target_spots = np.linspace(surface_spot_min, surface_spot_max, surface_spot_steps)
    target_times = np.linspace(0.0, inputs.maturity, surface_time_steps)
    prices = np.empty((surface_time_steps, surface_spot_steps), dtype=float)
    standard_errors = np.empty_like(prices)

    intrinsic = target_spots - inputs.strike
    prices[0] = np.maximum(intrinsic, 0.0) if side == "call" else np.maximum(-intrinsic, 0.0)
    standard_errors[0] = 0.0
    for time_index, tau in enumerate(target_times[1:], start=1):
        samples = _discounted_payoffs(inputs, side, float(tau), target_spots, normals)
        prices[time_index], standard_errors[time_index] = _mean_and_error(samples, antithetic)

    scalar_samples = _discounted_payoffs(
        inputs,
        side,
        inputs.maturity,
        np.asarray([inputs.spot]),
        normals,
    )[:, 0]
    scalar_price_array, scalar_error_array = _mean_and_error(scalar_samples, antithetic)
    scalar_price = float(scalar_price_array)
    scalar_error = float(scalar_error_array)
    critical_value = NormalDist().inv_cdf(0.5 + confidence_level / 2.0)
    lower = scalar_price - critical_value * scalar_error
    upper = scalar_price + critical_value * scalar_error

    convergence: list[dict[str, float | int]] = []
    for count in _convergence_counts(paths, antithetic):
        price_array, error_array = _mean_and_error(scalar_samples[:count], antithetic)
        price = float(price_array)
        error = float(error_array)
        convergence.append(
            {
                "paths": count,
                "price": price,
                "standard_error": error,
                "lower": price - critical_value * error,
                "upper": price + critical_value * error,
            }
        )

    confidence_lower = prices - critical_value * standard_errors
    confidence_upper = prices + critical_value * standard_errors
    warnings: list[str] = []
    if scalar_error > max(abs(scalar_price) * 0.02, 0.05):
        warnings.append("Monte Carlo uncertainty is large relative to the reported price.")

    return {
        "method": "monte_carlo",
        "price": scalar_price,
        "runtime_ms": (perf_counter() - started_at) * 1000,
        "standard_error": scalar_error,
        "confidence_interval": {"lower": lower, "upper": upper, "level": confidence_level},
        "surface": {
            "spots": target_spots.tolist(),
            "times_to_maturity": target_times.tolist(),
            "prices": prices.tolist(),
            "standard_errors": standard_errors.tolist(),
            "confidence_lower": confidence_lower.tolist(),
            "confidence_upper": confidence_upper.tolist(),
        },
        "convergence": convergence,
        "sample_paths": _sample_paths(inputs, paths, steps, seed),
        "diagnostics": {
            "paths": paths,
            "steps": steps,
            "seed": seed,
            "antithetic": antithetic,
            "confidence_level": confidence_level,
            "sampling": "exact GBM with aggregated path increments",
        },
        "warnings": warnings,
    }
