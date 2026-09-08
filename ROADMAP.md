# CapitalCanvas roadmap

## Baseline

The owner confirms all previous roadmap content is complete. Existing CapitalCanvas/Ithaca release and infrastructure work is closed; do not reopen it as part of Troy.

## Troy — second tool

- [x] Integrate `/tools/troy` and the second home card in the existing frontend.
- [x] Implement independent dynamics, pricing, quoting, order flow, accounting, and hedge state.
- [x] Add persistent parameters, model badges, both tabs, charts, and tooltips.
- [x] Generate imagegen UI ideas in `docs/design/troy-concepts.png`.
- [x] Test reproducibility, pricing references, inventory limits, settlement, P&L, fills, and pooled statistics.
- [x] Test model controls, worker cancellation, keyboard tabs, and routing.
- [ ] Publish Troy through the existing release workflow; check home launch and direct `/tools/troy` refresh on the deployed origin.

Troy is implemented locally. Publication is separate from this implementation request. See `docs/TROY.md` for conventions and bounds.
