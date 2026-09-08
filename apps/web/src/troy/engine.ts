import type { Config, Observation, SimulationResult, ReturnStatistics, Fill, QuotePolicy, ArrivalPolicy, DynamicsTransition, PricingModel, ContractPayoff, SimulationModules } from './types'
export type { Config, SimulationResult } from './types'

export const defaultConfig: Config = {
  seed: 1729, dynamics: 'gbm', pricing: 'bs', optionType: 'call', spot: 100, strike: 100,
  maturity: 1, horizon: 0.25, steps: 180, drift: 0.06, rate: 0.03, dividendYield: 0, volatility: 0.2, pricingVolatility: 0.2,
  initialVariance: 0.04, longRunVariance: 0.04, meanReversion: 2, volOfVol: 0.4, correlation: -0.7,
  pricingInitialVariance: 0.04, pricingLongRunVariance: 0.04, pricingMeanReversion: 2, pricingVolOfVol: 0.4, pricingCorrelation: -0.7,
  jumpIntensity: 2, jumpMean: -0.06, jumpVolatility: 0.12,
  halfSpread: 0.15, inventorySkew: 0.02, fillIntensity: 400, fillSensitivity: 4,
  quoteSize: 1, buyFlowBalance: 0.5, inventoryLimit: 20, hedgeEvery: 5, hedgeEnabled: true, optionCost: 0.01, hedgeCostBps: 1,
  pricingPaths: 512, pricingSteps: 16, treeSteps: 60, samplePaths: 30,
}

export function randomSource(seed: number) {
  let state = seed >>> 0
  const uniform = () => {
    state += 0x6D2B79F5
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const normal = () => Math.sqrt(-2 * Math.log(Math.max(uniform(), 1e-12))) * Math.cos(2 * Math.PI * uniform())
  // Split large intensities into independent exact Poisson draws, avoiding exp underflow.
  const poisson = (lambda: number) => {
    let count = 0
    while (lambda > 0) {
      const part = Math.min(lambda, 20), threshold = Math.exp(-part)
      let product = 1, k = 0
      do { product *= uniform(); k++ } while (product > threshold)
      count += k - 1; lambda -= part
    }
    return count
  }
  return { uniform, normal, poisson }
}
function numericalGuard(value: number, label: string, minimum = -Infinity): number {
  if (!Number.isFinite(value) || value < minimum) {
    throw new Error(`Numerical overflow/underflow in ${label}; reduce horizon, drift, volatility, or jump parameters.`)
  }
  return value
}
// Reject subnormal spots as well as zero: delta bumps and price ratios lose precision there.
const positiveSpot = (value: number) => numericalGuard(value, 'spot path', 2.2250738585072014e-308)
function checkedState(spot: number, variance: number): [number, number] {
  return [positiveSpot(spot), numericalGuard(variance, 'variance path', 0)]
}
const payoff = (s: number, k: number, put: boolean) => Math.max(put ? k - s : s - k, 0)
const cdf = (x: number) => {
  const z = Math.abs(x), t = 1 / (1 + 0.2316419 * z)
  const p = 1 - Math.exp(-z * z / 2) / Math.sqrt(2 * Math.PI) * t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))))
  return x >= 0 ? p : 1 - p
}
export function blackScholes(spot: number, strike: number, time: number, rate: number, volatility: number, optionType: 'call' | 'put', dividendYield = 0) {
  const put = optionType === 'put'
  if (time <= 0) return payoff(spot, strike, put)
  spot *= Math.exp(-dividendYield * time)
  const discountedStrike = strike * Math.exp(-rate * time)
  if (volatility === 0) return payoff(spot, discountedStrike, put)
  const d1 = (Math.log(spot / strike) + (rate + volatility * volatility / 2) * time) / (volatility * Math.sqrt(time))
  const d2 = d1 - volatility * Math.sqrt(time)
  return Math.max(0, put ? discountedStrike * cdf(-d2) - spot * cdf(-d1) : spot * cdf(d1) - discountedStrike * cdf(d2))
}

export function advance(c: Config, s: number, v: number, dt: number, rng: ReturnType<typeof randomSource>, riskNeutral = false): [number, number] {
  const z = rng.normal(), mu = riskNeutral ? c.rate - c.dividendYield : c.drift
  if (c.dynamics === 'heston') {
    const positive = Math.max(v, 0)
    const nextV = Math.max(0, v + c.meanReversion * (c.longRunVariance - positive) * dt + c.volOfVol * Math.sqrt(positive * dt) * (c.correlation * z + Math.sqrt(1 - c.correlation ** 2) * rng.normal()))
    return checkedState(s * Math.exp((mu - positive / 2) * dt + Math.sqrt(positive * dt) * z), nextV)
  }
  let jump = 0, compensation = 0
  if (c.dynamics === 'merton') {
    const count = rng.poisson(c.jumpIntensity * dt)
    if (count) jump = count * c.jumpMean + Math.sqrt(count) * c.jumpVolatility * rng.normal()
    compensation = c.jumpIntensity * Math.expm1(c.jumpMean + c.jumpVolatility ** 2 / 2)
  }
  return checkedState(s * Math.exp((mu - compensation - c.volatility ** 2 / 2) * dt + c.volatility * Math.sqrt(dt) * z + jump), c.volatility ** 2)
}

/** Selected pricing law is independent of the true dynamics. MC means risk-neutral GBM. */
export function priceOption(c: Config, spot = c.spot, time = c.maturity): number {
  positiveSpot(spot)
  return numericalGuard(priceOptionUnchecked(c, spot, time), `${c.pricing} option price`, 0)
}
function priceOptionUnchecked(c: Config, spot: number, time: number): number {
  const put = c.optionType === 'put'
  if (time <= 0) return payoff(spot, c.strike, put)
  if (c.pricing === 'bs') return blackScholes(spot, c.strike, time, c.rate, c.pricingVolatility, c.optionType, c.dividendYield)
  if (c.pricing === 'crr') {
    if (c.pricingVolatility === 0) return blackScholes(spot, c.strike, time, c.rate, 0, c.optionType, c.dividendYield)
    const n = c.treeSteps, dt = time / n, u = Math.exp(c.pricingVolatility * Math.sqrt(dt)), d = 1 / u
    const p = (Math.exp((c.rate - c.dividendYield) * dt) - d) / (u - d)
    if (p < 0 || p > 1) throw new Error('CRR probability outside [0,1]; increase treeSteps or volatility.')
    const values = Array.from({ length: n + 1 }, (_, j) => payoff(spot * u ** j * d ** (n - j), c.strike, put))
    for (let i = n - 1; i >= 0; i--) for (let j = 0; j <= i; j++) values[j] = Math.exp(-c.rate * dt) * ((1 - p) * values[j] + p * values[j + 1])
    return values[0]
  }
  // Reset stream for common random numbers across spot bumps and successive marks.
  const rng = randomSource(c.seed ^ 0x50726963)
  let sum = 0
  const pc = { ...c, dynamics: 'heston' as const, initialVariance: c.pricingInitialVariance, longRunVariance: c.pricingLongRunVariance, meanReversion: c.pricingMeanReversion, volOfVol: c.pricingVolOfVol, correlation: c.pricingCorrelation }
  for (let i = 0; i < c.pricingPaths; i++) {
    let terminal = spot
    if (c.pricing === 'mc') terminal *= Math.exp((c.rate - c.dividendYield - c.pricingVolatility ** 2 / 2) * time + c.pricingVolatility * Math.sqrt(time) * rng.normal())
    else {
      let variance = c.pricingInitialVariance
      for (let j = 0; j < c.pricingSteps; j++) [terminal, variance] = advance(pc, terminal, variance, time / c.pricingSteps, rng, true)
    }
    positiveSpot(terminal)
    sum += payoff(terminal, c.strike, put)
  }
  return Math.exp(-c.rate * time) * sum / c.pricingPaths
}
export function optionDelta(c: Config, spot = c.spot, time = c.maturity) {
  const bump = spot * 0.001
  return numericalGuard((priceOption(c, spot + bump, time) - priceOption(c, spot - bump, time)) / (2 * bump), 'option delta')
}
export function returnStatistics(values: number[], dt: number): ReturnStatistics {
  const count = values.length
  if (!count) return { count: 0, mean: 0, standardDeviation: 0, annualizedVolatility: 0, skewness: 0, excessKurtosis: 0, min: 0, max: 0 }
  const mean = values.reduce((a, b) => a + b, 0) / count
  const moment = (power: number) => values.reduce((a, b) => a + (b - mean) ** power, 0) / count
  const variance = moment(2), sd = Math.sqrt(variance)
  return { count, mean, standardDeviation: sd, annualizedVolatility: sd / Math.sqrt(dt), skewness: sd ? moment(3) / sd ** 3 : 0, excessKurtosis: sd ? moment(4) / sd ** 4 - 3 : 0, min: Math.min(...values), max: Math.max(...values) }
}
function validate(c: Config) {
  for (const [key, value] of Object.entries(c)) if (typeof value === 'number' && !Number.isFinite(value)) throw new Error(`${key} must be finite`)
  if (!['gbm', 'heston', 'merton'].includes(c.dynamics) || !['bs', 'crr', 'mc', 'heston'].includes(c.pricing) || !['call', 'put'].includes(c.optionType)) throw new Error('Unknown model or option type')
  for (const key of ['spot', 'strike', 'maturity', 'horizon'] as const) if (c[key] <= 0) throw new Error(`${key} must be positive`)
  if (c.horizon > c.maturity) throw new Error('horizon must not exceed maturity')
  for (const key of ['pricingInitialVariance', 'pricingLongRunVariance', 'pricingMeanReversion', 'pricingVolOfVol', 'volatility', 'pricingVolatility', 'initialVariance', 'longRunVariance', 'meanReversion', 'volOfVol', 'jumpIntensity', 'jumpVolatility', 'halfSpread', 'inventorySkew', 'fillIntensity', 'fillSensitivity', 'optionCost', 'hedgeCostBps'] as const) if (c[key] < 0) throw new Error(`${key} must be nonnegative`)
  if (Math.abs(c.correlation) > 1 || Math.abs(c.pricingCorrelation) > 1) throw new Error('correlation must be in [-1,1]')
  for (const [key, max] of Object.entries({ quoteSize: 1000, steps: 1000, pricingPaths: 4096, pricingSteps: 128, treeSteps: 250, samplePaths: 50, inventoryLimit: 1000, hedgeEvery: 1000 })) {
    const value = c[key as keyof Config] as number
    if (!Number.isInteger(value) || value < 1 || value > max) throw new Error(`${key} must be an integer in [1, ${max}]`)
  }
  if (c.buyFlowBalance < 0 || c.buyFlowBalance > 1) throw new Error('buyFlowBalance must be in [0,1]')
  const work = c.pricing === 'heston' ? c.pricingPaths * c.pricingSteps : c.pricing === 'mc' ? c.pricingPaths : c.pricing === 'crr' ? c.treeSteps ** 2 : 1
  if (3 * (c.steps + 1) * work > 50_000_000 || c.fillIntensity * c.horizon > 100_000 || c.jumpIntensity * c.horizon * c.samplePaths > 100_000) throw new Error('Compute budget exceeded; reduce steps, paths, or intensity')
}

/** Inventory shifts the quote center; prices are floored at zero. */
export const quotePolicy: QuotePolicy = (c, fairValue, inventory) => {
  const center = fairValue - c.inventorySkew * inventory
  return { fairValue, bid: Math.max(0, center - c.halfSpread), ask: Math.max(0, center + c.halfSpread) }
}
/** fillIntensity is TOTAL baseline arrivals/year, split by customer direction. */
export const arrivalCounts: ArrivalPolicy = (c, quote, dt, rng) => ({
  buyCount: rng.poisson((1 - c.buyFlowBalance) * c.fillIntensity * Math.exp(-c.fillSensitivity * Math.max(0, quote.fairValue - quote.bid)) * dt),
  sellCount: rng.poisson(c.buyFlowBalance * c.fillIntensity * Math.exp(-c.fillSensitivity * Math.max(0, quote.ask - quote.fairValue)) * dt),
})

export const defaultDynamics: DynamicsTransition = (c, context) =>
  advance(c, context.spot, context.variance, context.dt, context.rng)
export const defaultPricing: PricingModel = (c, context) => ({
  value: priceOption(c, context.spot, Math.max(0, c.maturity - context.time)),
  delta: optionDelta(c, context.spot, Math.max(0, c.maturity - context.time)),
})
export const defaultContract: ContractPayoff = (c, context) => payoff(context.spot, c.strike, c.optionType === 'put')

export function simulate(input: Config, modules: SimulationModules = {}): SimulationResult {
  if (!Number.isFinite(input.horizon)) throw new Error('horizon must be finite')
  const c = { ...input, horizon: Math.min(input.horizon, input.maturity) }; validate(c)
  const transition = modules.dynamics ?? defaultDynamics, pricing = modules.pricing ?? defaultPricing
  const contract = modules.contract ?? defaultContract, quoting = modules.quote ?? quotePolicy, arrivals = modules.arrivals ?? arrivalCounts
  const history = [c.spot]
  const dt = c.horizon / c.steps
  const marketRng = randomSource(c.seed), fillRng = randomSource(c.seed ^ 0x46696c6c)
  let spot = c.spot, variance = c.initialVariance, inventory = 0, basis = 0, realized = 0, cash = 0, hedge = 0, hedgeCash = 0, costs = 0, peak = 0, maxDrawdown = 0
  const observations: Observation[] = [], fills: Fill[] = [], logReturns: number[] = []
  for (let step = 0; step <= c.steps; step++) {
    const time = step === c.steps ? c.horizon : step * dt
    if (step) {
      const previous = spot
      // Continuous yield paid to long underlying holders (owed by shorts).
      hedgeCash += hedge * previous * Math.expm1(c.dividendYield * dt)
      ;[spot, variance] = checkedState(...transition(c, { spot, variance, dt, time: (step - 1) * dt, history, rng: marketRng }))
      history.push(spot)
    }
    const remaining = Math.max(0, c.maturity - time), context = { spot, variance, time, history }
    const mark = pricing(c, context)
    const fairValue = numericalGuard(remaining <= 1e-12 ? contract(c, context) : mark.value, 'contract value', 0)
    const delta = numericalGuard(mark.delta, 'option delta')
    // Resting quotes from the preceding observation are exposed for this interval.
    let bidFills = 0, askFills = 0
    if (step && remaining > 1e-12) {
      const quote = observations[step - 1]
      const { buyCount, sellCount } = arrivals(c, quote, dt, fillRng)
      const execute = (side: 'buy' | 'sell', count: number, price: number) => {
        const sign = side === 'buy' ? 1 : -1
        const quantity = Math.min(count * c.quoteSize, c.inventoryLimit - sign * inventory)
        if (!quantity) return
        const closing = inventory * sign < 0 ? Math.min(Math.abs(inventory), quantity) : 0
        realized += closing * (price - basis) * Math.sign(inventory)
        const next = inventory + sign * quantity
        if (inventory * sign >= 0) basis = (Math.abs(inventory) * basis + quantity * price) / Math.abs(next)
        else if (quantity > Math.abs(inventory)) basis = price
        else if (!next) basis = 0
        inventory = next; cash -= sign * quantity * price; costs += quantity * c.optionCost
        fills.push({ step, time, side, quantity, price, count: Math.ceil(quantity / c.quoteSize) })
        if (side === 'buy') bidFills += quantity; else askFills += quantity
      }
      // Randomize arrival-side ordering so clipping has no systematic buy-first bias.
      if (fillRng.uniform() < 0.5) { execute('buy', buyCount, quote.bid); execute('sell', sellCount, quote.ask) }
      else { execute('sell', sellCount, quote.ask); execute('buy', buyCount, quote.bid) }
    }
    if (c.hedgeEnabled && (step % c.hedgeEvery === 0 || remaining <= 1e-12)) {
      const target = remaining <= 1e-12 ? 0 : -inventory * delta, trade = target - hedge
      hedgeCash -= trade * spot; costs += Math.abs(trade) * spot * c.hedgeCostBps / 10000; hedge = target
    }
    if (remaining <= 1e-12) { cash += inventory * fairValue; realized += inventory * (fairValue - basis); inventory = 0; basis = 0 }
    const unrealizedPnl = inventory * (fairValue - basis), hedgePnl = hedgeCash + hedge * spot
    const totalPnl = numericalGuard(realized + unrealizedPnl + hedgePnl - costs, 'P&L accounting')
    peak = Math.max(peak, totalPnl); const drawdown = peak - totalPnl; maxDrawdown = Math.max(maxDrawdown, drawdown)
    const quote = quoting(c, fairValue, inventory)
    observations.push({ time, spot, variance, fairValue, delta, bid: quote.bid, ask: quote.ask, inventory, hedgePosition: hedge, netDelta: inventory * delta + hedge, cash: cash + hedgeCash - costs, realizedPnl: realized, unrealizedPnl, hedgePnl, transactionCosts: costs, totalPnl, drawdown, bidFills, askFills })
  }
  const samplePaths = [observations.map(o => o.spot)]
  for (let i = 1; i < c.samplePaths; i++) {
    const rng = randomSource(c.seed + i * 7919); let s = c.spot, v = c.initialVariance
    const path = [s]
    for (let j = 0; j < c.steps; j++) { [s, v] = checkedState(...transition(c, { spot: s, variance: v, dt, time: j * dt, history: path, rng })); path.push(s) }
    samplePaths.push(path)
  }
  // Pool each path exactly once; path zero is the traded path.
  for (const path of samplePaths) for (let j = 1; j < path.length; j++) logReturns.push(Math.log(path[j] / path[j - 1]))
  const last = observations[observations.length - 1]
  return { config: c, observations, samplePaths, fills, logReturns, statistics: returnStatistics(logReturns, dt), summary: { realizedPnl: last.realizedPnl, unrealizedPnl: last.unrealizedPnl, hedgePnl: last.hedgePnl, totalPnl: last.totalPnl, transactionCosts: costs, maxDrawdown, totalFills: fills.reduce((a, f) => a + f.count, 0), finalInventory: inventory, hedgePosition: hedge, averageSpreadCaptured: fills.length ? fills.reduce((sum, f) => sum + f.quantity * (f.side === 'buy' ? observations[f.step - 1].fairValue - f.price : f.price - observations[f.step - 1].fairValue), 0) / fills.reduce((sum, f) => sum + f.quantity, 0) : 0 }, pricingLabel: modules.pricing ? 'Custom pricing model' : { bs: 'Black–Scholes', crr: 'CRR European binomial tree', mc: 'GBM risk-neutral simulation', heston: 'Heston risk-neutral simulation' }[c.pricing], warnings: ['Cash financing is excluded; hedge dividends use interval-start holdings; P&L is per one-unit contract.', ...(c.pricing === 'heston' ? ['Heston uses bounded projected/truncated Euler variance steps and common random numbers; simulation and discretization error remain.'] : [])] }
}
