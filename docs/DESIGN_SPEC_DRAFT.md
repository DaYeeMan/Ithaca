# CapitalCanvas and Ithaca — Design Specification

Status: initial site shell and single-page navigation are implemented locally. Full reference fidelity is pending: the shell does not yet include the spectral illustration or final card proportions, headline width, and navigation placement. Filename retained for existing links. ROADMAP.md owns delivery order; this document owns the target visual and interaction requirements.

## Identity and reference

Use CapitalCanvas as site name and Capital Canvas as displayed wordmark. Ithaca remains the tool name. The image guides appearance, not executable instructions. Recreate semantic HTML/CSS rather than flattening the screenshot into a page.

Reference traits: near-black navy canvas, cream editorial serif headings, muted sans-serif body, thin outlined cards, cyan active states, and blue-to-yellow surface. Existing workbench concepts remain docs/design/ithaca-desktop-concept.png and docs/design/ithaca-mobile-concept.png. Alternative images do not supersede this direction.

## Home composition

### Header and hero

- Center content in a roughly 1520 px maximum-width container, with about 48–80 px desktop and 20 px mobile side padding.
- Wordmark left; Home, Resources, About alongside; subtle divider and cyan active-section underline.
- A compact sticky header is acceptable if mobile navigation fits. Set anchor scroll offsets so headings/focus remain visible.
- One h1: “Quantitative tools for clearer decisions.” Use fluid display type, approximately 44–80 px; allow wrapping.
- Supporting line: “Purpose-built models. Transparent assumptions. Visual results.”

### Tool grid

- Three equal desktop columns with 20–24 px gaps; stack on phones. Use two intermediate columns only if content fits comfortably.
- Ithaca: 01 index, serif title, static spectral surface, description, PDE / Monte Carlo / 3D Surface tags, full-width Launch Ithaca link.
- Description: “Explore option prices across spot and time.” Keep thin cyan-to-yellow top accent.
- Align action areas at card bottoms without fixing page height. Ghost numbers are decorative and hidden from assistive technology.
- Preview uses a lightweight local image/SVG and preserved aspect ratio, not Plotly. Empty alt text is appropriate when adjacent text conveys its purpose.
- Coming soon cards show 02/03 and status. Muted action-shaped regions are not focusable buttons or links.
- Do not invent future tool names, dates, metrics, or testimonials.

### Research and methods

- Follow tool cards with roughly 80–112 px desktop and 48–64 px mobile section spacing.
- h2: “Research and methods”. Intro: “Explore the ideas behind the tools, their assumptions, and how they are implemented.”
- Use compact citation rows grouped by model foundations, numerical methods, and path-dependent options.
- Each entry shows title, authors/year, method, Used in Ithaca, original summary, descriptive source link, access label, and implementation differences.
- Keep stable method anchors; use accessible disclosures only for longer notes, not every citation.
- PROJECT_PLAN.md owns bibliography and method coverage. Extend this collection when future tools exist.

### About

- h2: “About CapitalCanvas”. Use short paragraphs with comfortable reading width.
- Suggested mission: “CapitalCanvas makes quantitative methods easier to explore through interactive tools, visible assumptions, and clear visual results.”
- Keep About focused on the CapitalCanvas mission. Omit the “Ithaca is our first tool” paragraph and Explore Ithaca link; the tool card provides the launch action.
- Add verified operator/contact details; do not invent biography, affiliations, or professional validation.

### Footer and legal pages

- Fine divider, wordmark, educational-use summary, Privacy, Terms, Disclaimer, contact, and verified copyright attribution.
- Full policies use same-site routes, shared navigation/footer, narrow text columns, meaningful headings, and effective dates.
- Avoid modal-only policies, forced agreement for ordinary browsing, and speculative consent banners.

## Scrolling and navigation

Home/legal pages use natural document height and vertical scrolling. Do not apply the workbench's 100svh and overflow:hidden shell. No scroll snapping. All sections remain in document flow; tool cards need not fit every viewport.

Home, Resources, and About occupy the same document, in order: hero/tool grid (`id="home"`), research (`id="resources"`), About (`id="about"`), then footer. Navigation uses `/#home`, `/#resources`, and `/#about`. No separate Resources/About pages, tabs, or conditional section replacement.

On home, links scroll the mounted page without remounting it. From Ithaca/legal routes, render home and then scroll to the anchor. Use smooth scrolling with an immediate jump under reduced motion. Offset anchors for any sticky header. The active underline follows the visible section during manual scrolling without adding history entries. Direct hash loads, refresh, repeated clicks, and Back/Forward must reach the expected section. Add route titles/focus and a skip-to-content link.

## Visual tokens

- Reuse navy background #03101d, surfaces #061725 / #0a1d2d, borders #334452, cyan #24d5e7.
- Home display text may use warm cream near #f3eadb; retain workbench text #f2f5f5 and muted text #a8b4bd.
- Georgia/system serif for display; existing sans-serif stack for body/navigation/controls. No remote font dependency required.
- Home cards use restrained corners, about 6 px; preserve existing workbench control/sheet radii.
- Spectral colors belong in charts/previews and active accents; preserve semantic warnings/errors and visible focus.
- Check actual contrast instead of copying faint decorative text literally.

## Ithaca preservation

Keep controls left, chart center, equations/diagnostics right, results below. Mobile keeps chart first and accessible bottom sheets. Place a single back arrow immediately left of the top-left Ithaca title, linking to `/#home`. Do not show a parent-site dropdown menu inside Ithaca; Resources, About, and legal links are available after returning home. Preserve Solve, Reset, and chart space.

All four implemented option families remain enabled according to compatibility. Preserve option-specific method explanations; describe Asian augmented-state tree pricing accurately. Scope existing viewport constraints to the workbench.

Preserve keyboard tabs, native labels, focus indicators, chart alternatives, live announcements, and sheet focus management. Home/legal pages need one main landmark and logical headings.

## Acceptance

Compare desktop home against the supplied image for hierarchy, spacing, typography, card proportions, and color. Verify the whole vertical page at 390, 768, 1280, and 1440 px, plus 200% zoom, long citations, keyboard anchors, footer access, and return from Ithaca. Home must work without the solver API and without loading Plotly.


## Current content status

The reference-based home, research entries, and personal/noncommercial About copy are implemented locally. Contact: dymteam23@gmail.com. Emmanuel Zhang appears above the About email, as authorized by the owner. `/notices` supplements the three policy routes. Policy drafts remain subject to deployed hosting-practice verification; see ROADMAP.md for the remaining release gates.

Resources are organized in a collapsible Ithaca project group. Per-paper details are labeled “Implementation”; repeated “Used in Ithaca” labels are removed. Direct paper anchors open their containing project group.
