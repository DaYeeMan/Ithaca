import { ChevronDown, Dices, FunctionSquare, Grid3X3 } from "lucide-react";
import { estimateOperations, MAX_ESTIMATED_OPERATIONS } from "../lib/validation";
import type { SolverMethod, SolverParameters } from "../types";
import { NumberField } from "./NumberField";

interface ProblemPanelProps {
  parameters: SolverParameters;
  availableMethods: SolverMethod[];
  onChange: <Key extends keyof SolverParameters>(key: Key, value: SolverParameters[Key]) => void;
  onToggleMethod: (method: SolverMethod) => void;
}

const methodLabels: Record<SolverMethod, string> = {
  closed_form: "Closed form",
  finite_difference: "Finite difference",
  monte_carlo: "Monte Carlo",
};

export function ProblemPanel({ parameters, availableMethods, onChange, onToggleMethod }: ProblemPanelProps) {
  const estimatedOperations = estimateOperations(parameters);
  const workPercent = estimatedOperations / MAX_ESTIMATED_OPERATIONS;

  return (
    <div className="problem-content">
      <h2>Problem</h2>

      <section className="control-section">
        <h3>Contract <ChevronDown size={15} /></h3>
        <label className="select-field">
          <span>Option family</span>
          <select value="european" aria-label="Option family" onChange={() => undefined}>
            <option value="european">European</option>
            <option value="american" disabled>American — planned</option>
            <option value="barrier" disabled>Barrier — planned</option>
            <option value="asian" disabled>Asian — planned</option>
          </select>
        </label>
        <label className="select-field">
          <span>Side</span>
          <select
            value={parameters.optionSide}
            onChange={(event) => onChange("optionSide", event.currentTarget.value as "call" | "put")}
          >
            <option value="call">Call</option>
            <option value="put">Put</option>
          </select>
        </label>
      </section>

      <section className="control-section">
        <h3>Market <ChevronDown size={15} /></h3>
        <NumberField label="Spot" symbol="S₀" value={parameters.spot} min={0.01} step={1} onChange={(value) => onChange("spot", value)} />
        <NumberField label="Strike" symbol="K" value={parameters.strike} min={0.01} step={1} onChange={(value) => onChange("strike", value)} />
        <NumberField label="Maturity" symbol="T" value={parameters.maturity} min={0.01} max={50} step={0.25} suffix="yr" onChange={(value) => onChange("maturity", value)} />
        <NumberField label="Volatility" symbol="σ" value={parameters.volatility * 100} min={0.01} max={500} step={1} suffix="%" onChange={(value) => onChange("volatility", value / 100)} />
        <NumberField label="Rate" symbol="r" value={parameters.rate * 100} min={-100} max={100} step={0.25} suffix="%" onChange={(value) => onChange("rate", value / 100)} />
        <NumberField label="Dividend" symbol="q" value={parameters.dividend * 100} min={-100} max={100} step={0.25} suffix="%" onChange={(value) => onChange("dividend", value / 100)} />
      </section>

      <section className="control-section">
        <h3>Surface <ChevronDown size={15} /></h3>
        <div className="range-row">
          <span>S range</span>
          <input aria-label="Minimum spot" type="number" value={parameters.spotMin} min={0} onChange={(event) => onChange("spotMin", event.currentTarget.valueAsNumber)} />
          <span>–</span>
          <input aria-label="Maximum spot" type="number" value={parameters.spotMax} min={1} onChange={(event) => onChange("spotMax", event.currentTarget.valueAsNumber)} />
        </div>
        <div className="range-row">
          <span>Grid (S × T)</span>
          <input aria-label="Spot grid count" type="number" value={parameters.spotSteps} min={20} max={160} onChange={(event) => onChange("spotSteps", event.currentTarget.valueAsNumber)} />
          <span>×</span>
          <input aria-label="Time grid count" type="number" value={parameters.timeSteps} min={20} max={160} onChange={(event) => onChange("timeSteps", event.currentTarget.valueAsNumber)} />
        </div>
      </section>

      <section className="control-section methods-section">
        <h3>Methods</h3>
        {availableMethods.map((method) => {
          const selected = parameters.methods.includes(method);
          const icon = method === "closed_form" ? <FunctionSquare size={18} />
            : method === "finite_difference" ? <Grid3X3 size={18} /> : <Dices size={18} />;
          return (
            <button
              key={method}
              type="button"
              className={`method-row ${selected ? "selected" : ""}`}
              aria-pressed={selected}
              onClick={() => onToggleMethod(method)}
            >
              <span><span className="radio-dot" />{methodLabels[method]}</span>
              {icon}
            </button>
          );
        })}
      </section>

      {parameters.methods.includes("finite_difference") ? (
        <section className="control-section numerical-section">
          <h3>Finite difference <ChevronDown size={15} /></h3>
          <NumberField label="Spot steps" value={parameters.finiteDifferenceSpotSteps} min={51} max={801} step={10} onChange={(value) => onChange("finiteDifferenceSpotSteps", value)} />
          <NumberField label="Time steps" value={parameters.finiteDifferenceTimeSteps} min={20} max={2000} step={20} onChange={(value) => onChange("finiteDifferenceTimeSteps", value)} />
          <NumberField label="Domain max" symbol="Sₘₐₓ" value={parameters.finiteDifferenceDomainMax} min={1} max={2_000_000} step={10} onChange={(value) => onChange("finiteDifferenceDomainMax", value)} />
        </section>
      ) : null}

      {parameters.methods.includes("monte_carlo") ? (
        <section className="control-section numerical-section">
          <h3>Monte Carlo settings <ChevronDown size={15} /></h3>
          <NumberField label="Paths" value={parameters.monteCarloPaths} min={1000} max={200000} step={1000} onChange={(value) => onChange("monteCarloPaths", value)} />
          <NumberField label="Path steps" value={parameters.monteCarloSteps} min={1} max={512} step={8} onChange={(value) => onChange("monteCarloSteps", value)} />
          <NumberField label="Seed" value={parameters.monteCarloSeed} min={0} max={2_147_483_647} step={1} onChange={(value) => onChange("monteCarloSeed", value)} />
          <label className="toggle-field">
            <span>Antithetic</span>
            <input type="checkbox" checked={parameters.monteCarloAntithetic} onChange={(event) => onChange("monteCarloAntithetic", event.currentTarget.checked)} />
          </label>
          <label className="select-field">
            <span>Confidence</span>
            <select value={parameters.confidenceLevel} onChange={(event) => onChange("confidenceLevel", Number(event.currentTarget.value))}>
              <option value={0.9}>90%</option>
              <option value={0.95}>95%</option>
              <option value={0.99}>99%</option>
            </select>
          </label>
        </section>
      ) : null}

      <div className={`work-estimate ${workPercent > 0.8 ? "warning" : ""}`}>
        Estimated work {(estimatedOperations / 1_000_000).toFixed(1)}M / 120M operations
      </div>
    </div>
  );
}
