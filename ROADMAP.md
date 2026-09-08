# CapitalCanvas remaining work

Only unfinished work belongs in this checklist. Scope remains in PROJECT_PLAN.md; visual requirements remain in docs/DESIGN_SPEC_DRAFT.md.

## Current state

One repository and one existing Vercel project. Home, Resources, and About share `/`; Ithaca is at `/tools/ithaca` with a single back arrow. The reference-based hero, three cards, generated spectral surface, nine research references, Asian lattice implementation note, About, contact, and legal footer are implemented locally. Method reference expands the matching Resources content inline in the workbench sidebar. Privacy, Terms, Disclaimer, and Attributions are substantive review drafts, not certified legal compliance.

The owner confirms a personal, noncommercial project in Chicago. Public contact is dymteam23@gmail.com. Display Emmanuel Zhang above the About contact email, as requested by the owner.

## Release gates

- [ ] Obtain explicit approval to upload this repository to the already-linked Vercel `ithaca` project for a preview. Automatic approval review rejected the previous upload; do not bypass that decision.
- [ ] Verify deployed direct loads and refreshes for `/`, `/tools/ithaca`, `/privacy`, `/terms`, `/disclaimer`, `/notices`, and unknown paths. Preserve API precedence for `/health` and `/v1/*`.
- [ ] Audit hosting logs, retention settings, provider recipients/transfers, and browser cookies/storage on the preview. Resolve factual differences in the privacy draft and approve effective policy copy.
- [ ] Complete upstream license review: react-katex 3.1.0 declares MIT but its installed package omits a license file. Verify the upstream copyright notice and font/bundled Plotly notices before release. Installed license files are reproduced at `/notices`; do not treat this preliminary collection as an exhaustive audit.
- [ ] Configure and verify edge rate limiting for `POST /v1/solve` before sustained public traffic. Per-process concurrency limits do not replace edge rate limiting.
- [ ] Run hosted same-origin smoke and browser solve checks, confirm home works without the API, and inspect keyboard/mobile behavior on that build.
- [ ] Finalize canonical/sitemap URLs against the released origin, remove draft/noindex status from approved policies, and promote only after release approval. Record actual deployment results in docs/OPERATIONS.md.

## Local evidence

The final content update passes 25 frontend tests, lint, production build, 57 solver tests, and HTTP smoke. Final browser checks pass section focus, policy routes, mobile reflow, and the Ithaca back link with no page errors. Browser layout checks pass at 320, 390, 768, 1280, and 1672 px with no horizontal overflow. The 1672×941 first viewport was visually inspected against the reference. Earlier route extraction checks covered all four solver families, cancellation, error recovery, desktop/mobile controls, direct hashes/history, and API-unavailable home. These checks do not establish hosted routing, manual screen-reader certification, or legal compliance.

Resources are organized in a collapsible Ithaca project group. Per-paper details are labeled “Implementation”; repeated “Used in Ithaca” labels are removed. Direct paper anchors open their containing project group.

The Ithaca sidebar uses an inline Method reference disclosure with shared Resources content and stable light-blue links. It has no Disclaimer link. On mobile, Black–Scholes closed form uses two lines and the heading reserves space for the close button.
