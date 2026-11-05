# Deposit-statistics guard v2: validation boundary

This is a proposed validation plan, not evidence that a v2 guard exists. No evaluation seed is opened until a candidate is frozen from grouped training-only cross-validation and the complete candidate/preregistration hashes are recorded. The v1 holdout and reserved third split remain sealed.

| requirement | adversarial check | gate |
|---|---|---|
| SGV-001 | Plant overlapping seeds and split variants; require rejection before any data loader returns rows. | `tests/test_stats_guard_v2.py::test_seed_partitions_are_disjoint_and_grouped` |
| SGV-002 | Plant holdout/confirmation sentinels in the training path and permute scenario variants; prove the fitter reads only training seeds and groups all variants together. | `tests/test_stats_guard_v2.py::test_candidate_selection_is_train_only` |
| SGV-003 | Alter the tree, threshold, feature bounds, or split hash after freeze; require the validator to reject the candidate before reading outcomes. | `tests/test_stats_guard_v2.py::test_frozen_candidate_hash_covers_model_and_partitions` |
| SGV-004 | Plant each first-gate metric just below its floor and assert the confirmation loader is never called. | `tests/test_stats_guard_v2.py::test_first_gate_failure_does_not_open_confirmation` |
| SGV-005 | Plant a passing first receipt and failing confirmation receipt; require research-only status and no browser eligibility. | `tests/test_stats_guard_v2.py::test_confirmation_uses_frozen_candidate_and_strict_floors` |
| SGV-006 | Remove a feature or place one real deposit outside training support; require an explicit unavailable reason. | `tests/test_stats_guard_v2.py::test_real_deposit_outside_support_abstains`; bilingual browser gate |
| SGV-007 | Plant an exact measured ExTS comparator beside a predicted warning and assert the measured ratio is displayed. | `tests/test_live_guard_eligibility.py`; `frontend/test/guard.test.ts` |
| SGV-008 | Fail either independent evaluation gate; assert zero live flags and bilingual research-only metrics. | `tests/test_stats_guard_v2.py`; `scripts/check_artifacts.py`; frontend browser gate |
| SGV-009 | Delete each required receipt field, one seed's metrics/contribution, or a supported real-case disposition; require the artifact checker to fail with the missing field named. Plant a single seed that dominates failures and require the receipt to expose its per-seed contribution without changing the frozen pooled gate. | `scripts/check_artifacts.py`; `tests/test_stats_guard_v2.py` |

Final validation also runs exact Python/TypeScript tree parity on nonsaturated and boundary inputs, full fresh-kernel notebooks, full artifact validation, and the complete shell/browser matrix after a successful bake. Any failed scientific floor is a valid negative result and keeps the live guard unavailable.
