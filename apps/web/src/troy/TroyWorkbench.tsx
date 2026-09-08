import { useEffect, useState } from 'react';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import { defaultConfig } from './engine';
import type { Config, SimulationResult } from './types';
import { TroyParameters } from './TroyParameters';
import { dynamicsLabels, pricingLabels } from './labels';
import { DynamicsCharts, TradingCharts } from './TroyCharts';
import '../workbench.css';
import './troy.css';

const money = (value: number) => `${value < 0 ? '−' : ''}$${Math.abs(value).toFixed(2)}`;
export default function TroyWorkbench() {
  const [config, setConfig] = useState<Config>(defaultConfig);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(true);
  const [tab, setTab] = useState<'making' | 'dynamics'>('making');
  const updateConfig = (value: Config) => { setConfig(value); setBusy(true); setError(''); };
  useEffect(() => {
    let active = true;
    let worker: Worker | undefined;
    const timer = window.setTimeout(() => {
      try {
        worker = new Worker(new URL('./simulation.worker.ts', import.meta.url), { type: 'module' });
        worker.onmessage = (event: MessageEvent<{ result?: SimulationResult; error?: string }>) => {
          if (!active) return;
          if (event.data.result) setResult(event.data.result);
          setError(event.data.error ?? ''); setBusy(false); worker?.terminate();
        };
        worker.onerror = () => { if (!active) return; setError('Simulation worker failed. Change parameters or reset to retry.'); setBusy(false); worker?.terminate(); };
        worker.postMessage(config);
      } catch { setError('Simulation could not start. Refresh the page to retry.'); setBusy(false); }
    }, 250);
    return () => { active = false; clearTimeout(timer); worker?.terminate(); };
  }, [config]);
  const last = result?.observations.at(-1);
  const shown = result?.config ?? config;
  return <div className="ithaca-workbench troy-workbench">
    <a className="skip-link" href="#troy-main">Skip to simulation</a>
    <header className="topbar troy-topbar">
      <a className="back-home" href="/#home" aria-label="Back to CapitalCanvas"><ArrowLeft size={20} /></a>
      <h1 className="wordmark">Troy</h1><span className="troy-tagline">Options market-making laboratory</span>
      <button className="secondary-button" onClick={() => updateConfig({ ...defaultConfig })}><RotateCcw size={14} /> Reset</button>
    </header>
    <aside className="troy-parameters" aria-label="Simulation parameters"><TroyParameters config={config} onChange={updateConfig} /></aside>
    <main className="troy-main" id="troy-main" tabIndex={-1}>
      <div className="troy-experiment-heading"><div><span className="troy-eyebrow">SIMULATED REALITY / MODEL BELIEF</span><h2>Explore the cost of being wrong.</h2></div><span className={`troy-run-status ${busy ? 'working' : ''}`} role="status">{error ? 'Needs attention' : busy ? 'Simulating…' : `Seed ${shown.seed} · ${shown.steps} steps`}</span></div>
      <div className="troy-model-badges"><span>True Market: <strong>{dynamicsLabels[shown.dynamics]}</strong></span><span>Market Maker: <strong>{pricingLabels[shown.pricing]}</strong></span></div>
      <div className="troy-tabs" role="tablist" aria-label="Simulation views">
        {(['making', 'dynamics'] as const).map(id => <button key={id} id={`troy-tab-${id}`} type="button" role="tab" aria-controls={`troy-panel-${id}`} aria-selected={tab === id} tabIndex={tab === id ? 0 : -1}
          onKeyDown={e => { if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) { e.preventDefault(); const next = e.key === 'Home' ? 'making' : e.key === 'End' ? 'dynamics' : tab === 'making' ? 'dynamics' : 'making'; setTab(next); document.getElementById(`troy-tab-${next}`)?.focus(); } }}
          onClick={() => setTab(id)}>{id === 'making' ? 'Market Making' : 'Market Dynamics'}</button>)}
      </div>
      {error && <p className="troy-error" role="alert">{error}</p>}
      <div role="tabpanel" id={`troy-panel-${tab}`} aria-labelledby={`troy-tab-${tab}`} aria-busy={busy} className={busy ? 'troy-output updating' : 'troy-output'}>
        {result && last ? <>
          {tab === 'making' ? <>
            <div className="troy-metrics">
              {[
                ['Total P&L', money(last.totalPnl), 'model-marked', last.totalPnl < 0 ? 'negative' : 'positive'],
                ['Current Inventory', String(last.inventory), 'option units', ''],
                ['Number of Fills', String(result.summary.totalFills), 'executions', ''],
                ['Avg. Spread Captured', money(result.summary.averageSpreadCaptured), 'per unit · vs fair value', ''],
                ['Maximum Drawdown', money(result.summary.maxDrawdown), 'peak to trough', ''],
                ['Hedge Position', last.hedgePosition.toFixed(2), 'underlying units', ''],
              ].map(([label, value, note, tone]) => <div className={`troy-metric ${tone}`} key={label}><span>{label}</span><strong>{value}</strong><small>{note}</small></div>)}
            </div>
            <TradingCharts result={result} />
          </> : <DynamicsCharts result={result} />}
          <details className="troy-methods"><summary>How this experiment works</summary>
            <p>True dynamics generate the underlying. An independent pricing model computes the maker’s fair value and delta. Quotes shift downward for long inventory and upward for short inventory. Fill arrivals decrease exponentially as quotes move away from the reference.</p>
            <p>{result.pricingLabel}. Contract values and P&L use one underlying unit per option. Option inventory is marked to the maker’s model; a misspecified model can misstate wealth before settlement. Total P&L equals realized option P&L plus unrealized option P&L plus hedge P&L, minus transaction costs. Average spread captured is execution edge against the maker’s fair value when the quote was posted, not round-trip profit.</p>
            {result.warnings.map(w => <p key={w}>{w}</p>)}
            <p>All rates and horizons use years. The effective horizon is the smaller of simulation horizon and maturity. Returns pool all paths at the selected step size; finite samples need not display textbook tail shapes.</p>
            <p>Heston uses a discretized nonnegative variance process. <a href="https://www.macs.hw.ac.uk/~simonm/psdesarxiv.pdf" target="_blank" rel="noreferrer">Numerical variance schemes</a> explain the approximation. See <a href="/disclaimer">model limitations</a>.</p>
          </details>
        </> : !error && <div className="troy-empty">Generating market paths, quotes, and inventory…</div>}
      </div>
    </main>
  </div>;
}
