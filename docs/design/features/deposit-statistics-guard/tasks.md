# Deposit-statistics live guard: tasks

Status: label-rule candidate rejected by SG-004; statistical guard design and implementation remain open.

| Order | Task | Requirements | Completion evidence |
|---|---|---|---|
| 0 | Enforce the negative path for the evaluated label candidate: fail closed when any third-split threshold is missed. | SG-004, SG-008 | `LearnedBundle.live_guard_status`; `tests/test_live_guard_eligibility.py`; bilingual unavailable state |
| 1 | Complete the statistical feature design, freeze the input schema, and compute it on every training, held-out, third-split and committed real input. | SG-001, SG-002, SG-005 | reviewed design, `test_stats_guard.py`, feature audit table |
| 2 | Discover one interpretable rule on train seeds only; freeze its JSON before the two evaluations. | SG-002, SG-003 | versioned rule, split hashes, script log |
| 3 | Run held-out and untouched third-split validation once; apply SG-004 without tuning to the latter. | SG-003, SG-004 | `stats-guard-validation.json`, enforce exit code |
| 4 | If SG-004 passes, wire the warning into the live lane and preserve measured-ratio precedence; otherwise retain the unavailable state. | SG-005 to SG-008 | artifact, unit and EN/ES browser gates |
| 5 | Rebuild the complete artifact set, update the wiki with successes and failures, then record convergence. | SG-001 to SG-008 | full bake, guards, source-bound browser QA |
