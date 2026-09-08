import { describe, expect, it } from 'vitest'
import { advance, arrivalCounts, quotePolicy, blackScholes, defaultConfig, optionDelta, priceOption, randomSource, returnStatistics, simulate } from './engine'
import type { Config } from './types'
const config = (patch: Partial<Config> = {}): Config => ({ ...defaultConfig, steps: 40, samplePaths: 3, ...patch })

describe('European pricing', () => {
  it('matches analytical reference and dividend put-call parity', () => {
    expect(blackScholes(100, 100, 1, 0.05, 0.2, 'call')).toBeCloseTo(10.45058357, 4)
    expect(blackScholes(100, 100, 1, 0.05, 0.2, 'put')).toBeCloseTo(5.57352602, 4)
    const call = blackScholes(100, 105, 0.7, 0.04, 0.3, 'call', 0.02)
    const put = blackScholes(100, 105, 0.7, 0.04, 0.3, 'put', 0.02)
    expect(call - put).toBeCloseTo(100 * Math.exp(-0.02 * 0.7) - 105 * Math.exp(-0.04 * 0.7), 10)
  })
  it('handles expiry and deterministic zero volatility', () => {
    expect(blackScholes(90, 100, 0, 0.03, 0.2, 'put')).toBe(10)
    expect(blackScholes(100, 100, 1, 0.03, 0, 'call')).toBeCloseTo(100 - 100 * Math.exp(-0.03), 10)
  })
  it('CRR converges to Black–Scholes for calls and puts', () => {
    for (const optionType of ['call', 'put'] as const) {
      const c = config({ optionType, dividendYield: 0.02, treeSteps: 250 })
      expect(Math.abs(priceOption({ ...c, pricing: 'crr' }) - priceOption(c))).toBeLessThan(0.02)
    }
  })
  it('risk-neutral simulations agree with BS within sampling error', () => {
    const c = config({ pricingPaths: 4096, pricingVolOfVol: 0, pricingSteps: 32 })
    const analytic = priceOption(c)
    expect(Math.abs(priceOption({ ...c, pricing: 'mc' }) - analytic)).toBeLessThan(0.5)
    expect(Math.abs(priceOption({ ...c, pricing: 'heston' }) - analytic)).toBeLessThan(0.5)
    expect(optionDelta({ ...c, pricing: 'mc' })).toBeGreaterThan(0.4)
    expect(optionDelta({ ...c, pricing: 'mc' })).toBeLessThan(0.7)
  })
  it('Heston pricing uses independent risk-neutral parameters', () => {
    const c = config({ pricing: 'heston' })
    expect(priceOption(c)).toBe(priceOption({ ...c, initialVariance: 0.9, drift: 0.9, volOfVol: 2, dynamics: 'merton' }))
    expect(priceOption({ ...c, pricingInitialVariance: 0.2 })).not.toBe(priceOption(c))
  })
})

describe('seeded dynamics and bounded compute', () => {
  it('is reproducible and independent of pricing, fills and sample count', () => {
    const c = config()
    const a = simulate(c)
    expect(simulate(c)).toEqual(a)
    const b = simulate({ ...c, pricing: 'mc', samplePaths: 8, fillIntensity: 0 })
    expect(b.samplePaths[0]).toEqual(a.samplePaths[0])
    expect(simulate({ ...c, seed: 2 }).samplePaths[0]).not.toEqual(a.samplePaths[0])
  })
  it('GBM empirical one-year mean and log variance match the law', () => {
    const terminals = Array.from({ length: 1500 }, (_, seed) => simulate(config({ seed, steps: 1, samplePaths: 1, horizon: 1, fillIntensity: 0 })).logReturns[0])
    const stats = returnStatistics(terminals, 1)
    expect(stats.mean).toBeCloseTo(defaultConfig.drift - 0.2 ** 2 / 2, 1)
    expect(stats.standardDeviation).toBeCloseTo(0.2, 2)
  })
  it('Heston variance stays nonnegative and Merton changes tails', () => {
    const h = simulate(config({ dynamics: 'heston', volOfVol: 2 }))
    expect(h.observations.every(o => o.variance >= 0 && o.spot > 0)).toBe(true)
    const m = simulate(config({ dynamics: 'merton', jumpIntensity: 40, jumpVolatility: 0.5 }))
    expect(m.samplePaths[0]).not.toEqual(simulate(config()).samplePaths[0])
    expect(m.statistics.standardDeviation).toBeGreaterThan(simulate(config()).statistics.standardDeviation)
  })
  it('rejects invalid inputs and excessive compute', () => {
    expect(() => simulate(config({ steps: 0 }))).toThrow()
    expect(() => simulate(config({ spot: NaN }))).toThrow()
    expect(() => simulate(config({ horizon: -1 }))).toThrow()
    expect(() => simulate(config({ pricing: 'heston', steps: 1000, pricingPaths: 4096, pricingSteps: 128 }))).toThrow(/budget/)
  })
  it('pools every sample path once and caps horizon without mutating input', () => {
    const c = config({ horizon: 2, maturity: 0.5, samplePaths: 7 })
    const result = simulate(c)
    const expected = result.samplePaths.flatMap(path => path.slice(1).map((s, i) => Math.log(s / path[i])))
    expect(result.logReturns).toEqual(expected)
    expect(result.statistics.count).toBe(c.steps * c.samplePaths)
    expect(result.config.horizon).toBe(0.5)
    expect(result.observations.at(-1)!.time).toBe(0.5)
    expect(result.summary.finalInventory).toBe(0)
    expect(c.horizon).toBe(2)
    expect(defaultConfig.samplePaths).toBe(30)
    expect(() => simulate(config({ samplePaths: 51 }))).toThrow()
  })
  it('true drift is the spot drift and does not subtract dividends', () => {
    for (const dynamics of ['gbm', 'heston', 'merton'] as const) {
      const c = config({ dynamics })
      expect(simulate({ ...c, dividendYield: 0.08 }).samplePaths).toEqual(simulate(c).samplePaths)
    }
    const result = simulate(config({ volatility: 0, drift: 0.06, dividendYield: 0.08 }))
    expect(result.samplePaths[0].at(-1)).toBeCloseTo(100 * Math.exp(0.06 * 0.25), 9)
  })
  it('rejects Merton underflow and explosive true paths with actionable errors', () => {
    expect(() => simulate(config({ dynamics: 'merton', jumpIntensity: 50, jumpMean: 1, jumpVolatility: 2, horizon: 5, maturity: 5, steps: 180 }))).toThrow(/Numerical overflow\/underflow.*reduce/)
    expect(() => advance(config({ drift: -10000 }), 100, 0.04, 1, randomSource(1))).toThrow(/spot path/)
    expect(() => simulate(config({ drift: 10000 }))).toThrow(/Numerical overflow\/underflow/)
  })
  it('rejects invalid pricing paths and nonfinite prices while permitting zero payoff', () => {
    expect(() => priceOption(config({ pricing: 'mc', pricingVolatility: 10000 }))).toThrow(/Numerical overflow\/underflow/)
    expect(() => priceOption(config({ pricing: 'heston', pricingInitialVariance: 1e10 }))).toThrow(/Numerical overflow\/underflow/)
    expect(() => priceOption(config({ rate: -10000 }))).toThrow(/Numerical overflow\/underflow.*option price/)
    expect(priceOption(config({ spot: 90 }), 90, 0)).toBe(0)
    expect(priceOption(config({ pricingVolatility: 0, spot: 90, rate: 0 }))).toBe(0)
  })
  it('Poisson sampler has the requested mean', () => {
    const rng = randomSource(42)
    const average = Array.from({ length: 10000 }, () => rng.poisson(3)).reduce((a, b) => a + b, 0) / 10000
    expect(Math.abs(average - 3)).toBeLessThan(0.08)
  })
})

describe('market making and accounting', () => {
  it('arrival policy splits total baseline intensity and applies quote distance', () => {
    const lambdas: number[] = []
    const rng = { uniform: () => 0.5, normal: () => 0, poisson: (lambda: number) => { lambdas.push(lambda); return 0 } }
    const c = config({ fillIntensity: 100, buyFlowBalance: 0.7, halfSpread: 0 })
    arrivalCounts(c, quotePolicy(c, 10, 0), 0.1, rng)
    expect(lambdas[0]).toBeCloseTo(3, 12)
    expect(lambdas[1]).toBeCloseTo(7, 12)
    lambdas.length = 0
    arrivalCounts(c, quotePolicy({ ...c, halfSpread: 0.5 }, 10, 0), 0.1, rng)
    expect(lambdas[0] + lambdas[1]).toBeCloseTo(10 * Math.exp(-c.fillSensitivity * 0.5), 12)
  })
  it('counts executed arrivals, including partial lots, independently from units', () => {
    const result = simulate(config({ fillIntensity: 10000, buyFlowBalance: 0, quoteSize: 3, inventoryLimit: 5, halfSpread: 0 }))
    expect(result.summary.totalFills).toBe(2)
    expect(result.fills.reduce((sum, f) => sum + f.quantity, 0)).toBe(5)
    expect(result.observations.reduce((sum, o) => sum + o.bidFills, 0)).toBe(5)
    expect(result.fills.every(f => f.count === Math.ceil(f.quantity / 3))).toBe(true)
  })
  it('reuses the ledger with injected dynamics, pricing, quotes and history payoff', () => {
    const result = simulate(config({ steps: 2, horizon: 1, maturity: 1, hedgeEnabled: false, optionCost: 0, quoteSize: 1 }), {
      dynamics: (_c, context) => [context.spot + 2, context.variance],
      pricing: () => ({ value: 7, delta: 0 }),
      quote: (_c, fairValue) => ({ fairValue, bid: 3, ask: 9 }),
      arrivals: () => ({ buyCount: 1, sellCount: 0 }),
      contract: (_c, context) => {
        expect(context.time).toBe(1)
        expect(context.spot).toBe(104)
        expect(context.history).toEqual([100, 102, 104])
        return context.history.reduce((a, b) => a + b, 0) / context.history.length - 100
      },
    })
    expect(result.samplePaths.every(path => path.join(',') === '100,102,104')).toBe(true)
    expect(result.fills[0].price).toBe(3)
    expect(result.summary.totalPnl).toBe(-1)
    expect(result.summary.realizedPnl).toBe(-1)
    expect(result.summary.finalInventory).toBe(0)
    expect(result.observations.at(-1)!.cash).toBe(-1)
  })
  it('no flow produces zero P&L, inventory and costs', () => {
    const result = simulate(config({ fillIntensity: 0 }))
    expect(result.summary.totalPnl).toBe(0)
    expect(result.summary.totalFills).toBe(0)
    expect(result.summary.transactionCosts).toBe(0)
  })
  it('reconciles cash ledger, P&L components, drawdown and inventory limits', () => {
    const result = simulate(config({ fillIntensity: 2000, inventoryLimit: 5, quoteSize: 3, dividendYield: 0.02 }))
    let peak = 0
    for (const o of result.observations) {
      expect(Math.abs(o.inventory)).toBeLessThanOrEqual(5)
      expect(o.totalPnl).toBeCloseTo(o.cash + o.inventory * o.fairValue + o.hedgePosition * o.spot, 8)
      expect(o.totalPnl).toBeCloseTo(o.realizedPnl + o.unrealizedPnl + o.hedgePnl - o.transactionCosts, 10)
      peak = Math.max(peak, o.totalPnl)
      expect(o.drawdown).toBeCloseTo(peak - o.totalPnl, 10)
    }
    expect(result.summary.maxDrawdown).toBe(Math.max(...result.observations.map(o => o.drawdown)))
  })
  it('settles calls and puts at exact expiry and closes hedge', () => {
    for (const optionType of ['call', 'put'] as const) {
      const result = simulate(config({ optionType, horizon: 1, steps: 30 }))
      const last = result.observations.at(-1)!
      expect(last.time).toBe(1)
      expect(last.inventory).toBe(0)
      expect(last.hedgePosition).toBe(0)
      expect(last.unrealizedPnl).toBe(0)
      expect(last.totalPnl).toBeCloseTo(last.cash, 8)
      expect(last.fairValue).toBe(optionType === 'call' ? Math.max(last.spot - 100, 0) : Math.max(100 - last.spot, 0))
    }
  })
  it('hedges delta on cadence and subtracts explicit costs', () => {
    const c = config({ hedgeEvery: 1 })
    const result = simulate(c)
    expect(result.observations.every(o => Math.abs(o.netDelta) < 1e-9)).toBe(true)
    const free = simulate({ ...c, optionCost: 0, hedgeCostBps: 0 })
    expect(free.summary.totalPnl - result.summary.totalPnl).toBeCloseTo(result.summary.transactionCosts, 9)
  })
  it('wider quotes reduce flow and skew lowers quotes for long inventory', () => {
    const tight = simulate(config({ halfSpread: 0.01, buyFlowBalance: 0, inventoryLimit: 1000 }))
    const wide = simulate(config({ halfSpread: 2, buyFlowBalance: 0, inventoryLimit: 1000 }))
    expect(tight.summary.totalFills).toBeGreaterThan(wide.summary.totalFills)
    const long = tight.observations.find(o => o.inventory > 0)!
    expect((long.bid + long.ask) / 2).toBeCloseTo(long.fairValue - defaultConfig.inventorySkew * long.inventory, 8)
    expect(tight.fills.every(f => f.side === 'buy')).toBe(true)
  })
})

