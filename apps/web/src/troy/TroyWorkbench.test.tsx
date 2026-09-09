// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import TroyWorkbench from './TroyWorkbench';
import { defaultConfig, simulate } from './engine';
import type { Config, SimulationResult } from './types';
vi.mock('./TroyCharts', () => ({ TradingCharts: () => <div>Trading charts</div>, DynamicsCharts: () => <div>Dynamics charts</div> }));
class TestWorker {
  static instances: TestWorker[] = [];
  onmessage?: (event: { data: { result?: SimulationResult; error?: string } }) => void;
  onerror?: () => void;
  posted?: Config;
  terminate = vi.fn();
  constructor() { TestWorker.instances.push(this); }
  postMessage(config: Config) { this.posted = config; }
}
beforeEach(() => {
  vi.useFakeTimers(); TestWorker.instances = []; vi.stubGlobal('Worker', TestWorker);
  let nextSeed = 100;
  vi.stubGlobal('crypto', { getRandomValues: (values: Uint32Array) => { values[0] = ++nextSeed; return values; } });
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });
const tick = () => act(() => vi.advanceTimersByTime(260));
describe('Troy experiment controls', () => {
  it('keeps independent assumptions and parameter panel mounted across tabs', () => {
    render(<TroyWorkbench />);
    const sidebar = screen.getByRole('complementary');
    fireEvent.change(screen.getByLabelText('Dynamics model'), { target: { value: 'heston' } });
    expect(screen.getByLabelText('Pricing model')).toHaveValue('bs');
    expect(screen.getByRole('spinbutton', { name: 'Assumed volatility %' })).toHaveValue(20);
    expect(screen.getByLabelText('Initial variance v₀')).toHaveValue(.04);
    fireEvent.click(screen.getByRole('tab', { name: 'Market Dynamics' }));
    expect(screen.getByRole('complementary')).toBe(sidebar);
    expect(within(sidebar).getByLabelText('Dynamics model')).toHaveValue('heston');
    tick();
    expect(TestWorker.instances[0].posted).toMatchObject({ dynamics: 'heston', pricing: 'bs', pricingVolatility: .2 });
  });
  it('debounces, terminates superseded work, and replaces results coherently', () => {
    render(<TroyWorkbench />); tick();
    const first = TestWorker.instances[0];
    act(() => first.onmessage?.({ data: { result: simulate(defaultConfig) } }));
    expect(screen.getByText('Trading charts')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Assumed volatility %' }), { target: { value: '30' } });
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Assumed volatility %' }), { target: { value: '35' } });
    expect(first.terminate).toHaveBeenCalled();
    expect(TestWorker.instances).toHaveLength(1);
    expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-busy', 'true');
    tick();
    expect(TestWorker.instances).toHaveLength(2);
    expect(TestWorker.instances[1].posted?.pricingVolatility).toBe(.35);
    act(() => first.onmessage?.({ data: { error: 'Obsolete worker error' } }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    act(() => TestWorker.instances[1].onmessage?.({ data: { error: 'Compute budget exceeded' } }));
    expect(screen.getByRole('alert')).toHaveTextContent('Compute budget exceeded');
    fireEvent.click(screen.getByRole('button', { name: 'Reset' })); tick();
    expect(TestWorker.instances[2].posted).toEqual({ ...defaultConfig, seed: TestWorker.instances[2].posted?.seed });
    expect(TestWorker.instances[2].posted?.seed).not.toBe(first.posted?.seed);
  });
  it('switches tabs with keyboard and conditionally exposes model controls', () => {
    render(<TroyWorkbench />);
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Market Making' }), { key: 'ArrowRight' });
    expect(screen.getByRole('tab', { name: 'Market Dynamics' })).toHaveFocus();
    fireEvent.change(screen.getByLabelText('Dynamics model'), { target: { value: 'merton' } });
    expect(screen.getByRole('spinbutton', { name: 'Jump intensity λ /yr' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Initial variance v₀')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Pricing model'), { target: { value: 'heston' } });
    expect(screen.queryByRole('spinbutton', { name: 'Assumed volatility %' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Pricing paths')).toBeInTheDocument();
  });
  it('allows clearing number fields and restores the last valid value on blur', () => {
    render(<TroyWorkbench />);
    const spot = screen.getByRole('spinbutton', { name: 'Initial spot S₀ $' });
    fireEvent.change(spot, { target: { value: '' } });
    expect(spot).toHaveValue(null);
    fireEvent.blur(spot);
    expect(spot).toHaveValue(100);
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Drift μ %' }), { target: { value: '-5' } });
    tick();
    expect(TestWorker.instances[0].posted?.drift).toBe(-.05);
  });
  it('draws new realizations on market switches and New market, while allowing seed replay', () => {
    render(<TroyWorkbench />); tick();
    fireEvent.change(screen.getByLabelText('Dynamics model'), { target: { value: 'merton' } }); tick();
    const firstMerton = TestWorker.instances.at(-1)!.posted!;
    fireEvent.change(screen.getByLabelText('Dynamics model'), { target: { value: 'gbm' } }); tick();
    fireEvent.change(screen.getByLabelText('Dynamics model'), { target: { value: 'merton' } }); tick();
    const secondMerton = TestWorker.instances.at(-1)!.posted!;
    expect(secondMerton.seed).not.toBe(firstMerton.seed);
    expect(simulate(secondMerton).samplePaths[0]).not.toEqual(simulate(firstMerton).samplePaths[0]);
    fireEvent.change(screen.getByLabelText('Random seed'), { target: { value: String(firstMerton.seed) } }); tick();
    expect(simulate(TestWorker.instances.at(-1)!.posted!).samplePaths[0]).toEqual(simulate(firstMerton).samplePaths[0]);
    fireEvent.change(screen.getByLabelText('Pricing model'), { target: { value: 'mc' } }); tick();
    expect(TestWorker.instances.at(-1)!.posted!.seed).toBe(firstMerton.seed);
    expect(within(screen.getByRole('complementary')).queryByText(/Maker Pricing Model:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/this is not a model-match indicator/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'New market' })); tick();
    expect(TestWorker.instances.at(-1)!.posted!.seed).not.toBe(firstMerton.seed);
  });
});


