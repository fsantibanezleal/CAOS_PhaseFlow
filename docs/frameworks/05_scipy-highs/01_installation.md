# scipy and HiGHS · 01 · Installation

```bash
pip install -r requirements-precompute.txt  # exact SciPy, highspy and ONNX pins for a full bake
```

HiGHS is bundled in the scipy wheel: no separate install, no licence. Without scipy the engine still
computes the critical multiplier bound, Algorithm 4 and the TopoSort and shift methods (numpy only), and the
pipeline records the solver-dependent methods as NOT RUN with the reason.
