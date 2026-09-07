# Accessibility audit

Phase 6 audit target: keyboard-only use and common screen-reader semantics at 390×844, 768×1024, 1280×720, and 1440×900.

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

Plotly remains a visual exploration surface. The text alternative communicates the active result; detailed point inspection is available through keyboard-accessible slice controls and the result strip.
