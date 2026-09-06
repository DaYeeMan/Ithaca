from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, model_validator

SolverMethod = Literal["closed_form", "binomial", "finite_difference", "monte_carlo"]


class MarketParameters(BaseModel):
    spot: float = Field(gt=0, le=1_000_000)
    strike: float = Field(gt=0, le=1_000_000)
    maturity: float = Field(gt=0, le=50)
    volatility: float = Field(gt=0, le=5)
    rate: float = Field(ge=-1, le=1)
    dividend: float = Field(ge=-1, le=1)


class SurfaceParameters(BaseModel):
    spot_min: float = Field(ge=0, le=1_000_000)
    spot_max: float = Field(gt=0, le=1_000_000)
    spot_steps: int = Field(ge=20, le=160)
    time_steps: int = Field(ge=20, le=160)

    @model_validator(mode="after")
    def validate_domain(self) -> "SurfaceParameters":
        if self.spot_max <= self.spot_min:
            raise ValueError("spot_max must be greater than spot_min")
        return self


class FiniteDifferenceSettings(BaseModel):
    spot_steps: int = Field(default=241, ge=51, le=801)
    time_steps: int = Field(default=240, ge=20, le=2_000)
    domain_max: float = Field(default=300, gt=0, le=2_000_000)


class MonteCarloSettings(BaseModel):
    paths: int = Field(default=20_000, ge=1_000, le=200_000)
    steps: int = Field(default=64, ge=1, le=512)
    seed: int = Field(default=1_729, ge=0, le=2_147_483_647)
    antithetic: bool = True
    confidence_level: float = Field(default=0.95, ge=0.80, le=0.999)

    @model_validator(mode="after")
    def validate_antithetic_paths(self) -> "MonteCarloSettings":
        if self.antithetic and self.paths % 2:
            raise ValueError("paths must be even when antithetic sampling is enabled")
        return self


class BinomialSettings(BaseModel):
    steps: int = Field(default=800, ge=50, le=4_000)


class BarrierSettings(BaseModel):
    direction: Literal["down", "up"] = "down"
    style: Literal["in", "out"] = "out"
    level: float = Field(default=90, gt=0, le=1_000_000)
    monitoring: Literal["continuous"] = "continuous"
    rebate: Literal[0] = 0


class SolveRequest(BaseModel):
    option_family: Literal["european", "american", "barrier"]
    option_side: Literal["call", "put"]
    methods: list[SolverMethod] = Field(min_length=1, max_length=3)
    market: MarketParameters
    surface: SurfaceParameters
    finite_difference: FiniteDifferenceSettings = Field(default_factory=FiniteDifferenceSettings)
    monte_carlo: MonteCarloSettings = Field(default_factory=MonteCarloSettings)
    binomial: BinomialSettings = Field(default_factory=BinomialSettings)
    barrier: BarrierSettings = Field(default_factory=BarrierSettings)

    @model_validator(mode="after")
    def validate_work(self) -> "SolveRequest":
        if len(set(self.methods)) != len(self.methods):
            raise ValueError("methods must not contain duplicates")
        allowed = (
            {"binomial", "finite_difference", "monte_carlo"}
            if self.option_family == "american"
            else {"closed_form", "finite_difference", "monte_carlo"}
        )
        if not set(self.methods).issubset(allowed):
            raise ValueError(f"methods are not compatible with {self.option_family} options")
        if "finite_difference" in self.methods:
            required_domain = max(self.market.spot, self.surface.spot_max)
            if self.finite_difference.domain_max < required_domain:
                raise ValueError("finite_difference.domain_max must cover spot and surface maximum")
        if self.estimated_operations() > 120_000_000:
            raise ValueError("requested work exceeds the 120,000,000 operation budget")
        if self.option_family == "american" and "monte_carlo" in self.methods:
            if self.monte_carlo.paths * self.monte_carlo.steps > 20_000_000:
                raise ValueError("American Monte Carlo path grid exceeds the 20,000,000 node memory budget")
        if self.option_family == "barrier" and self.barrier.direction == "down":
            if "finite_difference" in self.methods and self.finite_difference.domain_max <= self.barrier.level:
                raise ValueError("finite_difference.domain_max must exceed a down barrier")
        return self

    def estimated_operations(self) -> int:
        operations = self.surface.spot_steps * self.surface.time_steps
        if "binomial" in self.methods:
            surface_tree_steps = min(self.binomial.steps, 100)
            operations += self.binomial.steps**2 // 2
            operations += self.surface.time_steps * self.surface.spot_steps * surface_tree_steps**2 // 2
        if "finite_difference" in self.methods:
            operations += self.finite_difference.spot_steps * self.finite_difference.time_steps
        if "monte_carlo" in self.methods:
            operations += self.monte_carlo.paths * (
                self.monte_carlo.steps + self.surface.spot_steps * self.surface.time_steps
            )
        return operations


class SurfaceResult(BaseModel):
    spots: list[float]
    times_to_maturity: list[float]
    prices: list[list[float]]
    standard_errors: list[list[float]] | None = None
    confidence_lower: list[list[float]] | None = None
    confidence_upper: list[list[float]] | None = None


class ExerciseBoundary(BaseModel):
    times_to_maturity: list[float]
    spots: list[float | None]


class ConfidenceInterval(BaseModel):
    lower: float
    upper: float
    level: float


class ConvergencePoint(BaseModel):
    paths: int
    price: float
    standard_error: float
    lower: float
    upper: float


class SamplePath(BaseModel):
    times: list[float]
    spots: list[float]


class MethodResult(BaseModel):
    method: SolverMethod
    price: float
    runtime_ms: float
    surface: SurfaceResult
    standard_error: float | None = None
    confidence_interval: ConfidenceInterval | None = None
    reference_error: float | None = None
    convergence: list[ConvergencePoint] = Field(default_factory=list)
    sample_paths: list[SamplePath] = Field(default_factory=list)
    exercise_boundary: ExerciseBoundary | None = None
    diagnostics: dict[str, float | int | str | bool] = Field(default_factory=dict)
    warnings: list[str] = Field(default_factory=list)


class SolveResponse(BaseModel):
    results: list[MethodResult]
    estimated_operations: int
    warnings: list[str] = Field(default_factory=list)
