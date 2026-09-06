import { describe, expect, it } from "vitest";
import { estimateOperations, validateParameters } from "./validation";
import type { SolverParameters } from "../types";

const valid: SolverParameters = {
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
});
