# Ithaca Roadmap

This file tracks unfinished product work. `PROJECT_PLAN.md` remains the source of truth for architecture, scope, and acceptance criteria. `docs/BENCHMARKS.md` owns numerical gates.

## Current status

- [x] Phase 0: product decisions, European benchmarks, desktop concept, and mobile concept
- [x] Phase 1 implementation: European call/put closed form, API validation, 3D surface, 2D price slice, equation inspector, and results
- [x] Phase 1 automated checks: Black–Scholes benchmarks, parity, surface shape, terminal payoff, frontend validation, lint, and production build
- [x] Phase 1 desktop browser QA: call/put solve flow, surface/slice interaction, equations, error-free console, and concept comparison
- [ ] Phase 1 mobile browser QA at 390 × 844 and one wider mobile viewport

## Next: Phase 2 — numerical comparison

Numerical work must satisfy the European gates already defined in `docs/BENCHMARKS.md`.

- [ ] Define API contracts for method settings, diagnostics, progress, cancellation, and errors
- [ ] Add work estimator and caps for grid cells, paths, steps, and total operations
- [ ] Implement Crank–Nicolson finite differences with documented boundary handling
- [ ] Test finite-difference accuracy, stability, boundaries, and grid refinement
- [ ] Implement seeded risk-neutral Monte Carlo
- [ ] Add path count, step count, seed, confidence level, and antithetic controls
- [ ] Test reproducibility, confidence intervals, convergence, and standard-error scaling
- [ ] Add finite-difference and Monte Carlo capability metadata to the API
- [ ] Enable only methods valid for the selected contract
- [ ] Render method overlays and difference charts
- [ ] Render Monte Carlo confidence bands, convergence, and optional sample paths
- [ ] Preserve the last successful result during cancellation or request failure
- [ ] Meet default runtime budget under 5 seconds; cap advanced runs at 30 seconds

Phase 2 exit: closed form, finite difference, and Monte Carlo agree within documented European tolerances.

## Later option families

### Phase 3 — American

- [ ] Lock `AM-PUT-BASE` with two independent references
- [ ] Add American call/put contract controls and capability rules
- [ ] Implement binomial reference, constrained finite differences, and Longstaff–Schwartz Monte Carlo
- [ ] Render early-exercise boundary
- [ ] Pass American value, no-dividend call, and exercise-boundary gates

### Phase 4 — barrier

- [ ] Lock down-and-out and up-and-out analytical benchmarks
- [ ] Add up/down and in/out controls for continuous monitoring and no rebate
- [ ] Implement analytical, barrier-aware finite-difference, and Brownian-bridge Monte Carlo methods
- [ ] Render barrier level and activation state
- [ ] Pass parity, breached-barrier, boundary, and monotonicity gates

### Phase 5 — Asian

- [ ] Lock discrete geometric monthly analytical benchmark
- [ ] Lock high-precision arithmetic monthly reference and metadata
- [ ] Add fixed-strike arithmetic averaging with discrete monitoring controls
- [ ] Implement geometric analytical, arithmetic/geometric Monte Carlo, and augmented-state methods
- [ ] Render spot × time × price with fixed average-state slider
- [ ] Pass observation-count, benchmark, convergence, and fixed-state slice gates

## Phase 6 — release hardening

- [ ] Complete keyboard and screen-reader audit
- [ ] Test responsive layouts across supported desktop and mobile widths
- [ ] Add API timeouts, cancellation, structured logs, and production diagnostics
- [ ] Run performance and security reviews
- [ ] Deploy frontend to Vercel
- [ ] Deploy FastAPI service separately and configure CORS/API URL
- [ ] Add production smoke tests and operational documentation

## Deferred beyond initial release

- Implied-volatility surfaces and smiles
- Live market data and calibration
- Authentication, accounts, databases, or saved results
- Portfolios, trade execution, and production risk metrics
- Heston, SABR, local volatility, jump diffusion, baskets, or arbitrary user-authored PDEs

## Maintenance rule

Update this file when a phase starts, a scope decision changes, or an acceptance gate passes. Do not mark solver work complete until its benchmark suite passes.
