# Ithaca

Interactive option-pricing PDE solver and visualization workbench.

Phase 3 prices European and American calls and puts. European methods are Black–Scholes closed form, Crank–Nicolson finite differences, and seeded risk-neutral Monte Carlo. American methods are a Cox–Ross–Rubinstein tree, Crank–Nicolson with a PSOR early-exercise constraint, and Longstaff–Schwartz Monte Carlo. The workbench renders synchronized surfaces and slices, uncertainty, convergence, sample paths, governing equations, numerical diagnostics, and the American early-exercise boundary. Asian and barrier contracts remain planned phases.

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

Open `http://127.0.0.1:5173`. Override the API URL with `VITE_SOLVER_API_URL` when the service is not at `http://127.0.0.1:8000`.

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
