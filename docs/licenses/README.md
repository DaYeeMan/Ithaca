# Third-party license sources

- Package license texts: exact installed versions in apps/web/package-lock.json.
- Plotly bundled notices: https://cdn.plot.ly/plotly-2.35.3.min.js.LICENSE.txt (retrieved September 8, 2026).
- Standard SIL OFL 1.1: https://raw.githubusercontent.com/google/fonts/main/ofl/notosans/OFL.txt (retrieved September 8, 2026). Only the standard license text is retained; Noto-specific copyright is not used.
- KaTeX font copyright and reserved names: extracted from the installed TTF name tables (IDs 0, 13, 14), covering the accompanying WOFF/WOFF2 versions of those fonts.

Run `python scripts/generate_notices.py` after dependency changes. The former react-katex adapter is no longer imported or distributed; the application renders its own formula strings with KaTeX directly. Plotly's supplied bundled notices are included alongside its package MIT license.
