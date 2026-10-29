# Deposit-statistics guard v2: requirements

Status: planned

This proposed redesign follows the first statistics-only rule failing its frozen held-out gate. No v2 model, feature, score, or warning is implemented by this design. The original holdout and reserved third split remain sealed for this proposal.

| ID | EARS requirement | Named verification gate |
|---|---|---|
| SGV-001 | THE training and evaluation pipeline SHALL assign every scenario and grid variant from one deposit seed to one partition, and SHALL use no seed in the v2 evaluation that appears in the v1 train, holdout, or reserved third split. | `tests/test_stats_guard_v2.py::test_seed_partitions_are_disjoint_and_grouped` |
| SGV-002 | THE candidate-selection procedure SHALL fit transforms, select tree structure, and select a warning threshold using only grouped out-of-fold predictions from the v1 training seeds; it SHALL not read the consumed v1 holdout or the reserved v1 third split. | `tests/test_stats_guard_v2.py::test_candidate_selection_is_train_only`; `scripts/train_stats_guard_v2.py` input audit |
| SGV-003 | WHEN the candidate is selected, THE pipeline SHALL freeze one label-free feature schema, serialized model, warning threshold, training support, partition hashes, and decision receipt before loading either new evaluation partition. | `tests/test_stats_guard_v2.py::test_frozen_candidate_hash_covers_model_and_partitions`; `scripts/train_stats_guard_v2.py` |
| SGV-004 | WHEN a frozen candidate is evaluated on the new first evaluation partition, THE validator SHALL require precision ≥0.7407, recall ≥0.5517, worst unflagged learned-to-exact ratio ≥0.7364, and flagged share ≤0.50; IF any floor fails, THEN it SHALL stop without opening the confirmation partition. | `scripts/validate_stats_guard_v2.py --frozen --enforce`; `tests/test_stats_guard_v2.py::test_first_gate_failure_does_not_open_confirmation` |
| SGV-005 | WHEN SGV-004 passes, THE validator SHALL evaluate the unchanged candidate on the separately frozen confirmation partition and require precision ≥0.667, recall ≥0.818, and worst unflagged ratio ≥0.7852 before returning a promotable receipt. | `scripts/validate_stats_guard_v2.py --frozen --enforce`; `tests/test_stats_guard_v2.py::test_confirmation_uses_frozen_candidate_and_strict_floors` |
| SGV-006 | IF a required real-deposit feature is absent or outside the frozen training support, THEN THE live lane SHALL abstain with a named reason; a synthetic score pass alone SHALL not enable a live warning. | `tests/test_stats_guard_v2.py::test_real_deposit_outside_support_abstains`; frontend bilingual unavailable-state gate |
| SGV-007 | WHEN an exact ExTS result is present for the selected case, THE app SHALL show its measured ratio and SHALL give that measurement precedence over any prediction. | `tests/test_live_guard_eligibility.py`; `frontend/test/guard.test.ts` |
| SGV-008 | IF either independent evaluation gate fails, THEN THE artifact contract SHALL mark the candidate research-only, emit no live flag, and show the measured failed metrics beside an unavailable state in both languages. | `tests/test_stats_guard_v2.py`; `scripts/check_artifacts.py`; frontend EN/ES learned-panel gate |
| SGV-009 | THE final evidence record SHALL report per-partition counts, hashes, confusion matrices, calibration/threshold, worst missed case and ratio, flagged share, and real-deposit support/abstention by case. | `scripts/check_artifacts.py`; `scripts/validate_stats_guard_v2.py` |

Convergence additionally requires every committed real case to have a measured feature-support disposition. If no real deposit lies inside training support, the live-guard backlog item remains open even when both synthetic partitions pass.
