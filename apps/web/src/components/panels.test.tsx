// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { SolverParameters } from "../types";
import { EquationPanel } from "./EquationPanel";
import { ProblemPanel } from "./ProblemPanel";

const parameters: SolverParameters = {
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

describe("workbench panels", () => {
  it("collapses a left-sidebar control section", () => {
    render(<ProblemPanel parameters={parameters} onChange={vi.fn()} onFamilyChange={vi.fn()} onAsianAverageTypeChange={vi.fn()} />);

    const disclosure = screen.getByText("Contract").closest("details");
    expect(disclosure).toHaveAttribute("open");
    expect(screen.getByLabelText("Option family")).toBeVisible();

    fireEvent.click(screen.getByText("Contract").closest("summary")!);

    expect(disclosure).not.toHaveAttribute("open");
    expect(screen.getByLabelText("Option family")).not.toBeVisible();
  });

  it("shows Cox–Ross–Rubinstein for an American binomial result", () => {
    const equation = render(<EquationPanel
      family="american"
      side="put"
      method="binomial"
      barrierDirection="down"
      barrierStyle="out"
      barrierLevel={90}
      asianAverageType="arithmetic"
      asianObservations={12}
      asianAverageState={100}
    />);

    const panel = within(equation.container);
    expect(panel.getByRole("heading", { level: 2 })).toHaveTextContent("Cox–Ross–Rubinstein");
    expect(panel.queryByText("Black–Scholes PDE")).not.toBeInTheDocument();
    expect(panel.queryByRole("link", { name: "Disclaimer" })).not.toBeInTheDocument();
    expect(panel.queryByRole("link", { name: "Method reference" })).not.toBeInTheDocument();
    const reference = panel.getByText("Method reference").closest("details");
    expect(reference).not.toHaveAttribute("open");
    fireEvent.click(panel.getByText("Method reference"));
    expect(reference).toHaveAttribute("open");
    expect(panel.getByRole("link", { name: /Option pricing: A simplified approach/ })).toBeVisible();
    expect(panel.getByText("Implementation")).toBeVisible();
  });
});
