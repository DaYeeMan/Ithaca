from __future__ import annotations

from math import exp
from time import perf_counter

import numpy as np
from scipy.linalg import solve_banded

from app.solvers.black_scholes import MarketInputs, OptionSide


def _boundaries(inputs: MarketInputs, side: OptionSide, domain_max: float, tau: float) -> tuple[float, float]:
    if side == "call":
        upper = domain_max * exp(-inputs.dividend * tau) - inputs.strike * exp(-inputs.rate * tau)
        return 0.0, max(upper, 0.0)
    return inputs.strike * exp(-inputs.rate * tau), 0.0


def _interpolate_surface(
    values: np.ndarray,
    source_spots: np.ndarray,
    source_times: np.ndarray,
    target_spots: np.ndarray,
    target_times: np.ndarray,
) -> np.ndarray:
    spatial = np.vstack([np.interp(target_spots, source_spots, row) for row in values])
    output = np.empty((target_times.size, target_spots.size), dtype=float)
    for spot_index in range(target_spots.size):
        output[:, spot_index] = np.interp(target_times, source_times, spatial[:, spot_index])
    return output


def solve_finite_difference(
    inputs: MarketInputs,
    side: OptionSide,
    surface_spot_min: float,
    surface_spot_max: float,
    surface_spot_steps: int,
    surface_time_steps: int,
    grid_spot_steps: int,
    grid_time_steps: int,
    domain_max: float,
) -> dict[str, object]:
    started_at = perf_counter()
    spots = np.linspace(0.0, domain_max, grid_spot_steps)
    times = np.linspace(0.0, inputs.maturity, grid_time_steps + 1)
    delta_t = inputs.maturity / grid_time_steps

    intrinsic = spots - inputs.strike
    values = np.empty((grid_time_steps + 1, grid_spot_steps), dtype=float)
    values[0] = np.maximum(intrinsic, 0.0) if side == "call" else np.maximum(-intrinsic, 0.0)

    indices = np.arange(1, grid_spot_steps - 1, dtype=float)
    diffusion = 0.5 * inputs.volatility**2 * indices**2
    carry = (inputs.rate - inputs.dividend) * indices
    lower = diffusion - 0.5 * carry
    diagonal = -2.0 * diffusion - inputs.rate
    upper = diffusion + 0.5 * carry
    upwind = (lower < 0.0) | (upper < 0.0)
    if inputs.rate - inputs.dividend >= 0:
        lower[upwind] = diffusion[upwind]
        diagonal[upwind] = -2.0 * diffusion[upwind] - carry[upwind] - inputs.rate
        upper[upwind] = diffusion[upwind] + carry[upwind]
    else:
        lower[upwind] = diffusion[upwind] - carry[upwind]
        diagonal[upwind] = -2.0 * diffusion[upwind] + carry[upwind] - inputs.rate
        upper[upwind] = diffusion[upwind]
    alpha = 0.5 * delta_t * lower
    beta = 0.5 * delta_t * diagonal
    gamma = 0.5 * delta_t * upper

    banded = np.zeros((3, grid_spot_steps - 2), dtype=float)
    banded[0, 1:] = -gamma[:-1]
    banded[1] = 1.0 - beta
    banded[2, :-1] = -alpha[1:]

    for time_index in range(grid_time_steps):
        tau_now = times[time_index]
        tau_next = times[time_index + 1]
        lower_now, upper_now = _boundaries(inputs, side, domain_max, tau_now)
        lower_next, upper_next = _boundaries(inputs, side, domain_max, tau_next)
        previous = values[time_index]
        right_hand = (
            alpha * previous[:-2]
            + (1.0 + beta) * previous[1:-1]
            + gamma * previous[2:]
        )
        right_hand[0] += alpha[0] * lower_next
        right_hand[-1] += gamma[-1] * upper_next
        values[time_index + 1, 0] = lower_next
        values[time_index + 1, -1] = upper_next
        values[time_index + 1, 1:-1] = solve_banded((1, 1), banded, right_hand)

    target_spots = np.linspace(surface_spot_min, surface_spot_max, surface_spot_steps)
    target_times = np.linspace(0.0, inputs.maturity, surface_time_steps)
    chart_values = _interpolate_surface(values, spots, times, target_spots, target_times)
    scalar_price = float(np.interp(inputs.spot, spots, values[-1]))
    warnings: list[str] = []
    if domain_max < 2.0 * max(inputs.spot, inputs.strike):
        warnings.append("Finite-difference domain may be too narrow for low truncation error.")

    return {
        "method": "finite_difference",
        "price": scalar_price,
        "runtime_ms": (perf_counter() - started_at) * 1000,
        "surface": {
            "spots": target_spots.tolist(),
            "times_to_maturity": target_times.tolist(),
            "prices": chart_values.tolist(),
        },
        "diagnostics": {
            "scheme": "Crank-Nicolson",
            "drift_discretization": "central with local upwind stabilization",
            "upwind_nodes": int(np.count_nonzero(upwind)),
            "spot_steps": grid_spot_steps,
            "time_steps": grid_time_steps,
            "spot_step": domain_max / (grid_spot_steps - 1),
            "time_step": delta_t,
            "domain_max": domain_max,
        },
        "warnings": warnings,
    }
