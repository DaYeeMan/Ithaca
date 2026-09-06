import { lazy, Suspense, useCallback, useEffect, useRef, useState, useTransition } from "react";
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
import { getCapabilities, solveOption } from "./lib/api";
import { validateParameters } from "./lib/validation";
import type { Capabilities, OptionFamily, SolveResponse, SolverMethod, SolverParameters } from "./types";

const ChartPanel = lazy(() => import("./components/ChartPanel").then((module) => ({ default: module.ChartPanel })));

const FAMILY_METHODS: Record<OptionFamily, SolverMethod[]> = {
  european: ["closed_form", "finite_difference", "monte_carlo"],
  american: ["binomial", "finite_difference", "monte_carlo"],
};

const DEFAULT_PARAMETERS: SolverParameters = {
  optionFamily: "european",
  optionSide: "call",
  methods: FAMILY_METHODS.european,
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
};

type Status = "idle" | "solving" | "error";
type MobilePanel = "problem" | "equation" | "results" | null;

export default function App() {
  const [parameters, setParameters] = useState<SolverParameters>(DEFAULT_PARAMETERS);
  const [response, setResponse] = useState<SolveResponse | null>(null);
  const [capabilities, setCapabilities] = useState<Capabilities | null>(null);
  const [activeMethod, setActiveMethod] = useState<SolverMethod>("closed_form");
  const [status, setStatus] = useState<Status>("solving");
  const [message, setMessage] = useState<string | null>(null);
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>(null);
  const activeRequest = useRef<AbortController | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    const controller = new AbortController();
    activeRequest.current = controller;
    getCapabilities(controller.signal).then(setCapabilities).catch(() => undefined);
    solveOption(DEFAULT_PARAMETERS, controller.signal)
      .then((nextResponse) => {
        startTransition(() => setResponse(nextResponse));
        setStatus("idle");
        setMessage(nextResponse.warnings[0] ?? null);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setStatus("error");
        setMessage(error instanceof Error ? "Solver API is unavailable. Start it on port 8000, then press Solve." : "Solver request failed.");
      })
      .finally(() => {
        if (activeRequest.current === controller) activeRequest.current = null;
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

  const toggleMethod = useCallback((method: SolverMethod) => {
    const selected = parameters.methods.includes(method);
    if (selected && parameters.methods.length === 1) {
      setMessage("Select at least one solution method.");
      return;
    }
    const methods = selected
      ? parameters.methods.filter((candidate) => candidate !== method)
      : FAMILY_METHODS[parameters.optionFamily].filter((candidate) => parameters.methods.includes(candidate) || candidate === method);
    setParameters((current) => ({ ...current, methods }));
    if (!methods.includes(activeMethod)) setActiveMethod(methods[0]);
    setMessage(null);
  }, [activeMethod, parameters.methods, parameters.optionFamily]);

  const changeFamily = useCallback((family: OptionFamily) => {
    const methods = FAMILY_METHODS[family];
    setParameters((current) => ({
      ...current,
      optionFamily: family,
      methods,
      finiteDifferenceDomainMax: family === "american" ? Math.max(current.spotMax, current.strike * 3) : Math.max(300, current.spotMax),
    }));
    setActiveMethod(methods[0]);
    setMessage(null);
  }, []);

  const cancelSolve = useCallback(() => {
    activeRequest.current?.abort();
    activeRequest.current = null;
    setStatus("idle");
    setMessage("Calculation cancelled. Last successful result remains visible.");
  }, []);

  const runSolve = useCallback(async () => {
    const validationMessage = validateParameters(parameters);
    if (validationMessage) {
      setMessage(validationMessage);
      return;
    }

    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    setStatus("solving");
    setMessage(null);
    try {
      const nextResponse = await solveOption(parameters, controller.signal);
      startTransition(() => setResponse(nextResponse));
      setStatus("idle");
      setMessage(nextResponse.warnings[0] ?? null);
      if (!nextResponse.results.some((result) => result.method === activeMethod)) {
        setActiveMethod(nextResponse.results[0].method);
      }
    } catch (error) {
      if (controller.signal.aborted) return;
      setStatus("error");
      setMessage(error instanceof Error && error.message.includes("operation budget")
        ? "Requested work exceeds the server operation budget."
        : "Solver request failed. Last successful result remains visible.");
    } finally {
      if (activeRequest.current === controller) activeRequest.current = null;
    }
  }, [activeMethod, parameters]);

  const reset = useCallback(() => {
    setParameters(DEFAULT_PARAMETERS);
    setActiveMethod("closed_form");
    setMessage(null);
  }, []);

  const availableMethods = capabilities?.option_families.find((family) => family.id === parameters.optionFamily)?.methods
    ?? FAMILY_METHODS[parameters.optionFamily];

  return (
    <main className="app-shell">
      <header className="topbar">
        <button className="icon-button menu-button" aria-label="Open navigation"><Menu /></button>
        <div className="wordmark">Ithaca</div>
        <div className="topbar-actions">
          <button className="secondary-button" type="button" onClick={reset}><RotateCcw size={17} />Reset</button>
          <button
            className={`solve-button ${status === "solving" ? "cancel" : ""}`}
            type="button"
            onClick={status === "solving" ? cancelSolve : runSolve}
          >
            {status === "solving" ? <X size={18} /> : <Play size={18} fill="currentColor" />}
            {status === "solving" ? "Cancel" : "Solve"}
          </button>
        </div>
      </header>

      <aside className="problem-panel desktop-rail">
        <ProblemPanel parameters={parameters} availableMethods={availableMethods} onChange={changeParameter} onFamilyChange={changeFamily} onToggleMethod={toggleMethod} />
      </aside>

      <section className={`chart-panel${message ? " has-message" : ""}`}>
        <Suspense fallback={<div className="chart-loading"><span className="status-spinner" />Loading visualization…</div>}>
          <ChartPanel response={response} activeMethod={activeMethod} onActiveMethodChange={setActiveMethod} loading={status === "solving"} />
        </Suspense>
        {message ? <div className="app-message" role="alert">{message}</div> : null}
      </section>

      <aside className="equation-panel desktop-rail">
        <EquationPanel family={parameters.optionFamily} side={parameters.optionSide} method={activeMethod} />
      </aside>

      <ResultsStrip response={response} activeMethod={activeMethod} status={status} />

      <footer className="status-footer">
        <span>Model: Black–Scholes</span><span>Currency: USD</span><span>Phase 3 · American options</span>
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
          {mobilePanel === "problem" ? <ProblemPanel parameters={parameters} availableMethods={availableMethods} onChange={changeParameter} onFamilyChange={changeFamily} onToggleMethod={toggleMethod} /> : null}
          {mobilePanel === "equation" ? <EquationPanel family={parameters.optionFamily} side={parameters.optionSide} method={activeMethod} /> : null}
          {mobilePanel === "results" ? <ResultsStrip response={response} activeMethod={activeMethod} status={status} /> : null}
        </section>
      ) : null}
    </main>
  );
}
