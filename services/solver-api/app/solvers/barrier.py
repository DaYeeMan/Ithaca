from __future__ import annotations

from math import exp, log, sqrt
from statistics import NormalDist
from time import perf_counter
from typing import Literal

import numpy as np

from app.execution import check_execution
from scipy.linalg import solve_banded

from app.solvers.black_scholes import MarketInputs, OptionSide, black_scholes_price, normal_cdf
from app.solvers.finite_difference import _boundaries, _interpolate_surface, solve_finite_difference

BarrierDirection = Literal["down", "up"]
BarrierStyle = Literal["in", "out"]


def _triggered(spot: float, barrier: float, direction: BarrierDirection) -> bool:
    return spot <= barrier if direction == "down" else spot >= barrier


def _vanilla(inputs: MarketInputs, side: OptionSide, tau: float) -> float:
    return black_scholes_price(inputs, side, tau=tau)


def barrier_price(
    inputs: MarketInputs,
    side: OptionSide,
    direction: BarrierDirection,
    style: BarrierStyle,
    barrier: float,
    tau: float | None = None,
) -> float:
    """Continuous single-barrier price with no rebate (Reiner-Rubinstein)."""
    time_left = inputs.maturity if tau is None else tau
    vanilla = _vanilla(inputs, side, time_left)
    if _triggered(inputs.spot, barrier, direction):
        return vanilla if style == "in" else 0.0
    if time_left <= 0.0:
        return 0.0 if style == "in" else vanilla

    spot = inputs.spot
    strike = inputs.strike
    deviation = inputs.volatility * sqrt(time_left)
    discount_r = exp(-inputs.rate * time_left)
    discount_q = exp(-inputs.dividend * time_left)
    mu = (inputs.rate - inputs.dividend) / inputs.volatility**2 - 0.5
    mu_sigma = (1.0 + mu) * deviation

    def a(phi: float) -> float:
        x1 = log(spot / strike) / deviation + mu_sigma
        return phi * (
            spot * discount_q * normal_cdf(phi * x1)
            - strike * discount_r * normal_cdf(phi * (x1 - deviation))
        )

    def b(phi: float) -> float:
        x2 = log(spot / barrier) / deviation + mu_sigma
        return phi * (
            spot * discount_q * normal_cdf(phi * x2)
            - strike * discount_r * normal_cdf(phi * (x2 - deviation))
        )

    def c(eta: float, phi: float) -> float:
        ratio = barrier / spot
        y1 = log(barrier * ratio / strike) / deviation + mu_sigma
        return phi * (
            spot * discount_q * ratio ** (2.0 * mu + 2.0) * normal_cdf(eta * y1)
            - strike * discount_r * ratio ** (2.0 * mu) * normal_cdf(eta * (y1 - deviation))
        )

    def d(eta: float, phi: float) -> float:
        ratio = barrier / spot
        y2 = log(barrier / spot) / deviation + mu_sigma
        return phi * (
            spot * discount_q * ratio ** (2.0 * mu + 2.0) * normal_cdf(eta * y2)
            - strike * discount_r * ratio ** (2.0 * mu) * normal_cdf(eta * (y2 - deviation))
        )

    if side == "call" and direction == "down":
        out_price = a(1.0) - c(1.0, 1.0) if strike >= barrier else b(1.0) - d(1.0, 1.0)
    elif side == "call":
        out_price = 0.0 if strike >= barrier else a(1.0) - b(1.0) + c(-1.0, 1.0) - d(-1.0, 1.0)
    elif direction == "down":
        out_price = a(-1.0) - b(-1.0) + c(1.0, -1.0) - d(1.0, -1.0) if strike >= barrier else 0.0
    else:
        out_price = b(-1.0) - d(-1.0, -1.0) if strike >= barrier else a(-1.0) - c(-1.0, -1.0)

    out_price = min(max(out_price, 0.0), vanilla)
    return vanilla - out_price if style == "in" else out_price


def solve_barrier_analytical(
    inputs: MarketInputs,
    side: OptionSide,
    direction: BarrierDirection,
    style: BarrierStyle,
    barrier: float,
    surface_spot_min: float,
    surface_spot_max: float,
    surface_spot_steps: int,
    surface_time_steps: int,
) -> dict[str, object]:
    started_at = perf_counter()
    target_spots = np.linspace(surface_spot_min, surface_spot_max, surface_spot_steps)
    target_times = np.linspace(0.0, inputs.maturity, surface_time_steps)
    prices = np.empty((surface_time_steps, surface_spot_steps), dtype=float)
    for time_index, tau in enumerate(target_times):
        check_execution()
        for spot_index, spot in enumerate(target_spots):
            node = MarketInputs(max(float(spot), 1e-12), inputs.strike, inputs.maturity, inputs.volatility, inputs.rate, inputs.dividend)
            prices[time_index, spot_index] = barrier_price(node, side, direction, style, barrier, float(tau))
    return {
        "method": "closed_form",
        "price": barrier_price(inputs, side, direction, style, barrier),
        "runtime_ms": (perf_counter() - started_at) * 1000,
        "surface": {
            "spots": target_spots.tolist(),
            "times_to_maturity": target_times.tolist(),
            "prices": prices.tolist(),
        },
        "diagnostics": {
            "solution": "Reiner-Rubinstein continuous single-barrier formula",
            "barrier_level": barrier,
            "barrier_direction": direction,
            "barrier_style": style,
            "barrier_monitoring": "continuous",
            "rebate": 0.0,
            "barrier_triggered": _triggered(inputs.spot, barrier, direction),
        },
        "warnings": [],
    }


def _knock_out_finite_difference(
    inputs: MarketInputs,
    side: OptionSide,
    direction: BarrierDirection,
    barrier: float,
    surface_spot_min: float,
    surface_spot_max: float,
    surface_spot_steps: int,
    surface_time_steps: int,
    grid_spot_steps: int,
    grid_time_steps: int,
    domain_max: float,
) -> tuple[float, np.ndarray, np.ndarray, np.ndarray]:
    lower_spot, upper_spot = (barrier, domain_max) if direction == "down" else (0.0, barrier)
    if upper_spot <= lower_spot:
        raise ValueError("Barrier leaves no finite-difference pricing domain.")
    spots = np.linspace(lower_spot, upper_spot, grid_spot_steps)
    times = np.linspace(0.0, inputs.maturity, grid_time_steps + 1)
    delta_t = inputs.maturity / grid_time_steps
    delta_s = (upper_spot - lower_spot) / (grid_spot_steps - 1)
    intrinsic = spots - inputs.strike if side == "call" else inputs.strike - spots
    values = np.empty((grid_time_steps + 1, grid_spot_steps), dtype=float)
    values[0] = np.maximum(intrinsic, 0.0)
    values[0, 0 if direction == "down" else -1] = 0.0

    interior_spots = spots[1:-1]
    diffusion = 0.5 * inputs.volatility**2 * interior_spots**2 / delta_s**2
    carry = 0.5 * (inputs.rate - inputs.dividend) * interior_spots / delta_s
    lower = diffusion - carry
    diagonal = -2.0 * diffusion - inputs.rate
    upper = diffusion + carry
    alpha = 0.5 * delta_t * lower
    beta = 0.5 * delta_t * diagonal
    gamma = 0.5 * delta_t * upper
    banded = np.zeros((3, grid_spot_steps - 2), dtype=float)
    banded[0, 1:] = -gamma[:-1]
    banded[1] = 1.0 - beta
    banded[2, :-1] = -alpha[1:]

    for time_index in range(grid_time_steps):
        check_execution()
        tau_now = times[time_index]
        tau_next = times[time_index + 1]
        vanilla_now = _boundaries(inputs, side, domain_max, tau_now)
        vanilla_next = _boundaries(inputs, side, domain_max, tau_next)
        if direction == "down":
            lower_now, upper_now = 0.0, vanilla_now[1]
            lower_next, upper_next = 0.0, vanilla_next[1]
        else:
            lower_now, upper_now = vanilla_now[0], 0.0
            lower_next, upper_next = vanilla_next[0], 0.0
        previous = values[time_index]
        right_hand = alpha * previous[:-2] + (1.0 + beta) * previous[1:-1] + gamma * previous[2:]
        right_hand[0] += alpha[0] * lower_next
        right_hand[-1] += gamma[-1] * upper_next
        values[time_index + 1, 0] = lower_next
        values[time_index + 1, -1] = upper_next
        values[time_index + 1, 1:-1] = solve_banded((1, 1), banded, right_hand)

    target_spots = np.linspace(surface_spot_min, surface_spot_max, surface_spot_steps)
    target_times = np.linspace(0.0, inputs.maturity, surface_time_steps)
    chart = _interpolate_surface(values, spots, times, np.clip(target_spots, lower_spot, upper_spot), target_times)
    alive = target_spots > barrier if direction == "down" else target_spots < barrier
    chart[:, ~alive] = 0.0
    scalar = 0.0 if _triggered(inputs.spot, barrier, direction) else float(np.interp(inputs.spot, spots, values[-1]))
    return scalar, chart, target_spots, target_times


def solve_barrier_finite_difference(
    inputs: MarketInputs,
    side: OptionSide,
    direction: BarrierDirection,
    style: BarrierStyle,
    barrier: float,
    surface_spot_min: float,
    surface_spot_max: float,
    surface_spot_steps: int,
    surface_time_steps: int,
    grid_spot_steps: int,
    grid_time_steps: int,
    domain_max: float,
) -> dict[str, object]:
    started_at = perf_counter()
    out_price, out_surface, target_spots, target_times = _knock_out_finite_difference(
        inputs, side, direction, barrier, surface_spot_min, surface_spot_max,
        surface_spot_steps, surface_time_steps, grid_spot_steps, grid_time_steps, domain_max,
    )
    if style == "in":
        vanilla = solve_finite_difference(
            inputs, side, surface_spot_min, surface_spot_max, surface_spot_steps,
            surface_time_steps, grid_spot_steps, grid_time_steps, domain_max,
        )
        vanilla_surface = np.asarray(vanilla["surface"]["prices"], dtype=float)
        prices = np.maximum(vanilla_surface - out_surface, 0.0)
        price = max(float(vanilla["price"]) - out_price, 0.0)
    else:
        prices = out_surface
        price = out_price
    return {
        "method": "finite_difference",
        "price": price,
        "runtime_ms": (perf_counter() - started_at) * 1000,
        "surface": {
            "spots": target_spots.tolist(),
            "times_to_maturity": target_times.tolist(),
            "prices": prices.tolist(),
        },
        "diagnostics": {
            "scheme": "Crank-Nicolson with absorbing barrier boundary",
            "spot_steps": grid_spot_steps,
            "time_steps": grid_time_steps,
            "domain_max": domain_max,
            "barrier_level": barrier,
            "barrier_direction": direction,
            "barrier_style": style,
            "barrier_monitoring": "continuous",
            "rebate": 0.0,
            "barrier_triggered": _triggered(inputs.spot, barrier, direction),
        },
        "warnings": [],
    }


def _antithetic_normals(paths: int, steps: int, seed: int, antithetic: bool) -> np.ndarray:
    generator = np.random.default_rng(seed)
    count = paths // 2 if antithetic else paths
    normals = generator.standard_normal((count, steps))
    if not antithetic:
        return normals
    paired = np.empty((paths, steps), dtype=float)
    paired[0::2] = normals
    paired[1::2] = -normals
    return paired


def _barrier_discounted_payoffs(
    inputs: MarketInputs,
    side: OptionSide,
    direction: BarrierDirection,
    style: BarrierStyle,
    barrier: float,
    starting_spots: np.ndarray,
    normals: np.ndarray,
) -> tuple[np.ndarray, np.ndarray]:
    paths, steps = normals.shape
    delta_t = inputs.maturity / steps
    log_steps = (
        (inputs.rate - inputs.dividend - 0.5 * inputs.volatility**2) * delta_t
        + inputs.volatility * sqrt(delta_t) * normals
    )
    cumulative = np.cumsum(log_steps, axis=1)
    sign = 1.0 if direction == "down" else -1.0
    initial_distance = sign * np.log(np.maximum(starting_spots, 1e-300) / barrier)
    survival = np.broadcast_to((initial_distance > 0.0).astype(float), (paths, starting_spots.size)).copy()
    previous = np.broadcast_to(initial_distance, survival.shape)
    variance = inputs.volatility**2 * delta_t
    for step in range(steps):
        if step % 8 == 0:
            check_execution()
        current = initial_distance[None, :] + sign * cumulative[:, step, None]
        safe = (previous > 0.0) & (current > 0.0)
        crossing = np.zeros_like(survival)
        crossing[safe] = np.exp(-2.0 * previous[safe] * current[safe] / variance)
        survival *= np.where(safe, 1.0 - crossing, 0.0)
        previous = current
    terminal = starting_spots[None, :] * np.exp(cumulative[:, -1, None])
    intrinsic = terminal - inputs.strike if side == "call" else inputs.strike - terminal
    payoff = np.maximum(intrinsic, 0.0)
    activation_weight = 1.0 - survival if style == "in" else survival
    discounted = exp(-inputs.rate * inputs.maturity) * payoff * activation_weight
    return discounted, terminal


def _mean_and_error(samples: np.ndarray, antithetic: bool) -> tuple[np.ndarray, np.ndarray]:
    independent = 0.5 * (samples[0::2] + samples[1::2]) if antithetic else samples
    return np.mean(independent, axis=0), np.std(independent, axis=0, ddof=1) / sqrt(independent.shape[0])


def solve_barrier_monte_carlo(
    inputs: MarketInputs,
    side: OptionSide,
    direction: BarrierDirection,
    style: BarrierStyle,
    barrier: float,
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
    normals = _antithetic_normals(paths, steps, seed, antithetic)
    scalar_samples, _ = _barrier_discounted_payoffs(
        inputs, side, direction, style, barrier, np.asarray([inputs.spot]), normals,
    )
    mean, error = _mean_and_error(scalar_samples[:, 0], antithetic)
    price, standard_error = float(mean), float(error)
    critical = NormalDist().inv_cdf(0.5 + confidence_level / 2.0)

    target_spots = np.linspace(surface_spot_min, surface_spot_max, surface_spot_steps)
    target_times = np.linspace(0.0, inputs.maturity, surface_time_steps)
    surface_paths = min(paths, 512)
    if antithetic and surface_paths % 2:
        surface_paths -= 1
    surface_steps = min(steps, 24)
    surface_normals = _antithetic_normals(surface_paths, surface_steps, seed + 10_000, antithetic)
    surface_prices = np.empty((surface_time_steps, surface_spot_steps), dtype=float)
    surface_errors = np.empty_like(surface_prices)
    for time_index, tau in enumerate(target_times):
        check_execution()
        if tau <= 0.0:
            payoff = np.maximum(target_spots - inputs.strike, 0.0) if side == "call" else np.maximum(inputs.strike - target_spots, 0.0)
            triggered = target_spots <= barrier if direction == "down" else target_spots >= barrier
            active = triggered if style == "in" else ~triggered
            surface_prices[time_index] = np.where(active, payoff, 0.0)
            surface_errors[time_index] = 0.0
            continue
        node_inputs = MarketInputs(inputs.spot, inputs.strike, float(tau), inputs.volatility, inputs.rate, inputs.dividend)
        samples, _ = _barrier_discounted_payoffs(
            node_inputs, side, direction, style, barrier, target_spots, surface_normals,
        )
        surface_prices[time_index], surface_errors[time_index] = _mean_and_error(samples, antithetic)

    counts = sorted({paths, max(1_000, paths // 8), max(1_000, paths // 4), max(1_000, paths // 2)})
    convergence = []
    for count in counts:
        point_mean, point_error = _mean_and_error(scalar_samples[:count, 0], antithetic)
        point_price, point_se = float(point_mean), float(point_error)
        convergence.append({
            "paths": count,
            "price": point_price,
            "standard_error": point_se,
            "lower": point_price - critical * point_se,
            "upper": point_price + critical * point_se,
        })
    path_times = np.linspace(0.0, inputs.maturity, steps + 1).tolist()
    cumulative = np.cumsum(
        (inputs.rate - inputs.dividend - 0.5 * inputs.volatility**2) * (inputs.maturity / steps)
        + inputs.volatility * sqrt(inputs.maturity / steps) * normals[:12], axis=1,
    )
    displayed = np.column_stack((np.full(min(12, paths), inputs.spot), inputs.spot * np.exp(cumulative)))
    return {
        "method": "monte_carlo",
        "price": price,
        "runtime_ms": (perf_counter() - started_at) * 1000,
        "standard_error": standard_error,
        "confidence_interval": {
            "lower": price - critical * standard_error,
            "upper": price + critical * standard_error,
            "level": confidence_level,
        },
        "surface": {
            "spots": target_spots.tolist(),
            "times_to_maturity": target_times.tolist(),
            "prices": surface_prices.tolist(),
            "standard_errors": surface_errors.tolist(),
            "confidence_lower": (surface_prices - critical * surface_errors).tolist(),
            "confidence_upper": (surface_prices + critical * surface_errors).tolist(),
        },
        "convergence": convergence,
        "sample_paths": [{"times": path_times, "spots": row.tolist()} for row in displayed],
        "diagnostics": {
            "sampling": "exact GBM endpoints with Brownian-bridge survival weighting",
            "paths": paths,
            "steps": steps,
            "seed": seed,
            "antithetic": antithetic,
            "surface_paths_per_spot": surface_paths,
            "surface_steps": surface_steps,
            "barrier_level": barrier,
            "barrier_direction": direction,
            "barrier_style": style,
            "barrier_monitoring": "continuous",
            "rebate": 0.0,
            "barrier_triggered": _triggered(inputs.spot, barrier, direction),
        },
        "warnings": ["Barrier Monte Carlo surface uses a reduced path and time-step budget."],
    }
