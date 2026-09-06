from typing import Literal

from pydantic import BaseModel, Field, model_validator


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


class SolveRequest(BaseModel):
    option_family: Literal["european"]
    option_side: Literal["call", "put"]
    method: Literal["closed_form"]
    market: MarketParameters
    surface: SurfaceParameters


class SurfaceResult(BaseModel):
    spots: list[float]
    times_to_maturity: list[float]
    prices: list[list[float]]


class SolveResult(BaseModel):
    method: Literal["closed_form"] = "closed_form"
    price: float
    runtime_ms: float
    surface: SurfaceResult
    warnings: list[str] = Field(default_factory=list)
