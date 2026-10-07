# 06 · The learned lane, as a component

`data-pipeline/pipeline/model/` (features, the MLP, the ONNX export), trained by `scripts/train_learned.py`,
weights and studies committed under `models/`, consumed in two places: the offline ladder (a rung, measured
against the exact plan of each case) and the browser (the instant plan and the sensitivity surface). Neither
model certifies anything.

The method, the training choices, the scores and the browser timing are on
[methodologies/07](../methodologies/07_learned.md); where it fails, on three disjoint seed sets, on
[methodologies/08](../methodologies/08_when-the-surrogate-fails.md); the files and their rules on
[data-contract/05](../data-contract/05_model-files.md). This page records only what is architectural.

## The boundaries

| boundary | rule |
|---|---|
| training | offline only (ADR-0074); hours; never in CI or the deploy |
| split | by deposit seed, never by row; three disjoint seed sets, asserted |
| artifact | JSON weights with their metrics (NaN as null) plus a verified ONNX graph |
| offline consumer | `LearnedBundle` loads the JSON; the inference capacity fractions are read off the instance (they were once hard-coded) |
| browser consumer | a TypeScript forward pass over the same JSON, held to a Python-written fixture; no ONNX runtime in the page |
| reliability signal | the measured share of the exact plan on every baked case; the archetype rule only where nothing was measured |

## A limit carried into the surface

The bound surrogate's `ore_fraction` and `strip_ratio` inputs count blocks with positive net value as a proxy
for plant tonnage, which differs from the fixed-destination processing coefficients for blocks that prefer
the plant while both values are negative. The live CPIT solver reads the baked coefficients; the sensitivity
surface stays exploratory until the surrogate is retrained on the corrected features.
