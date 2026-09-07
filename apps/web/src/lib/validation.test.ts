import { describe, expect, it } from "vitest";
import { estimateOperations, validateParameters } from "./validation";
import type { SolverParameters } from "../types";

const valid: SolverParameters = {
  optionFamily: "european",
  optionSide: "call",
  methods: ["closed_form", "finite_difference", "monte_carlo"],
  spot: 100,
  strike: 100,
  maturity: 1,
  volatility: 0.2,
  rate: 0.05,
  dividend: 0,
  spotMin: 0,
  spotMax: 300,
  spotSteps: 61,
  timeSteps: 51,
  finiteDifferenceSpotSteps: 241,
  finiteDifferenceTimeSteps: 240,
  finiteDifferenceDomainMax: 300,
  monteCarloPaths: 20_000,
  monteCarloSteps: 64,
  monteCarloSeed: 1_729,
  monteCarloAntithetic: true,
  confidenceLevel: 0.95,
  binomialSteps: 800,
  barrierDirection: "down",
  barrierStyle: "out",
  barrierLevel: 90,
  asianAverageType: "arithmetic",
  asianObservations: 12,
  asianAverageState: 100,
};

describe("validateParameters", () => {
  it("accepts the default problem", () => {
    expect(validateParameters(valid)).toBeNull();
  });

  it("rejects an inverted surface domain", () => {
    expect(validateParameters({ ...valid, spotMin: 300 })).toMatch(/maximum spot/i);
  });

  it("rejects an unbounded grid", () => {
    expect(validateParameters({ ...valid, spotSteps: 1000 })).toMatch(/between 20 and 160/i);
  });

  it("requires an even path count with antithetic sampling", () => {
    expect(validateParameters({ ...valid, monteCarloPaths: 19_999 })).toMatch(/even/i);
  });

  it("rejects work above the server budget", () => {
    expect(validateParameters({ ...valid, spotSteps: 160, timeSteps: 160, monteCarloPaths: 200_000 })).toMatch(/operation budget/i);
  });

  it("matches the documented default work estimate", () => {
    expect(estimateOperations(valid)).toBe(63_560_951);
  });

  it("enforces American method compatibility", () => {
    const american = { ...valid, optionFamily: "american" as const, methods: ["closed_form"] as const };
    expect(validateParameters({ ...american, methods: [...american.methods] })).toMatch(/not compatible/i);
  });

  it("accepts American Phase 3 methods", () => {
    expect(validateParameters({
      ...valid,
      optionFamily: "american",
      methods: ["binomial", "finite_difference", "monte_carlo"],
    })).toBeNull();
  });

  it("accepts Barrier Phase 4 methods", () => {
    expect(validateParameters({ ...valid, optionFamily: "barrier" })).toBeNull();
  });

  it("rejects a non-positive barrier", () => {
    expect(validateParameters({ ...valid, optionFamily: "barrier", barrierLevel: 0 })).toMatch(/barrier level/i);
  });

  it("rejects a barrier Monte Carlo grid above the memory budget", () => {
    expect(validateParameters({
      ...valid,
      optionFamily: "barrier",
      methods: ["monte_carlo"],
      monteCarloSteps: 512,
    })).toMatch(/4,000,000 node memory budget/i);
  });

  it("accounts for American reference and PSOR work", () => {
    expect(estimateOperations({
      ...valid,
      optionFamily: "american",
      methods: ["finite_difference"],
    })).toBeGreaterThan(valid.finiteDifferenceSpotSteps * valid.finiteDifferenceTimeSteps);
  });

  it("accepts arithmetic Asian methods", () => {
    expect(validateParameters({ ...valid, optionFamily: "asian", methods: ["finite_difference", "monte_carlo"] })).toBeNull();
  });

  it("limits Asian analytical pricing to geometric averages", () => {
    expect(validateParameters({ ...valid, optionFamily: "asian", methods: ["closed_form"] })).toMatch(/geometric Asian/i);
  });

  it("validates Asian observation count", () => {
    expect(validateParameters({ ...valid, optionFamily: "asian", methods: ["monte_carlo"], asianObservations: 1 })).toMatch(/between 2 and 60/i);
  });
});
