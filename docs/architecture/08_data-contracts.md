# The two data contracts

Data enters through one enforced contract and leaves through another. Both are checked in CI.

## CONTRACT 1, ingestion: raw to pipeline

`data-pipeline/pipeline/io/contract.py`. It is what lets someone point PhaseFlow at THEIR block model
instead of only replaying the baked cases.

| clause | rule |
|---|---|
| columns | `x, y, level` integer grid indices; one value column per destination; one column per resource |
| units | tonnes for resource coefficients, currency for value, both declared per case |
| ranges | resource coefficients must be non-negative; the solver raises rather than accepting a negative |
| forbidden destinations | the MineLib sentinel `-1e18` is recognised and mapped, never read as a number |
| non-numeric columns | kept as labels rather than coerced (a rock-type column crashed the reader once) |
| licence | a non-redistributable instance is FLAGGED at ingestion, and the flag decides what may be committed |

Nothing is silently coerced. A bad row is rejected with its reason; a plausible-but-suspicious one is
flagged, and the flag travels into the manifest.

**The two ingestion bugs worth reading about.** The reader crashed on `newman1`'s rock-type column
until non-numeric tokens became NaN and were kept as labels. And the tonnage column was read from the
wrong index on two instances, which is not something a schema check can catch: it was settled by
internal consistency, one column strictly positive and dominating the other, and zero exactly where
the process value is zero.

## CONTRACT 2, artifact: pipeline to web

`data-pipeline/pipeline/core/{trace.py, manifest.py}`. Every bake writes a compact trace
(`phaseflow.schedule-trace/v1`) and a manifest (`phaseflow.manifest/v1`) recording the parameters, the
seed, the engine and its version, the artifact byte size, the measured
[lane verdict](03_the-gate.md), the CONTRACT 1 flags, and the metrics.
`data/derived/manifests/index.json` (`phaseflow.index/v1`) inventories every case.

**Enforcement**, three separate mechanisms because one is not enough:

1. `frontend/src/lib/contract.types.ts` mirrors the schema, so drift fails `tsc`.
2. `scripts/check_artifacts.py` verifies index to manifests to artifacts, that byte sizes match, that
   `lane == gate`, and the NEGATIVE clause: a non-redistributable case must not carry `blocks`.
3. Every loader checks the schema id at runtime and throws on a mismatch rather than rendering three
   panels correctly and one silently wrong.

The web loads only these artifacts. The live lane recomputes, but it emits the same shapes and is held
to the offline lane by `frontend/test/parity.test.ts`.

## Why the two contracts are the product

Without CONTRACT 1 the app cannot be applied to new data, which makes it a slideshow of thirteen
cases. Without CONTRACT 2 the web can drift from what the pipeline produced, and the drift is
invisible: the page still renders, with last release's numbers under this release's labels.
