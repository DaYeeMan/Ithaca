import { describe, expect, it } from "vitest";
import { validateParameters } from "./validation";
import type { SolverParameters } from "../types";

const valid: SolverParameters = {
  optionSide: "call",
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
});

