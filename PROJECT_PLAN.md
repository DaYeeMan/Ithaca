# CapitalCanvas — Project Plan

Status: the site-structure phase is implemented and locally verified; Vercel preview validation awaits explicit upload approval. The reference-based home, research content, and legal drafts are implemented. Hosted verification and final privacy/license review remain pending. ROADMAP.md owns unfinished tasks and milestone exit conditions; docs/DESIGN_SPEC_DRAFT.md owns appearance.

## Product scope

CapitalCanvas is the parent site for quantitative tools. Ithaca is the first available tool inside it. Build everything in this repository, in the existing apps/web frontend, services/solver-api backend, and single Vercel project. No separate site, repository, service, or deployment is needed.

Use CapitalCanvas as the site name and “Capital Canvas” as the reference image's wordmark. The home page follows the supplied image, then continues through research, About, and the legal footer. Keep two unnamed Coming soon cards without invented functionality or release dates.

Preserve Ithaca's calculations, charts, controls, uncertainty, diagnostics, cancellation, and numerical gates. European, American, continuous zero-rebate single-barrier, and discrete fixed-strike Asian calls and puts are implemented. Deployment details belong to docs/OPERATIONS.md; numerical evidence belongs to docs/BENCHMARKS.md.

## Routes and navigation

| Location | Purpose |
| --- | --- |
| / | Scrollable CapitalCanvas home |
| /#home | Top section of home: hero and tool cards |
| /#resources | Research section on home |
| /#about | About section on home |
| /tools/ithaca | Existing Ithaca workbench |
| /privacy | Full privacy statement |
| /terms | Terms of use |
| /disclaimer | Financial and numerical limitations |
| Unknown path | Not-found view with Home link |

Home, Resources, and About are three sections of the same page, in that order. Home navigation targets `/#home`, Resources targets `/#resources`, and About targets `/#about`. Clicking these links while on home scrolls the existing document to the section; it does not replace content or remount the page. Resources and About remain visible below the tool cards during ordinary scrolling. Do not create `/resources` or `/about` pages or tab panels.

Use real anchor links. The wordmark also returns to `/#home`. Legal-page navigation loads home and scrolls to the requested section after it mounts. Ithaca has one back arrow immediately left of its title, linking to `/#home`; it has no parent-site menu. Resources, About, and legal links remain accessible on home. Use smooth scrolling unless reduced motion is requested; in that case jump directly. Keep target headings clear of any sticky header. The active navigation underline follows the visible section during manual scrolling; do not add history entries on every scroll. Explicit link navigation and browser Back/Forward must restore the expected section. Preserve direct hash loads, refresh, and accessible focus.

The old root URL intentionally becomes home; do not redirect it back to Ithaca. Keep the existing deployment origin until a custom domain is confirmed. Attaching a domain later must use this same project.

## Home content, in order

1. Header: Capital Canvas wordmark; Home, Resources, About navigation.
2. Hero: “Quantitative tools for clearer decisions.” Supporting line: “Purpose-built models. Transparent assumptions. Visual results.”
3. Tool grid: Ithaca with spectral surface preview, “Explore option prices across spot and time.”, PDE / Monte Carlo / 3D Surface tags, and Launch Ithaca. Two non-interactive Coming soon cards. Tags highlight features rather than list every solver.
4. Research and methods: accessible citations, original summaries, assumptions, and implementation notes for current methods. Future tools extend the same collection.
5. About: CapitalCanvas mission, intended audience, transparent assumptions, and verified operator/contact details. Omit the first-tool paragraph and Explore Ithaca link; the Ithaca card owns the launch action.
6. Footer: educational-use summary, Privacy, Terms, Disclaimer, contact, and copyright attribution. Full policies remain same-site routes rather than a wall of text on home.

Do not invent biographies, credentials, affiliations, user counts, or performance claims.

## Research content

Keep resources in versioned frontend data, not a CMS. Each entry has a stable ID, title, authors, year, primary-source URL, method category, associated tool IDs, original summary, and implementation note. Display all initial method groups on home; longer notes may use accessible disclosures. Search, filters, and a separate resource directory are unnecessary initially.

Distinguish foundational research from the exact implementation. Label publisher/paywalled links accurately. Link papers; do not redistribute them without permission. Link relevant Ithaca method explanations back to stable resource anchors.

### Verified initial references

| Reference | Implementation relationship |
| --- | --- |
| Black and Scholes (1973), [The Pricing of Options and Corporate Liabilities](https://doi.org/10.1086/260062) | European model foundation. Explain constant parameters and distinguish the implementation's continuous dividend yield. |
| Cox, Ross, and Rubinstein (1979), [Option pricing: A simplified approach](https://www.sciencedirect.com/science/article/pii/0304405X79900151) | American binomial pricing and the underlying tree used by Asian augmented-state pricing. |
| Longstaff and Schwartz (2001), [Valuing American Options by Simulation: A Simple Least-Squares Approach](https://escholarship.org/uc/item/43n1k4jb) | Regression estimates American continuation values. Explain regression error and reduced surface budgets. |
| Kemna and Vorst (1990), [A pricing method for options based on average asset values](https://www.sciencedirect.com/science/article/pii/0378426690900395) | Foundation for Asian geometric control variates. Explain our discrete monitoring and exact discrete geometric benchmark separately. |

### Citation work still required

- Crank and Nicolson (1947), A practical method for numerical evaluation of solutions of partial differential equations of the heat-conduction type: verify original publisher link; explain grid, boundary, and truncation error.
- Boyle (1977), Options: A Monte Carlo approach: verify publisher link; explain sampling uncertainty, confidence intervals, antithetic pairs, and common random numbers.
- American LCP/PSOR: verify a reference for the exercise constraint and projected iteration. Do not attribute that entire algorithm to the Crank–Nicolson paper.
- Reiner–Rubinstein barrier formulas: verify original citation/link for Breaking down the barriers; explain continuous monitoring, no rebate, and in/out parity.
- Brownian-bridge survival weighting: verify a source for the actual conditional survival formula in barrier.py. Do not substitute a discrete-monitoring continuity correction or a different one-step-survival algorithm.
- Asian augmented-state interpolation: cite CRR plus a verified running-average interpolation source, or explicitly identify interpolation as a project implementation detail. This is a tree-based method, not an Asian Crank–Nicolson PDE solver, despite the API's finite_difference grouping.
- Curate public benchmark explanations from docs/BENCHMARKS.md. RQMC is a test reference, not an available production solver.

Use correct names: Black–Scholes, Cox–Ross–Rubinstein, Crank–Nicolson, and Longstaff–Schwartz.

## Privacy, terms, and legal scope

These are content requirements and applicability checks, not a claim that a footer satisfies every jurisdiction. Final copy depends on operator location, audience, business model, and actual data practices.

Inspection identified no accounts, saved results/configurations, analytics integration, or browser-storage usage in the frontend. Inputs are transmitted to FastAPI. API middleware records request metadata; hosting infrastructure may retain access/security logs. Never publish “we collect no data” or “nothing leaves your browser.” Verify provider settings, retention, recipients, transfers, cookies, and exception logging before writing final policy text.

- Privacy: operator/contact, categories of data, computation purpose, hosting/logging, retention, recipients, applicable rights and request process, transfers, cookies/storage, external research links, and effective date.
- Terms: educational/research purpose, acceptable use and compute abuse, availability, intellectual property/third-party notices, contact, and jurisdiction-appropriate liability and governing-law clauses.
- Disclaimer: no investment advice or recommendation; no execution; theoretical values are not executable market quotes; model assumptions and discretization, truncation, regression, and statistical errors; no guaranteed accuracy or returns.
- Footer summary: “For education and research. Model outputs are estimates, not investment advice.” Link the full disclaimer from Ithaca too.

Before launch, assess applicable national/state privacy and consumer rules, GDPR territorial scope if relevant, required operator disclosures, accessibility obligations, and license/attribution requirements. Add cookie consent only if actual technology and applicable law require it. Do not invent certifications or blanket compliance claims.

Official starting points checked for this plan: [FTC privacy and security guidance](https://www.ftc.gov/business-guidance/privacy-security) emphasizes clear data practices; [European Commission GDPR applicability](https://commission.europa.eu/law/law-topic/data-protection/information-business-and-organisations/application-gdpr_en) informs jurisdiction assessment. These do not establish an exhaustive legal checklist for an unknown operator.

## Architecture and implementation

Reuse React/TypeScript/Vite, Plotly, KaTeX, local validation/request modules, and Python/FastAPI. The restructure does not require new form, request-state, persistence, or numerical frameworks.

- Implemented: apps/web/src/App.tsx selects the page from the URL; IthacaWorkbench.tsx preserves the existing tool. Native links perform cross-page navigation, while hash links scroll the mounted home document. Browser history supplies Back/Forward without a routing dependency.
- Keep home/legal pages, shared navigation/footer, and resource/tool data in apps/web/src.
- Implemented: Ithaca is lazy-loaded by route, including Plotly and equation dependencies. Browser checks confirm home does not mount the workbench, run its initial automatic solve, or request /v1.
- Implemented: workbench.css is scoped beneath .ithaca-workbench and loaded with the tool. Home/legal pages use natural document scrolling; tool rails and mobile sheets retain existing behavior.
- Use a static local image or SVG for the surface card. Do not load Plotly or compute a price for decorative preview art.
- Preserve /health and /v1/* precedence before frontend fallback. Verify deep-route refresh on a Vercel Services preview; current catch-all service routing alone does not prove SPA fallback.
- Add route titles/descriptions, brand assets, and canonical/sitemap/robots behavior using the confirmed origin. Do not invent a domain.
- Keep same-origin APIs, stateless behavior, compute caps, request cancellation, and existing numerical contracts. Internal package/module names do not need branding renames.

## Acceptance criteria

- Home matches the image's hierarchy and scrolls through tools, research, About, and footer.
- Launch Ithaca opens /tools/ithaca on the same origin. Refresh, direct load, history, anchors, and unknown paths work.
- Home/legal pages load no Plotly and trigger no solve requests; they work when the API is unavailable.
- All four option families preserve controls, compatible methods, charts, uncertainty, diagnostics, cancellation, and error recovery. Existing numerical benchmarks pass unchanged.
- References resolve, citation metadata is checked, access labels are accurate, and implemented methods have coverage without false equivalence.
- Keyboard navigation, visible focus, skip links, headings, contrast, route focus, reduced motion, and 200% zoom work at 390, 768, 1280, and 1440 px without horizontal page scrolling.
- Legal links resolve and privacy text matches deployed behavior. Missing operator/jurisdiction facts are not fabricated.
- Existing web test/lint/build, API suite, preview pricing smoke, and route/browser checks pass before production promotion.

## Deferred scope and owner inputs

Additional tools, live data, accounts, saved/shareable results, databases, portfolios, execution, calibration, implied-volatility smiles, and additional stochastic models remain deferred. No newsletter, contact form, analytics, CMS, or monetization is implied.

These exclusions are scope boundaries, not a future delivery commitment. Home design and research/legal drafts are implemented locally. Hosted verification and final release review remain. See ROADMAP.md for tasks and exit conditions.

Owner location confirmed: Chicago, Illinois, United States. The owner confirms a personal, noncommercial project and public contact dymteam23@gmail.com. The owner authorizes displaying Emmanuel Zhang above the About contact email. Audience targeting and deployed provider practices require release review. Domain selection is optional and does not block implementation on the current deployment.

### Contact and legal requirements: Chicago clarification

Do not treat a public contact or home address as a universal legal launch requirement. A monitored project email is recommended for privacy questions and issue reports; the owner has selected dymteam23@gmail.com. Do not publish a personal address, phone number, or inferred identity.

The [Illinois Personal Information Protection Act](https://www.ilga.gov/Legislation/ILCS/Articles?ActID=2702&ChapterID=67) addresses covered personal information, security, disposal, and breach notification. It does not establish a blanket public contact-page requirement for every website. Applicable duties depend on the statutory data definitions and actual practices.

Other conditional rules can matter beyond operator location. [California's CalOPPA guidance](https://oag.ca.gov/sites/all/files/agweb/pdfs/cybersecurity/making_your_privacy_practices_public.pdf) describes privacy-policy duties for commercial sites collecting personally identifiable information about Californians. If GDPR applies, privacy notices require controller identity/contact information. If COPPA applies to children's data collection, the [FTC guidance](https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions) specifies operator name, address, telephone, and email disclosures. Do not assume these regimes apply solely because the site is publicly accessible.

Privacy is planned to explain actual processing and meet any applicable notice duties. Terms and a financial disclaimer are recommended product protections, not automatically mandated standalone pages for every Chicago educational site. A contact choice is an editorial open item unless an applicable rule establishes it as legally necessary. Final legal review, not a generic checklist, determines mandatory disclosures.

Resources are organized in a collapsible Ithaca project group. Per-paper details are labeled “Implementation”; repeated “Used in Ithaca” labels are removed. Direct paper anchors open their containing project group.

The Ithaca sidebar uses an inline Method reference disclosure with shared Resources content and stable light-blue links. It has no Disclaimer link. On mobile, Black–Scholes closed form uses two lines and the heading reserves space for the close button.
