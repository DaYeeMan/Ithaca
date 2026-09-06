# Ithaca PDE Solver — Project Plan

## 1. Product goal

Build an interactive web application for exploring option-pricing PDEs and comparing solution methods. A user selects an option and model, edits financial and numerical parameters, runs compatible solvers, and compares prices, error, uncertainty, and runtime through synchronized 2D and 3D visualizations.

This product is an educational and quantitative research tool. It is not a trading, execution, or investment-advice system.

## 2. Product scope and first vertical slice

The initial public product must support four option families. Implementation remains incremental so each family is numerically trustworthy before the next one begins.

### Instruments

- European vanilla call and put
- American vanilla call and put
- Asian call and put
- Single-barrier call and put

### Model

- Black–Scholes with constant risk-free rate, dividend yield, and volatility
- Governing PDE:

  \[
  \frac{\partial V}{\partial t}
  + \frac{1}{2}\sigma^2 S^2\frac{\partial^2 V}{\partial S^2}
  + (r-q)S\frac{\partial V}{\partial S}
  - rV = 0
  \]

- Display terminal payoff and numerical boundary conditions beside the PDE.

### Required solution families

- European: Black–Scholes closed form, Crank–Nicolson finite differences, and risk-neutral Monte Carlo
- American: binomial tree, finite differences with an early-exercise constraint, and Longstaff–Schwartz Monte Carlo
- Barrier: supported analytical formulas, barrier-aware finite differences, and Monte Carlo with Brownian-bridge correction
- Asian: geometric-average analytical benchmark where applicable, augmented-state numerical method, and Monte Carlo

### First vertical slice

Build European call/put first because all three methods solve the same problem and can be checked against a known reference. American, barrier, and Asian options remain required release scope, delivered as successive verified slices rather than one unvalidated batch.

## 3. Primary user workflow

1. Select option type and model.
2. Enter contract and market parameters.
3. Choose one or more compatible solution methods.
4. Configure method-specific numerical settings.
5. Run the calculation.
6. Inspect scalar price, Greeks, runtime, convergence, and error.
7. Compare synchronized price surfaces and strike/spot slices.
8. Change one parameter and rerun without losing the prior result until the new result succeeds.

## 4. Interface structure

Use a dense but calm scientific-workbench layout rather than a marketing page.

### App shell

- Header: product name, example presets, documentation/about access
- Left control rail: instrument, model, market, contract, and solver settings
- Main visualization canvas: tabbed 3D surface and 2D charts
- Right inspector: governing PDE, terminal/boundary conditions, method explanation, warnings
- Bottom result strip: price, standard error, confidence interval, reference error, runtime

On small screens, controls and inspector become drawers. Charts remain the primary surface.

### Required visual states

- Initial state with a valid preset
- Computing state with progress/cancellation for Monte Carlo
- Successful comparison state
- Invalid parameter state with field-level errors
- Solver failure state that preserves the last successful result
- Mobile layout

Before implementation, generate and approve a complete visual concept for desktop and mobile. Extract design tokens and component rules from the approved concept before coding.

## 5. Parameter model

### Shared contract and market inputs

- Spot price `S0`
- Strike `K`
- Time to maturity `T`, in years
- Volatility `sigma`
- Risk-free rate `r`
- Continuous dividend yield `q`
- Option side: call or put

### Surface domain

- Minimum and maximum spot
- Spot grid count
- Time grid count
- Selected time or spot slice

### Finite-difference settings

- Spot steps
- Time steps
- Domain maximum
- Scheme fixed to Crank–Nicolson for MVP
- Stability/quality diagnostics

### Monte Carlo settings

- Number of paths
- Time steps per path
- Random seed
- Antithetic variates toggle
- Confidence level
- Surface resolution budget

Use safe defaults and explicit upper bounds. Estimate work before submission and warn when a configuration is expensive.

## 6. Visualization specification

### 3D price surface

- Axes: spot `S`, time-to-maturity `tau`, option value `V`
- Choose closed form, finite difference, or Monte Carlo as the active surface
- Overlay another method as a wireframe or difference surface
- Shared color scale and camera state when switching methods
- Hover shows coordinates, price, and method

### 2D views

- Price versus spot at selected time
- Price versus time at selected spot
- Method error versus spot relative to closed form
- Monte Carlo convergence versus path count with confidence band
- Terminal payoff and current price curve
- Draggable 2D price slice through the active 3D surface

### Price-slice convention

The requested “smile” is a 2D price slice through the 3D price surface, not implied volatility versus strike. Label it **Price slice** in the interface to avoid standard quant-finance ambiguity. Implied-volatility surfaces and smiles are deferred.

### Monte Carlo surface behavior

Monte Carlo results should be visible alongside deterministic surfaces, but uncertainty must remain explicit. Show confidence intervals on 2D slices and offer an error/difference surface. Use common random numbers across surface nodes to reduce visual noise. Enforce a computation budget so a surface request cannot accidentally multiply paths by an unbounded grid.

## 7. Solver compatibility matrix

| Instrument/model | Closed form | Finite difference | Monte Carlo | Later methods |
| --- | --- | --- | --- | --- |
| European vanilla / Black–Scholes | Yes | Crank–Nicolson | Risk-neutral paths | Binomial tree |
| American vanilla / Black–Scholes | No general formula | LCP/PSOR | Longstaff–Schwartz | Binomial tree |
| Single barrier / Black–Scholes | Supported continuous-monitoring variants | Barrier boundary | Brownian-bridge-corrected paths | Rebate variants later |
| Asian / Black–Scholes dynamics | Geometric variants only | Augmented state dimension | Natural fit | Arithmetic approximations |

All four rows belong to required release scope. Matrix drives which controls and methods appear; UI must not offer invalid combinations or imply that every method applies to every contract.

## 8. Technical architecture

### Frontend

- React + TypeScript + Vite
- Plotly.js for synchronized 2D/3D scientific charts
- React Hook Form plus Zod for parameter validation
- TanStack Query for solver requests and request state
- KaTeX for governing equations and boundary conditions
- Accessible shared form and chart-control components

### Numerical backend

- Python 3.12
- FastAPI with Pydantic request/response models
- NumPy for vectorized Monte Carlo and arrays
- SciPy sparse linear algebra for finite differences
- Deterministic solver modules independent from HTTP handlers

### Runtime shape

```text
React workbench
    |
    | validated solver request
    v
FastAPI calculation endpoint
    |
    +-- closed-form solver
    +-- finite-difference solver
    +-- Monte Carlo solver
    |
    v
typed result + diagnostics + chart-ready grids
```

Use synchronous HTTP for bounded MVP calculations. Add background jobs only after measured requests exceed acceptable latency or cancellation cannot work reliably.

### Deployment and persistence

- Deploy the web application to Vercel.
- Host numerical computation in a separate Python/FastAPI service; Vercel hosts the frontend.
- Save no user configurations, results, uploaded data, or accounts.
- Keep the application stateless between page loads.
- Keep default calculations under 5 seconds. Allow explicitly gated advanced calculations up to 30 seconds.

### Suggested repository structure

```text
apps/
  web/
    src/
      components/
      features/solver-workbench/
      lib/api/
      lib/charts/
services/
  solver-api/
    app/
      api/
      domain/
      solvers/
      validation/
    tests/
packages/
  contracts/
docs/
```

Do not create this structure until implementation begins and tooling choices are confirmed.

## 9. API outline

### `GET /v1/capabilities`

Returns supported instruments, models, methods, parameter definitions, limits, and compatibility. This keeps the UI from duplicating solver rules.

### `POST /v1/solve`

Accepts one validated problem and selected methods. Returns:

- Normalized input parameters
- Scalar price per method
- Surface grid per method
- Requested 2D slices
- Monte Carlo standard error and confidence interval
- Error metrics versus reference when available
- Runtime and numerical diagnostics
- Warnings

### `GET /health`

Basic deployment health check.

No database is required for MVP. Presets live in versioned source data. Browser URL state can make configurations shareable later without accounts.

## 10. Numerical correctness requirements

- Unit-test closed-form results against published benchmark values.
- Verify put-call parity.
- Verify terminal and boundary conditions.
- Verify monotonicity: call value increases with spot; put value decreases with spot.
- Verify non-negativity and basic no-arbitrage bounds.
- Compare finite-difference values with closed form over a parameter grid.
- Verify finite-difference error decreases as the grid refines.
- Verify seeded Monte Carlo runs are reproducible.
- Verify Monte Carlo confidence intervals cover reference values at the expected statistical rate over repeated tests.
- Report discretization, truncation, and statistical error separately.
- Never present Monte Carlo samples as deterministic precision.

## 11. Performance and safety budgets

Initial targets; confirm through benchmarks:

- Closed-form scalar response: under 100 ms server time
- Closed-form surface: under 300 ms
- Finite-difference surface: under 1 s at default grid
- Monte Carlo scalar: under 2 s at default path count
- Monte Carlo surface: under 5 s at default budget
- Interactive chart updates after response: under 100 ms for local slicing

Compute layer validates maximum paths, steps, grid cells, and total estimated operations. Requests receive timeouts and cancellation support. Numerical warnings are part of successful responses when results are usable but low quality.

## 12. Delivery phases

### Phase 0 — Decisions and benchmarks

- Resolve contract variants, compute placement, numerical scale, and high-dimensional surface slicing.
- Select 5–10 trusted benchmark cases.
- Approve desktop and mobile visual concepts.
- Record API and numerical conventions: time variable, rate units, confidence intervals, grid orientation.

Exit: benchmark table and numerical conventions committed.

### Phase 1 — Vertical slice

- European call/put under Black–Scholes
- Shared form validation
- Closed-form scalar and surface
- Governing PDE, payoff, and boundary-condition display
- One 3D surface and one synchronized 2D slice
- Automated benchmark and put-call-parity tests

Exit: user can change valid parameters and receive a correct, visual closed-form result.

### Phase 2 — Numerical comparison

- Crank–Nicolson finite-difference solver
- Risk-neutral Monte Carlo with seed, paths, steps, antithetic variates, and confidence level
- Difference charts, confidence bands, convergence view, runtime metrics
- Work estimation, limits, progress, and cancellation

Exit: all three methods agree within documented tolerances for benchmark cases.

### Phase 3 — American options

- American call/put
- Binomial reference, constrained finite differences, and Longstaff–Schwartz Monte Carlo
- Early-exercise boundary visualization
- American benchmark tests

Exit: American methods agree within documented tolerances and exercise behavior passes known cases.

### Phase 4 — Barrier options

- Confirmed single-barrier variants
- Barrier-aware analytical, finite-difference, and corrected Monte Carlo methods
- Barrier level and activation state in charts
- Barrier benchmark tests

Exit: supported barrier contracts satisfy boundary behavior and analytical benchmarks.

### Phase 5 — Asian options

- Confirmed averaging convention and monitoring schedule
- Geometric analytical benchmark where applicable
- Augmented-state numerical method
- Arithmetic/geometric Monte Carlo
- Fixed-state slices for higher-dimensional results

Exit: Asian results pass geometric benchmarks and documented Monte Carlo convergence tests.

### Phase 6 — Product hardening

- Responsive and keyboard-accessible workbench
- Error recovery and preserved last result
- Performance benchmarks
- Security review, Vercel deployment, observability, and documentation

Exit: production deployment meets correctness, accessibility, and performance gates.

## 13. Initial public release acceptance criteria

- User can select supported European, American, Asian, or barrier call/put contracts and edit their relevant parameters.
- Invalid input cannot reach a solver and produces a useful field-level message.
- UI shows each contract's governing PDE or augmented equation, payoff, state definitions, and active boundary conditions.
- UI offers only solution methods valid for the selected contract.
- 3D surface and 2D slices remain synchronized.
- Monte Carlo settings change the computation and displayed uncertainty.
- Results show method, runtime, diagnostics, and comparable error metrics.
- Each option family meets documented benchmark and convergence tolerances.
- Desktop and mobile core workflows work with keyboard navigation.
- Last successful result remains visible when a later request fails.
- Refreshing the page restores no prior configuration or result.

## 14. Explicit non-goals for initial public release

- Live market data
- Portfolio pricing
- Authentication or saved user accounts
- Saved or shareable configurations and results
- Trade execution or brokerage integration
- Calibration to an option chain
- GPU or distributed computing
- Arbitrary user-authored PDEs
- Basket or multi-asset options
- Heston, SABR, local volatility, or jump diffusion
- Implied-volatility surfaces and smiles
- Production risk metrics such as VaR

## 15. Main risks

- **Scope explosion:** option families require materially different state spaces and solvers. Enforce compatibility matrix and phase gates.
- **Terminology ambiguity:** call the requested chart a price slice, not a smile. Reserve smile for implied volatility versus strike.
- **Dimensionality:** Asian pricing adds an average state variable. A single 3D chart cannot display price over spot, time, and average simultaneously; require a fixed-state slice.
- **Monte Carlo cost:** surface calculation multiplies work. Use budgets, common random numbers, vectorization, and reduced grids.
- **False precision:** always show uncertainty and solver diagnostics.
- **Frontend/backend rule drift:** make backend capabilities and validation canonical.
- **Chart overload:** prioritize one active surface and synchronized slices rather than showing every chart simultaneously.

## 16. Confirmed decisions

- Audience: anyone who wants to explore option prices visually; interface should teach without blocking experienced users.
- Required option families: European, American, Asian, and barrier.
- “Smile”: a 2D price slice through the 3D price surface. Implied volatility is later work.
- Deployment: Vercel website.
- Persistence: none. No accounts, saved configurations, saved results, or database.

## 17. Locked implementation decisions

- Asian: fixed-strike arithmetic average with discrete monitoring. Add a geometric-average analytical benchmark.
- Barrier: support single up/down and in/out contracts with continuous monitoring and no rebate initially.
- Compute: Vercel frontend plus a separate Python/FastAPI numerical service. Browser remains visualization-focused.
- Higher-dimensional charts: show spot × time × price while an average-state slider fixes the additional Asian state.
- Monte Carlo: include an optional sample-path chart plus price surface, confidence bands, and convergence.
- Compute budget: default runs under 5 seconds; explicitly gated advanced runs may take up to 30 seconds.

Planning decisions, European benchmarks, and visual concepts are approved. Phase 1 is implemented; `ROADMAP.md` tracks remaining QA and later phases.
