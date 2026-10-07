# ONNX · 02 · How the export works

`data-pipeline/pipeline/model/learned.py::export_onnx`.

## The graph

Opset 13, IR version 9, input `x` of shape `[N, d]` (float32), output `y` of shape `[N, 1]`:

```text
x -> Sub(mu) -> Div(sigma) -> [MatMul(W_k) -> Add(B_k) -> Relu] x 2 -> MatMul(W_3) -> Add(B_3) -> Sigmoid -> y
```

`mu` and `sigma` are the standardisation fitted on the training split (`sigma` below 1e-8 replaced by 1),
so a consumer feeds raw features. `onnx.checker.check_model` validates the graph before it is saved.

## The check

```python
scale = np.where(model.sigma > 1e-8, model.sigma, 1.0)
sample = model.mu + scale * np.random.default_rng(0).normal(size=(256, d))   # the model's own input range
expected = model.forward(sample)                                             # float64 numpy
# at least half the sample must produce unsaturated outputs, or the check proves nothing
got = onnxruntime.InferenceSession(path).run(None, {"x": sample.astype(np.float32)})[0]
assert max(abs(got - expected)) <= 1e-5
```

The result is written as `onnx_parity_max_abs_err` into the model's JSON next to the weights.

## Re-verifying without retraining

```bash
python scripts/reexport_onnx.py
```

reloads both models from their committed JSON, re-exports and re-checks them, and rewrites only the parity
field. The graphs are a deterministic function of the weights, so the `.onnx` files do not change unless
the weights do.
