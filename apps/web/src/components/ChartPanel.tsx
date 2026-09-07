import { useEffect, useMemo, useRef, useState } from "react";
import Plotly from "plotly.js-dist-min";
import type { Data, Layout } from "plotly.js";
import type { MethodResult, OptionFamily, SolveResponse, SolverMethod } from "../types";

type ChartTab = "surface" | "slice" | "convergence" | "paths";

const plotConfig = {
  displaylogo: false,
  responsive: true,
  scrollZoom: true,
  modeBarButtonsToRemove: ["toImage", "sendDataToCloud", "lasso2d", "select2d"] as never[],
};

function ScientificPlot({ data, layout, label }: { data: Data[]; layout: Partial<Layout>; label: string }) {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = container.current;
    if (!node) return;
    const plotLayout = JSON.parse(JSON.stringify(layout)) as Partial<Layout>;
    void Plotly.react(node, data, plotLayout, plotConfig);
    return () => Plotly.purge(node);
  }, [data, layout]);

  return <div ref={container} role="img" aria-label={label} style={{ width: "100%", height: "100%" }} />;
}

const methodLabels: Record<SolverMethod, string> = {
  closed_form: "Closed form",
  binomial: "Binomial tree",
  finite_difference: "Finite difference",
  monte_carlo: "Monte Carlo",
};

const methodColors: Record<SolverMethod, string> = {
  closed_form: "#86d849",
  binomial: "#86d849",
  finite_difference: "#24d5e7",
  monte_carlo: "#ffb000",
};

function resultLabel(result: MethodResult): string {
  if (result.diagnostics.scheme === "augmented-state CRR lattice") return "Augmented state";
  if (result.diagnostics.solution === "discrete geometric-average analytical") return "Geometric analytical";
  return methodLabels[result.method];
}

function legendLabel(result: MethodResult): string {
  if (result.diagnostics.scheme === "augmented-state CRR lattice") return "Augmented";
  if (result.diagnostics.solution === "discrete geometric-average analytical") return "Geometric";
  if (result.method === "finite_difference") return "Finite diff.";
  return methodLabels[result.method];
}

const baseFont = { family: "Inter, ui-sans-serif, system-ui, sans-serif", color: "#dfe8ef", size: 12 };

function resultFor(response: SolveResponse | null, method: SolverMethod): MethodResult | null {
  return response?.results.find((result) => result.method === method) ?? response?.results[0] ?? null;
}

export function ChartPanel({
  response,
  activeMethod,
  onActiveMethodChange,
  loading,
  family,
  averageState,
  onAverageStateChange,
}: {
  response: SolveResponse | null;
  activeMethod: SolverMethod;
  onActiveMethodChange: (method: SolverMethod) => void;
  loading: boolean;
  family: OptionFamily;
  averageState: number;
  onAverageStateChange: (value: number) => void;
}) {
  const [tab, setTab] = useState<ChartTab>("surface");
  const [sliceIndex, setSliceIndex] = useState<number | null>(null);
  const activeResult = resultFor(response, activeMethod);
  const monteCarlo = response?.results.find((result) => result.method === "monte_carlo") ?? null;
  const reference = response?.results.find((result) => result.method === "closed_form" || result.method === "binomial") ?? null;
  const barrierLevel = typeof activeResult?.diagnostics.barrier_level === "number" ? activeResult.diagnostics.barrier_level : null;
  const barrierTriggered = activeResult?.diagnostics.barrier_triggered === true;
  const visibleTab = !monteCarlo && (tab === "convergence" || tab === "paths") ? "surface" : tab;
  const selectedIndex = activeResult
    ? Math.min(sliceIndex ?? activeResult.surface.times_to_maturity.length - 1, activeResult.surface.times_to_maturity.length - 1)
    : 0;
  const tabs: Array<{ id: ChartTab; label: string; disabled: boolean }> = [
    { id: "surface", label: "Surface", disabled: false },
    { id: "slice", label: "Price slice", disabled: false },
    { id: "convergence", label: "Convergence", disabled: !monteCarlo },
    { id: "paths", label: "Paths", disabled: !monteCarlo },
  ];
  const chartLabel = activeResult
    ? `${tabs.find((item) => item.id === visibleTab)?.label} chart for ${resultLabel(activeResult)}. Price ${activeResult.price.toFixed(4)}.`
    : "Option price visualization has no result yet.";

  const selectAdjacentTab = (current: ChartTab, direction: -1 | 1) => {
    const enabled = tabs.filter((item) => !item.disabled);
    const index = enabled.findIndex((item) => item.id === current);
    const next = enabled[(index + direction + enabled.length) % enabled.length];
    setTab(next.id);
    document.getElementById(`chart-tab-${next.id}`)?.focus();
  };

  const surfaceData = useMemo<Data[]>(() => {
    if (!activeResult) return [];
    const { spots, times_to_maturity: times, prices } = activeResult.surface;
    const traces: Data[] = [{
      type: "surface",
      x: spots,
      y: times,
      z: prices,
      name: resultLabel(activeResult),
      colorscale: [
        [0, "#171a57"],
        [0.28, "#075b93"],
        [0.56, "#07a88f"],
        [0.78, "#8bcf43"],
        [1, "#ffcb2c"],
      ],
      contours: { x: { show: true, color: "rgba(255,255,255,.28)", width: 1 }, y: { show: true, color: "rgba(255,255,255,.28)", width: 1 } },
      hovertemplate: `Spot %{x:.2f}<br>τ %{y:.3f} yr<br>Price %{z:.4f}<extra>${resultLabel(activeResult)}</extra>`,
      showscale: false,
    } as Data];

    for (const result of response?.results ?? []) {
      traces.push({
        type: "scatter3d",
        mode: "lines",
        x: result.surface.spots,
        y: result.surface.spots.map(() => result.surface.times_to_maturity[selectedIndex]),
        z: result.surface.prices[selectedIndex],
        name: legendLabel(result),
        line: { color: methodColors[result.method], width: result.method === activeResult.method ? 6 : 3 },
        hovertemplate: `Spot %{x:.2f}<br>Price %{z:.4f}<extra>${resultLabel(result)}</extra>`,
        showlegend: true,
      } as Data);
    }
    if (activeResult.exercise_boundary) {
      const points = activeResult.exercise_boundary.times_to_maturity
        .map((time, index) => ({ time, spot: activeResult.exercise_boundary?.spots[index] }))
        .filter((point): point is { time: number; spot: number } => point.spot != null);
      traces.push({
        type: "scatter3d",
        mode: "lines",
        x: points.map((point) => point.spot),
        y: points.map((point) => point.time),
        z: points.map((point) => {
          const timeIndex = activeResult.surface.times_to_maturity.reduce((best, time, index, times) =>
            Math.abs(time - point.time) < Math.abs(times[best] - point.time) ? index : best, 0);
          const spotIndex = activeResult.surface.spots.reduce((best, spot, index, spots) =>
            Math.abs(spot - point.spot) < Math.abs(spots[best] - point.spot) ? index : best, 0);
          return activeResult.surface.prices[timeIndex][spotIndex];
        }),
        name: "Exercise boundary",
        line: { color: "#ff5f6d", width: 7 },
        hovertemplate: "Boundary spot %{x:.2f}<br>τ %{y:.3f}<extra></extra>",
      } as Data);
    }
    if (barrierLevel != null) {
      let maximumPrice = 0;
      for (const row of prices) for (const price of row) maximumPrice = Math.max(maximumPrice, price);
      const firstTime = times[0];
      const lastTime = times[times.length - 1];
      traces.push({
        type: "mesh3d",
        x: [barrierLevel, barrierLevel, barrierLevel, barrierLevel],
        y: [firstTime, lastTime, lastTime, firstTime],
        z: [0, 0, maximumPrice, maximumPrice],
        i: [0, 0], j: [1, 2], k: [2, 3],
        name: `Barrier H=${barrierLevel}`,
        color: "#ff7c67",
        opacity: 0.24,
        hovertemplate: `Barrier H=${barrierLevel}<extra></extra>`,
        showlegend: true,
      } as unknown as Data);
    }
    return traces;
  }, [activeResult, barrierLevel, response, selectedIndex]);

  const sliceData = useMemo<Data[]>(() => {
    if (!response) return [];
    const traces: Data[] = [];
    for (const result of response.results) {
      if (result.method === "monte_carlo" && result.surface.confidence_lower && result.surface.confidence_upper) {
        traces.push({
          type: "scatter",
          mode: "lines",
          x: result.surface.spots,
          y: result.surface.confidence_lower[selectedIndex],
          line: { width: 0 },
          hoverinfo: "skip",
          showlegend: false,
        } as Data);
        traces.push({
          type: "scatter",
          mode: "lines",
          x: result.surface.spots,
          y: result.surface.confidence_upper[selectedIndex],
          line: { width: 0 },
          fill: "tonexty",
          fillcolor: "rgba(255,176,0,.16)",
          name: "Monte Carlo confidence band",
          hoverinfo: "skip",
        } as Data);
      }
      traces.push({
        type: "scatter",
        mode: "lines",
        x: result.surface.spots,
        y: result.surface.prices[selectedIndex],
        name: legendLabel(result),
        line: { color: methodColors[result.method], width: result.method === activeResult?.method ? 3 : 2 },
        hovertemplate: `Spot %{x:.2f}<br>Price %{y:.4f}<extra>${resultLabel(result)}</extra>`,
      } as Data);
      if (reference && result.method !== "closed_form") {
        traces.push({
          type: "scatter",
          mode: "lines",
          x: result.surface.spots,
          y: result.surface.prices[selectedIndex].map((price, index) => price - reference.surface.prices[selectedIndex][index]),
          xaxis: "x2",
          yaxis: "y2",
          name: `${resultLabel(result)} error`,
          line: { color: methodColors[result.method], width: 2, dash: "dot" },
          hovertemplate: "Spot %{x:.2f}<br>Error %{y:.5f}<extra></extra>",
        } as Data);
      }
    }
    if (barrierLevel != null) {
      let maximumPrice = 0;
      for (const result of response.results) {
        for (const price of result.surface.prices[selectedIndex]) maximumPrice = Math.max(maximumPrice, price);
      }
      traces.push({
        type: "scatter",
        mode: "lines",
        x: [barrierLevel, barrierLevel],
        y: [0, maximumPrice],
        name: `Barrier H=${barrierLevel}`,
        line: { color: "#ff7c67", width: 2, dash: "dash" },
        hovertemplate: `Barrier H=${barrierLevel}<extra></extra>`,
      } as Data);
    }
    return traces;
  }, [activeResult?.method, barrierLevel, reference, response, selectedIndex]);

  const convergenceData = useMemo<Data[]>(() => {
    if (!monteCarlo) return [];
    const points = monteCarlo.convergence;
    const traces: Data[] = [
      {
        type: "scatter",
        mode: "lines",
        x: points.map((point) => point.paths),
        y: points.map((point) => point.lower),
        line: { width: 0 },
        hoverinfo: "skip",
        showlegend: false,
      } as Data,
      {
        type: "scatter",
        mode: "lines",
        x: points.map((point) => point.paths),
        y: points.map((point) => point.upper),
        line: { width: 0 },
        fill: "tonexty",
        fillcolor: "rgba(255,176,0,.18)",
        name: "Confidence band",
        hoverinfo: "skip",
      } as Data,
      {
        type: "scatter",
        mode: "lines+markers",
        x: points.map((point) => point.paths),
        y: points.map((point) => point.price),
        name: "Monte Carlo",
        line: { color: methodColors.monte_carlo, width: 3 },
        hovertemplate: "%{x:,} paths<br>Price %{y:.4f}<extra></extra>",
      } as Data,
    ];
    if (reference) {
      traces.push({
        type: "scatter",
        mode: "lines",
        x: points.map((point) => point.paths),
        y: points.map(() => reference.price),
        name: "Closed-form reference",
        line: { color: methodColors.closed_form, width: 2, dash: "dash" },
      } as Data);
    }
    return traces;
  }, [monteCarlo, reference]);

  const pathsData = useMemo<Data[]>(() => {
    if (!monteCarlo) return [];
    const traces = monteCarlo.sample_paths.map((path, index) => ({
      type: "scatter",
      mode: "lines",
      x: path.times,
      y: path.spots,
      name: `Path ${index + 1}`,
      line: { color: `hsla(${185 + index * 12}, 75%, 60%, .62)`, width: 1.5 },
      hovertemplate: "Time %{x:.3f}<br>Spot %{y:.2f}<extra></extra>",
      showlegend: false,
    } as Data));
    const pathBarrier = typeof monteCarlo.diagnostics.barrier_level === "number" ? monteCarlo.diagnostics.barrier_level : null;
    if (pathBarrier != null) {
      traces.push({
        type: "scatter",
        mode: "lines",
        x: [0, monteCarlo.surface.times_to_maturity.at(-1) ?? 0],
        y: [pathBarrier, pathBarrier],
        name: `Barrier H=${pathBarrier}`,
        line: { color: "#ff7c67", width: 3, dash: "dash" },
        hovertemplate: `Barrier H=${pathBarrier}<extra></extra>`,
        showlegend: true,
      } as Data);
    }
    return traces;
  }, [monteCarlo]);

  const commonLayout: Partial<Layout> = {
    autosize: true,
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    font: baseFont,
    margin: { l: 58, r: 24, t: 20, b: 64 },
    legend: { orientation: "h", y: 1.08, x: 0, font: { ...baseFont, size: 10 } },
    showlegend: true,
  };

  const surfaceLayout: Partial<Layout> = {
    ...commonLayout,
    scene: {
      bgcolor: "rgba(0,0,0,0)",
      camera: { eye: { x: 1.5, y: -1.65, z: 0.85 } },
      xaxis: { title: { text: "Spot (S)" }, gridcolor: "#334454", zerolinecolor: "#536474", color: "#dfe8ef" },
      yaxis: { title: { text: "Time to maturity (τ, yrs)" }, gridcolor: "#334454", zerolinecolor: "#536474", color: "#dfe8ef" },
      zaxis: { title: { text: "Price" }, gridcolor: "#334454", zerolinecolor: "#536474", color: "#dfe8ef" },
      aspectmode: "manual",
      aspectratio: { x: 1.35, y: 1, z: 0.8 },
    },
  };

  const hasDifference = Boolean(reference && response && response.results.length > 1);
  const sliceLayout: Partial<Layout> = {
    ...commonLayout,
    margin: { l: 58, r: 24, t: 28, b: 48 },
    xaxis: { gridcolor: "#243849", zerolinecolor: "#536474", domain: [0, 1] },
    yaxis: { title: { text: "Option price" }, gridcolor: "#243849", zerolinecolor: "#536474", domain: hasDifference ? [0.36, 1] : [0, 1] },
    xaxis2: hasDifference ? { title: { text: "Spot (S)" }, gridcolor: "#243849", zerolinecolor: "#536474", domain: [0, 1] } : undefined,
    yaxis2: hasDifference ? { title: { text: "Error" }, gridcolor: "#243849", zerolinecolor: "#536474", domain: [0, 0.23] } : undefined,
  };

  const convergenceLayout: Partial<Layout> = {
    ...commonLayout,
    xaxis: { title: { text: "Paths" }, type: "log", gridcolor: "#243849", zerolinecolor: "#536474" },
    yaxis: { title: { text: "Price" }, gridcolor: "#243849", zerolinecolor: "#536474" },
  };

  const pathsLayout: Partial<Layout> = {
    ...commonLayout,
    xaxis: { title: { text: "Time (years)" }, gridcolor: "#243849", zerolinecolor: "#536474" },
    yaxis: { title: { text: "Spot" }, gridcolor: "#243849", zerolinecolor: "#536474" },
  };

  const plotData = visibleTab === "surface" ? surfaceData : visibleTab === "slice" ? sliceData : visibleTab === "convergence" ? convergenceData : pathsData;
  const plotLayout = visibleTab === "surface" ? surfaceLayout : visibleTab === "slice" ? sliceLayout : visibleTab === "convergence" ? convergenceLayout : pathsLayout;

  return (
    <div className="chart-content">
      <div className="chart-heading-row">
        <div className="chart-title-group">
          <h2>Price surface</h2>
          {barrierLevel != null ? <span className={`barrier-state ${barrierTriggered ? "triggered" : ""}`}>H={barrierLevel} · {barrierTriggered ? "triggered" : "not triggered"}</span> : null}
        </div>
        {response ? (
          <label className="active-method-select">
            <span>Active method</span>
            <select aria-label="Active method" value={activeResult?.method ?? activeMethod} onChange={(event) => onActiveMethodChange(event.currentTarget.value as SolverMethod)}>
              {response.results.map((result) => <option key={result.method} value={result.method}>{resultLabel(result)}</option>)}
            </select>
          </label>
        ) : null}
      </div>
      <div className="chart-tabs" role="tablist" aria-label="Visualization">
        {tabs.map((item) => <button
          key={item.id}
          id={`chart-tab-${item.id}`}
          type="button"
          role="tab"
          aria-controls="chart-tabpanel"
          aria-selected={visibleTab === item.id}
          tabIndex={visibleTab === item.id ? 0 : -1}
          className={visibleTab === item.id ? "active" : ""}
          disabled={item.disabled}
          onClick={() => setTab(item.id)}
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
              event.preventDefault();
              selectAdjacentTab(visibleTab, event.key === "ArrowLeft" ? -1 : 1);
            }
          }}
        >{item.label}</button>)}
      </div>

      <div id="chart-tabpanel" role="tabpanel" aria-labelledby={`chart-tab-${visibleTab}`} className={`chart-stage ${loading ? "loading" : ""}`} aria-busy={loading}>
        <p className="sr-only">{chartLabel}</p>
        {activeResult ? (
          <ScientificPlot data={plotData} layout={plotLayout} label={chartLabel} />
        ) : (
          <div className="chart-empty">
            <span className="status-spinner" />
            <p>{loading ? "Solving default problem…" : "Start the solver API, then press Solve."}</p>
          </div>
        )}
      </div>

      {activeResult && (visibleTab === "surface" || visibleTab === "slice") ? (
        <>
          <label className="slice-control">
            <span>Slice at τ = {activeResult.surface.times_to_maturity[selectedIndex].toFixed(2)} yr</span>
            <input
              type="range"
              min={0}
              max={activeResult.surface.times_to_maturity.length - 1}
              value={selectedIndex}
              onChange={(event) => setSliceIndex(event.currentTarget.valueAsNumber)}
            />
          </label>
          {family === "asian" ? (
            <label className="slice-control">
              <span>Fixed average state A = {averageState.toFixed(2)}</span>
              <input type="range" min={1} max={300} step={1} value={averageState} onChange={(event) => onAverageStateChange(event.currentTarget.valueAsNumber)} />
            </label>
          ) : null}
        </>
      ) : null}
      {visibleTab === "paths" ? <p className="chart-note">Displayed paths are a small sample, not the full pricing population.</p> : null}
    </div>
  );
}
