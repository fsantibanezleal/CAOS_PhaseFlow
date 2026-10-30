# Expected-time ensemble: requirements

| ID | EARS requirement | Verification gate |
|---|---|---|
| ET-001 | THE offline and browser feature builders SHALL emit the same eleven named inputs in the same order, with `tonnage_norm` absent. | `frontend/test/surrogate-parity.test.ts`; `tests/adversarial/test_training_features.py` |
| ET-002 | WHEN training data contain a constant or non-finite input, THE trainer SHALL stop with the offending feature name before fitting weights. | `tests/adversarial/test_training_features.py::test_adversarial_training_rejects_constant_features`; `::test_adversarial_training_names_non_finite_features` |
| ET-003 | WHEN the expected-time model is exported, IT SHALL contain five seed-distinct members that share the train-only normalization and whose forward pass is their arithmetic mean. | `tests/adversarial/test_training_features.py::test_expected_time_ensemble_averages_five_members_and_roundtrips`; `scripts/train_learned.py` |
| ET-004 | WHEN a model is loaded, THE Python and browser lanes SHALL reject unexpected feature order, non-finite scales, or zero-variance inputs. | `LearnedBundle.load`; `frontend/test/surrogate-parity.test.ts` |
| ET-005 | THE ONNX export and browser JSON forward pass SHALL match the trained Python prediction on non-saturated held-out inputs within their declared tolerances. | `scripts/train_learned.py`; `frontend/test/surrogate-parity.test.ts` |
| ET-006 | WHEN real MineLib files are unavailable, THE training report SHALL mark real-deposit validation unscored instead of implying transfer was demonstrated. | `scripts/train_learned.py` |
