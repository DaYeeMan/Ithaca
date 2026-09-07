# Performance review

Phase 6 keeps synchronous HTTP because default calculations remain bounded and the product stores no jobs or results.

Gates:

| Surface | Gate |
| --- | ---: |
| Closed-form scalar | < 100 ms solver runtime |
| Closed-form surface | < 300 ms |
| Default finite difference | < 1 s |
| Default Monte Carlo response | < 5 s |
| Advanced request deadline | 30 s |
| Barrier Monte Carlo path grid | ≤ 4,000,000 nodes |
| Concurrent solves per worker | 2 by default |

The API regression suite measures the default comparison under five seconds. Numerical benchmark tests cover individual solver accuracy and runtime-sensitive default cases. The Plotly bundle is lazy-loaded, so the workbench shell and controls are not blocked on chart parsing. Production p95 latency and memory must be measured on the selected backend host; alert thresholds are in `docs/OPERATIONS.md`.

The security review found that the old generic operation estimator undercounted PSOR/reference work and did not bound barrier path memory. Phase 6 adds solver-aware accounting, an American PSOR cap, a barrier node limit, bounded concurrency, and cooperative deadlines. Host CPU/memory limits and edge rate limiting remain required defense in depth.
