export type OptionSide = "call" | "put";
export type OptionFamily = "european" | "american" | "barrier" | "asian";
export type SolverMethod = "closed_form" | "binomial" | "finite_difference" | "monte_carlo";

export interface SolverParameters {
  optionFamily: OptionFamily;
  optionSide: OptionSide;
  methods: SolverMethod[];
  spot: number;
  strike: number;
  maturity: number;
  volatility: number;
  rate: number;
  dividend: number;
  spotMin: number;
  spotMax: number;
  spotSteps: number;
  timeSteps: number;
  finiteDifferenceSpotSteps: number;
  finiteDifferenceTimeSteps: number;
  finiteDifferenceDomainMax: number;
  monteCarloPaths: number;
  monteCarloSteps: number;
  monteCarloSeed: number;
  monteCarloAntithetic: boolean;
  confidenceLevel: number;
  binomialSteps: number;
  barrierDirection: "down" | "up";
  barrierStyle: "in" | "out";
  barrierLevel: number;
  asianAverageType: "arithmetic" | "geometric";
  asianObservations: number;
  asianAverageState: number;
}

export interface SurfaceResult {
  spots: number[];
  times_to_maturity: number[];
  prices: number[][];
  standard_errors?: number[][] | null;
  confidence_lower?: number[][] | null;
  confidence_upper?: number[][] | null;
}

export interface ConfidenceInterval {
  lower: number;
  upper: number;
  level: number;
}

export interface ConvergencePoint {
  paths: number;
  price: number;
  standard_error: number;
  lower: number;
  upper: number;
}

export interface SamplePath {
  times: number[];
  spots: number[];
}

export interface MethodResult {
  method: SolverMethod;
  price: number;
  runtime_ms: number;
  surface: SurfaceResult;
  standard_error?: number | null;
  confidence_interval?: ConfidenceInterval | null;
  reference_error?: number | null;
  convergence: ConvergencePoint[];
  sample_paths: SamplePath[];
  exercise_boundary?: { times_to_maturity: number[]; spots: Array<number | null> } | null;
  diagnostics: Record<string, number | string | boolean>;
  warnings: string[];
}

export interface SolveResponse {
  results: MethodResult[];
  estimated_operations: number;
  warnings: string[];
}

export interface Capabilities {
  option_families: Array<{ id: string; status: "available" | "planned"; methods: SolverMethod[] }>;
  methods: Array<{ id: SolverMethod; status: "available" | "planned" }>;
  limits: Record<string, number | { minimum: number; maximum: number }>;
  execution: Record<string, string>;
}
