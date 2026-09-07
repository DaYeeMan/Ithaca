# Production operations

Ithaca has two stateless deployments: the Vite frontend on Vercel and the FastAPI image on a container host. No database or background worker is required.

## Release order

1. Deploy `services/solver-api/Dockerfile` to a container host with at least 1 CPU and 1 GiB RAM per replica. Start with one Uvicorn worker per container; scale replicas horizontally.
2. Set the backend variables from `services/solver-api/.env.example`. Use the exact Vercel production and preview origins in `ITHACA_ALLOWED_ORIGINS`; never treat CORS as authentication.
3. Confirm `GET /health` and `GET /v1/diagnostics` over HTTPS.
4. Set Vercel `VITE_SOLVER_API_URL` to the HTTPS backend origin, then deploy the repository using `vercel.json`.
5. Run `python scripts/smoke_test.py --frontend https://... --api https://...`.

Production builds must set `VITE_SOLVER_API_URL`; the localhost fallback exists only for local development. Vite embeds this value at build time, so changing it requires a new frontend deployment. Vercel builds fail immediately when the value is missing, malformed, or not HTTPS.

## Vercel setup

Run these commands from the repository root after the backend is reachable over HTTPS:

```powershell
npx --yes vercel@59.11.7 login
npx --yes vercel@59.11.7 link
npx --yes vercel@59.11.7 env add VITE_SOLVER_API_URL preview
npx --yes vercel@59.11.7 env add VITE_SOLVER_API_URL production
npx --yes vercel@59.11.7
```

Enter the backend origin, without a trailing path, for both environment prompts. Add the preview deployment origin to `ITHACA_ALLOWED_ORIGINS` on the backend, verify it with the smoke test, then promote with:

```powershell
npx --yes vercel@59.11.7 --prod
```

If the backend origin changes, update both Vercel environment values and redeploy. Do not put backend secrets in variables beginning with `VITE_`; those values are embedded in public browser assets.

## Runtime controls

- `ITHACA_REQUEST_TIMEOUT_SECONDS` defaults to 30. Long solver loops cooperatively stop on deadline or client disconnect.
- `ITHACA_MAX_CONCURRENT_SOLVES` defaults to 2 per process. Excess requests receive `503 solver_busy`.
- Barrier Monte Carlo is capped at 4,000,000 path nodes. Containers still need a hard memory limit.
- Add provider edge rate limiting for `POST /v1/solve`. Health and diagnostics should remain outside the solve concurrency pool.
- Logs are one JSON object per completed/failed HTTP request and include request ID, path, status, and duration; request bodies and financial parameters are not logged.

## Monitoring and alerts

Probe `/health` every minute. Alert on repeated 5xx responses, `solver_busy`, `solve_timeout`, container restarts/OOM events, p95 solve latency above 5 seconds for defaults, or memory above 80%. Use `X-Request-ID` to correlate browser failures with API logs. `/v1/diagnostics` exposes only non-secret runtime limits and version.

## Rollback

Vercel: promote the previous successful deployment. Backend: redeploy the previous immutable image digest, retaining the same environment variables. Run the smoke test after either rollback. Because the service is stateless, there is no data migration or recovery step.

## Local production check

```powershell
docker build -t ithaca-solver-api services/solver-api
docker run --rm -p 8000:8000 --env-file services/solver-api/.env.example ithaca-solver-api
npm run build:web
python scripts/smoke_test.py --frontend http://127.0.0.1:5173 --api http://127.0.0.1:8000
```
