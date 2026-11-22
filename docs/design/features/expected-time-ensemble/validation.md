# Expected-time ensemble: validation plan

| requirement | adversarial check | gate |
|---|---|---|
| ET-001 | Inject the retired twelve-column contract and assert the offline feature list contains exactly the eleven current ordered names. | `tests/adversarial/test_training_features.py::test_adversarial_expected_time_feature_contract_is_exactly_eleven_named_inputs` |
| ET-002 | Inject a constant input and a non-finite value; require a named training error and no model artifact write. | `tests/adversarial/test_training_features.py::test_adversarial_training_rejects_constant_features`; `::test_adversarial_training_names_non_finite_features` |
| ET-003 | Fit five tiny seeded members, round-trip JSON, and verify the ensemble prediction is the member mean. | `tests/adversarial/test_training_features.py::test_expected_time_ensemble_averages_five_members_and_roundtrips` |
| ET-004 | Load a mismatched feature schema in Python and a zero-scale feature in the browser; require refusal before scheduling. | `tests/adversarial/test_training_features.py::test_adversarial_python_loader_rejects_feature_order_mismatch`; `frontend/test/surrogate-parity.test.ts::adversarial: the browser refuses a zero-variance expected-time feature` |
| ET-005 | Re-export the five-member ONNX graph and compare browser predictions with the Python-generated parity fixture. | `frontend/test/surrogate-parity.test.ts::adversarial: the expectedTime surrogate computes the trained function`; `::adversarial: the browser averages all five expected-time ensemble members` |
| ET-006 | Simulate an absent licensed cache and require both real validation cases to be marked unscored. | `tests/adversarial/test_training_features.py::test_adversarial_real_deposit_validation_is_unscored_without_cache` |

This validation plan does not set new performance thresholds from the final
holdout. Historical transfer measurements remain evidence for comparison, not
labels for training or promises for a future real-deposit input.
