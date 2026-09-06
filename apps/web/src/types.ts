export type OptionSide = "call" | "put";

export interface SolverParameters {
  optionSide: OptionSide;
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
}

export interface SurfaceResult {
  spots: number[];
  times_to_maturity: number[];
  prices: number[][];
}

export interface SolveResult {
  method: "closed_form";
  price: number;
  runtime_ms: number;
  surface: SurfaceResult;
  warnings: string[];
}

