from __future__ import annotations

from dataclasses import dataclass
from math import erf, exp, log, sqrt
from time import perf_counter
from typing import Literal

OptionSide = Literal["call", "put"]


@dataclass(frozen=True)
class MarketInputs:
    spot: float
    strike: float
    maturity: float
    volatility: float
    rate: float
    dividend: float


def normal_cdf(value: float) -> float:
    return 0.5 * (1.0 + erf(value / sqrt(2.0)))


def black_scholes_price(inputs: MarketInputs, side: OptionSide, tau: float | None = None) -> float:
    time_left = inputs.maturity if tau is None else tau
    if time_left <= 0:
        intrinsic = inputs.spot - inputs.strike
        return max(intrinsic, 0.0) if side == "call" else max(-intrinsic, 0.0)

    sigma_root_t = inputs.volatility * sqrt(time_left)
    d1 = (
        log(inputs.spot / inputs.strike)
        + (inputs.rate - inputs.dividend + 0.5 * inputs.volatility**2) * time_left
    ) / sigma_root_t
    d2 = d1 - sigma_root_t
    discounted_spot = inputs.spot * exp(-inputs.dividend * time_left)
    discounted_strike = inputs.strike * exp(-inputs.rate * time_left)

    if side == "call":
        return discounted_spot * normal_cdf(d1) - discounted_strike * normal_cdf(d2)
    return discounted_strike * normal_cdf(-d2) - discounted_spot * normal_cdf(-d1)


def solve_surface(
    inputs: MarketInputs,
    side: OptionSide,
    spot_min: float,
    spot_max: float,
    spot_steps: int,
    time_steps: int,
) -> dict[str, object]:
    started_at = perf_counter()
    spots = [spot_min + (spot_max - spot_min) * index / (spot_steps - 1) for index in range(spot_steps)]
    taus = [inputs.maturity * index / (time_steps - 1) for index in range(time_steps)]
    prices: list[list[float]] = []

    for tau in taus:
        row = []
        for spot in spots:
            node_inputs = MarketInputs(
                spot=max(spot, 1e-12),
                strike=inputs.strike,
                maturity=inputs.maturity,
                volatility=inputs.volatility,
                rate=inputs.rate,
                dividend=inputs.dividend,
            )
            row.append(black_scholes_price(node_inputs, side, tau=tau))
        prices.append(row)

    scalar_price = black_scholes_price(inputs, side)
    runtime_ms = (perf_counter() - started_at) * 1000
    return {
        "price": scalar_price,
        "runtime_ms": runtime_ms,
        "surface": {
            "spots": spots,
            "times_to_maturity": taus,
            "prices": prices,
        },
    }

