import type { SolverParameters } from "../types";

export const MAX_ESTIMATED_OPERATIONS = 120_000_000;

export function estimateOperations(parameters: SolverParameters): number {
  let operations = parameters.spotSteps * parameters.timeSteps;
  const asianLatticeSteps = parameters.asianObservations * Math.max(
    4,
    Math.min(12, Math.ceil(parameters.finiteDifferenceTimeSteps / parameters.asianObservations)),
  );
  if (parameters.optionFamily === "american") {
    operations += Math.floor(parameters.binomialSteps ** 2 / 2);
  } else if (parameters.optionFamily === "asian" && parameters.asianAverageType === "arithmetic") {
    operations += Math.floor(asianLatticeSteps ** 2 * 321 / 2);
  }
  if (parameters.methods.includes("binomial")) {
    const surfaceTreeSteps = Math.min(parameters.binomialSteps, 100);
    operations += Math.floor(parameters.binomialSteps ** 2 / 2)
      + Math.floor(parameters.timeSteps * parameters.spotSteps * surfaceTreeSteps ** 2 / 2);
  }
  if (parameters.methods.includes("finite_difference")) {
    operations += parameters.optionFamily === "asian"
      ? Math.floor(asianLatticeSteps ** 2 * 321 / 2)
      : parameters.finiteDifferenceSpotSteps * parameters.finiteDifferenceTimeSteps
        * (parameters.optionFamily === "american" ? 250 : 1);
  }
  if (parameters.methods.includes("monte_carlo")) {
    const pathSteps = parameters.optionFamily === "asian" ? parameters.asianObservations : parameters.monteCarloSteps;
    operations += parameters.monteCarloPaths * (
      pathSteps + parameters.spotSteps * parameters.timeSteps
    );
  }
  return operations;
}

export function validateParameters(parameters: SolverParameters): string | null {
  const values = Object.values(parameters).filter((value): value is number => typeof value === "number");
  if (values.some((value) => !Number.isFinite(value))) return "Every parameter must be a finite number.";
  if (parameters.methods.length === 0) return "Select at least one solution method.";
  if (new Set(parameters.methods).size !== parameters.methods.length) return "Each solution method may be selected once.";
  const compatible = parameters.optionFamily === "american"
    ? new Set(["binomial", "finite_difference", "monte_carlo"])
    : new Set(["closed_form", "finite_difference", "monte_carlo"]);
  if (parameters.methods.some((method) => !compatible.has(method))) return "Selected method is not compatible with this option family.";
  if (parameters.optionFamily === "asian" && parameters.asianAverageType === "arithmetic" && parameters.methods.includes("closed_form")) {
    return "Closed form is only compatible with geometric Asian averaging.";
  }
  if (parameters.spot <= 0 || parameters.strike <= 0) return "Spot and strike must be greater than zero.";
  if (parameters.optionFamily === "barrier" && (parameters.barrierLevel <= 0 || parameters.barrierLevel > 1_000_000)) {
    return "Barrier level must be greater than zero and at most 1,000,000.";
  }
  if (parameters.optionFamily === "asian") {
    if (!Number.isInteger(parameters.asianObservations) || parameters.asianObservations < 2 || parameters.asianObservations > 60) {
      return "Asian observations must be an integer between 2 and 60.";
    }
    if (parameters.asianAverageState <= 0 || parameters.asianAverageState > 1_000_000) {
      return "Asian average state must be greater than zero and at most 1,000,000.";
    }
  }
  if (parameters.maturity <= 0 || parameters.maturity > 50) return "Maturity must be between 0 and 50 years.";
  if (parameters.volatility <= 0 || parameters.volatility > 5) return "Volatility must be between 0% and 500%.";
  if (parameters.rate < -1 || parameters.rate > 1 || parameters.dividend < -1 || parameters.dividend > 1) {
    return "Rate and dividend yield must be between -100% and 100%.";
  }
  if (parameters.spotMin < 0 || parameters.spotMax <= parameters.spotMin) return "Surface maximum spot must exceed minimum spot.";
  if (!Number.isInteger(parameters.spotSteps) || !Number.isInteger(parameters.timeSteps)
    || parameters.spotSteps < 20 || parameters.spotSteps > 160
    || parameters.timeSteps < 20 || parameters.timeSteps > 160) {
    return "Surface grids must contain between 20 and 160 integer points per axis.";
  }
  if (parameters.methods.includes("finite_difference") && parameters.optionFamily !== "asian") {
    if (!Number.isInteger(parameters.finiteDifferenceSpotSteps)
      || parameters.finiteDifferenceSpotSteps < 51 || parameters.finiteDifferenceSpotSteps > 801
      || !Number.isInteger(parameters.finiteDifferenceTimeSteps)
      || parameters.finiteDifferenceTimeSteps < 20 || parameters.finiteDifferenceTimeSteps > 2000) {
      return "Finite-difference grids exceed supported limits.";
    }
    if (parameters.finiteDifferenceDomainMax < Math.max(parameters.spot, parameters.spotMax)) {
      return "Finite-difference domain must cover spot and surface maximum.";
    }
    if (parameters.optionFamily === "barrier" && parameters.barrierDirection === "down"
      && parameters.finiteDifferenceDomainMax <= parameters.barrierLevel) {
      return "Finite-difference domain must exceed a down barrier.";
    }
  }
  if (parameters.methods.includes("monte_carlo")) {
    if (!Number.isInteger(parameters.monteCarloPaths) || parameters.monteCarloPaths < 1000 || parameters.monteCarloPaths > 200000) {
      return "Monte Carlo paths must be an integer between 1,000 and 200,000.";
    }
    if (parameters.monteCarloAntithetic && parameters.monteCarloPaths % 2 !== 0) {
      return "Monte Carlo paths must be even with antithetic sampling.";
    }
    if (!Number.isInteger(parameters.monteCarloSteps) || parameters.monteCarloSteps < 1 || parameters.monteCarloSteps > 512) {
      return "Monte Carlo steps must be an integer between 1 and 512.";
    }
    if (parameters.monteCarloSeed < 0 || parameters.monteCarloSeed > 2_147_483_647 || !Number.isInteger(parameters.monteCarloSeed)) {
      return "Monte Carlo seed must be an integer between 0 and 2,147,483,647.";
    }
    if (parameters.confidenceLevel < 0.8 || parameters.confidenceLevel > 0.999) {
      return "Confidence level must be between 80% and 99.9%.";
    }
    if (parameters.optionFamily === "american" && parameters.monteCarloPaths * parameters.monteCarloSteps > 20_000_000) {
      return "American Monte Carlo path grid exceeds the 20,000,000 node memory budget.";
    }
    if (parameters.optionFamily === "barrier" && parameters.monteCarloPaths * parameters.monteCarloSteps > 4_000_000) {
      return "Barrier Monte Carlo path grid exceeds the 4,000,000 node memory budget.";
    }
  }
  if (parameters.methods.includes("binomial") && (
    !Number.isInteger(parameters.binomialSteps) || parameters.binomialSteps < 50 || parameters.binomialSteps > 4000
  )) return "Binomial steps must be an integer between 50 and 4,000.";
  if (estimateOperations(parameters) > MAX_ESTIMATED_OPERATIONS) {
    return "Requested work exceeds the 120,000,000 operation budget.";
  }
  return null;
}
