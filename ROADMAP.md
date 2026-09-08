# CapitalCanvas remaining work

## Current state

CapitalCanvas is live at https://capitalcanvas.vercel.app in the existing project. Direct home, Ithaca, policy, notices, and unknown-page loads passed the September 8 production check. Same-origin health, capabilities, and a small European solve passed. Home also rendered with API requests blocked. No browser cookies or storage entries were observed in that check.

Current local changes finalize policy labels and license notices, simplify footer/About text, and replace the react-katex wrapper with direct KaTeX rendering. Name and email remain in About; legal pages retain their contact details. Mathematical font licenses and Plotly bundled notices are included. Policies retain noindex intentionally; sitemap/canonical work is optional SEO work.

## Remaining actions

- [ ] Deploy the current local changes through the existing release workflow, then confirm policy pages contain no review labels and footer/About edits are live.
- [ ] Publish the staged log-only firewall rule `Ithaca solve rate`, inspect matching traffic, then enable enforcement after confirming an appropriate threshold. Rule ID: `rule_ithaca_solve_rate_tXl5Aq`. It matches only POST /v1/solve, counts per IP, and logs above 60 requests per 60-second window. It is not live and does not yet provide enforced protection. No other staged rules were present.

The Vercel Firewall skill requires the owner to publish staged firewall changes. Existing application computation bounds, timeout, and per-process concurrency protection remain active.
