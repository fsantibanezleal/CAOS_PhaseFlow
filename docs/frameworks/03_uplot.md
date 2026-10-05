# 03 · uPlot: the charts

**What it is.** The chart library behind production and cumulative NPV, capacity utilisation, head grade
and strip ratio, spatial coherence, the method bars and the risk fan.

**Pin.** `uplot@^1.6.31` in `frontend/package.json`.

**Why this one.** The interactive-visualisation rubric asks for an interactive chart with a value readout
under the cursor, not a static SVG. uPlot gives a synchronised cursor and per-series toggling in about
45 KB, which matters on a page that already carries a 3D renderer.

**What would make us change it.** A chart type it does not do (a 2D field, a heatmap): under the rubric
that is a different library for a different data type, not a reason to abandon this one.

| page | content |
|---|---|
| [installation](03_uplot/01_installation.md) | the pin and the stylesheet |
| [usage](03_uplot/02_usage.md) | the wrapper, the production chart, the resize trap, language and theme |
| [applying](03_uplot/03_applying.md) | charting another trace or another per-period quantity |
