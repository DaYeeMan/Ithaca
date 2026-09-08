// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

const { loadWorkbench } = vi.hoisted(() => ({ loadWorkbench: vi.fn() }));
vi.mock("./IthacaWorkbench", () => {
  loadWorkbench();
  return { default: () => <main><h1>Ithaca test workbench</h1></main> };
});
vi.mock("./troy/TroyWorkbench", () => ({ default: () => <main><h1>Troy test workbench</h1></main> }));

beforeEach(() => {
  window.history.replaceState(null, "", "/");
  vi.stubGlobal("fetch", vi.fn());
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false })));
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("CapitalCanvas route boundaries", () => {
  it("keeps home sections in one document without importing the workbench or fetching", async () => {
    const { container } = render(<App />);
    const home = container.querySelector("#home");
    const resources = container.querySelector("#resources");
    const about = container.querySelector("#about");
    expect(home).toBeInTheDocument();
    expect(resources).toBeInTheDocument();
    expect(about).toBeInTheDocument();
    const navigation = screen.getByRole("navigation", { name: "Main" });
    for (const name of ["Home", "Resources", "About"]) {
      expect(within(navigation).getByRole("link", { name })).toHaveAttribute("href", `/#${name.toLowerCase()}`);
    }
    window.location.hash = "resources";
    await waitFor(() => expect(document.activeElement).toBe(resources));
    expect(container.querySelector("#home")).toBe(home);
    expect(loadWorkbench).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
    expect(screen.getByRole("link", { name: /Launch Ithaca/ })).toHaveAttribute("href", "/tools/ithaca");
    expect(screen.getByRole("link", { name: /Launch Troy/ })).toHaveAttribute("href", "/tools/troy");
  });

  it.each(["/privacy", "/terms", "/disclaimer", "/notices"])("renders %s with a publication date and shared home anchors", (path) => {
    window.history.replaceState(null, "", path);
    render(<App />);
    expect(screen.getByText("Updated September 8, 2026")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Resources" })).toHaveAttribute("href", "/#resources");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("keeps initial hash positioning scheduled when a scroll event arrives during mount", () => {
    const frames = new Map<number, FrameRequestCallback>();
    let nextFrame = 0;
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      frames.set(++nextFrame, callback);
      return nextFrame;
    });
    vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id));
    window.history.replaceState(null, "", "/#about");
    render(<App />);
    act(() => {
      window.dispatchEvent(new Event("scroll"));
      for (const callback of frames.values()) callback(0);
    });
    expect(document.activeElement).toBe(document.getElementById("about"));
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({ behavior: "instant" });
  });

  it("opens the project dropdown for a direct paper reference", async () => {
    window.history.replaceState(null, "", "/#crr");
    const { container } = render(<App />);
    await waitFor(() => expect(document.activeElement).toBe(document.getElementById("crr")));
    expect(container.querySelector("details.resource-project")).toHaveAttribute("open");
    expect(screen.queryByText(/Used in Ithaca/)).not.toBeInTheDocument();
    expect(screen.getAllByText("Implementation").length).toBeGreaterThan(0);
    expect(within(container.querySelector("#about") as HTMLElement).getByText("Emmanuel Zhang")).toBeInTheDocument();
  });

  it("does not treat Resources or About as separate pages", () => {
    window.history.replaceState(null, "", "/about");
    render(<App />);
    expect(screen.getByRole("heading", { name: "Page not found" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Return home" })).toHaveAttribute("href", "/#home");
  });

  it("loads the workbench only on its tool route", async () => {
    window.history.replaceState(null, "", "/tools/ithaca");
    render(<App />);
    expect(await screen.findByRole("heading", { name: "Ithaca test workbench" })).toBeInTheDocument();
    expect(loadWorkbench).toHaveBeenCalledTimes(1);
    expect(document.title).toBe("Ithaca — CapitalCanvas");
  });
  it("loads Troy directly on its own route", async () => {
    window.history.replaceState(null, "", "/tools/troy");
    render(<App />);
    expect(await screen.findByRole("heading", { name: "Troy test workbench" })).toBeInTheDocument();
    expect(document.title).toBe("Troy — CapitalCanvas");
    expect(fetch).not.toHaveBeenCalled();
  });
});
