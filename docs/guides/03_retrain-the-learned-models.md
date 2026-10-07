# 03 · Retrain, re-score or re-verify the learned models

All of this is offline (ADR-0074: CI never trains). Install the precompute requirements first
(`pip install -r requirements-precompute.txt`).

| want | run | cost |
|---|---|---|
| retrain both models and the failure study | `python scripts/train_learned.py` | hours: it solves the exact relaxation and the ExTS plan on every training and held-out deposit (four archetypes, nine scenarios, two sizes, eighteen seeds) |
| re-score the guard rules without retraining | `python scripts/rescore_guard.py` | minutes |
| measure the shipped rule on the third seed set | `python scripts/validate_guard.py` | about an hour |
| re-verify the ONNX exports from the committed weights | `python scripts/reexport_onnx.py` | seconds |
| rewrite the browser parity fixture | `python scripts/export_surrogate_parity.py` | seconds |
| re-measure the browser's learned-preview timing | `cd frontend && node scripts/measure-learned-preview.mjs` | a minute |

## The order after a retrain

1. `train_learned.py` (writes `expected-time.*`, `bound.*`, `training-report.json`,
   `learned-failure-modes.json`);
2. `validate_guard.py` (writes `guard-validation.json`);
3. `export_surrogate_parity.py` (the fixture the browser test reads);
4. `cd frontend && npm test` (the forward pass and the features must match the new fixture);
5. a release bake (the learned rung in every trace uses the new model) and the steps after it
   ([01](01_bake-the-artifacts.md));
6. `python scripts/docs_tables.py` (the wiki's learned tables read these files).

## What a retrain must not change silently

- The expected-time model is an ENSEMBLE of five members (`ENSEMBLE_SEEDS`), trained on the same rows and
  averaged; a single seed reached 0.717 to 0.879 of the exact plan on `kd-declared` where the mean of
  five reached 0.886 ([methodologies/07](../methodologies/07_learned.md)). The browser runs all five, so
  re-measure the preview timing after a retrain.
- `train_mlp` refuses an input that is constant in the training rows (its weights would never be
  trained), and the pipeline refuses a model whose feature names differ from `BLOCK_FEATURES`.
- With the MineLib cache present (`PHASEFLOW_DATA_DIR`), the training report scores the real deposits
  (`real_holdout`: newman1 and KD, per member and for the mean). They are a held-out check, never
  training data; without the cache the report says it could not check.
- Collection is memory-bound: `PHASEFLOW_TRAIN_WORKERS` sets the worker count (about 2 GB each at the
  larger grid size).

- The split is by deposit seed; the scripts assert the training, held-out and validation seed sets are
  disjoint. Never split by row.
- The target is the tightest single-resource relaxation's expected time, the one the ExTS rung schedules
  from.
- The scenario sweep crosses rate and capacity; a sweep that moves them together teaches one as a proxy
  for the other ([methodologies/08](../methodologies/08_when-the-surrogate-fails.md)).
- The bound surrogate's monotonicity rates are part of its metrics; the sensitivity panel refuses to draw a
  plane from a model that breaks them.
