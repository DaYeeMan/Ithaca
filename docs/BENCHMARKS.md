# Numerical Benchmark Specification

Status: European Phase 2 gates are locked and passing. The Phase 3 American baseline is locked. Later-family expected values must be locked from independent reference implementations before each solver is implemented.

## Conventions

- Prices use continuous compounding.
- Rates and volatility use decimal values in solver contracts.
- `t` is calendar time and `tau = T - t` is time to maturity.
- `q` is continuous dividend yield.
- Report scalar prices to at least 8 decimal places internally.
- UI rounding never changes comparison or acceptance calculations.
- Seeded stochastic tests must be reproducible.

## Phase 2 numerical conventions

- Crank–Nicolson uses a uniform finite spot domain with analytical Dirichlet boundaries.
- Central spatial differences are used except at convection-dominated nodes, where local upwind stabilization preserves monotonicity and non-negativity.
- Default finite-difference grid: 241 spot nodes, 240 time steps, and `S_max = 300` for the baseline case.
- Monte Carlo simulates exact geometric-Brownian terminal factors from aggregated seeded path increments.
- Antithetic standard errors use independent pair means rather than treating paired samples as independent.
- Confidence intervals use a two-sided normal critical value at the selected confidence level.
- Surface nodes share random numbers. Convergence points use nested prefixes of the same sample.
- Default Monte Carlo configuration: 20,000 paths, 64 path steps, seed 1729, antithetic sampling, and 95% confidence.
- Requests are capped at 120,000,000 estimated operations.

## European Black–Scholes reference

### `EUR-ATM-1Y`

| Parameter | Value |
| --- | ---: |
| Spot | 100 |
| Strike | 100 |
| Maturity | 1 year |
| Volatility | 0.20 |
| Risk-free rate | 0.05 |
| Dividend yield | 0.00 |

Locked analytical values:

| Result | Expected |
| --- | ---: |
| Call | 10.450583572185565 |
| Put | 5.573526022256971 |

Required checks:

- Closed form absolute error: `<= 1e-10`
- Put-call parity absolute residual: `<= 1e-10`
- Crank–Nicolson scalar absolute error at default grid: `<= 0.02`
- Crank–Nicolson interior-surface RMSE against closed form: `<= 0.05`
- Monte Carlo reference price lies inside reported 95% confidence interval for the seeded default case
- Terminal payoff and both spatial boundaries satisfy documented discretization tolerances

### European invariant grid

Test calls and puts over:

- Moneyness `S/K`: `0.5`, `0.8`, `1.0`, `1.2`, `1.5`
- Maturity: `1/365`, `0.25`, `1.0`, `5.0`
- Volatility: `0.01`, `0.20`, `0.80`
- Rate: `-0.01`, `0.00`, `0.05`, `0.15`
- Dividend yield: `0.00`, `0.02`, `0.10`

Check non-negativity, no-arbitrage bounds, monotonicity, call/put parity, terminal convergence, and grid-refinement convergence.

## American benchmarks

### `AM-PUT-BASE`

`S=40`, `K=40`, `T=1`, `sigma=0.20`, `r=0.06`, `q=0`.

Locked expected value: `2.3196`.

Independent references:

1. Test-only Cox–Ross–Rubinstein tree: `2.3195567957` at 16,384 steps and `2.3195655771` at 32,768 steps. First-order Richardson extrapolation gives `2.3195743586`.
2. Berridge and Schumacher, *Pricing High-Dimensional American Options Using Local Consistency Conditions*, CentER Discussion Paper 2004-19, Table 1: `2.3196` for the equivalent one-dimensional American put. Source: <https://pure.uvt.nl/ws/portalfiles/portal/600547/19.pdf>.

The published value is rounded to four decimals. The independent tree differs by `0.0000256414`. `services/solver-api/tests/test_american_benchmarks.py` owns the test oracle and must not be imported by production solvers.

Phase 3 production conventions:

- Production binomial reference: 800-step Cox–Ross–Rubinstein tree. Surface slices use at most 100 steps to remain interactive.
- American finite difference: uniform 241-node spot grid, 240 time steps, `S_max = 120` for `AM-PUT-BASE`, Crank–Nicolson LCP solved by PSOR with `omega = 1.2` and residual-change tolerance `1e-8`.
- Longstaff–Schwartz: 20,000 paths, 64 exercise dates, seed 1729, antithetic sampling, and quadratic basis `1`, `S/K`, `(S/K)^2`.
- Longstaff–Schwartz surfaces use common antithetic random numbers, 512 paths per spot, at most 24 exercise dates, and pooled spot regression. Scalar confidence intervals use the full requested budget.
- American Monte Carlo path grids are capped at 20,000,000 stored nodes.

Acceptance:

- LCP/PSOR and production binomial prices agree with locked reference within `0.01`.
- Longstaff–Schwartz price agrees within its reported statistical interval and documented regression tolerance.
- American put price is no less than European put price.
- Exercise boundary is monotone under the baseline assumptions.

Locked Phase 3 results:

- 800-step production binomial: `2.3192041545`; absolute reference error `0.0003958455`.
- Default LCP/PSOR with `S_max = 120`: `2.3177472324`; absolute reference error `0.0018527676`.
- Seeded Longstaff–Schwartz: `2.3319841353`, standard error `0.0121611142`, 95% interval `[2.3081487895, 2.3558194811]`; locked reference covered.

### `AM-CALL-NO-DIVIDEND`

Use the European baseline call with `q=0`. An American call with no dividends must equal its European counterpart within numerical tolerance. This catches incorrect early-exercise logic.

## Barrier benchmarks

### `BAR-DOWN-OUT-CALL`

`S=100`, `K=100`, `H=90`, `T=1`, `sigma=0.20`, `r=0.05`, `q=0`, continuous monitoring, no rebate.

### `BAR-UP-OUT-CALL`

`S=100`, `K=100`, `H=120`, `T=1`, `sigma=0.20`, `r=0.05`, `q=0`, continuous monitoring, no rebate.

Lock analytical prices from a separately reviewed Reiner–Rubinstein implementation before Phase 4. Cross-check against QuantLib or published tables.

Acceptance:

- Knock-in plus knock-out price equals matching vanilla price within `1e-6` analytically and documented numerical tolerance for other methods.
- Knock-out value is zero when the barrier is already breached and no rebate exists.
- Finite-difference solution satisfies the absorbing barrier boundary.
- Brownian-bridge Monte Carlo reduces discrete-monitoring bias relative to naive path sampling.
- Moving a knock-out barrier farther from spot cannot reduce contract value under otherwise fixed inputs.

## Asian benchmarks

### `AS-GEOMETRIC-MONTHLY`

Fixed-strike geometric-average call and put with `S=100`, `K=100`, `T=1`, `sigma=0.20`, `r=0.05`, `q=0`, and 12 equally spaced monthly observations.

Lock values from the discrete geometric-Asian analytical formula before Phase 5. Use these values to validate simulation, monitoring dates, discounting, and average-state conventions.

### `AS-ARITHMETIC-MONTHLY`

Fixed-strike arithmetic-average call and put with the same parameters and monitoring schedule.

No closed form is claimed. Lock a reference from a high-precision randomized quasi-Monte Carlo run plus an independent implementation. Store reference standard error and run metadata with the expected value.

Acceptance:

- Geometric Monte Carlo reference lies inside its reported confidence interval.
- Arithmetic production Monte Carlo agrees with the locked reference within combined uncertainty.
- Augmented-state solver and Monte Carlo agree within documented discretization and statistical error.
- Twelve monitoring dates means exactly twelve observations; document whether spot at `t=0` participates.
- Fixed average-state chart slices reproduce scalar prices at their selected state.

## Monte Carlo statistical checks

- Same seed and configuration returns identical results.
- Antithetic toggle changes sampling while preserving unbiased pricing.
- Standard error scales approximately with `1/sqrt(N)` over controlled repeated runs.
- Confidence interval uses the selected confidence level and reports its convention.
- Convergence plot uses nested path prefixes or otherwise labels independent estimates clearly.
- Surface nodes use common random numbers where comparisons benefit from correlated noise.
- Sample-path charts never imply that displayed paths equal the full pricing sample.

## Benchmark completion gate

Before implementing an option-family solver:

1. Lock expected scalar values and source metadata.
2. Implement the reference check independently from the production solver.
3. Record tolerances before viewing production results.
4. Add invariants and boundary cases, not only happy-path scalar values.
5. Make the family benchmark suite pass before adding the next family.
