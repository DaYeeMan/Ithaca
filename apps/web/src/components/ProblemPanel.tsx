import { ChevronDown } from "lucide-react";
import { estimateOperations, MAX_ESTIMATED_OPERATIONS } from "../lib/validation";
import type { OptionFamily, SolverParameters } from "../types";
import { NumberField } from "./NumberField";

interface ProblemPanelProps {
  parameters: SolverParameters;
  onChange: <Key extends keyof SolverParameters>(key: Key, value: SolverParameters[Key]) => void;
  onFamilyChange: (family: OptionFamily) => void;
  onAsianAverageTypeChange: (averageType: "arithmetic" | "geometric") => void;
}

export function ProblemPanel({ parameters, onChange, onFamilyChange, onAsianAverageTypeChange }: ProblemPanelProps) {
  const estimatedOperations = estimateOperations(parameters);
  const workPercent = estimatedOperations / MAX_ESTIMATED_OPERATIONS;

  return (
    <div className="problem-content">
      <h2>Problem</h2>

      <section className="control-section">
        <h3>Contract <ChevronDown size={15} /></h3>
        <label className="select-field">
          <span>Option family</span>
          <select value={parameters.optionFamily} aria-label="Option family" onChange={(event) => onFamilyChange(event.currentTarget.value as OptionFamily)}>
            <option value="european">European</option>
            <option value="american">American</option>
            <option value="barrier">Barrier</option>
            <option value="asian">Asian</option>
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

      {parameters.optionFamily === "barrier" ? (
        <section className="control-section">
          <h3>Barrier <ChevronDown size={15} /></h3>
          <label className="select-field">
            <span>Direction</span>
            <select aria-label="Barrier direction" value={parameters.barrierDirection} onChange={(event) => onChange("barrierDirection", event.currentTarget.value as "down" | "up")}>
              <option value="down">Down</option>
              <option value="up">Up</option>
            </select>
          </label>
          <label className="select-field">
            <span>Activation</span>
            <select aria-label="Barrier activation" value={parameters.barrierStyle} onChange={(event) => onChange("barrierStyle", event.currentTarget.value as "in" | "out")}>
              <option value="out">Knock out</option>
              <option value="in">Knock in</option>
            </select>
          </label>
          <NumberField label="Level" symbol="H" value={parameters.barrierLevel} min={0.01} max={1_000_000} step={1} onChange={(value) => onChange("barrierLevel", value)} />
          <label className="select-field">
            <span>Monitoring</span>
            <select aria-label="Barrier monitoring" value="continuous" disabled><option value="continuous">Continuous</option></select>
          </label>
          <label className="select-field">
            <span>Rebate</span>
            <select aria-label="Barrier rebate" value="none" disabled><option value="none">None</option></select>
          </label>
        </section>
      ) : null}

      {parameters.optionFamily === "asian" ? (
        <section className="control-section">
          <h3>Average <ChevronDown size={15} /></h3>
          <label className="select-field">
            <span>Average type</span>
            <select aria-label="Asian average type" value={parameters.asianAverageType} onChange={(event) => onAsianAverageTypeChange(event.currentTarget.value as "arithmetic" | "geometric")}>
              <option value="arithmetic">Arithmetic</option>
              <option value="geometric">Geometric</option>
            </select>
          </label>
          <NumberField label="Observations" symbol="n" value={parameters.asianObservations} min={2} max={60} step={1} onChange={(value) => onChange("asianObservations", value)} />
          <NumberField label="Fixed average state" symbol="A" value={parameters.asianAverageState} min={0.01} max={1_000_000} step={1} onChange={(value) => onChange("asianAverageState", value)} />
          <label className="select-field">
            <span>Monitoring</span>
            <select aria-label="Asian monitoring" value="discrete" disabled><option value="discrete">Equally spaced</option></select>
          </label>
          <p className="equation-note">Observations occur after t=0. Fixed A controls higher-dimensional chart slices.</p>
        </section>
      ) : null}

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

      {parameters.methods.includes("binomial") ? (
        <section className="control-section numerical-section">
          <h3>Binomial tree <ChevronDown size={15} /></h3>
          <NumberField label="Steps" value={parameters.binomialSteps} min={50} max={4000} step={50} onChange={(value) => onChange("binomialSteps", value)} />
        </section>
      ) : null}

      {parameters.methods.includes("finite_difference") ? (
        <section className="control-section numerical-section">
          <h3>{parameters.optionFamily === "asian" ? "Augmented state" : "Finite difference"} <ChevronDown size={15} /></h3>
          {parameters.optionFamily !== "asian" ? <NumberField label="Spot steps" value={parameters.finiteDifferenceSpotSteps} min={51} max={801} step={10} onChange={(value) => onChange("finiteDifferenceSpotSteps", value)} /> : null}
          <NumberField label="Time steps" value={parameters.finiteDifferenceTimeSteps} min={20} max={2000} step={20} onChange={(value) => onChange("finiteDifferenceTimeSteps", value)} />
          {parameters.optionFamily !== "asian" ? <NumberField label="Domain max" symbol="Sₘₐₓ" value={parameters.finiteDifferenceDomainMax} min={1} max={2_000_000} step={10} onChange={(value) => onChange("finiteDifferenceDomainMax", value)} /> : null}
        </section>
      ) : null}

      {parameters.methods.includes("monte_carlo") ? (
        <section className="control-section numerical-section">
          <h3>Monte Carlo settings <ChevronDown size={15} /></h3>
          <NumberField label="Paths" value={parameters.monteCarloPaths} min={1000} max={200000} step={1000} onChange={(value) => onChange("monteCarloPaths", value)} />
          {parameters.optionFamily !== "asian" ? <NumberField label="Path steps" value={parameters.monteCarloSteps} min={1} max={512} step={8} onChange={(value) => onChange("monteCarloSteps", value)} /> : null}
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
