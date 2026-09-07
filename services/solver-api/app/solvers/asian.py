from __future__ import annotations

from math import exp, log, sqrt
from statistics import NormalDist
from time import perf_counter
from typing import Literal

import numpy as np

from app.execution import check_execution

from app.solvers.black_scholes import MarketInputs, OptionSide, normal_cdf

AverageType = Literal["arithmetic", "geometric"]


def _observation_times(maturity: float, observations: int) -> np.ndarray:
    """Future observations only: t_i=iT/n. Spot at t=0 never participates."""
    return np.arange(1, observations + 1, dtype=float) * maturity / observations


def _geometric_distribution(
    inputs: MarketInputs,
    observations: int,
    observed_count: int = 0,
    average_state: float | None = None,
) -> tuple[float, float]:
    remaining = observations - observed_count
    if remaining <= 0:
        state = inputs.spot if average_state is None else average_state
        return log(state), 0.0
    times = _observation_times(inputs.maturity, remaining)
    past_log_sum = 0.0 if observed_count == 0 else observed_count * log(float(average_state))
    mean = (
        past_log_sum
        + remaining * log(inputs.spot)
        + (inputs.rate - inputs.dividend - 0.5 * inputs.volatility**2) * float(np.sum(times))
    ) / observations
    covariance_sum = float(np.sum(np.minimum.outer(times, times)))
    variance = inputs.volatility**2 * covariance_sum / observations**2
    return mean, variance


def geometric_asian_price(
    inputs: MarketInputs,
    side: OptionSide,
    observations: int,
    observed_count: int = 0,
    average_state: float | None = None,
) -> float:
    mean, variance = _geometric_distribution(inputs, observations, observed_count, average_state)
    if variance <= 0.0:
        intrinsic = exp(mean) - inputs.strike
        payoff = max(intrinsic, 0.0) if side == "call" else max(-intrinsic, 0.0)
        return exp(-inputs.rate * inputs.maturity) * payoff
    deviation = sqrt(variance)
    expected_average = exp(mean + 0.5 * variance)
    d1 = (mean - log(inputs.strike) + variance) / deviation
    d2 = d1 - deviation
    discount = exp(-inputs.rate * inputs.maturity)
    if side == "call":
        return discount * (expected_average * normal_cdf(d1) - inputs.strike * normal_cdf(d2))
    return discount * (inputs.strike * normal_cdf(-d2) - expected_average * normal_cdf(-d1))


def _arithmetic_moments(
    inputs: MarketInputs,
    observations: int,
    observed_count: int,
    average_state: float,
) -> tuple[float, float]:
    remaining = observations - observed_count
    past_sum = observed_count * average_state
    if remaining <= 0:
        value = past_sum / observations
        return value, value * value
    times = _observation_times(inputs.maturity, remaining)
    carry = inputs.rate - inputs.dividend
    expected_spots = inputs.spot * np.exp(carry * times)
    first = (past_sum + float(np.sum(expected_spots))) / observations
    joint = np.outer(expected_spots, expected_spots) * np.exp(
        inputs.volatility**2 * np.minimum.outer(times, times)
    )
    second = (
        past_sum**2
        + 2.0 * past_sum * float(np.sum(expected_spots))
        + float(np.sum(joint))
    ) / observations**2
    return first, second


def _moment_matched_price(
    inputs: MarketInputs,
    side: OptionSide,
    observations: int,
    average_type: AverageType,
    observed_count: int,
    average_state: float,
) -> float:
    if average_type == "geometric":
        return geometric_asian_price(inputs, side, observations, observed_count, average_state)
    first, second = _arithmetic_moments(inputs, observations, observed_count, average_state)
    variance_log = max(log(max(second / (first * first), 1.0)), 0.0)
    if variance_log <= 1e-15:
        intrinsic = first - inputs.strike
        payoff = max(intrinsic, 0.0) if side == "call" else max(-intrinsic, 0.0)
        return exp(-inputs.rate * inputs.maturity) * payoff
    mean_log = log(first) - 0.5 * variance_log
    deviation = sqrt(variance_log)
    d1 = (mean_log - log(inputs.strike) + variance_log) / deviation
    d2 = d1 - deviation
    discount = exp(-inputs.rate * inputs.maturity)
    if side == "call":
        return discount * (first * normal_cdf(d1) - inputs.strike * normal_cdf(d2))
    return discount * (inputs.strike * normal_cdf(-d2) - first * normal_cdf(-d1))


def augmented_asian_price(
    inputs: MarketInputs,
    side: OptionSide,
    observations: int,
    average_type: AverageType,
    observed_count: int = 0,
    average_state: float | None = None,
    steps_per_observation: int = 8,
    average_steps: int = 161,
) -> float:
    """CRR backward induction on spot and a discretized running-average state."""
    state = inputs.spot if average_state is None else average_state
    remaining_observations = observations - observed_count
    if remaining_observations <= 0:
        intrinsic = state - inputs.strike
        return max(intrinsic, 0.0) if side == "call" else max(-intrinsic, 0.0)

    total_steps = remaining_observations * steps_per_observation
    delta_t = inputs.maturity / total_steps
    up = exp(inputs.volatility * sqrt(delta_t))
    down = 1.0 / up
    probability = (exp((inputs.rate - inputs.dividend) * delta_t) - down) / (up - down)
    if not 0.0 < probability < 1.0:
        return _moment_matched_price(inputs, side, observations, average_type, observed_count, state)
    discount = exp(-inputs.rate * delta_t)

    extreme_low = min(state, inputs.spot * down**total_steps, inputs.strike) * 0.98
    extreme_high = max(state, inputs.spot * up**total_steps, inputs.strike) * 1.02
    average_grid = np.geomspace(max(extreme_low, 1e-10), extreme_high, average_steps)
    terminal_intrinsic = average_grid - inputs.strike
    terminal = np.maximum(terminal_intrinsic, 0.0) if side == "call" else np.maximum(-terminal_intrinsic, 0.0)
    values = np.repeat(terminal[None, :], total_steps + 1, axis=0)
    observation_stride = steps_per_observation

    for step in range(total_steps - 1, -1, -1):
        check_execution()
        next_is_observation = (step + 1) % observation_stride == 0
        observations_before = observed_count + step // observation_stride
        current = np.empty((step + 1, average_steps), dtype=float)
        for down_moves in range(step + 1):
            spot = inputs.spot * up ** (step - down_moves) * down**down_moves
            up_spot = spot * up
            down_spot = spot * down
            if next_is_observation:
                count_after = observations_before + 1
                if average_type == "arithmetic":
                    up_average = (observations_before * average_grid + up_spot) / count_after
                    down_average = (observations_before * average_grid + down_spot) / count_after
                else:
                    if observations_before == 0:
                        up_average = np.full_like(average_grid, up_spot)
                        down_average = np.full_like(average_grid, down_spot)
                    else:
                        up_average = np.exp((observations_before * np.log(average_grid) + log(up_spot)) / count_after)
                        down_average = np.exp((observations_before * np.log(average_grid) + log(down_spot)) / count_after)
                up_values = np.interp(up_average, average_grid, values[down_moves], left=values[down_moves, 0], right=values[down_moves, -1])
                down_values = np.interp(down_average, average_grid, values[down_moves + 1], left=values[down_moves + 1, 0], right=values[down_moves + 1, -1])
            else:
                up_values = values[down_moves]
                down_values = values[down_moves + 1]
            current[down_moves] = discount * (probability * up_values + (1.0 - probability) * down_values)
        values = current
    return float(np.interp(state, average_grid, values[0]))


def _surface(
    inputs: MarketInputs,
    side: OptionSide,
    observations: int,
    average_type: AverageType,
    average_state: float,
    spot_min: float,
    spot_max: float,
    spot_steps: int,
    time_steps: int,
) -> dict[str, object]:
    spots = np.linspace(spot_min, spot_max, spot_steps)
    taus = np.linspace(0.0, inputs.maturity, time_steps)
    prices = np.empty((time_steps, spot_steps), dtype=float)
    for time_index, tau in enumerate(taus):
        check_execution()
        observed_count = observations - int(round(observations * tau / inputs.maturity))
        remaining = observations - observed_count
        effective_tau = inputs.maturity * remaining / observations
        for spot_index, spot in enumerate(spots):
            node = MarketInputs(max(float(spot), 1e-10), inputs.strike, effective_tau, inputs.volatility, inputs.rate, inputs.dividend)
            prices[time_index, spot_index] = _moment_matched_price(
                node, side, observations, average_type, observed_count, average_state
            )
    return {"spots": spots.tolist(), "times_to_maturity": taus.tolist(), "prices": prices.tolist()}


def _align_scalar(surface: dict[str, object], spot: float, price: float) -> None:
    spots = np.asarray(surface["spots"], dtype=float)
    prices = np.asarray(surface["prices"], dtype=float)
    current = float(np.interp(spot, spots, prices[-1]))
    adjustment = price - current
    prices[-1] = np.maximum(prices[-1] + adjustment, 0.0)
    surface["prices"] = prices.tolist()
    for key in ("confidence_lower", "confidence_upper"):
        if key in surface:
            values = np.asarray(surface[key], dtype=float)
            values[-1] = np.maximum(values[-1] + adjustment, 0.0)
            surface[key] = values.tolist()


def _monte_carlo_surface(
    inputs: MarketInputs, side: OptionSide, observations: int, average_type: AverageType,
    average_state: float, spot_min: float, spot_max: float, spot_steps: int, time_steps: int,
    normals: np.ndarray, antithetic: bool, confidence_level: float,
) -> dict[str, object]:
    spots = np.linspace(spot_min, spot_max, spot_steps)
    safe_spots = np.maximum(spots, 1e-10)
    taus = np.linspace(0.0, inputs.maturity, time_steps)
    prices = np.empty((time_steps, spot_steps), dtype=float)
    errors = np.empty_like(prices)
    critical = NormalDist().inv_cdf(0.5 + confidence_level / 2.0)
    surface_normals = normals[: min(normals.shape[0], 512)]

    for time_index, tau in enumerate(taus):
        check_execution()
        remaining = int(round(observations * tau / inputs.maturity))
        observed_count = observations - remaining
        if remaining == 0:
            intrinsic = average_state - inputs.strike
            payoff = max(intrinsic, 0.0) if side == "call" else max(-intrinsic, 0.0)
            prices[time_index] = payoff
            errors[time_index] = 0.0
            continue
        delta_t = tau / remaining
        increments = (
            (inputs.rate - inputs.dividend - 0.5 * inputs.volatility**2) * delta_t
            + inputs.volatility * sqrt(delta_t) * surface_normals[:, :remaining]
        )
        factors = np.exp(np.cumsum(increments, axis=1))
        future_spots = factors[:, :, None] * safe_spots[None, None, :]
        if average_type == "arithmetic":
            final_average = (observed_count * average_state + np.sum(future_spots, axis=1)) / observations
        else:
            past_log_sum = observed_count * log(average_state)
            final_average = np.exp((past_log_sum + np.sum(np.log(future_spots), axis=1)) / observations)
        intrinsic = final_average - inputs.strike
        samples = exp(-inputs.rate * tau) * (np.maximum(intrinsic, 0.0) if side == "call" else np.maximum(-intrinsic, 0.0))
        if average_type == "arithmetic":
            geometric_average = np.exp((observed_count * log(average_state) + np.sum(np.log(future_spots), axis=1)) / observations)
            geometric_intrinsic = geometric_average - inputs.strike
            geometric_samples = exp(-inputs.rate * tau) * (
                np.maximum(geometric_intrinsic, 0.0) if side == "call" else np.maximum(-geometric_intrinsic, 0.0)
            )
            geometric_references = np.asarray([
                geometric_asian_price(
                    MarketInputs(float(spot), inputs.strike, tau, inputs.volatility, inputs.rate, inputs.dividend),
                    side, observations, observed_count, average_state,
                )
                for spot in safe_spots
            ])
            centered_geometric = geometric_samples - np.mean(geometric_samples, axis=0)
            centered_samples = samples - np.mean(samples, axis=0)
            variance = np.sum(centered_geometric**2, axis=0)
            beta = np.divide(
                np.sum(centered_samples * centered_geometric, axis=0), variance,
                out=np.zeros_like(variance), where=variance > 0.0,
            )
            samples = samples - beta * (geometric_samples - geometric_references)
        independent = _independent_samples(samples, antithetic)
        prices[time_index] = np.mean(independent, axis=0)
        errors[time_index] = np.std(independent, axis=0, ddof=1) / sqrt(independent.shape[0])
    return {
        "spots": spots.tolist(), "times_to_maturity": taus.tolist(), "prices": prices.tolist(),
        "standard_errors": errors.tolist(),
        "confidence_lower": np.maximum(prices - critical * errors, 0.0).tolist(),
        "confidence_upper": (prices + critical * errors).tolist(),
    }


def solve_asian_analytical(
    inputs: MarketInputs, side: OptionSide, observations: int, average_state: float,
    surface_spot_min: float, surface_spot_max: float, surface_spot_steps: int, surface_time_steps: int,
) -> dict[str, object]:
    started_at = perf_counter()
    price = geometric_asian_price(inputs, side, observations)
    surface = _surface(inputs, side, observations, "geometric", average_state, surface_spot_min, surface_spot_max, surface_spot_steps, surface_time_steps)
    _align_scalar(surface, inputs.spot, price)
    return {
        "method": "closed_form", "price": price, "runtime_ms": (perf_counter() - started_at) * 1000,
        "surface": surface,
        "diagnostics": {
            "solution": "discrete geometric-average analytical", "average_type": "geometric",
            "observations": observations, "observation_schedule": "equally spaced future dates",
            "includes_initial_spot": False, "average_state": average_state,
        },
    }


def solve_asian_augmented(
    inputs: MarketInputs, side: OptionSide, observations: int, average_type: AverageType, average_state: float,
    surface_spot_min: float, surface_spot_max: float, surface_spot_steps: int, surface_time_steps: int,
    time_steps: int,
) -> dict[str, object]:
    started_at = perf_counter()
    steps_per_observation = max(2, min(12, time_steps // observations))
    average_grid_steps = 321
    price = augmented_asian_price(
        inputs, side, observations, average_type,
        steps_per_observation=steps_per_observation, average_steps=average_grid_steps,
    )
    surface = _surface(inputs, side, observations, average_type, average_state, surface_spot_min, surface_spot_max, surface_spot_steps, surface_time_steps)
    _align_scalar(surface, inputs.spot, price)
    return {
        "method": "finite_difference", "price": price, "runtime_ms": (perf_counter() - started_at) * 1000,
        "surface": surface,
        "diagnostics": {
            "scheme": "augmented-state CRR lattice", "average_state_grid": average_grid_steps,
            "steps_per_observation": steps_per_observation, "average_type": average_type,
            "observations": observations, "includes_initial_spot": False, "average_state": average_state,
            "surface_projection": "conditional moment matching at fixed running-average state",
        },
    }


def _antithetic_normals(paths: int, observations: int, seed: int, antithetic: bool) -> np.ndarray:
    generator = np.random.default_rng(seed)
    base = generator.standard_normal((paths // 2 if antithetic else paths, observations))
    if not antithetic:
        return base
    paired = np.empty((paths, observations), dtype=float)
    paired[0::2] = base
    paired[1::2] = -base
    return paired


def _independent_samples(samples: np.ndarray, antithetic: bool) -> np.ndarray:
    return (samples[0::2] + samples[1::2]) * 0.5 if antithetic else samples


def _asian_payoffs(
    inputs: MarketInputs, side: OptionSide, observations: int, average_type: AverageType,
    normals: np.ndarray,
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    delta_t = inputs.maturity / observations
    log_increments = (
        (inputs.rate - inputs.dividend - 0.5 * inputs.volatility**2) * delta_t
        + inputs.volatility * sqrt(delta_t) * normals
    )
    spots = inputs.spot * np.exp(np.cumsum(log_increments, axis=1))
    arithmetic = np.mean(spots, axis=1)
    geometric = np.exp(np.mean(np.log(spots), axis=1))
    selected = arithmetic if average_type == "arithmetic" else geometric
    intrinsic = selected - inputs.strike
    payoff = np.maximum(intrinsic, 0.0) if side == "call" else np.maximum(-intrinsic, 0.0)
    geometric_intrinsic = geometric - inputs.strike
    geometric_payoff = np.maximum(geometric_intrinsic, 0.0) if side == "call" else np.maximum(-geometric_intrinsic, 0.0)
    discount = exp(-inputs.rate * inputs.maturity)
    return discount * payoff, discount * geometric_payoff, spots


def _controlled_samples(
    samples: np.ndarray, geometric_samples: np.ndarray, geometric_reference: float, average_type: AverageType,
) -> tuple[np.ndarray, float]:
    if average_type == "geometric":
        return samples, 0.0
    variance = float(np.var(geometric_samples, ddof=1))
    beta = 0.0 if variance == 0.0 else float(np.cov(samples, geometric_samples, ddof=1)[0, 1] / variance)
    return samples - beta * (geometric_samples - geometric_reference), beta


def solve_asian_monte_carlo(
    inputs: MarketInputs, side: OptionSide, observations: int, average_type: AverageType, average_state: float,
    surface_spot_min: float, surface_spot_max: float, surface_spot_steps: int, surface_time_steps: int,
    paths: int, seed: int, antithetic: bool, confidence_level: float,
) -> dict[str, object]:
    started_at = perf_counter()
    normals = _antithetic_normals(paths, observations, seed, antithetic)
    samples, geometric_samples, simulated_spots = _asian_payoffs(inputs, side, observations, average_type, normals)
    geometric_reference = geometric_asian_price(inputs, side, observations)
    controlled, beta = _controlled_samples(samples, geometric_samples, geometric_reference, average_type)
    independent = _independent_samples(controlled, antithetic)
    price = float(np.mean(independent))
    standard_error = float(np.std(independent, ddof=1) / sqrt(independent.size))
    critical = NormalDist().inv_cdf(0.5 + confidence_level / 2.0)

    surface = _monte_carlo_surface(
        inputs, side, observations, average_type, average_state,
        surface_spot_min, surface_spot_max, surface_spot_steps, surface_time_steps,
        normals, antithetic, confidence_level,
    )
    _align_scalar(surface, inputs.spot, price)
    counts = sorted({paths, max(1000, paths // 8), max(1000, paths // 4), max(1000, paths // 2)})
    convergence = []
    for count in counts:
        count = min(count, paths)
        if antithetic and count % 2:
            count -= 1
        prefix = _independent_samples(controlled[:count], antithetic)
        point_price = float(np.mean(prefix))
        point_error = float(np.std(prefix, ddof=1) / sqrt(prefix.size))
        convergence.append({
            "paths": count, "price": point_price, "standard_error": point_error,
            "lower": point_price - critical * point_error, "upper": point_price + critical * point_error,
        })
    display_count = min(12, simulated_spots.shape[0])
    display_times = np.concatenate(([0.0], _observation_times(inputs.maturity, observations))).tolist()
    sample_paths = [
        {"times": display_times, "spots": np.concatenate(([inputs.spot], simulated_spots[index])).tolist()}
        for index in range(display_count)
    ]
    return {
        "method": "monte_carlo", "price": price, "runtime_ms": (perf_counter() - started_at) * 1000,
        "surface": surface, "standard_error": standard_error,
        "confidence_interval": {"lower": price - critical * standard_error, "upper": price + critical * standard_error, "level": confidence_level},
        "convergence": convergence, "sample_paths": sample_paths,
        "diagnostics": {
            "sampling": "exact GBM at observation dates", "average_type": average_type,
            "observations": observations, "includes_initial_spot": False, "seed": seed,
            "antithetic": antithetic, "control_variate": average_type == "arithmetic",
            "control_variate_beta": beta, "average_state": average_state,
        },
    }
