# Ithaca

Interactive option-pricing PDE solver and visualization workbench.

The release candidate prices European, American, barrier, and fixed-strike Asian calls and puts. It includes bounded compute, cooperative request cancellation, structured diagnostics, accessible desktop/mobile controls, synchronized charts, uncertainty, convergence, governing equations, and numerical diagnostics.

## Local development

Requirements: Node.js 22+, npm, and Python 3.12+.

Install and start the solver API:

```powershell
cd services/solver-api
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -e ".[dev]"
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

In a second terminal, install and start the web app:

```powershell
npm --prefix apps/web install
npm run dev:web -- --host 127.0.0.1
```

Open `http://127.0.0.1:5173`. Vite proxies `/health` and `/v1` to the local API on port 8000, matching the same-origin production routes. Set `VITE_SOLVER_API_URL` only when deliberately using an external API host.

## Checks

```powershell
npm run test:web
npm run lint:web
npm run build:web
.\services\solver-api\.venv\Scripts\python.exe -m unittest discover -s services/solver-api/tests
```

## Project documents

- [PROJECT_PLAN.md](./PROJECT_PLAN.md): product scope, architecture, phases, and acceptance criteria
- [ROADMAP.md](./ROADMAP.md): current status and implementation checklist
- [docs/BENCHMARKS.md](./docs/BENCHMARKS.md): numerical reference cases and accuracy gates
- [docs/DESIGN_SPEC_DRAFT.md](./docs/DESIGN_SPEC_DRAFT.md): approved visual system and responsive composition
- [docs/ACCESSIBILITY.md](./docs/ACCESSIBILITY.md): keyboard and screen-reader audit
- [docs/PERFORMANCE.md](./docs/PERFORMANCE.md): performance gates and resource controls
- [docs/OPERATIONS.md](./docs/OPERATIONS.md): deployment, monitoring, smoke tests, and rollback
