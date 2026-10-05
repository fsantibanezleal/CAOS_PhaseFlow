# 04 · ONNX and onnxruntime: the portable export, verified

**What it is.** The export format of the two learned models, and the runtime that verifies the export
before it is written.

**Pins.** `onnx==1.22.0` and `onnxruntime==1.28.0` in `requirements-precompute.txt`: **offline only**,
never installed by CI or the deploy. There is **no** `onnxruntime-web` in the frontend: an earlier version
of this card said there was, and `frontend/package.json` never carried it.

**Why an export at all.** The models are two small MLPs trained in explicit numpy with a hand-written Adam;
a set of arrays in a JSON file is not a portable model, so the weights are ALSO exported as ONNX graphs with
the input standardisation folded in, usable by any ONNX consumer without knowing the means and scales.

**Why the browser does not use it.** Two MLPs of a few thousand weights do not justify a WASM runtime in
the page. The browser runs the same function from the JSON weights with a plain TypeScript forward pass,
held to the trained model by a Python-written parity fixture ([data-contract/05](../data-contract/05_model-files.md)).

**The part that is not optional.** `export_onnx` RUNS the exported graph under onnxruntime and compares it
with the numpy forward pass (1e-5) before the file is written, on a sample drawn from the model's own input
distribution; a sample whose outputs are mostly saturated is refused. A parity check on raw standard-normal
features once saturated every sigmoid, recorded an error of exactly 0.0, and proved nothing.

**What would make us change it.** A model that outgrows an MLP, at which point training moves to a real
framework and the export is that framework's exporter. The verification stays.

| page | content |
|---|---|
| [installation](04_onnx/01_installation.md) | the offline pins |
| [usage](04_onnx/02_usage.md) | the graph, the fold, the check, the re-export script |
| [applying](04_onnx/03_applying.md) | loading the models in another runtime |
