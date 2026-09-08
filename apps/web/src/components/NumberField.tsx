import { useEffect, useState } from "react";

interface NumberFieldProps {
  label: string;
  symbol?: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  allowDraft?: boolean;
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
  allowDraft = false,
  onChange,
}: NumberFieldProps) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => { setDraft(String(value)); }, [value]);
  return (
    <label className="number-field">
      <span className="number-label">
        {label} {symbol ? <i>({symbol})</i> : null}
      </span>
      <span className="number-control">
        <input
          type="number"
          value={allowDraft ? draft : value}
          min={min}
          max={max}
          step={step}
          onChange={(event) => {
            const next = event.currentTarget.valueAsNumber;
            if (!allowDraft) { onChange(next); return; }
            setDraft(event.currentTarget.value);
            if (Number.isFinite(next) && (min === undefined || next >= min) && (max === undefined || next <= max)) onChange(next);
          }}
          onBlur={() => {
            if (!allowDraft) return;
            const next = Number(draft);
            if (draft !== "" && Number.isFinite(next)) {
              const bounded = Math.min(max ?? Infinity, Math.max(min ?? -Infinity, next));
              setDraft(String(bounded)); if (bounded !== value) onChange(bounded);
            } else setDraft(String(value));
          }}
        />
        {suffix ? <span className="number-suffix">{suffix}</span> : null}
      </span>
    </label>
  );
}
