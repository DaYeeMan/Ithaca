interface NumberFieldProps {
  label: string;
  symbol?: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  onChange: (value: number) => void;
}

export function NumberField({
  label,
  symbol,
  value,
  min,
  max,
  step,
  suffix,
  onChange,
}: NumberFieldProps) {
  return (
    <label className="number-field">
      <span className="number-label">
        {label} {symbol ? <i>({symbol})</i> : null}
      </span>
      <span className="number-control">
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(event) => onChange(event.currentTarget.valueAsNumber)}
        />
        {suffix ? <span className="number-suffix">{suffix}</span> : null}
      </span>
    </label>
  );
}

