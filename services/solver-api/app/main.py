from __future__ import annotations

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.models import SolveRequest, SolveResult
from app.solvers.black_scholes import MarketInputs, solve_surface


def allowed_origins() -> list[str]:
    configured = os.getenv(
        "ITHACA_ALLOWED_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173",
    )
    return [origin.strip() for origin in configured.split(",") if origin.strip()]


app = FastAPI(title="Ithaca Solver API", version="0.1.0")
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
            {"id": "european", "status": "available"},
            {"id": "american", "status": "planned"},
            {"id": "barrier", "status": "planned"},
            {"id": "asian", "status": "planned"},
        ],
        "methods": [{"id": "closed_form", "status": "available"}],
        "limits": {"spot_steps": 160, "time_steps": 160},
    }


@app.post("/v1/solve", response_model=SolveResult)
def solve(request: SolveRequest) -> SolveResult:
    market = MarketInputs(
        spot=request.market.spot,
        strike=request.market.strike,
        maturity=request.market.maturity,
        volatility=request.market.volatility,
        rate=request.market.rate,
        dividend=request.market.dividend,
    )
    result = solve_surface(
        inputs=market,
        side=request.option_side,
        spot_min=request.surface.spot_min,
        spot_max=request.surface.spot_max,
        spot_steps=request.surface.spot_steps,
        time_steps=request.surface.time_steps,
    )
    return SolveResult(**result)
