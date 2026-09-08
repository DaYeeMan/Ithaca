# Performance review

CapitalCanvas route isolation is implemented. Local browser network checks confirm fresh home/legal visits do not mount Ithaca or download its workbench, KaTeX, or Plotly assets; home works with solver requests blocked. The production home entry is approximately 201 kB JavaScript (63 kB gzip), versus the original 488 kB entry (148 kB gzip). Ithaca and its existing roughly 4.5 MB Plotly chart chunk load only on the tool route. Final illustration/performance checks and Vercel preview measurements remain pending. Existing solver budgets below remain unchanged.

Ithaca uses synchronous HTTP because default calculations remain bounded and the product stores no jobs or results.

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

Preserve solver-aware work accounting, the American PSOR cap, barrier node limits, bounded concurrency, and cooperative deadlines during route extraction. Verify host resource controls and solve rate limiting according to docs/OPERATIONS.md.

For the CapitalCanvas release, inspect a fresh home load and direct legal-page load in browser network tools. Confirm no Plotly download or solver request, then navigate to Ithaca and verify dependencies load there and the default solve still meets its budget. Repeat home navigation with the API unavailable. Record measurements after implementation rather than treating planned gates as completed results.
