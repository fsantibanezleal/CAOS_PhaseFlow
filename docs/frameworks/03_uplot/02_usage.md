# uPlot · 02 · How the charts use it

`frontend/src/viz/Charts.tsx`.

## One wrapper

`UPlotChart({ data, build, height, onCursor })` creates the plot from a `build(width, height)` options
function, wires the cursor to the shared period cursor through a `setCursor` hook, and observes size.

```ts
const p = new uPlot(build(width, height), data, el);
const ro = new ResizeObserver(() => {
  const w2 = (el.parentElement ?? el).clientWidth;
  if (Math.abs(w2 - lastW) >= 1) p.setSize({ width: w2, height });
});
ro.observe(el.parentElement ?? el);   // the PARENT, never el
```

**The resize trap.** uPlot draws INTO the element it is given, so observing that element makes every
resize change its own content box, which fires the observer again: the chart grows without limit and takes
the page with it. Observing the parent, whose box the layout sets, breaks the cycle. A browser gate checks
that the plot returns to its size after a viewport change.

## The production chart is the discipline's chart

Morales, Jelvez, Nancel-Penard, Marinho and Guimaraes (APCOM 2015) pair every schedule table with the same
figure: production and waste per period as bars, cumulative NPV as a line. `ProductionChart` draws exactly
that, plus the certified bound as a reference line, because a cumulative NPV curve with no bound on it is a
number with no scale.

## Language and theme

Axis titles, series labels and tick numbers follow the app's language (a Spanish page reads `1,4`, not
`1.4`); colours are read from the shell's CSS variables at build time, and the theme is a dependency of
every chart, so a toggle rebuilds them.

## Accessibility

Each chart host is focusable with a role and label, and every chart prints the value under the cursor
beneath itself; per-series checkboxes solo or hide a series.
