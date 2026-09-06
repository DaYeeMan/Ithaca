import type { Capabilities, SolveResponse, SolverParameters } from "../types";

const API_BASE_URL = import.meta.env.VITE_SOLVER_API_URL ?? import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export async function getCapabilities(signal?: AbortSignal): Promise<Capabilities> {
  const response = await fetch(`${API_BASE_URL}/v1/capabilities`, { signal });
  if (!response.ok) throw new Error(`Capabilities returned HTTP ${response.status}`);
  return response.json() as Promise<Capabilities>;
}

export async function solveOption(
  parameters: SolverParameters,
  signal?: AbortSignal,
): Promise<SolveResponse> {
  const response = await fetch(`${API_BASE_URL}/v1/solve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify({
      option_family: parameters.optionFamily,
      option_side: parameters.optionSide,
      methods: parameters.methods,
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
      finite_difference: {
        spot_steps: parameters.finiteDifferenceSpotSteps,
        time_steps: parameters.finiteDifferenceTimeSteps,
        domain_max: parameters.finiteDifferenceDomainMax,
      },
      monte_carlo: {
        paths: parameters.monteCarloPaths,
        steps: parameters.monteCarloSteps,
        seed: parameters.monteCarloSeed,
        antithetic: parameters.monteCarloAntithetic,
        confidence_level: parameters.confidenceLevel,
      },
      binomial: { steps: parameters.binomialSteps },
      barrier: {
        direction: parameters.barrierDirection,
        style: parameters.barrierStyle,
        level: parameters.barrierLevel,
        monitoring: "continuous",
        rebate: 0,
      },
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Solver returned HTTP ${response.status}`);
  }

  return response.json() as Promise<SolveResponse>;
}
