# Deposit-statistics guard v2: tasks

Status: proposal under review. The v1 attempt is rejected. V2 code and evaluation do not begin until this design and its frozen partition plan are reviewed.

| Order | Task | Requirements | Completion evidence |
|---|---|---|---|
| 1 | Add the preregistration receipt and assert fresh seed disjointness against every existing partition before generating data. | SGV-001, SGV-003 | `tests/test_stats_guard_v2.py`; frozen split hashes |
| 2 | Audit feature units, support and availability on all committed real deposits without labels or outcomes. | SGV-006, SGV-009 | feature audit; real-case coverage table |
| 3 | Implement grouped nested cross-validation on training seeds, shallow-tree candidate selection, deterministic tie-breaks, and frozen serialization. | SGV-002, SGV-003 | `scripts/train_stats_guard_v2.py`; adversarial leakage and hash tests |
| 4 | Implement the fail-closed validator with one-time first and confirmation partitions, full receipts, and stop-before-open behavior. | SGV-004, SGV-005, SGV-009 | `scripts/validate_stats_guard_v2.py`; adversarial gate tests |
| 5 | Prove Python/browser parity, live-input support abstention, measured-ratio precedence and EN/ES unavailable copy. | SGV-006 to SGV-008 | Python and frontend tests; browser gate |
| 6 | Only after both independent synthetic gates pass and real-input support exists, wire the research artifact as a separately identified live warning and rebake every case. | SGV-005 to SGV-009 | artifact guard, full bake and result-bound browser QA |

No model is eligible for the product selector. The guard remains unavailable unless every promotion criterion converges.
