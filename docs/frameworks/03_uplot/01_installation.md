# uPlot · 01 · Installation

```bash
cd frontend && npm ci      # uplot@^1.6.31 from the lockfile
```

```ts
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';
```

The stylesheet is imported once, by `viz/Charts.tsx`; colours and fonts are then set per chart from the
shell's CSS variables so the charts follow the theme.
