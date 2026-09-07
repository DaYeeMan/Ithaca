# Ithaca Roadmap

This file tracks unfinished product work. `PROJECT_PLAN.md` remains the source of truth for architecture, scope, and acceptance criteria. `docs/BENCHMARKS.md` owns numerical gates.

## Current status

- [x] Phase 0: product decisions, European benchmarks, desktop concept, and mobile concept
- [x] Phase 1 implementation: European call/put closed form, API validation, 3D surface, 2D price slice, equation inspector, and results
- [x] Phase 1 automated checks: Black–Scholes benchmarks, parity, surface shape, terminal payoff, frontend validation, lint, and production build
- [x] Phase 1 desktop browser QA: call/put solve flow, surface/slice interaction, equations, error-free console, and concept comparison
- [x] Phase 1 mobile browser QA at 390 × 844 and 768 × 1024
- [x] Phase 2: Crank–Nicolson and seeded Monte Carlo comparison, diagnostics, compute limits, cancellation, and browser QA
- [x] Phase 3: American options, benchmark gates, solver comparison, early-exercise boundary, and browser QA
- [x] Phase 4: continuous zero-rebate barrier options, analytical/finite-difference/bridge-Monte-Carlo comparison, benchmark gates, and browser QA
- [x] Phase 5: discrete fixed-strike Asian options, analytical/augmented-state/Monte-Carlo comparison, fixed-state slices, and benchmark gates

## Phase 2 — numerical comparison

Numerical work must satisfy the European gates already defined in `docs/BENCHMARKS.md`.

- [x] Define API contracts for method settings, diagnostics, progress, cancellation, and errors
- [x] Add work estimator and caps for grid cells, paths, steps, and total operations
- [x] Implement Crank–Nicolson finite differences with documented boundary handling
- [x] Test finite-difference accuracy, stability, boundaries, and grid refinement
- [x] Implement seeded risk-neutral Monte Carlo
- [x] Add path count, step count, seed, confidence level, and antithetic controls
- [x] Test reproducibility, confidence intervals, convergence, and standard-error scaling
- [x] Add finite-difference and Monte Carlo capability metadata to the API
- [x] Enable only methods valid for the selected contract
- [x] Render method overlays and difference charts
- [x] Render Monte Carlo confidence bands, convergence, and optional sample paths
- [x] Preserve the last successful result during cancellation or request failure
- [x] Meet default runtime budget under 5 seconds; cap advanced runs at 30 seconds

Phase 2 exit: closed form, finite difference, and Monte Carlo agree within documented European tolerances. Passed.

## Later option families

### Phase 3 — American

- [x] Lock `AM-PUT-BASE` with two independent references
- [x] Add American call/put contract controls and capability rules
- [x] Implement binomial reference, constrained finite differences, and Longstaff–Schwartz Monte Carlo
- [x] Render early-exercise boundary
- [x] Pass American value, no-dividend call, and exercise-boundary gates

Phase 3 exit: American methods agree within locked tolerances, no-dividend calls match European values, exercise behavior passes, and desktop/mobile browser QA passes. Passed.

### Phase 4 — barrier

- [x] Lock down-and-out and up-and-out analytical benchmarks
- [x] Add up/down and in/out controls for continuous monitoring and no rebate
- [x] Implement analytical, barrier-aware finite-difference, and Brownian-bridge Monte Carlo methods
- [x] Render barrier level and activation state
- [x] Pass parity, breached-barrier, boundary, and monotonicity gates

Phase 4 exit: supported barrier contracts match locked analytical values, preserve knock-in/out parity, enforce absorbing boundaries, correct discrete-monitoring bias, and pass desktop/mobile browser QA. Passed.

### Phase 5 — Asian

- [x] Lock discrete geometric monthly analytical benchmark
- [x] Lock high-precision arithmetic monthly reference and metadata
- [x] Add fixed-strike arithmetic averaging with discrete monitoring controls
- [x] Implement geometric analytical, arithmetic/geometric Monte Carlo, and augmented-state methods
- [x] Render spot × time × price with fixed average-state slider
- [x] Pass observation-count, benchmark, convergence, and fixed-state slice gates

Phase 5 exit: geometric values match analytical benchmarks, arithmetic control-variate Monte Carlo matches locked RQMC references, augmented-state values meet documented discretization tolerance, and fixed-state slices reproduce scalar prices. Passed.

## Phase 6 — release hardening

- [x] Complete keyboard and screen-reader audit
- [x] Test responsive layouts across supported desktop and mobile widths
- [x] Add API timeouts, cancellation, structured logs, and production diagnostics
- [x] Run performance and security reviews
- [x] Configure the Vite frontend and FastAPI backend as one Vercel Services deployment
- [x] Route `/health` and `/v1/*` to FastAPI with same-origin browser requests
- [x] Deploy and smoke-test the combined project on Vercel Hobby
- [x] Add production smoke tests and operational documentation

Phase 6 is complete. The production deployment at `https://ithaca-lake.vercel.app` passed health, diagnostics, pricing smoke, and live-browser solve checks on September 7, 2026.

## Deferred beyond initial release

- Implied-volatility surfaces and smiles
- Live market data and calibration
- Authentication, accounts, databases, or saved results
- Portfolios, trade execution, and production risk metrics
- Heston, SABR, local volatility, jump diffusion, baskets, or arbitrary user-authored PDEs

## Maintenance rule

Update this file when a phase starts, a scope decision changes, or an acceptance gate passes. Do not mark solver work complete until its benchmark suite passes.
