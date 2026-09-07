import { CircleCheck, Timer } from "lucide-react";
import type { SolveResponse, SolverMethod } from "../types";

const labels: Record<SolverMethod, string> = {
  closed_form: "Closed form",
  binomial: "Binomial tree",
  finite_difference: "Finite difference",
  monte_carlo: "Monte Carlo",
};

function formatError(value: number | null | undefined): string {
  if (value == null) return "—";
  if (value === 0) return "Exact";
  return value < 0.001 ? value.toExponential(2) : value.toFixed(4);
}

export function ResultsStrip({
  response,
  activeMethod,
  status,
}: {
  response: SolveResponse | null;
  activeMethod: SolverMethod;
  status: "idle" | "solving" | "error";
}) {
  const result = response?.results.find((candidate) => candidate.method === activeMethod) ?? response?.results[0] ?? null;
  const interval = result?.confidence_interval;
  const resultLabel = result?.diagnostics.scheme === "augmented-state CRR lattice"
    ? "Augmented state"
    : result?.diagnostics.solution === "discrete geometric-average analytical"
      ? "Geometric analytical"
      : result ? labels[result.method] : "Results";

  return (
    <section className="results-strip" aria-label="Results" aria-live="polite" aria-atomic="true">
      <div className="results-heading">{resultLabel}</div>
      <div className="metric primary-metric">
        <span>Price</span>
        <strong>{result ? result.price.toFixed(4) : "—"}</strong>
      </div>
      <div className="metric">
        <span>Std. error</span>
        <strong>{result?.standard_error != null ? result.standard_error.toFixed(4) : "—"}</strong>
      </div>
      <div className="metric">
        <span>{interval ? `${(interval.level * 100).toFixed(0)}% CI` : "Confidence"}</span>
        <strong>{interval ? `${interval.lower.toFixed(3)}–${interval.upper.toFixed(3)}` : "Deterministic"}</strong>
      </div>
      <div className="metric">
        <span>Reference error</span>
        <strong className={result?.reference_error === 0 ? "success-value" : ""}>{formatError(result?.reference_error)}</strong>
      </div>
      <div className="metric">
        <span>Runtime</span>
        <strong>{result ? `${result.runtime_ms.toFixed(1)} ms` : "—"}</strong>
      </div>
      <div className={`status-block ${status}`}>
        {status === "solving" ? <span className="status-spinner" /> : status === "error" ? <span className="status-error">!</span> : <CircleCheck size={18} />}
        <span>{status === "solving" ? "Solving…" : status === "error" ? "Solver unavailable" : result ? "Solved" : "Ready"}</span>
        {status === "solving" ? <Timer size={16} /> : null}
      </div>
    </section>
  );
}
