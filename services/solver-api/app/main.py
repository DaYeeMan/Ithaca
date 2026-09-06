from __future__ import annotations

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.models import MethodResult, SolveRequest, SolveResponse
from app.solvers.black_scholes import MarketInputs, solve_surface
from app.solvers.american import (
    solve_american_binomial,
    solve_american_finite_difference,
    solve_american_monte_carlo,
)
from app.solvers.finite_difference import solve_finite_difference
from app.solvers.monte_carlo import solve_monte_carlo
from app.solvers.barrier import (
    solve_barrier_analytical,
    solve_barrier_finite_difference,
    solve_barrier_monte_carlo,
)


def allowed_origins() -> list[str]:
    configured = os.getenv(
        "ITHACA_ALLOWED_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173",
    )
    return [origin.strip() for origin in configured.split(",") if origin.strip()]


app = FastAPI(title="Ithaca Solver API", version="0.4.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins(),
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/v1/capabilities")
def capabilities() -> dict[str, object]:
    return {
        "option_families": [
            {"id": "european", "status": "available", "methods": ["closed_form", "finite_difference", "monte_carlo"]},
            {"id": "american", "status": "available", "methods": ["binomial", "finite_difference", "monte_carlo"]},
            {"id": "barrier", "status": "available", "methods": ["closed_form", "finite_difference", "monte_carlo"]},
            {"id": "asian", "status": "planned", "methods": []},
        ],
        "methods": [
            {"id": "closed_form", "status": "available"},
            {"id": "binomial", "status": "available", "tree": "Cox-Ross-Rubinstein"},
            {"id": "finite_difference", "status": "available", "scheme": "Crank-Nicolson"},
            {"id": "monte_carlo", "status": "available", "sampling": "risk-neutral GBM"},
        ],
        "limits": {
            "surface_spot_steps": {"minimum": 20, "maximum": 160},
            "surface_time_steps": {"minimum": 20, "maximum": 160},
            "finite_difference_spot_steps": {"minimum": 51, "maximum": 801},
            "finite_difference_time_steps": {"minimum": 20, "maximum": 2_000},
            "binomial_steps": {"minimum": 50, "maximum": 4_000},
            "monte_carlo_paths": {"minimum": 1_000, "maximum": 200_000},
            "monte_carlo_steps": {"minimum": 1, "maximum": 512},
            "total_estimated_operations": 120_000_000,
            "default_runtime_seconds": 5,
            "advanced_runtime_seconds": 30,
        },
        "execution": {
            "transport": "synchronous_http",
            "progress": "method-level indeterminate",
            "cancellation": "client abort",
            "error_format": "FastAPI validation detail or HTTP error body",
        },
    }


@app.post("/v1/solve", response_model=SolveResponse)
def solve(request: SolveRequest) -> SolveResponse:
    market = MarketInputs(
        spot=request.market.spot,
        strike=request.market.strike,
        maturity=request.market.maturity,
        volatility=request.market.volatility,
        rate=request.market.rate,
        dividend=request.market.dividend,
    )
    closed_form = solve_surface(
        inputs=market,
        side=request.option_side,
        spot_min=request.surface.spot_min,
        spot_max=request.surface.spot_max,
        spot_steps=request.surface.spot_steps,
        time_steps=request.surface.time_steps,
    )
    reference_price = float(closed_form["price"])
    if request.option_family == "american":
        reference_price = float(solve_american_binomial(
            inputs=market,
            side=request.option_side,
            surface_spot_min=request.surface.spot_min,
            surface_spot_max=request.surface.spot_max,
            surface_spot_steps=2,
            surface_time_steps=2,
            steps=request.binomial.steps,
        )["price"])
    elif request.option_family == "barrier":
        reference_price = float(solve_barrier_analytical(
            inputs=market,
            side=request.option_side,
            direction=request.barrier.direction,
            style=request.barrier.style,
            barrier=request.barrier.level,
            surface_spot_min=request.surface.spot_min,
            surface_spot_max=request.surface.spot_max,
            surface_spot_steps=2,
            surface_time_steps=2,
        )["price"])
    results: list[MethodResult] = []

    for method in request.methods:
        if request.option_family == "american" and method == "binomial":
            raw_result = solve_american_binomial(
                inputs=market,
                side=request.option_side,
                surface_spot_min=request.surface.spot_min,
                surface_spot_max=request.surface.spot_max,
                surface_spot_steps=request.surface.spot_steps,
                surface_time_steps=request.surface.time_steps,
                steps=request.binomial.steps,
            )
            raw_result["reference_error"] = 0.0
        elif method == "closed_form":
            if request.option_family == "barrier":
                raw_result = solve_barrier_analytical(
                    inputs=market,
                    side=request.option_side,
                    direction=request.barrier.direction,
                    style=request.barrier.style,
                    barrier=request.barrier.level,
                    surface_spot_min=request.surface.spot_min,
                    surface_spot_max=request.surface.spot_max,
                    surface_spot_steps=request.surface.spot_steps,
                    surface_time_steps=request.surface.time_steps,
                )
                raw_result["reference_error"] = 0.0
            else:
                raw_result = {
                    **closed_form,
                    "method": "closed_form",
                    "reference_error": 0.0,
                    "diagnostics": {"solution": "analytical Black-Scholes"},
                }
        elif method == "finite_difference":
            settings = request.finite_difference
            if request.option_family == "barrier":
                raw_result = solve_barrier_finite_difference(
                    inputs=market, side=request.option_side,
                    direction=request.barrier.direction, style=request.barrier.style,
                    barrier=request.barrier.level,
                    surface_spot_min=request.surface.spot_min, surface_spot_max=request.surface.spot_max,
                    surface_spot_steps=request.surface.spot_steps, surface_time_steps=request.surface.time_steps,
                    grid_spot_steps=settings.spot_steps, grid_time_steps=settings.time_steps,
                    domain_max=settings.domain_max,
                )
            else:
                finite_difference_solver = solve_american_finite_difference if request.option_family == "american" else solve_finite_difference
                raw_result = finite_difference_solver(
                    inputs=market,
                    side=request.option_side,
                    surface_spot_min=request.surface.spot_min,
                    surface_spot_max=request.surface.spot_max,
                    surface_spot_steps=request.surface.spot_steps,
                    surface_time_steps=request.surface.time_steps,
                    grid_spot_steps=settings.spot_steps,
                    grid_time_steps=settings.time_steps,
                    domain_max=settings.domain_max,
                )
            raw_result["reference_error"] = abs(float(raw_result["price"]) - reference_price)
        else:
            settings = request.monte_carlo
            if request.option_family == "barrier":
                raw_result = solve_barrier_monte_carlo(
                    inputs=market, side=request.option_side,
                    direction=request.barrier.direction, style=request.barrier.style,
                    barrier=request.barrier.level,
                    surface_spot_min=request.surface.spot_min, surface_spot_max=request.surface.spot_max,
                    surface_spot_steps=request.surface.spot_steps, surface_time_steps=request.surface.time_steps,
                    paths=settings.paths, steps=settings.steps, seed=settings.seed,
                    antithetic=settings.antithetic, confidence_level=settings.confidence_level,
                )
            else:
                monte_carlo_solver = solve_american_monte_carlo if request.option_family == "american" else solve_monte_carlo
                raw_result = monte_carlo_solver(
                    inputs=market,
                    side=request.option_side,
                    surface_spot_min=request.surface.spot_min,
                    surface_spot_max=request.surface.spot_max,
                    surface_spot_steps=request.surface.spot_steps,
                    surface_time_steps=request.surface.time_steps,
                    paths=settings.paths,
                    steps=settings.steps,
                    seed=settings.seed,
                    antithetic=settings.antithetic,
                    confidence_level=settings.confidence_level,
                )
            raw_result["reference_error"] = abs(float(raw_result["price"]) - reference_price)
        results.append(MethodResult(**raw_result))

    warnings = [warning for result in results for warning in result.warnings]
    return SolveResponse(
        results=results,
        estimated_operations=request.estimated_operations(),
        warnings=warnings,
    )
