# Visual Design Spec — Approved

Status: approved concept, Phase 1 implementation complete. This document remains named `DESIGN_SPEC_DRAFT.md` to preserve existing links.

## Concept files

- Desktop: `docs/design/ithaca-desktop-concept.png`
- Mobile: `docs/design/ithaca-mobile-concept.png`

These files are visual concepts, not production UI assets. Implementation must recreate controls, equations, charts, and text as code-native React components.

## Direction

Ithaca looks like a precise scientific instrument: deep navy canvas, crisp near-white type, cyan active states, spectral blue-to-yellow price surface, and amber warnings. Editorial serif headings distinguish mathematical content; compact sans-serif text handles controls and data.

## Desktop composition

- Quiet header with product name, preset, Reset, and primary Solve action.
- Left Problem rail owns contract, market, domain, method, and numerical inputs.
- Center canvas owns Surface, Price slice, Convergence, and Paths views.
- Right inspector owns governing equation, terminal/boundary conditions, method explanation, and warnings.
- Bottom result strip owns price, uncertainty, reference error, runtime, Monte Carlo settings, and status.
- Rails use separators and open regions rather than nested cards.

## Mobile composition

- Header retains product name, preset, and Solve.
- Chart stays primary and appears before controls.
- Compact result band stays close to chart.
- Problem, Equation, and Results open as bottom sheets.
- Finger-sized controls replace desktop-dense inputs.
- Bottom sheet may leave chart context visible where viewport height permits.

## Locked tokens

- Background: `#03101d`
- Primary surface: `#061725`
- Raised surface: `#0a1d2d`
- Text: `#f2f5f5`
- Muted text: `#a8b4bd`
- Border: `#334452`; soft border: `#203545`
- Active accent: `#24d5e7`; soft accent: `#8cebf2`
- Warning: `#ffb000`
- Success/reference accent: `#86d849`
- Error: `#ff7c67`
- Serif: Georgia with Times and system-serif fallbacks
- Controls: Inter with system sans-serif fallbacks
- Radius: 4 px controls; 14 px mobile sheet top corners
- Borders: 1 px, low-contrast, precise
- Motion: 160 ms opacity changes; disabled under `prefers-reduced-motion`

## Visible-copy lock

Above the fold may include only required product/workbench copy:

- Ithaca
- European Call
- Reset
- Solve
- Problem
- Contract
- Market
- Surface
- Methods
- Price surface
- Price slice
- Convergence
- Paths
- Governing equation
- Results
- Monte Carlo settings
- Status

Option-specific labels, equations, conditions, warnings, metrics, and form labels may change from state data. No marketing headline, badge, fake metric, or decorative product claim should be added.

## Component families

- App shell and responsive rail/drawer layout
- Preset selector
- Parameter section and labeled numerical input
- Option/method selector
- Chart tabs and chart canvas
- Equation inspector
- Result metric
- Monte Carlo control group
- Warning/diagnostic message
- Progress and cancellation state
- Mobile bottom-sheet navigation

## Implementation notes

- Closed form, finite difference, and Monte Carlo are enabled for European contracts.
- European call and put are the only enabled contracts.
- Planned option families remain visible but disabled, preserving the accepted workbench structure.
- Plotly loads through a lazy React boundary to keep the initial application bundle separate from the chart bundle.
- Mobile keeps the chart first and exposes Problem, Equation, and Results through bottom-sheet navigation.
- Price slices compare methods and show reference errors; Monte Carlo views show confidence, convergence, and sample paths.
