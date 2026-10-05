# ONNX and onnxruntime

**What it is.** The export format for the two learned models, and the runtime that verifies the
export.

**Pins.** `onnx==1.22.0` and `onnxruntime==1.28.0` in `requirements-precompute.txt` (offline only),
`onnxruntime-web@^1.27.0` in `frontend/package.json`.

**Why an export at all.** The models are trained in explicit numpy, with a hand-written Adam, because
they are two small MLPs and a training framework would be a large dependency for a job that fits on a
page. But a set of numpy arrays in a JSON file is not a portable model, so the weights are ALSO
exported to ONNX, with the input standardisation folded into the graph so that a consumer does not
have to know the mean and scale to use it.

**The part that is not optional.** `export_onnx` RUNS the exported graph under onnxruntime and
compares it against the numpy forward pass to 1e-5 BEFORE the file is written. An ONNX file that loads
is not an ONNX file that computes the same function, and the folded standardisation is exactly the
kind of step that can be right in the code and wrong in the graph.

**What would make us change it.** A model that stops fitting in an MLP, at which point the training
lane is a real framework and the export is that framework's exporter. The verification step stays
either way.
