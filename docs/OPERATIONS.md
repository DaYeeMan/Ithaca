# Production operations

CapitalCanvas transition: frontend routes `/`, `/tools/ithaca`, `/privacy`, `/terms`, and `/disclaimer` are implemented locally in the existing web service. Verify direct loads, refresh, unknown paths, and home anchors on Vercel preview before promotion. `/health` and `/v1/*` must retain API precedence. No custom-domain change is assumed. The route migration has not been deployed: automatic approval review requires explicit user approval for source upload to the existing `ithaca` project.

Local verification: the production build served through Vite preview passed the updated HTTP smoke script, including frontend fallback, API health/capabilities, and the European benchmark at `10.4505835722`. Edge browser checks passed actual route rendering and all four option-family solve flows. This does not prove Vercel Services fallback; that gate remains open.

Ithaca deploys as one stateless Vercel Services project. The Vite service owns `/`; the FastAPI service owns `/health` and `/v1/*`. Browser-to-API traffic stays on the deployment origin, so production needs neither an API URL variable nor CORS configuration. No database or background worker is required.

Current production: `https://ithaca-lake.vercel.app`. The initial Hobby deployment was verified on September 7, 2026 with `/health`, `/v1/diagnostics`, the automated pricing smoke test, and a live browser solve.

## Release order

1. Use the already-linked Vercel project and repository-root `vercel.json`. Keep both services in this project.
2. Run frontend checks and solver regressions. Preserve same-origin `/v1` requests without adding `VITE_SOLVER_API_URL`.
3. Deploy a preview and confirm `GET /health` and `GET /v1/diagnostics` on that origin.
4. Verify `/`, `/tools/ithaca`, `/privacy`, `/terms`, `/disclaimer`, unknown paths, direct refreshes, and browser history. Test all home anchors from home/legal pages and by direct load; test Ithaca's single back arrow to `/#home`. All three sections belong to the same home document. Check the complete home scroll and legal footer on mobile.
5. Run `python scripts/smoke_test.py --frontend https://preview.example --api https://preview.example`, then verify an Ithaca solve in the browser. Confirm home loads no Plotly and makes no solver request.
6. Promote the verified preview, repeat route/pricing checks on production, and record the release URL and results.

## Vercel CLI

The same flow from the repository root is:

```powershell
npx --yes vercel@59.11.7
python scripts/smoke_test.py --frontend https://your-preview.vercel.app --api https://your-preview.vercel.app
npx --yes vercel@59.11.7 promote https://your-preview.vercel.app
```

Vercel Services and the Python runtime are beta platform features. Keep the Dockerfile as a rollback path: set `VITE_SOLVER_API_URL` to an external HTTPS API origin and configure that API's `ITHACA_ALLOWED_ORIGINS` and `ITHACA_ALLOWED_HOSTS`. Never put secrets in variables beginning with `VITE_`; those values are embedded in public browser assets.

## Runtime controls

- `ITHACA_REQUEST_TIMEOUT_SECONDS` defaults to 30. Long solver loops cooperatively stop on deadline or client disconnect.
- `ITHACA_MAX_CONCURRENT_SOLVES` defaults to 2 per process. Excess requests receive `503 solver_busy`.
- Barrier Monte Carlo is capped at 4,000,000 path nodes. Monitor function OOM events before raising this cap.
- Add a Vercel Firewall rate-limit rule for `POST /v1/solve` before sustained public traffic. Health and diagnostics remain outside the solve concurrency pool.
- Logs are one JSON object per completed/failed HTTP request and include request ID, path, status, and duration; request bodies and financial parameters are not logged.

## Monitoring and alerts

Probe `/health` every minute. Alert on repeated 5xx responses, `solver_busy`, `solve_timeout`, function OOM events, p95 solve latency above 5 seconds for defaults, or exhausted function usage. Use `X-Request-ID` to correlate browser failures with API logs. `/v1/diagnostics` exposes only non-secret runtime limits and version.

## Rollback

Promote the previous successful Vercel deployment, then run the smoke test against that URL. Because both services are versioned in the same deployment and hold no durable data, there is no split-version window or data recovery step. The retained Dockerfile supports a later external-backend fallback if Vercel Services must be abandoned.

## Local production check

```powershell
.\services\solver-api\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir services/solver-api --host 127.0.0.1 --port 8000
npm run dev:web -- --host 127.0.0.1
python scripts/smoke_test.py --frontend http://127.0.0.1:5173 --api http://127.0.0.1:5173
```

The Vite development server proxies `/health` and `/v1` to port 8000. To exercise Vercel's combined routing instead, use `vercel dev -L` after the project is linked or the installed CLI supports local Services mode.

Vercel CLI 59.11.7 can generate an invalid Python bootstrap on Windows when the repository's absolute path contains backslash escape sequences such as `C:\Users`. If that occurs, use the normal two-process check above or a cloud preview; Vercel's Linux deployment build is unaffected.


## Current content status

The reference-based home, research entries, and personal/noncommercial About copy are implemented locally. Contact: dymteam23@gmail.com. Emmanuel Zhang appears above the About email, as authorized by the owner. `/notices` supplements the three policy routes. Policy drafts remain subject to deployed hosting-practice verification; see ROADMAP.md for the remaining release gates.

Resources are organized in a collapsible Ithaca project group. Per-paper details are labeled “Implementation”; repeated “Used in Ithaca” labels are removed. Direct paper anchors open their containing project group.


## CapitalCanvas deep-route 404 diagnosis

Read-only production checks on September 8, 2026 at `https://capitalcanvas.vercel.app` returned 200 for `/`, `/index.html`, and `/health`, but Vercel `NOT_FOUND` responses for `/tools/ithaca` and `/privacy`. The web service lacked an explicit SPA fallback. Root service routing selects the web service but does not itself serve the React entry for unknown file paths.

The local `services.web.routes` now checks the filesystem first, then serves `/index.html` for remaining web paths. Existing top-level `/health` and `/v1/*` rules still select the solver service first. Configuration checks pass; this patch is not deployed or verified on Vercel. Redeploy the updated configuration and repeat direct-route, asset, and same-origin API smoke checks before marking the failure resolved. See [Vercel service routing](https://vercel.com/docs/services/routing).
