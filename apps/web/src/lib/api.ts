import type { SolveResult, SolverParameters } from "../types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export async function solveEuropean(
  parameters: SolverParameters,
  signal?: AbortSignal,
): Promise<SolveResult> {
  const response = await fetch(`${API_BASE_URL}/v1/solve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify({
      option_family: "european",
      option_side: parameters.optionSide,
      method: "closed_form",
      market: {
        spot: parameters.spot,
        strike: parameters.strike,
        maturity: parameters.maturity,
        volatility: parameters.volatility,
        rate: parameters.rate,
        dividend: parameters.dividend,
      },
      surface: {
        spot_min: parameters.spotMin,
        spot_max: parameters.spotMax,
        spot_steps: parameters.spotSteps,
        time_steps: parameters.timeSteps,
      },
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Solver returned HTTP ${response.status}`);
  }

  return response.json() as Promise<SolveResult>;
}

