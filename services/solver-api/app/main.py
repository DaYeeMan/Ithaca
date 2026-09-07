from __future__ import annotations

import asyncio
import json
import logging
import os
import re
from time import monotonic, perf_counter
from uuid import uuid4

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.concurrency import run_in_threadpool
from starlette.middleware.trustedhost import TrustedHostMiddleware

from app.execution import ExecutionControl, ExecutionStopped, bind_execution, reset_execution
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
from app.solvers.asian import (
    solve_asian_analytical,
    solve_asian_augmented,
    solve_asian_monte_carlo,
)


def allowed_origins() -> list[str]:
    configured = os.getenv(
        "ITHACA_ALLOWED_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173",
    )
    return [origin.strip() for origin in configured.split(",") if origin.strip()]


def integer_setting(name: str, default: int, minimum: int, maximum: int) -> int:
    try:
        value = int(os.getenv(name, str(default)))
    except ValueError as error:
        raise RuntimeError(f"{name} must be an integer") from error
    if not minimum <= value <= maximum:
        raise RuntimeError(f"{name} must be between {minimum} and {maximum}")
    return value


REQUEST_TIMEOUT_SECONDS = integer_setting("ITHACA_REQUEST_TIMEOUT_SECONDS", 30, 1, 120)
MAX_CONCURRENT_SOLVES = integer_setting("ITHACA_MAX_CONCURRENT_SOLVES", 2, 1, 32)
SERVICE_ENVIRONMENT = os.getenv("ITHACA_ENVIRONMENT", os.getenv("VERCEL_ENV", "development"))
REQUEST_ID_PATTERN = re.compile(r"^[A-Za-z0-9._-]{1,64}$")
logger = logging.getLogger("ithaca.api")
if not logging.getLogger().handlers:
    logging.basicConfig(level=os.getenv("ITHACA_LOG_LEVEL", "INFO").upper(), format="%(message)s")

app = FastAPI(title="Ithaca Solver API", version="0.6.0")
app.state.solve_slots = asyncio.Semaphore(MAX_CONCURRENT_SOLVES)
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins(),
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)
trusted_hosts = [item.strip() for item in os.getenv("ITHACA_ALLOWED_HOSTS", "*").split(",") if item.strip()]
app.add_middleware(TrustedHostMiddleware, allowed_hosts=trusted_hosts)


@app.middleware("http")
async def request_diagnostics(request: Request, call_next):
    supplied_id = request.headers.get("x-request-id", "")
    request_id = supplied_id if REQUEST_ID_PATTERN.fullmatch(supplied_id) else uuid4().hex
    request.state.request_id = request_id
    started_at = perf_counter()
    try:
        response = await call_next(request)
    except Exception:
        logger.exception(json.dumps({"event": "request_failed", "request_id": request_id, "method": request.method, "path": request.url.path}))
        raise
    duration_ms = round((perf_counter() - started_at) * 1000, 2)
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "no-referrer"
    logger.info(json.dumps({"event": "request_complete", "request_id": request_id, "method": request.method, "path": request.url.path, "status": response.status_code, "duration_ms": duration_ms}))
    return response


@app.exception_handler(ExecutionStopped)
async def execution_stopped_handler(request: Request, error: ExecutionStopped) -> JSONResponse:
    return JSONResponse(status_code=504, content={"error": {"code": "solve_timeout", "message": str(error), "request_id": request.state.request_id}})


@app.exception_handler(HTTPException)
async def http_error_handler(request: Request, error: HTTPException) -> JSONResponse:
    detail = error.detail if isinstance(error.detail, dict) else {"code": "http_error", "message": str(error.detail)}
    return JSONResponse(status_code=error.status_code, content={"error": {**detail, "request_id": request.state.request_id}})


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "ithaca-solver-api", "version": app.version}


@app.get("/v1/diagnostics")
def diagnostics() -> dict[str, object]:
    return {
        "service": "ithaca-solver-api",
        "version": app.version,
        "environment": SERVICE_ENVIRONMENT,
        "request_timeout_seconds": REQUEST_TIMEOUT_SECONDS,
        "max_concurrent_solves": MAX_CONCURRENT_SOLVES,
        "status": "ready",
    }


@app.get("/v1/capabilities")
def capabilities() -> dict[str, object]:
    return {
        "option_families": [
            {"id": "european", "status": "available", "methods": ["closed_form", "finite_difference", "monte_carlo"]},
            {"id": "american", "status": "available", "methods": ["binomial", "finite_difference", "monte_carlo"]},
            {"id": "barrier", "status": "available", "methods": ["closed_form", "finite_difference", "monte_carlo"]},
            {"id": "asian", "status": "available", "methods": ["closed_form", "finite_difference", "monte_carlo"], "closed_form_average": "geometric"},
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
            "asian_observations": {"minimum": 2, "maximum": 60},
            "total_estimated_operations": 120_000_000,
            "barrier_monte_carlo_nodes": 4_000_000,
            "default_runtime_seconds": 5,
            "advanced_runtime_seconds": 30,
        },
        "execution": {
            "transport": "synchronous_http",
            "progress": "method-level indeterminate",
            "cancellation": "client disconnect and cooperative solver deadline",
            "error_format": "structured error object for runtime failures; FastAPI validation detail for invalid requests",
        },
    }


def solve_sync(request: SolveRequest, control: ExecutionControl) -> SolveResponse:
    token = bind_execution(control)
    try:
        return _solve(request)
    finally:
        reset_execution(token)


@app.post("/v1/solve", response_model=SolveResponse)
async def solve(http_request: Request, request: SolveRequest) -> SolveResponse:
    try:
        await asyncio.wait_for(app.state.solve_slots.acquire(), timeout=0.05)
    except TimeoutError as error:
        raise HTTPException(status_code=503, detail={"code": "solver_busy", "message": "All solver slots are busy. Retry shortly."}) from error

    control = ExecutionControl(deadline=monotonic() + REQUEST_TIMEOUT_SECONDS)
    task = asyncio.create_task(run_in_threadpool(solve_sync, request, control))
    try:
        while not task.done():
            if await http_request.is_disconnected():
                control.stop("client disconnected")
                raise HTTPException(status_code=499, detail={"code": "client_disconnected", "message": "Client disconnected; calculation cancelled."})
            if monotonic() >= control.deadline:
                control.stop("deadline exceeded")
                try:
                    await asyncio.wait_for(asyncio.shield(task), timeout=0.25)
                except (TimeoutError, ExecutionStopped):
                    pass
                raise ExecutionStopped("calculation exceeded the server deadline")
            await asyncio.sleep(0.025)
        return await task
    finally:
        if not task.done():
            task.add_done_callback(lambda completed: completed.exception() if not completed.cancelled() else None)
        app.state.solve_slots.release()


def _solve(request: SolveRequest) -> SolveResponse:
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
    elif request.option_family == "asian":
        asian = request.asian
        if asian.average_type == "geometric":
            reference_price = float(solve_asian_analytical(
                market, request.option_side, asian.observations, asian.average_state,
                request.surface.spot_min, request.surface.spot_max, 2, 2,
            )["price"])
        else:
            reference_price = float(solve_asian_augmented(
                market, request.option_side, asian.observations, asian.average_type, asian.average_state,
                request.surface.spot_min, request.surface.spot_max, 2, 2,
                request.finite_difference.time_steps,
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
            if request.option_family == "asian":
                raw_result = solve_asian_analytical(
                    market, request.option_side, request.asian.observations, request.asian.average_state,
                    request.surface.spot_min, request.surface.spot_max,
                    request.surface.spot_steps, request.surface.time_steps,
                )
                raw_result["reference_error"] = 0.0
            elif request.option_family == "barrier":
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
            if request.option_family == "asian":
                raw_result = solve_asian_augmented(
                    market, request.option_side, request.asian.observations, request.asian.average_type,
                    request.asian.average_state, request.surface.spot_min, request.surface.spot_max,
                    request.surface.spot_steps, request.surface.time_steps, settings.time_steps,
                )
            elif request.option_family == "barrier":
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
            if request.option_family == "asian":
                raw_result = solve_asian_monte_carlo(
                    market, request.option_side, request.asian.observations, request.asian.average_type,
                    request.asian.average_state, request.surface.spot_min, request.surface.spot_max,
                    request.surface.spot_steps, request.surface.time_steps, settings.paths, settings.seed,
                    settings.antithetic, settings.confidence_level,
                )
            elif request.option_family == "barrier":
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
