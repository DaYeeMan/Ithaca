# CapitalCanvas product context

## Purpose and scope

CapitalCanvas helps people understand quantitative finance through visualization and experimentation. It is a personal, noncommercial education and research project. Outputs are theoretical estimates, not investment advice, executable quotes, or promises of returns.

The site name is CapitalCanvas; the displayed wordmark is Capital Canvas. The public About attribution is Emmanuel Zhang, with contact `dymteam23@gmail.com`.

Two tools exist: Ithaca and Troy. The third home slot is Coming soon, without a defined name, feature set, or release date. Historical implementation plans are not requirements for that tool.

The current product has no accounts, database, saved results, live market data, or trading execution. These describe the existing product rather than restrictions on future planning.

## Site and navigation

- `/` contains Home, Research and methods, About, and the footer in one scrolling document.
- `/#home`, `/#resources`, and `/#about` target sections of that document. Resources and About are not separate pages.
- `/tools/ithaca` and `/tools/troy` open independent workbenches with a return link to home.
- `/privacy`, `/terms`, `/disclaimer`, and `/notices` contain policy and attribution content.
- Unknown paths show a not-found view with a home link.

Home currently says “Explore pricing and market dynamics” and “Visual tools for understanding financial models.” Ithaca and Troy each have a preview and launch link; the third card is non-interactive.

Research entries are grouped by tool in collapsible sections. They include source metadata, original summaries, and implementation notes that distinguish published models from project approximations. Stable paper anchors open the containing group. Ithaca also exposes method references within its sidebar.

## Ithaca: option pricing

Ithaca compares analytical and numerical option prices across parameters. It supports European, American, continuous zero-rebate single-barrier, and discrete fixed-strike Asian calls and puts, with methods enabled according to contract compatibility.

The workbench combines input controls, synchronized charts, scalar results, governing equations, uncertainty, convergence, and numerical diagnostics. Desktop places controls left, charts centrally, and explanations right. Mobile prioritizes charts and uses accessible control sheets.

Useful model distinctions:

- European pricing includes Black–Scholes, finite differences, and Monte Carlo.
- American pricing includes a binomial tree, an exercise-constrained finite-difference method, and Longstaff–Schwartz simulation.
- Barrier contracts use continuous monitoring and no rebate. Touching the barrier activates a knock-in or deactivates a knock-out. Monte Carlo uses Brownian-bridge survival weighting.
- Asian contracts use equally spaced future observations, excluding initial spot. Geometric averages have an analytical benchmark; arithmetic Monte Carlo uses a geometric control variate. The augmented-state method is a tree with running-average interpolation, despite its API grouping under `finite_difference`.
- Rates are continuously compounded, volatility and rates use decimal values in API contracts, and time is measured in years. Seeded stochastic results are reproducible; displayed paths may be a subset of the pricing sample.

Ithaca sends inputs to the Python solver API. Computation is stateless, bounded, and cancellable. Preserve numerical checks and method-specific diagnostics when extending shared components.

## Troy: market making and model risk

Troy explores the difference between true market dynamics and a market maker's pricing beliefs. It supports European vanilla calls and puts in one-unit contracts, without an exchange-style 100-share multiplier.

True dynamics can be GBM, Heston, or compensated Merton jump diffusion. Pricing can use Black–Scholes, European CRR, risk-neutral GBM Monte Carlo, or separately configured risk-neutral Heston Monte Carlo. Pricing assumptions remain independent of true dynamics.

The Market Making view shows prices, executions, inventory, hedging, P&L, and costs. The Market Dynamics view shows sample paths, pooled log-return distributions, a normal reference, and distribution moments.

Useful simulation conventions:

- Simulations run in a cancellable browser Worker; inputs and results stay in the browser.
- Market, order-flow, and pricing random streams are separate. A fresh seed is chosen when opening, resetting, changing true dynamics, or selecting New market. An explicit seed and identical settings reproduce an experiment. Changing pricing or hedging preserves the traded underlying path.
- Inventory shifts quotes; quote-sensitive Poisson arrivals generate fills. Inventory limits bound positions. This is an illustrative policy, not calibrated order flow or an optimal quoting strategy.
- Optional hedging offsets model delta. Total P&L combines realized and unrealized option P&L plus hedge P&L minus transaction costs. Cash financing is excluded; starting capital is zero.
- At maturity, options cash-settle and hedges close. A shorter simulation horizon retains open positions.
- Heston uses approximate variance discretization; Monte Carlo pricing has sampling error. Neither implies calibration to observed markets.
- Computation is bounded. Invalid configurations produce errors, and previous completed results retain their model labels during recalculation.

## Shared design and behavior

Use the existing dark navy surfaces, cream serif display text, muted sans-serif body text, thin borders, and cyan accents. Spectral colors support charts and preview art. Reuse existing controls and charts where their behavior fits.

Home and policy pages use natural document scrolling. Tool viewport layouts remain scoped to their workbenches. Tool code and heavy chart dependencies are lazy-loaded; home should remain usable without the solver API or a background solve.

Preserve keyboard access, visible focus, labelled controls, chart text alternatives, keyboard tabs, reduced-motion behavior, and mobile dialog focus management. Navigation supports direct links, refresh, anchors, and browser history.

## Code map and runtime boundaries

| Location | Responsibility |
| --- | --- |
| `apps/web/src/App.tsx` | Route selection and lazy tool loading |
| `apps/web/src/site/` | Home, navigation, policies, research data, shared site styling |
| `apps/web/src/IthacaWorkbench.tsx` | Ithaca interface |
| `apps/web/src/components/` | Existing numerical controls, chart and explanation components |
| `apps/web/src/lib/` | Ithaca API client and input validation |
| `apps/web/src/troy/` | Troy interface, pure simulation engine, Worker, and tests |
| `services/solver-api/` | FastAPI solver and numerical regression tests |
| `scripts/` | Smoke checks and license notice generation |
| `vercel.json` | Combined web/API service routing |

The frontend uses React, TypeScript, and Vite, with Plotly charts and KaTeX equations. The existing deployment configuration combines the frontend and solver API in one Vercel project. `/health` and `/v1/*` take precedence over the frontend SPA fallback. Browser API requests are same-origin by default.

Ithaca transmits calculation inputs; Troy computes locally. Application request logs contain request metadata rather than calculation bodies. Hosting-provider practices are separate from application behavior, so privacy copy must not claim that the entire site collects no data or that nothing leaves the browser.

Current source, configuration, and tests are the authority for implementation details. These notes intentionally omit historical release status, audit snapshots, and completed task lists.
