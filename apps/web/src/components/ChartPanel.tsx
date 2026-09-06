import { useMemo, useState } from "react";
import createPlotlyComponent from "react-plotly.js/factory";
import Plotly from "plotly.js-dist-min";
import type { Data, Layout } from "plotly.js";
import type { SolveResult } from "../types";

const plotFactory = (
  createPlotlyComponent as unknown as { default?: typeof createPlotlyComponent }
).default ?? createPlotlyComponent;
const Plot = plotFactory(Plotly);

type ChartTab = "surface" | "slice";

const plotConfig = {
  displaylogo: false,
  responsive: true,
  scrollZoom: true,
  modeBarButtonsToRemove: ["toImage", "sendDataToCloud", "lasso2d", "select2d"] as never[],
};

const baseFont = { family: "Inter, ui-sans-serif, system-ui, sans-serif", color: "#dfe8ef", size: 12 };

export function ChartPanel({ result, loading }: { result: SolveResult | null; loading: boolean }) {
  const [tab, setTab] = useState<ChartTab>("surface");
  const [sliceIndex, setSliceIndex] = useState<number | null>(null);

  const selectedIndex = result
    ? Math.min(sliceIndex ?? result.surface.times_to_maturity.length - 1, result.surface.times_to_maturity.length - 1)
    : 0;

  const surfaceData = useMemo<Data[]>(() => {
    if (!result) return [];
    const { spots, times_to_maturity: times, prices } = result.surface;
    const lineValues = prices[selectedIndex];
    return [
      {
        type: "surface",
        x: spots,
        y: times,
        z: prices,
        colorscale: [
          [0, "#171a57"],
          [0.28, "#075b93"],
          [0.56, "#07a88f"],
          [0.78, "#8bcf43"],
          [1, "#ffcb2c"],
        ],
        colorbar: { title: { text: "Price", font: baseFont }, orientation: "h", x: 0.5, y: -0.08, len: 0.58, thickness: 10, tickfont: baseFont },
        contours: { x: { show: true, color: "rgba(255,255,255,.28)", width: 1 }, y: { show: true, color: "rgba(255,255,255,.28)", width: 1 } },
        hovertemplate: "Spot %{x:.2f}<br>τ %{y:.3f} yr<br>Price %{z:.4f}<extra>Closed form</extra>",
        showscale: true,
      },
      {
        type: "scatter3d",
        mode: "lines",
        x: spots,
        y: spots.map(() => times[selectedIndex]),
        z: lineValues,
        line: { color: "#f6f3ea", width: 5 },
        hoverinfo: "skip",
        showlegend: false,
      },
    ] as Data[];
  }, [result, selectedIndex]);

  const sliceData = useMemo<Data[]>(() => {
    if (!result) return [];
    return [{
      type: "scatter",
      mode: "lines",
      x: result.surface.spots,
      y: result.surface.prices[selectedIndex],
      line: { color: "#22d3e6", width: 3 },
      fill: "tozeroy",
      fillcolor: "rgba(34,211,230,.08)",
      hovertemplate: "Spot %{x:.2f}<br>Price %{y:.4f}<extra>Closed form</extra>",
    } as Data];
  }, [result, selectedIndex]);

  const commonLayout: Partial<Layout> = {
    autosize: true,
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    font: baseFont,
    margin: { l: 54, r: 24, t: 20, b: 72 },
    showlegend: false,
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

  const sliceLayout: Partial<Layout> = {
    ...commonLayout,
    xaxis: { title: { text: "Spot (S)" }, gridcolor: "#243849", zerolinecolor: "#536474" },
    yaxis: { title: { text: "Option price" }, gridcolor: "#243849", zerolinecolor: "#536474" },
  };

  return (
    <div className="chart-content">
      <div className="chart-heading-row">
        <h2>Price surface</h2>
        <span className="method-legend"><span />Closed form</span>
      </div>
      <div className="chart-tabs" role="tablist" aria-label="Visualization">
        <button role="tab" aria-selected={tab === "surface"} className={tab === "surface" ? "active" : ""} onClick={() => setTab("surface")}>Surface</button>
        <button role="tab" aria-selected={tab === "slice"} className={tab === "slice" ? "active" : ""} onClick={() => setTab("slice")}>Price slice</button>
        <button role="tab" disabled title="Available with Monte Carlo in Phase 2">Convergence</button>
        <button role="tab" disabled title="Available with Monte Carlo in Phase 2">Paths</button>
      </div>

      <div className={`chart-stage ${loading ? "loading" : ""}`} aria-busy={loading}>
        {result ? (
          <Plot
            data={tab === "surface" ? surfaceData : sliceData}
            layout={tab === "surface" ? surfaceLayout : sliceLayout}
            config={plotConfig}
            useResizeHandler
            style={{ width: "100%", height: "100%" }}
          />
        ) : (
          <div className="chart-empty">
            <span className="status-spinner" />
            <p>{loading ? "Solving default problem…" : "Start the solver API, then press Solve."}</p>
          </div>
        )}
      </div>

      {result ? (
        <label className="slice-control">
          <span>Slice at τ = {result.surface.times_to_maturity[selectedIndex].toFixed(2)} yr</span>
          <input
            type="range"
            min={0}
            max={result.surface.times_to_maturity.length - 1}
            value={selectedIndex}
            onChange={(event) => setSliceIndex(event.currentTarget.valueAsNumber)}
          />
        </label>
      ) : null}
    </div>
  );
}
