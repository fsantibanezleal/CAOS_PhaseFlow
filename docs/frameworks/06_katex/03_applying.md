# KaTeX · 03 · Writing equations that render everywhere

- Use `String.raw` for TeX in TypeScript, so backslashes survive.
- Keep to the commands both KaTeX and GitHub's MathJax render (`\frac`, `\sum`, `\underbrace`,
  `\mathcal`, `\mathrm`, `\begin{aligned}`), so the wiki and the app can share formulas.
- Balance `$` in prose: an odd count turns the rest of a paragraph into math. Check before committing.
- Put the explanation of every symbol in `symbols`, not in the caption, so the reader can look it up.
