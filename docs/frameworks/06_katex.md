# 06 · KaTeX: the equations

**What it is.** The math typesetter behind every equation on the reading pages.

**Pin.** `katex@0.19.1` in `frontend/package.json`; shell 0.19.9 accepts KaTeX `^0.16.0`, `^0.17.0`, `^0.18.0` or `^0.19.0` as a peer dependency.

**Why this one.** It renders synchronously to HTML with no layout reflow, fast enough for pages with dozens
of display equations, and its output follows the page's text colour, so equations invert with the theme.

**How it is used.** Never directly: the shell's `Equation` (display, with a caption) and `InlineMath`
components wrap it, and the reading pages pass LaTeX strings (`String.raw` literals in
`frontend/src/content/*.tsx`). Inline math inside prose is written `$...$` and split by `doc.tsx`. Spanish
pages localise decimal separators inside the TeX (`localizeTex`), so a formula reads `0,138` on the Spanish
site. The wiki itself uses GitHub's `$...$` and `$$...$$` math, which GitHub renders with MathJax.

**What would make us change it.** Nothing foreseeable; the risk is an unbalanced `$` in prose, which a
content check catches before deploy.

| page | content |
|---|---|
| [installation](06_katex/01_installation.md) | the pin and the stylesheet |
| [usage](06_katex/02_usage.md) | how a topic's equations reach the page |
| [applying](06_katex/03_applying.md) | writing equations that render on both the app and GitHub |
