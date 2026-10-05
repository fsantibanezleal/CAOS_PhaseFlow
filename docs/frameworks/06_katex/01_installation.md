# KaTeX · 01 · Installation

```bash
cd frontend && npm ci      # katex@^0.16.11, consumed through the shell
```

The KaTeX stylesheet and fonts arrive with the shell's styles (`@fasl-work/caos-app-shell/styles.css`,
imported once in `main.tsx`); no page imports KaTeX itself.
