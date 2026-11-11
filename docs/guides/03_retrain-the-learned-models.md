# 03 · Retrain, re-score or re-verify the learned models

All of this is offline; CI never trains. Install the precompute requirements first
(`pip install -r requirements-precompute.txt`). Set `CAOS_MODELS_ROOT` to an external model candidate before
running standalone commands that write or read newly generated models. Candidate commands never write
model files into the checkout. The official staged bake trains the model bundle in its external stage,
measures the third-split guard, bakes all cases, then writes the parity and preview receipts against those
same staged models and traces. Do not use a prior version-stamped model report as a staged input.

| want | run | cost |
|---|---|---|
| retrain both models and the failure study | `CAOS_MODELS_ROOT=<external-model-stage> python scripts/train_learned.py` | hours: it solves the exact relaxation and the ExTS plan on every training and held-out deposit (four archetypes, nine scenarios, two sizes, eighteen seeds) |
| re-score the guard rules without retraining | `python scripts/rescore_guard.py` | minutes |
| measure the candidate rule on the third seed set | `python scripts/validate_guard.py` | about an hour |
| re-verify candidate ONNX exports | `python scripts/reexport_onnx.py` | seconds |
| rewrite the browser parity fixture in the candidate bundle | `python scripts/export_surrogate_parity.py --derived-root <external-stage>/data/derived` | seconds |
| re-measure the browser's learned-preview timing | `cd frontend && node scripts/measure-learned-preview.mjs` | a minute |

## The order after a retrain

1. `train_learned.py` (writes `expected-time.*`, `bound.*`, `training-report.json`,
   `learned-failure-modes.json` into the external model stage);
2. `validate_guard.py` (writes `guard-validation.json`);
3. `export_surrogate_parity.py --derived-root <external-stage>/data/derived` (the fixture uses the same rebaked twin trace as the candidate model);
4. `cd frontend && npm test` (the forward pass and the features must match the new fixture);
5. a release bake (the learned method in every trace uses the new model) and the steps after it
   ([01](01_bake-the-artifacts.md));
6. `python scripts/docs_tables.py --manifests <external-stage>/data/derived/manifests` (the wiki's learned tables
   read the candidate model bundle and staged manifests; review the generated diff before promotion).

## What a retrain must not change silently

- The split is by deposit seed; the scripts assert the training, held-out and validation seed sets are
  disjoint. Never split by row.
- The target is the tightest single-resource relaxation's expected time, the one the ExTS method schedules
  from.
- The scenario sweep crosses rate and capacity; a sweep that moves them together teaches one as a proxy
  for the other ([methodologies/08](../methodologies/08_when-the-surrogate-fails.md)).
- The bound surrogate's monotonicity rates are part of its metrics; the sensitivity panel refuses to draw a
  plane from a model that breaks them.
