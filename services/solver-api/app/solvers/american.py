from __future__ import annotations

from math import exp, sqrt
from statistics import NormalDist
from time import perf_counter

import numpy as np

from app.execution import check_execution

from app.solvers.black_scholes import MarketInputs, OptionSide
from app.solvers.finite_difference import _interpolate_surface


def _payoff(spots: np.ndarray, strike: float, side: OptionSide) -> np.ndarray:
    intrinsic = spots - strike if side == "call" else strike - spots
    return np.maximum(intrinsic, 0.0)


def _crr_price(inputs: MarketInputs, side: OptionSide, steps: int) -> float:
    delta_t = inputs.maturity / steps
    up = exp(inputs.volatility * sqrt(delta_t))
    down = 1.0 / up
    probability = (exp((inputs.rate - inputs.dividend) * delta_t) - down) / (up - down)
    if not 0.0 <= probability <= 1.0:
        raise ValueError("Binomial risk-neutral probability falls outside [0, 1]; increase steps.")
    discount = exp(-inputs.rate * delta_t)
    up_moves = np.arange(steps + 1)
    spots = inputs.spot * up**up_moves * down ** (steps - up_moves)
    values = _payoff(spots, inputs.strike, side)
    for _ in range(steps - 1, -1, -1):
        values = discount * (probability * values[1:] + (1.0 - probability) * values[:-1])
        spots = spots[:-1] / down
        values = np.maximum(values, _payoff(spots, inputs.strike, side))
    return float(values[0])


def _crr_surface(
    inputs: MarketInputs,
    side: OptionSide,
    target_spots: np.ndarray,
    target_times: np.ndarray,
    steps: int,
) -> np.ndarray:
    prices = np.empty((target_times.size, target_spots.size), dtype=float)
    prices[0] = _payoff(target_spots, inputs.strike, side)
    for time_index, tau in enumerate(target_times[1:], start=1):
        row_steps = max(2, round(steps * float(tau) / inputs.maturity))
        delta_t = float(tau) / row_steps
        up = exp(inputs.volatility * sqrt(delta_t))
        down = 1.0 / up
        probability = (exp((inputs.rate - inputs.dividend) * delta_t) - down) / (up - down)
        discount = exp(-inputs.rate * delta_t)
        up_moves = np.arange(row_steps + 1)[:, None]
        spots = target_spots[None, :] * up**up_moves * down ** (row_steps - up_moves)
        values = _payoff(spots, inputs.strike, side)
        for _ in range(row_steps - 1, -1, -1):
            values = discount * (probability * values[1:] + (1.0 - probability) * values[:-1])
            spots = spots[:-1] / down
            values = np.maximum(values, _payoff(spots, inputs.strike, side))
        prices[time_index] = values[0]
    return prices


def solve_american_binomial(
    inputs: MarketInputs,
    side: OptionSide,
    surface_spot_min: float,
    surface_spot_max: float,
    surface_spot_steps: int,
    surface_time_steps: int,
    steps: int,
) -> dict[str, object]:
    started_at = perf_counter()
    target_spots = np.linspace(surface_spot_min, surface_spot_max, surface_spot_steps)
    target_times = np.linspace(0.0, inputs.maturity, surface_time_steps)
    surface_steps = min(steps, 100)
    prices = _crr_surface(inputs, side, target_spots, target_times, surface_steps)
    return {
        "method": "binomial",
        "price": _crr_price(inputs, side, steps),
        "runtime_ms": (perf_counter() - started_at) * 1000,
        "surface": {
            "spots": target_spots.tolist(),
            "times_to_maturity": target_times.tolist(),
            "prices": prices.tolist(),
        },
        "diagnostics": {
            "tree": "Cox-Ross-Rubinstein",
            "steps": steps,
            "surface_steps": surface_steps,
            "exercise": "continuous limit approximated by exercise at every tree date",
        },
        "warnings": ["Binomial surface uses at most 100 steps per maturity slice."] if steps > 100 else [],
    }


def _american_boundaries(
    inputs: MarketInputs, side: OptionSide, domain_max: float, tau: float
) -> tuple[float, float]:
    if side == "put":
        return inputs.strike, 0.0
    continuation = domain_max * exp(-inputs.dividend * tau) - inputs.strike * exp(-inputs.rate * tau)
    return 0.0, max(domain_max - inputs.strike, continuation, 0.0)


def solve_american_finite_difference(
    inputs: MarketInputs,
    side: OptionSide,
    surface_spot_min: float,
    surface_spot_max: float,
    surface_spot_steps: int,
    surface_time_steps: int,
    grid_spot_steps: int,
    grid_time_steps: int,
    domain_max: float,
    omega: float = 1.2,
    tolerance: float = 1e-8,
    max_iterations: int = 250,
) -> dict[str, object]:
    started_at = perf_counter()
    spots = np.linspace(0.0, domain_max, grid_spot_steps)
    times = np.linspace(0.0, inputs.maturity, grid_time_steps + 1)
    delta_t = inputs.maturity / grid_time_steps
    intrinsic = _payoff(spots, inputs.strike, side)
    values = np.empty((grid_time_steps + 1, grid_spot_steps), dtype=float)
    values[0] = intrinsic

    indices = np.arange(1, grid_spot_steps - 1, dtype=float)
    diffusion = 0.5 * inputs.volatility**2 * indices**2
    carry = (inputs.rate - inputs.dividend) * indices
    lower = diffusion - 0.5 * carry
    diagonal = -2.0 * diffusion - inputs.rate
    upper = diffusion + 0.5 * carry
    alpha = 0.5 * delta_t * lower
    beta = 0.5 * delta_t * diagonal
    gamma = 0.5 * delta_t * upper
    matrix_lower = -alpha
    matrix_diagonal = 1.0 - beta
    matrix_upper = -gamma
    iteration_counts: list[int] = []

    for time_index in range(grid_time_steps):
        check_execution()
        tau_next = times[time_index + 1]
        lower_next, upper_next = _american_boundaries(inputs, side, domain_max, tau_next)
        previous = values[time_index]
        right_hand = alpha * previous[:-2] + (1.0 + beta) * previous[1:-1] + gamma * previous[2:]
        right_hand[0] += alpha[0] * lower_next
        right_hand[-1] += gamma[-1] * upper_next
        current = np.maximum(previous[1:-1].copy(), intrinsic[1:-1])
        for iteration in range(1, max_iterations + 1):
            if iteration % 16 == 0:
                check_execution()
            max_change = 0.0
            for index in range(current.size):
                left_value = lower_next if index == 0 else current[index - 1]
                right_value = upper_next if index == current.size - 1 else current[index + 1]
                unconstrained = (
                    right_hand[index]
                    - matrix_lower[index] * left_value
                    - matrix_upper[index] * right_value
                ) / matrix_diagonal[index]
                updated = max(
                    intrinsic[index + 1],
                    current[index] + omega * (unconstrained - current[index]),
                )
                max_change = max(max_change, abs(updated - current[index]))
                current[index] = updated
            if max_change < tolerance:
                break
        else:
            raise RuntimeError("PSOR failed to converge within the iteration limit")
        iteration_counts.append(iteration)
        values[time_index + 1, 0] = lower_next
        values[time_index + 1, -1] = upper_next
        values[time_index + 1, 1:-1] = current

    target_spots = np.linspace(surface_spot_min, surface_spot_max, surface_spot_steps)
    target_times = np.linspace(0.0, inputs.maturity, surface_time_steps)
    chart_values = _interpolate_surface(values, spots, times, target_spots, target_times)
    boundary_spots: list[float | None] = []
    for time_index, row in enumerate(values):
        exercise = intrinsic > 1e-10
        contact = exercise & (row - intrinsic <= max(tolerance * 20, 1e-6))
        candidates = spots[contact]
        if side == "put":
            boundary_spots.append(float(candidates.max()) if candidates.size else None)
        else:
            boundary_spots.append(float(candidates.min()) if candidates.size else None)

    return {
        "method": "finite_difference",
        "price": float(np.interp(inputs.spot, spots, values[-1])),
        "runtime_ms": (perf_counter() - started_at) * 1000,
        "surface": {
            "spots": target_spots.tolist(),
            "times_to_maturity": target_times.tolist(),
            "prices": chart_values.tolist(),
        },
        "exercise_boundary": {
            "times_to_maturity": times.tolist(),
            "spots": boundary_spots,
        },
        "diagnostics": {
            "scheme": "Crank-Nicolson LCP with PSOR",
            "spot_steps": grid_spot_steps,
            "time_steps": grid_time_steps,
            "domain_max": domain_max,
            "omega": omega,
            "tolerance": tolerance,
            "maximum_iterations": max(iteration_counts),
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


def _lsm_discounted_cashflows(
    inputs: MarketInputs, side: OptionSide, normals: np.ndarray
) -> tuple[np.ndarray, np.ndarray]:
    paths, steps = normals.shape
    delta_t = inputs.maturity / steps
    log_steps = (
        (inputs.rate - inputs.dividend - 0.5 * inputs.volatility**2) * delta_t
        + inputs.volatility * sqrt(delta_t) * normals
    )
    spots = np.empty((paths, steps + 1), dtype=float)
    spots[:, 0] = inputs.spot
    spots[:, 1:] = inputs.spot * np.exp(np.cumsum(log_steps, axis=1))
    cashflows = _payoff(spots[:, -1], inputs.strike, side)
    exercise_steps = np.full(paths, steps, dtype=int)

    for step in range(steps - 1, 0, -1):
        exercise_value = _payoff(spots[:, step], inputs.strike, side)
        eligible = exercise_value > 0.0
        if np.count_nonzero(eligible) < 3:
            continue
        state = spots[eligible, step] / inputs.strike
        future = cashflows[eligible] * np.exp(-inputs.rate * delta_t * (exercise_steps[eligible] - step))
        design = np.column_stack((np.ones(state.size), state, state * state))
        coefficients = np.linalg.lstsq(design, future, rcond=None)[0]
        continuation = design @ coefficients
        exercise_now = exercise_value[eligible] > continuation
        selected = np.flatnonzero(eligible)[exercise_now]
        cashflows[selected] = exercise_value[selected]
        exercise_steps[selected] = step

    discounted = cashflows * np.exp(-inputs.rate * delta_t * exercise_steps)
    return discounted, spots


def _lsm_surface_row(
    inputs: MarketInputs,
    side: OptionSide,
    starting_spots: np.ndarray,
    normals: np.ndarray,
) -> tuple[np.ndarray, np.ndarray]:
    paths, steps = normals.shape
    delta_t = inputs.maturity / steps
    log_steps = (
        (inputs.rate - inputs.dividend - 0.5 * inputs.volatility**2) * delta_t
        + inputs.volatility * sqrt(delta_t) * normals
    )
    growth = np.empty((paths, steps + 1), dtype=float)
    growth[:, 0] = 1.0
    growth[:, 1:] = np.exp(np.cumsum(log_steps, axis=1))
    spots = growth[:, None, :] * starting_spots[None, :, None]
    cashflows = _payoff(spots[:, :, -1], inputs.strike, side)
    exercise_steps = np.full(cashflows.shape, steps, dtype=int)

    for step in range(steps - 1, 0, -1):
        exercise_value = _payoff(spots[:, :, step], inputs.strike, side)
        eligible = exercise_value > 0.0
        if np.count_nonzero(eligible) < 3:
            continue
        state = spots[:, :, step][eligible] / inputs.strike
        future = cashflows[eligible] * np.exp(
            -inputs.rate * delta_t * (exercise_steps[eligible] - step)
        )
        design = np.column_stack((np.ones(state.size), state, state * state))
        continuation = design @ np.linalg.lstsq(design, future, rcond=None)[0]
        exercise_now = eligible.copy()
        exercise_now[eligible] = exercise_value[eligible] > continuation
        cashflows[exercise_now] = exercise_value[exercise_now]
        exercise_steps[exercise_now] = step

    discounted = cashflows * np.exp(-inputs.rate * delta_t * exercise_steps)
    independent = (discounted[0::2] + discounted[1::2]) * 0.5
    return np.mean(independent, axis=0), np.std(independent, axis=0, ddof=1) / sqrt(independent.shape[0])


def solve_american_monte_carlo(
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
    normals = _antithetic_normals(paths, steps, seed, antithetic)
    discounted, simulated_spots = _lsm_discounted_cashflows(inputs, side, normals)
    independent = (discounted[0::2] + discounted[1::2]) * 0.5 if antithetic else discounted
    price = float(np.mean(independent))
    standard_error = float(np.std(independent, ddof=1) / sqrt(independent.size))
    immediate = float(_payoff(np.asarray([inputs.spot]), inputs.strike, side)[0])
    if immediate > price:
        price = immediate
        standard_error = 0.0
    critical = NormalDist().inv_cdf(0.5 + confidence_level / 2.0)

    target_spots = np.linspace(surface_spot_min, surface_spot_max, surface_spot_steps)
    target_times = np.linspace(0.0, inputs.maturity, surface_time_steps)
    surface_paths = min(paths, 512)
    if surface_paths % 2:
        surface_paths -= 1
    surface_steps = min(steps, 24)
    surface_normals = _antithetic_normals(surface_paths, surface_steps, seed + 10_000, True)
    surface_prices = np.empty((surface_time_steps, surface_spot_steps), dtype=float)
    surface_errors = np.empty_like(surface_prices)
    surface_prices[0] = _payoff(target_spots, inputs.strike, side)
    surface_errors[0] = 0.0
    for time_index, tau in enumerate(target_times[1:], start=1):
        check_execution()
        surface_inputs = MarketInputs(
            spot=inputs.spot,
            strike=inputs.strike,
            maturity=float(tau),
            volatility=inputs.volatility,
            rate=inputs.rate,
            dividend=inputs.dividend,
        )
        surface_prices[time_index], surface_errors[time_index] = _lsm_surface_row(
            surface_inputs, side, target_spots, surface_normals
        )
    surface_prices = np.maximum(surface_prices, _payoff(target_spots, inputs.strike, side)[None, :])
    counts = sorted({paths, max(1_000, paths // 8), max(1_000, paths // 4), max(1_000, paths // 2)})
    convergence = []
    for count in counts:
        effective = count // 2 if antithetic else count
        sample = independent[:effective]
        point_price = float(np.mean(sample))
        point_error = float(np.std(sample, ddof=1) / sqrt(sample.size))
        convergence.append({
            "paths": count,
            "price": point_price,
            "standard_error": point_error,
            "lower": point_price - critical * point_error,
            "upper": point_price + critical * point_error,
        })
    display_count = min(paths, 12)
    path_times = np.linspace(0.0, inputs.maturity, steps + 1).tolist()

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
        "sample_paths": [
            {"times": path_times, "spots": simulated_spots[index].tolist()}
            for index in range(display_count)
        ],
        "diagnostics": {
            "sampling": "Longstaff-Schwartz",
            "basis": "1, S/K, (S/K)^2",
            "paths": paths,
            "steps": steps,
            "seed": seed,
            "antithetic": antithetic,
            "surface_estimator": "Longstaff-Schwartz with pooled spot regression",
            "surface_paths_per_spot": surface_paths,
            "surface_steps": surface_steps,
        },
        "warnings": ["Longstaff-Schwartz surface uses a reduced path and exercise-date budget."],
    }
