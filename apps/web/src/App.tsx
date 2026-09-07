import { lazy, Suspense, useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
  BarChart3,
  FunctionSquare,
  Play,
  RotateCcw,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { EquationPanel } from "./components/EquationPanel";
import { ProblemPanel } from "./components/ProblemPanel";
import { ResultsStrip } from "./components/ResultsStrip";
import { solveOption } from "./lib/api";
import { validateParameters } from "./lib/validation";
import type { OptionFamily, SolveResponse, SolverMethod, SolverParameters } from "./types";

const ChartPanel = lazy(() => import("./components/ChartPanel").then((module) => ({ default: module.ChartPanel })));

const FAMILY_METHODS: Record<OptionFamily, SolverMethod[]> = {
  european: ["closed_form", "finite_difference", "monte_carlo"],
  american: ["binomial", "finite_difference", "monte_carlo"],
  barrier: ["closed_form", "finite_difference", "monte_carlo"],
  asian: ["finite_difference", "monte_carlo"],
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
  barrierDirection: "down",
  barrierStyle: "out",
  barrierLevel: 90,
  asianAverageType: "arithmetic",
  asianObservations: 12,
  asianAverageState: 100,
};

type Status = "idle" | "solving" | "error";
type MobilePanel = "problem" | "equation" | "results" | null;

export default function App() {
  const [parameters, setParameters] = useState<SolverParameters>(DEFAULT_PARAMETERS);
  const [response, setResponse] = useState<SolveResponse | null>(null);
  const [activeMethod, setActiveMethod] = useState<SolverMethod>("closed_form");
  const [status, setStatus] = useState<Status>("solving");
  const [message, setMessage] = useState<string | null>(null);
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>(null);
  const activeRequest = useRef<AbortController | null>(null);
  const sheetRef = useRef<HTMLElement | null>(null);
  const panelTrigger = useRef<HTMLButtonElement | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    const controller = new AbortController();
    activeRequest.current = controller;
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

  const changeAsianAverageType = useCallback((averageType: "arithmetic" | "geometric") => {
    const methods: SolverMethod[] = averageType === "geometric"
      ? ["closed_form", "finite_difference", "monte_carlo"]
      : ["finite_difference", "monte_carlo"];
    setParameters((current) => ({ ...current, asianAverageType: averageType, methods }));
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
    activeRequest.current?.abort();
    window.location.reload();
  }, []);

  const openMobilePanel = useCallback((panel: Exclude<MobilePanel, null>, trigger: HTMLButtonElement) => {
    panelTrigger.current = trigger;
    setMobilePanel(panel);
  }, []);

  const closeMobilePanel = useCallback(() => {
    setMobilePanel(null);
    window.setTimeout(() => panelTrigger.current?.focus(), 0);
  }, []);

  useEffect(() => {
    if (!mobilePanel) return;
    const sheet = sheetRef.current;
    const focusable = () => Array.from(sheet?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])') ?? []);
    focusable()[0]?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMobilePanel();
      } else if (event.key === "Tab") {
        const items = focusable();
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [closeMobilePanel, mobilePanel]);

  return (
    <main className="app-shell">
      <a className="skip-link" href="#visualization">Skip to visualization</a>
      <header className="topbar">
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
        <ProblemPanel parameters={parameters} onChange={changeParameter} onFamilyChange={changeFamily} onAsianAverageTypeChange={changeAsianAverageType} />
      </aside>

      <section id="visualization" tabIndex={-1} className={`chart-panel${message ? " has-message" : ""}`}>
        <Suspense fallback={<div className="chart-loading"><span className="status-spinner" />Loading visualization…</div>}>
          <ChartPanel response={response} activeMethod={activeMethod} onActiveMethodChange={setActiveMethod} loading={status === "solving"} family={parameters.optionFamily} averageState={parameters.asianAverageState} onAverageStateChange={(value) => changeParameter("asianAverageState", value)} />
        </Suspense>
        {message ? <div className="app-message" role="alert">{message}</div> : null}
      </section>

      <aside className="equation-panel desktop-rail">
        <EquationPanel family={parameters.optionFamily} side={parameters.optionSide} method={activeMethod} barrierDirection={parameters.barrierDirection} barrierStyle={parameters.barrierStyle} barrierLevel={parameters.barrierLevel} asianAverageType={parameters.asianAverageType} asianObservations={parameters.asianObservations} asianAverageState={parameters.asianAverageState} />
      </aside>

      <ResultsStrip response={response} activeMethod={activeMethod} status={status} />

      <nav className="mobile-nav" aria-label="Workbench panels">
        <button type="button" aria-expanded={mobilePanel === "problem"} className={mobilePanel === "problem" ? "active" : ""} onClick={(event) => openMobilePanel("problem", event.currentTarget)}><SlidersHorizontal /><span>Problem</span></button>
        <button type="button" aria-expanded={mobilePanel === "equation"} className={mobilePanel === "equation" ? "active" : ""} onClick={(event) => openMobilePanel("equation", event.currentTarget)}><FunctionSquare /><span>Equation</span></button>
        <button type="button" aria-expanded={mobilePanel === "results"} className={mobilePanel === "results" ? "active" : ""} onClick={(event) => openMobilePanel("results", event.currentTarget)}><BarChart3 /><span>Results</span></button>
      </nav>

      {mobilePanel ? (
        <section ref={sheetRef} className="mobile-sheet" role="dialog" aria-modal="true" aria-label={`${mobilePanel} panel`}>
          <div className="sheet-handle" />
          <button type="button" className="sheet-close" aria-label="Close panel" onClick={closeMobilePanel}><X /></button>
          {mobilePanel === "problem" ? <ProblemPanel parameters={parameters} onChange={changeParameter} onFamilyChange={changeFamily} onAsianAverageTypeChange={changeAsianAverageType} /> : null}
          {mobilePanel === "equation" ? <EquationPanel family={parameters.optionFamily} side={parameters.optionSide} method={activeMethod} barrierDirection={parameters.barrierDirection} barrierStyle={parameters.barrierStyle} barrierLevel={parameters.barrierLevel} asianAverageType={parameters.asianAverageType} asianObservations={parameters.asianObservations} asianAverageState={parameters.asianAverageState} /> : null}
          {mobilePanel === "results" ? <ResultsStrip response={response} activeMethod={activeMethod} status={status} /> : null}
        </section>
      ) : null}
    </main>
  );
}
