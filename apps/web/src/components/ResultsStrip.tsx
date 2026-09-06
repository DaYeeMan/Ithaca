import { CircleCheck, Timer } from "lucide-react";
import type { SolveResult } from "../types";

export function ResultsStrip({ result, status }: { result: SolveResult | null; status: "idle" | "solving" | "error" }) {
  return (
    <section className="results-strip" aria-label="Results">
      <div className="results-heading">Results</div>
      <div className="metric primary-metric">
        <span>Price</span>
        <strong>{result ? result.price.toFixed(4) : "—"}</strong>
      </div>
      <div className="metric">
        <span>Std. error</span>
        <strong>—</strong>
      </div>
      <div className="metric">
        <span>95% CI</span>
        <strong>Closed form</strong>
      </div>
      <div className="metric">
        <span>Reference error</span>
        <strong className="success-value">Exact</strong>
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

