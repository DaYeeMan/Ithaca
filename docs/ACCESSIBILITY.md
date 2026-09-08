# Accessibility audit

Scope: preserve the existing Ithaca controls below while validating the new CapitalCanvas shell. Local Edge/Playwright checks passed section navigation, direct hashes, browser history, reduced-motion scrolling, responsive document widths (390, 768, 1280, 1440 px), chart keyboard tabs, and mobile-sheet Escape dismissal with focus return. Full screen-reader, contrast, and 200% zoom audits remain release work; these local checks do not certify accessibility compliance.

Audit target: keyboard-only use and common screen-reader semantics at 390×844, 768×1024, 1280×720, and 1440×900.

Implemented controls:

- Visible focus indicators and a skip link to the visualization.
- Native labels for numerical fields and selectors; pressed state for method toggles.
- ARIA tablist semantics with roving focus and Left/Right Arrow navigation.
- A labelled chart image plus a concise text alternative containing view, method, and scalar price.
- Polite result announcements and assertive error announcements.
- Mobile panels use modal dialog semantics, initial focus, Escape dismissal, focus containment, and return focus.
- Reduced-motion preferences disable meaningful animation.

Manual release audit:

1. Complete a solve without a pointer; verify focus never disappears.
2. Move through chart tabs with Tab then Left/Right Arrow.
3. At mobile widths, open each panel, cycle focus with Tab/Shift+Tab, dismiss with Escape, and verify focus returns to its trigger.
4. With Narrator, NVDA, or VoiceOver, confirm form labels, method state, selected chart tab, chart summary, results, and errors are announced once and in logical order.
5. At 200% zoom and each target viewport, confirm controls remain reachable without horizontal page scrolling.

CapitalCanvas full release audit (repeat after final design/content):

1. Reach tools, research, About, and footer by normal scrolling and keyboard navigation.
2. Follow `/#home`, `/#resources`, and `/#about` from home/legal routes, and use Ithaca's back arrow to return to Home. Verify all sections share one document, headings are not obscured, and keyboard focus reaches the intended content. Test repeated clicks, direct hash loads, refresh, and Back/Forward.
3. Verify one main landmark, ordered headings, route titles, skip links, and sensible focus after navigation.
4. Confirm Coming soon cards add no dead controls to the tab order; citation and legal links have descriptive names.
5. Test direct loads, Back/Forward, reduced motion, contrast, and 200% zoom at the same target sizes.

Record actual audit results after implementation. Existing Ithaca evidence does not certify the new pages.

Plotly remains a visual exploration surface. The text alternative communicates the active result; detailed point inspection is available through keyboard-accessible slice controls and the result strip.
