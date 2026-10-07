# ONNX · 01 · Installation

```bash
pip install -r requirements-precompute.txt   # onnx==1.22.0, onnxruntime==1.28.0 (and scipy)
```

Offline only. CI and the deploy never install these (ADR-0074): nothing in CI trains or exports, and the
committed `.onnx` files are artifacts like any other. Without onnxruntime, `export_onnx` still writes the
graph and records the parity error as `null` rather than inventing one.
