import type { SolverParameters } from "../types";

export function validateParameters(parameters: SolverParameters): string | null {
  const values = Object.values(parameters).filter((value): value is number => typeof value === "number");
  if (values.some((value) => !Number.isFinite(value))) return "Every parameter must be a finite number.";
  if (parameters.spot <= 0 || parameters.strike <= 0) return "Spot and strike must be greater than zero.";
  if (parameters.maturity <= 0 || parameters.maturity > 50) return "Maturity must be between 0 and 50 years.";
  if (parameters.volatility <= 0 || parameters.volatility > 5) return "Volatility must be between 0% and 500%.";
  if (parameters.spotMin < 0 || parameters.spotMax <= parameters.spotMin) return "Surface maximum spot must exceed minimum spot.";
  if (parameters.spotSteps < 20 || parameters.spotSteps > 160 || parameters.timeSteps < 20 || parameters.timeSteps > 160) {
    return "Surface grids must contain between 20 and 160 points per axis.";
  }
  return null;
}

