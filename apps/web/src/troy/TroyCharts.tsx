import { useMemo } from 'react';
import type { Data, Layout } from 'plotly.js';
import { ScientificPlot } from '../components/ChartPanel';
import type { Observation, SimulationResult } from './types';

const colors = { cyan: '#24d5e7', green: '#86d849', amber: '#ffb000', red: '#ff7c67', muted: '#7b8c9e' };
const axis = { gridcolor: '#203545', zerolinecolor: '#a8b4bd', tickfont: { size: 11 }, automargin: true };
const base: Partial<Layout> = {
  paper_bgcolor: 'transparent', plot_bgcolor: 'transparent',
  font: { family: 'Inter, ui-sans-serif, system-ui, sans-serif', color: '#dfe8ef', size: 12 },
  margin: { l: 62, r: 22, t: 18, b: 48 }, hovermode: 'x unified',
  legend: { orientation: 'h', x: 0, y: 1.12 },
  xaxis: { ...axis, title: { text: 'Time (years)' } }, yaxis: axis,
};
function PlotCard({ title, detail, data, layout, height = 280 }: { title: string; detail: string; data: Data[]; layout?: Partial<Layout>; height?: number }) {
  return <section className="troy-chart-card" aria-label={title}>
    <div className="troy-chart-heading"><h2>{title}</h2><p>{detail}</p></div>
    <div style={{ height }}><ScientificPlot data={data} layout={{ ...base, ...layout }} label={`${title}. ${detail}`} /></div>
  </section>;
}

export function TradingCharts({ result }: { result: SimulationResult }) {
  const charts = useMemo(() => {
    const rows = result.observations;
    const x = rows.map(r => r.time);
    const customdata = rows.map(r => [r.spot, r.fairValue, r.bid, r.ask, r.inventory,
      [r.bidFills ? `Maker bought ${r.bidFills}` : '', r.askFills ? `Maker sold ${r.askFills}` : ''].filter(Boolean).join(' · ') || 'No trade']);
    const hovertemplate = 'Time %{x:.4f} yr<br>Spot %{customdata[0]:.2f}<br>Fair %{customdata[1]:.3f}<br>Bid %{customdata[2]:.3f}<br>Ask %{customdata[3]:.3f}<br>Inventory %{customdata[4]}<br>%{customdata[5]}<extra>%{fullData.name}</extra>';
    const line = (name: string, key: keyof Observation, color: string, extra = {}): Data => ({
      type: 'scatter', mode: 'lines', x, y: rows.map(r => r[key]), name, line: { color, width: 1.6 }, ...extra,
    } as Data);
    const market: Data[] = [
      line('Underlying', 'spot', colors.cyan, { customdata, hovertemplate }),
      line('Fair value', 'fairValue', colors.cyan, { xaxis: 'x2', yaxis: 'y2', customdata, hovertemplate }),
      line('Bid', 'bid', colors.green, { xaxis: 'x2', yaxis: 'y2', customdata, hovertemplate }),
      line('Ask', 'ask', colors.amber, { xaxis: 'x2', yaxis: 'y2', customdata, hovertemplate }),
      ...(['buy', 'sell'] as const).map(side => {
        const fills = result.fills.filter(f => f.side === side);
        return { type: 'scatter', mode: 'markers', x: fills.map(f => f.time), y: fills.map(f => f.price),
          name: `Maker ${side}`, xaxis: 'x2', yaxis: 'y2', customdata: fills.map(f => [...customdata[f.step], f.quantity]), hovertemplate: `Maker ${side} %{customdata[6]} @ $%{y:.3f}<br>${hovertemplate}`,
          marker: { size: 8, color: side === 'buy' ? colors.green : colors.amber, symbol: side === 'buy' ? 'triangle-up' : 'triangle-down', line: { color: '#03101d', width: 1 } },
        } as Data;
      }),
    ];
    const pnl = [line('Total P&L', 'totalPnl', colors.green), line('Realized', 'realizedPnl', colors.cyan),
      line('Unrealized', 'unrealizedPnl', colors.amber), line('Hedge P&L', 'hedgePnl', colors.muted),
      { type: 'scatter', mode: 'lines', x, y: rows.map(r => -r.transactionCosts), name: '− Costs', line: { color: colors.red, width: 1, dash: 'dot' } } as Data];
    const limits = rows.filter(r => Math.abs(r.inventory) >= result.config.inventoryLimit);
    const inventory = [line('Inventory', 'inventory', colors.cyan, { line: { color: colors.cyan, shape: 'hv' }, fill: 'tozeroy', fillcolor: 'rgba(36,213,231,.08)' }),
      { type: 'scatter', mode: 'markers', name: 'Inventory limit', x: limits.map(r => r.time), y: limits.map(r => r.inventory), marker: { color: colors.red, size: 6 } } as Data];
    return { market, pnl, inventory };
  }, [result]);
  return <>
    <PlotCard title="Market & Quotes" detail="One traded path · separate price scales · click legend to toggle" data={charts.market} height={430} layout={{
      uirevision: `market-${result.config.seed}-${result.config.horizon}`, margin: { l: 62, r: 22, t: 38, b: 45 },
      xaxis: { ...axis, domain: [0, 1], anchor: 'y', matches: 'x2', showticklabels: false },
      xaxis2: { ...axis, domain: [0, 1], anchor: 'y2', title: { text: 'Time (years)' } },
      yaxis: { ...axis, domain: [.63, 1], title: { text: 'Underlying ($)' } },
      yaxis2: { ...axis, domain: [0, .49], title: { text: 'Option ($)' } },
    }} />
    <PlotCard title="P&L" detail="Model-marked equity · zero starting capital · one-unit contracts" data={charts.pnl} layout={{ uirevision: 'pnl', yaxis: { ...axis, title: { text: 'P&L ($)' } }, margin: { l: 62, r: 22, t: 38, b: 45 } }} />
    <PlotCard title="Inventory" detail="Options held · red marks indicate inventory limit" data={charts.inventory} height={210} layout={{
      uirevision: 'inventory', yaxis: { ...axis, title: { text: 'Contracts' } },
      shapes: [-1, 1].map(sign => ({ type: 'line', xref: 'paper', x0: 0, x1: 1, y0: sign * result.config.inventoryLimit, y1: sign * result.config.inventoryLimit, line: { color: '#ff7c6755', dash: 'dot', width: 1 } })),
    }} />
  </>;
}

export function DynamicsCharts({ result }: { result: SimulationResult }) {
  const charts = useMemo(() => {
    const x = result.observations.map(r => r.time);
    const paths: Data[] = result.samplePaths.slice(1).map((path, i) => ({ type: 'scatter', mode: 'lines', x, y: path,
      name: 'Other paths', legendgroup: 'samples', showlegend: i === 0, line: { color: 'rgba(123,140,158,.35)', width: 1 }, hoverinfo: 'skip' }));
    paths.push({ type: 'scatter', mode: 'lines', x, y: x.map((_, i) => result.samplePaths.reduce((sum, p) => sum + p[i], 0) / result.samplePaths.length), name: 'Mean path', line: { color: colors.amber, width: 1.5, dash: 'dot' } });
    paths.push({ type: 'scatter', mode: 'lines', x, y: result.samplePaths[0], name: 'Traded path', line: { color: colors.cyan, width: 2.5 }, hovertemplate: 'Time %{x:.4f} yr<br>Spot $%{y:.2f}<extra>Traded path</extra>' });
    const s = result.statistics;
    const span = Math.max(s.max - s.min, 1e-6);
    const binWidth = span / 60;
    const centers = Array.from({ length: 60 }, (_, i) => s.min + (i + .5) * binWidth);
    const counts = Array<number>(60).fill(0);
    result.logReturns.forEach(r => counts[Math.min(59, Math.max(0, Math.floor((r - s.min) / binWidth)))]++);
    const normalX = Array.from({ length: 240 }, (_, i) => s.min + span * i / 239);
    const distribution: Data[] = [{ type: 'bar', x: centers, y: counts.map(c => c / (s.count * binWidth)), width: binWidth * .9, name: 'Simulated returns', marker: { color: colors.cyan }, hovertemplate: 'Log return %{x:.4f}<br>Density %{y:.2f}<extra></extra>' }];
    if (s.standardDeviation > 1e-10) distribution.push({ type: 'scatter', mode: 'lines', x: normalX,
      y: normalX.map(v => Math.exp(-.5 * ((v - s.mean) / s.standardDeviation) ** 2) / (s.standardDeviation * Math.sqrt(2 * Math.PI))), name: 'Normal reference', line: { color: colors.amber, width: 2 } });
    return { paths, distribution };
  }, [result]);
  const s = result.statistics;
  return <>
    <PlotCard title="Sample Paths" detail={`${result.samplePaths.length} realizations of the true market · cyan is the path traded by the maker`} data={charts.paths} height={390} layout={{ yaxis: { ...axis, title: { text: 'Underlying ($)' } } }} />
    <div className="troy-metrics troy-return-metrics">
      {[['Mean Return', `${(s.mean * 100).toFixed(3)}%`, 'per step'], ['Volatility', `${(s.annualizedVolatility * 100).toFixed(2)}%`, 'annualized'], ['Skewness', s.skewness.toFixed(3), 'zero for normal'], ['Excess Kurtosis', s.excessKurtosis.toFixed(3), 'zero for normal']].map(([label, value, note]) => <div className="troy-metric" key={label}><span>{label}</span><strong>{value}</strong><small>{note}</small></div>)}
    </div>
    <PlotCard title="Return Distribution" detail={`${s.count.toLocaleString()} pooled one-step log returns · normal reference matches sample mean and variance`} data={charts.distribution} height={330} layout={{ hovermode: 'closest', xaxis: { ...axis, title: { text: 'One-step log return' }, tickformat: '.1%' }, yaxis: { ...axis, title: { text: 'Density' } }, bargap: .08 }} />
  </>;
}
