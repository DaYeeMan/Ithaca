# Production operations

Ithaca deploys as one stateless Vercel Services project. The Vite service owns `/`; the FastAPI service owns `/health` and `/v1/*`. Browser-to-API traffic stays on the deployment origin, so production needs neither an API URL variable nor CORS configuration. No database or background worker is required.

Current production: `https://ithaca-lake.vercel.app`. The initial Hobby deployment was verified on September 7, 2026 with `/health`, `/v1/diagnostics`, the automated pricing smoke test, and a live browser solve.

## Release order

1. Import the repository into Vercel with the repository root selected. If Vercel asks for a framework preset, select **Services**; `vercel.json` owns each service's build settings.
2. Do not add `VITE_SOLVER_API_URL`. The web service uses same-origin `/v1` requests.
3. Deploy a preview and confirm `GET /health` and `GET /v1/diagnostics` on the preview origin.
4. Run `python scripts/smoke_test.py --frontend https://preview.example --api https://preview.example`.
5. Promote the verified preview to production.

## Vercel CLI

The same flow from the repository root is:

```powershell
npx --yes vercel@59.11.7 login
npx --yes vercel@59.11.7 link
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
\.\services\solver-api\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir services/solver-api --host 127.0.0.1 --port 8000
npm run dev:web -- --host 127.0.0.1
python scripts/smoke_test.py --frontend http://127.0.0.1:5173 --api http://127.0.0.1:5173
```

The Vite development server proxies `/health` and `/v1` to port 8000. To exercise Vercel's combined routing instead, use `vercel dev -L` after the project is linked or the installed CLI supports local Services mode.

Vercel CLI 59.11.7 can generate an invalid Python bootstrap on Windows when the repository's absolute path contains backslash escape sequences such as `C:\Users`. If that occurs, use the normal two-process check above or a cloud preview; Vercel's Linux deployment build is unaffected.
