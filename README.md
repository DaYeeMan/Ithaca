# CapitalCanvas

Quantitative tools for clearer decisions. This repository contains the CapitalCanvas site and its first tool, Ithaca, an interactive option-pricing workbench.

CapitalCanvas is live at https://capitalcanvas.vercel.app. Home follows the supplied dark three-card reference, with research and About below it. The latest local changes finalize policy labels and license notices and simplify the footer/About content. Deploy these changes through the existing workflow. See ROADMAP.md for the staged firewall follow-up.

Home, Resources, and About navigation scrolls to `/#home`, `/#resources`, and `/#about` on that single page. Resources sits below the hero/tool cards; About sits below Resources.

The existing Ithaca tool prices European, American, barrier, and fixed-strike Asian calls and puts. It includes bounded compute, cooperative request cancellation, structured diagnostics, accessible desktop/mobile controls, synchronized charts, uncertainty, convergence, governing equations, and numerical diagnostics.

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

- [PROJECT_PLAN.md](./PROJECT_PLAN.md): CapitalCanvas site structure, content, architecture, and acceptance criteria
- [ROADMAP.md](./ROADMAP.md): next implementation steps in order, with milestone exit conditions
- [docs/BENCHMARKS.md](./docs/BENCHMARKS.md): numerical reference cases and accuracy gates
- [docs/DESIGN_SPEC_DRAFT.md](./docs/DESIGN_SPEC_DRAFT.md): CapitalCanvas home direction and preserved Ithaca composition
- [docs/ACCESSIBILITY.md](./docs/ACCESSIBILITY.md): keyboard and screen-reader audit
- [docs/PERFORMANCE.md](./docs/PERFORMANCE.md): performance gates and resource controls
- [docs/OPERATIONS.md](./docs/OPERATIONS.md): deployment, monitoring, smoke tests, and rollback

## Remaining work

Deploy the latest content changes and publish/review the staged solve-protection rule before enabling enforcement. ROADMAP.md contains the exact remaining actions; completed site restructuring is no longer an implementation backlog.
