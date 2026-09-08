import { Component, lazy, Suspense, useEffect, type ReactNode } from "react";
import HomePage from "./site/HomePage";
import InformationPage from "./site/InformationPage";
import "./site/site.css";

const IthacaWorkbench = lazy(() => import("./IthacaWorkbench"));
const titles: Record<string, string> = {
  "/": "CapitalCanvas — Quantitative tools",
  "/tools/ithaca": "Ithaca — CapitalCanvas",
  "/notices": "Attributions — CapitalCanvas",
  "/privacy": "Privacy — CapitalCanvas",
  "/terms": "Terms of use — CapitalCanvas",
  "/disclaimer": "Disclaimer — CapitalCanvas",
};

class WorkbenchBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed
      ? <main className="route-message"><h1>Ithaca could not load</h1><p>Refresh the page to try again.</p><a href="/#home">Return to CapitalCanvas</a></main>
      : this.props.children;
  }
}

export default function App() {
  // Cross-page links use browser navigation. Hash links keep HomePage mounted.
  const path = window.location.pathname.replace(/\/+$/, "") || "/";
  useEffect(() => {
    document.title = titles[path] ?? "Page not found — CapitalCanvas";
    const description = document.querySelector('meta[name="description"]');
    description?.setAttribute("content", path === "/tools/ithaca"
      ? "Explore theoretical option prices with Ithaca, CapitalCanvas's interactive quantitative workbench."
      : "CapitalCanvas: educational quantitative tools, transparent assumptions, and research behind the methods.");
    let robots = document.querySelector('meta[name="robots"]');
    if (!robots) { robots = document.createElement("meta"); robots.setAttribute("name", "robots"); document.head.appendChild(robots); }
    robots.setAttribute("content", path === "/" || path === "/tools/ithaca" ? "index,follow" : "noindex,follow");
  }, [path]);

  if (path === "/tools/ithaca") return <WorkbenchBoundary>
    <Suspense fallback={<main className="route-message" aria-busy="true"><p role="status">Loading Ithaca…</p><a href="/#home">Return to CapitalCanvas</a></main>}>
      <div className="ithaca-workbench"><IthacaWorkbench /></div>
    </Suspense>
  </WorkbenchBoundary>;
  return path === "/" ? <HomePage /> : <InformationPage path={path} />;
}
