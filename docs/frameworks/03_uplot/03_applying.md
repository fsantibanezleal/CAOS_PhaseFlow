# uPlot · 03 · Applying the charts to other data

Every chart reads a method's `periods[]` from a trace ([data-contract/03](../../data-contract/03_trace-and-manifest.md)):
`minedTonnes`, `oreTonnes`, `wasteTonnes`, `headGrade`, `cumNpv`, `stripRatio`, `resourceUse`,
`resourceLimit`, `components`, `largestComponentShare`. To chart a schedule produced elsewhere, emit those
rows and pass them in; to add a quantity, add a field to the trace (and to `contract.types.ts`, so a drift
fails the build) and a `build` function that maps it to series.

Keep the cursor contract: every chart's `onCursor` reports the period index, and the page passes one shared
cursor to the charts and the 3D stage, so moving the year moves everything at once.
