import { lazy, Suspense, useCallback, useEffect, useState, useTransition } from "react";
import {
  BarChart3,
  FunctionSquare,
  Menu,
  Play,
  RotateCcw,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { EquationPanel } from "./components/EquationPanel";
import { ProblemPanel } from "./components/ProblemPanel";
import { ResultsStrip } from "./components/ResultsStrip";
import { solveEuropean } from "./lib/api";
import { validateParameters } from "./lib/validation";
import type { SolveResult, SolverParameters } from "./types";

const ChartPanel = lazy(() => import("./components/ChartPanel").then((module) => ({ default: module.ChartPanel })));

const DEFAULT_PARAMETERS: SolverParameters = {
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

type Status = "idle" | "solving" | "error";
type MobilePanel = "problem" | "equation" | "results" | null;

export default function App() {
  const [parameters, setParameters] = useState<SolverParameters>(DEFAULT_PARAMETERS);
  const [result, setResult] = useState<SolveResult | null>(null);
  const [status, setStatus] = useState<Status>("solving");
  const [message, setMessage] = useState<string | null>(null);
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>("problem");
  const [, startTransition] = useTransition();

  useEffect(() => {
    const controller = new AbortController();
    solveEuropean(DEFAULT_PARAMETERS, controller.signal)
      .then((nextResult) => {
        startTransition(() => setResult(nextResult));
        setStatus("idle");
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setStatus("error");
        setMessage(error instanceof Error ? "Solver API is unavailable. Start it on port 8000, then press Solve." : "Solver request failed.");
      });
    return () => controller.abort();
  }, []);

  const changeParameter = useCallback(<Key extends keyof SolverParameters>(
    key: Key,
    value: SolverParameters[Key],
  ) => {
    setParameters((current) => ({ ...current, [key]: value }));
    setMessage(null);
  }, []);

  const runSolve = useCallback(async () => {
    const validationMessage = validateParameters(parameters);
    if (validationMessage) {
      setMessage(validationMessage);
      return;
    }

    setStatus("solving");
    setMessage(null);
    try {
      const nextResult = await solveEuropean(parameters);
      startTransition(() => setResult(nextResult));
      setStatus("idle");
    } catch {
      setStatus("error");
      setMessage("Solver API is unavailable. The last successful result remains visible.");
    }
  }, [parameters]);

  const reset = useCallback(() => {
    setParameters(DEFAULT_PARAMETERS);
    setMessage(null);
  }, []);

  return (
    <main className="app-shell">
      <header className="topbar">
        <button className="icon-button menu-button" aria-label="Open navigation"><Menu /></button>
        <div className="wordmark">Ithaca</div>
        <select
          className="preset-select"
          aria-label="Preset"
          value={parameters.optionSide}
          onChange={(event) => changeParameter("optionSide", event.currentTarget.value as "call" | "put")}
        >
          <option value="call">European Call</option>
          <option value="put">European Put</option>
        </select>
        <div className="topbar-actions">
          <button className="secondary-button" type="button" onClick={reset}><RotateCcw size={17} />Reset</button>
          <button className="solve-button" type="button" onClick={runSolve} disabled={status === "solving"}><Play size={18} fill="currentColor" />Solve</button>
        </div>
      </header>

      <aside className="problem-panel desktop-rail">
        <ProblemPanel parameters={parameters} onChange={changeParameter} />
      </aside>

      <section className="chart-panel">
        <Suspense fallback={<div className="chart-loading"><span className="status-spinner" />Loading visualization…</div>}>
          <ChartPanel result={result} loading={status === "solving"} />
        </Suspense>
        {message ? <div className="app-message" role="alert">{message}</div> : null}
      </section>

      <aside className="equation-panel desktop-rail">
        <EquationPanel side={parameters.optionSide} />
      </aside>

      <ResultsStrip result={result} status={status} />

      <footer className="status-footer">
        <span>Model: Black–Scholes</span><span>Currency: USD</span><span>Phase 1 · Closed form</span>
      </footer>

      <nav className="mobile-nav" aria-label="Workbench panels">
        <button className={mobilePanel === "problem" ? "active" : ""} onClick={() => setMobilePanel("problem")}><SlidersHorizontal /><span>Problem</span></button>
        <button className={mobilePanel === "equation" ? "active" : ""} onClick={() => setMobilePanel("equation")}><FunctionSquare /><span>Equation</span></button>
        <button className={mobilePanel === "results" ? "active" : ""} onClick={() => setMobilePanel("results")}><BarChart3 /><span>Results</span></button>
      </nav>

      {mobilePanel ? (
        <section className="mobile-sheet" aria-label={`${mobilePanel} panel`}>
          <div className="sheet-handle" />
          <button className="sheet-close" aria-label="Close panel" onClick={() => setMobilePanel(null)}><X /></button>
          {mobilePanel === "problem" ? <ProblemPanel parameters={parameters} onChange={changeParameter} /> : null}
          {mobilePanel === "equation" ? <EquationPanel side={parameters.optionSide} /> : null}
          {mobilePanel === "results" ? <ResultsStrip result={result} status={status} /> : null}
        </section>
      ) : null}
    </main>
  );
}

