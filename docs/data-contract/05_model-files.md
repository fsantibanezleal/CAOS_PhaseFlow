# 05 · The model files: `models/`

The learned lane's committed artifacts. They are produced offline only, by `scripts/train_learned.py`
(hours; never in CI, ADR-0074) and the scripts that score and export without retraining.

| file | schema / content | written by |
|---|---|---|
| `expected-time.json` | `phaseflow.mlp/v1`: `target` (`expected_time_fraction`), `features` (12 names), `mu`, `sigma` (standardisation fitted on the training split), `layers[{w, b}]` (12 to 48 to 24 to 1), `metrics`, `onnx_parity_max_abs_err` | `train_learned.py`, `rescore_guard.py` (metrics), `reexport_onnx.py` (parity) |
| `expected-time.onnx` | the same function as an ONNX graph (opset 13), standardisation folded in as Sub and Div | `export_onnx` |
| `bound.json`, `bound.onnx` | the bound surrogate, `target` `bound_over_upit`, 11 deposit statistics plus the scenario | the same |
| `training-report.json` | both models' held-out metrics, per-case ratios, archetypes, scenarios, sizes, the split, the target relaxation | `train_learned.py`, `rescore_guard.py` |
| `learned-failure-modes.json` | the failure study: every training and held-out case with its covariates and share, by archetype, size, rate and horizon, every candidate rule's confusion on both splits, the shipped rule | `train_learned.py`, `rescore_guard.py` |
| `guard-validation.json` | the shipped rule measured on a third disjoint seed set | `validate_guard.py` |
| `surrogate-parity.json` | `phaseflow.surrogate-parity/v1`: inputs and outputs the Python models wrote, for the browser parity test | `export_surrogate_parity.py` |
| `learned-preview-timing.json` | `phaseflow.learned-preview-timing/v1`: per twin, the browser's learned-plan and exact-solve times and the share | `frontend/scripts/measure-learned-preview.mjs` |

## Rules these files obey

- **No NaN.** Every file is written with NaN and infinities as `null` (`json_safe`, `allow_nan=False`): a
  browser's `JSON.parse` rejects NaN, and one NaN in a model file made every page that reads it fail.
- **The ONNX export is verified before it is written**, on a sample drawn from the model's own input
  distribution, and a sample whose outputs are mostly saturated is refused: a parity check on saturated
  sigmoid outputs once recorded an error of exactly 0.0 and proved nothing.
- **The browser runs the JSON weights**, not the ONNX graph, held to the trained function by
  `surrogate-parity.json` (1e-9 on the model, 1e-6 on the features).
- **Metrics travel with the model.** The app reads held-out errors and shares from these files; a page
  that hard-codes them goes stale on the next training run (the sensitivity surface once did).

## Seeds

Training seeds 101 to 157 (twelve), held-out seeds 211 to 239 (six), validation seeds 241 to 271 (six); the
scripts assert the three sets are disjoint. Every generated deposit's id carries a `train-` prefix
whatever its split; the seed is what decides the split.
