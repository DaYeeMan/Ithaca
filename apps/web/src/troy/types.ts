export type Dynamics = 'gbm' | 'heston' | 'merton'
export type Pricing = 'bs' | 'crr' | 'mc' | 'heston'
/** Times in years; rates/vols as decimals; prices and costs per one-unit contract. */
export interface Config {
  seed: number; dynamics: Dynamics; pricing: Pricing; optionType: 'call' | 'put'
  spot: number; strike: number; maturity: number; horizon: number; steps: number
  drift: number; rate: number; dividendYield: number; volatility: number; pricingVolatility: number
  initialVariance: number; longRunVariance: number; meanReversion: number; volOfVol: number; correlation: number
  pricingInitialVariance: number; pricingLongRunVariance: number; pricingMeanReversion: number; pricingVolOfVol: number; pricingCorrelation: number
  jumpIntensity: number; jumpMean: number; jumpVolatility: number
  halfSpread: number; inventorySkew: number; fillIntensity: number; fillSensitivity: number
  /** Contracts per arrival; buyFlowBalance is the fraction of customers buying (dealer sells). */
  quoteSize: number; buyFlowBalance: number; inventoryLimit: number; hedgeEvery: number; hedgeEnabled: boolean
  optionCost: number; hedgeCostBps: number; pricingPaths: number; pricingSteps: number; treeSteps: number; samplePaths: number
}
export interface Observation {
  time: number; spot: number; variance: number; fairValue: number; delta: number
  bid: number; ask: number; inventory: number; hedgePosition: number; netDelta: number
  cash: number; realizedPnl: number; unrealizedPnl: number; hedgePnl: number; transactionCosts: number; totalPnl: number; drawdown: number
  bidFills: number; askFills: number
}
export interface Fill { step: number; time: number; side: 'buy' | 'sell'; quantity: number; price: number; count: number }
export interface ReturnStatistics { count: number; mean: number; standardDeviation: number; annualizedVolatility: number; skewness: number; excessKurtosis: number; min: number; max: number }
export interface SimulationResult {
  config: Config; observations: Observation[]; samplePaths: number[][]; fills: Fill[]; logReturns: number[]
  statistics: ReturnStatistics
  summary: { realizedPnl: number; unrealizedPnl: number; hedgePnl: number; totalPnl: number; transactionCosts: number; maxDrawdown: number; totalFills: number; finalInventory: number; averageSpreadCaptured: number; hedgePosition: number }
  pricingLabel: string; warnings: string[]
}

/** Quote prices and reference value, in currency per contract. */
export interface Quote { fairValue: number; bid: number; ask: number }
/** Arrival counts by dealer side, before inventory clipping. */
export interface ArrivalCounts { buyCount: number; sellCount: number }
export interface RandomSource { uniform(): number; normal(): number; poisson(lambda: number): number }
export type QuotePolicy = (config: Config, fairValue: number, inventory: number) => Quote
export type ArrivalPolicy = (config: Config, quote: Quote, dt: number, rng: RandomSource) => ArrivalCounts
export type DynamicsStep = (config: Config, spot: number, variance: number, dt: number, rng: RandomSource, riskNeutral?: boolean) => [number, number]
export type PricingFunction = (config: Config, spot?: number, time?: number) => number

/** History includes the current spot. Modules must not mutate it or config. */
export interface MarketContext { spot: number; variance: number; time: number; history: readonly number[] }
export interface DynamicsTransition {
  (config: Config, context: MarketContext & { dt: number; rng: RandomSource }): [number, number]
}
export interface PricingModel {
  (config: Config, context: MarketContext): { value: number; delta: number }
}
export interface ContractPayoff {
  (config: Config, context: MarketContext): number
}
/** Inject inside a Worker; function modules themselves cannot be structured-cloned. */
export interface SimulationModules {
  dynamics?: DynamicsTransition
  pricing?: PricingModel
  contract?: ContractPayoff
  quote?: QuotePolicy
  arrivals?: ArrivalPolicy
}
