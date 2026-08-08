# uPlot

**What it is.** The chart library behind production and cumulative NPV, capacity utilisation, head
grade and strip ratio, spatial coherence, and the risk fan.

**Pin.** `uplot@^1.6.31` in `frontend/package.json`.

**Why this one.** The interactive-visualization rubric asks for a Tier-A interactive chart with a
value readout under the cursor, not a static SVG. uPlot gives a synchronised cursor across several
charts and per-series toggling in about 45 KB, which matters on a page that already carries a 3D
renderer.

**How it is used here.** Every chart reports the value at the cursor beneath itself, with a per-series
checkbox that solos or hides a series. The period cursor is shared with the 3D stage, so moving the
year moves everything at once.

**What would make us change it.** A chart type uPlot does not do, which for this product would mean a
2D field or a heatmap. Under the rubric that is a different library for a different data type rather
than a reason to abandon this one.
