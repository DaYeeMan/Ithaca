# Numerical Benchmark Specification

Status: Phase 0 draft. European values are locked. Later-family expected values must be locked from independent reference implementations before each solver is implemented.

## Conventions

- Prices use continuous compounding.
- Rates and volatility use decimal values in solver contracts.
- `t` is calendar time and `tau = T - t` is time to maturity.
- `q` is continuous dividend yield.
- Report scalar prices to at least 8 decimal places internally.
- UI rounding never changes comparison or acceptance calculations.
- Seeded stochastic tests must be reproducible.

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

Lock the expected value before Phase 3 from two independent references:

1. High-step Cox–Ross–Rubinstein tree with convergence extrapolation.
2. QuantLib or a published benchmark table, used only as a test oracle.

Acceptance:

- LCP/PSOR and production binomial prices agree with locked reference within `0.01`.
- Longstaff–Schwartz price agrees within its reported statistical interval and documented regression tolerance.
- American put price is no less than European put price.
- Exercise boundary is monotone under the baseline assumptions.

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

