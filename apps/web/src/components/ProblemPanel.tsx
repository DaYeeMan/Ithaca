import { ChevronDown, FunctionSquare, Grid3X3 } from "lucide-react";
import { NumberField } from "./NumberField";
import type { SolverParameters } from "../types";

interface ProblemPanelProps {
  parameters: SolverParameters;
  onChange: <Key extends keyof SolverParameters>(key: Key, value: SolverParameters[Key]) => void;
}

export function ProblemPanel({ parameters, onChange }: ProblemPanelProps) {
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
        <button type="button" className="method-row selected" aria-pressed="true">
          <span><span className="radio-dot" />Closed form</span>
          <FunctionSquare size={18} />
        </button>
        <button type="button" className="method-row" disabled title="Available in Phase 2">
          <span><span className="radio-dot" />Finite difference</span>
          <Grid3X3 size={18} />
        </button>
        <button type="button" className="method-row" disabled title="Available in Phase 2">
          <span><span className="radio-dot" />Monte Carlo</span>
          <span className="dots-icon">•••</span>
        </button>
      </section>
    </div>
  );
}
