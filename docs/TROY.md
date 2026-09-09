# Troy: options market-making laboratory

## Experiment and architecture

Troy lives at `/tools/troy`, lazy-loaded separately from home. European vanilla calls and puts are the first contract family. Quantities use one-unit contracts, not exchange contracts with a 100-share multiplier.

`types.ts` defines experiments, quotes, arrivals, and results. `engine.ts` contains pure market transitions, independent pricing, quoting and arrival policies, and the cash/inventory ledger. `simulation.worker.ts` owns execution. `TroyWorkbench.tsx` debounces changes by 250 ms and terminates obsolete workers. Inputs and results remain in the browser.

Market, fill, and pricing RNGs use separate streams. The UI draws a fresh browser-random seed on opening Troy, switching true dynamics, resetting, or pressing New market. Changing pricing, hedging, or sample count preserves the traded underlying path. Enter a previous seed after choosing the dynamics to replay an experiment with identical settings. The engine itself remains deterministic. Path zero in Sample Paths is exactly the Market Making path. Statistics pool each path once.

Dynamics own spot/variance state. Pricing uses separate assumptions and risk-neutral drift `r−q`; it never reads true variance parameters. `simulate(config, modules)` accepts optional `DynamicsTransition`, `PricingModel`, `ContractPayoff`, quote, and arrival policies. Pricing consumes market context and returns value/delta; contract payoff receives spot, time, and path history. New dynamics or path-dependent contract adapters can therefore reuse the ledger. The initial UI exposes European vanilla options only; early exercise would also need an exercise-timing extension.

## Numerical conventions

- Time uses years. True `μ` is expected ex-dividend spot appreciation. GBM uses exact log steps. Merton adds Poisson lognormal jumps with the expected-jump drift compensator.
- Heston uses log-spot steps and projected/truncated Euler variance steps. Extreme volatility-of-volatility and coarse steps introduce bias. This is not an exact Heston sampler.
- Black–Scholes includes dividends. CRR is a European terminal-payoff tree; invalid risk-neutral probabilities produce an error.
- Monte Carlo prices risk-neutral GBM terminal payoffs. Heston pricing simulates separately configured risk-neutral variance. Common random numbers across marks and spot bumps stabilize values and finite-difference deltas. Heston pricing is a sampling approximation, not a closed-form or calibrated value.
- Effective horizon is the smaller of horizon and maturity. At maturity, options cash-settle at intrinsic value and hedges close. Earlier horizons retain open positions.

## Quotes and execution

Quote center is `fairValue − inventorySkew × inventory`. Bid and ask are center minus/plus half the base spread, floored at zero. Positive inventory shifts quotes down. Inventory limits clip quantities.

Customer sells hit the maker's bid; customer buys hit its ask. Each side has Poisson arrivals at its flow-weighted base intensity multiplied by `exp(−sensitivity × unfavorable quote distance)`. Base intensity is total orders per year before this reduction. The reference is the maker's fair value when the resting quote was posted. This simple model does not claim to represent informed flow or an independently calibrated true option market.

Prior-step quotes are exposed during each interval. No fills occur at time zero or settlement. Orders are aggregated by side, with randomized side ordering to avoid systematic buy-first clipping. A marker can represent several arrivals. Number of Fills counts filled arrivals; inventory and marker quantity count option units. Average Spread Captured is quantity-weighted execution edge against the posted quote's fair value, not round-trip profit.

## Accounting and bounds

Realized option P&L uses weighted-average basis. Unrealized P&L is inventory times model value minus basis. Underlying hedges maintain a separate position and cash account, rebalancing on the chosen cadence to offset model delta. Hedge dividends use interval-start holdings.

`Total P&L = realized + unrealized + hedge P&L − transaction costs`.

The total also reconciles to cash plus option inventory value plus hedge value. Costs include per-option-unit fees and underlying notional basis points. Cash financing is excluded. Starting capital is zero. Maximum drawdown measures loss from running peak equity, including the initial zero baseline.

The UI caps simulation steps at 1,000, sample paths at 50, and pricing paths at 2,048. Engine validation independently bounds work and rejects excessive requests. Invalid numerical states produce actionable errors. Previous completed results retain their model labels while recalculating.

## Verification and reference

Run `npm run test:web`, `npm run lint:web`, and `npm run build:web`. Tests cover analytical prices, dividend parity, CRR convergence, Monte Carlo constant-variance agreement, seeded isolation, pooled statistics, quote-width effects, arrival counts, hedging, settlement, costs, drawdown, ledger reconciliation, and numerical/compute guards. UI tests cover independent controls, cancellation, errors, conditional fields, keyboard tabs, and routing.

`docs/design/troy-concepts.png` is an exploratory concept board. The implementation follows the requested two-pane market chart, not the generated image's incidental option table.

Variance discretization background: [Halley, Malham and Wiese (2008), Positive stochastic volatility simulation](https://www.macs.hw.ac.uk/~simonm/psdesarxiv.pdf), including its discussion of Euler projection methods. Troy uses projected Euler variance, not the paper's proposed splitting method.

Local verification: 53 web tests passed, lint passed, and production build passed. Browser checks covered all four pricing models against Merton, Heston with Black–Scholes, both tabs, keyboard navigation, and 390 px mobile layout. Default Heston dynamics plus Heston pricing took approximately 380 ms in local Node; a near-budget configuration took 4.37 seconds. These are local measurements, not browser latency guarantees.
