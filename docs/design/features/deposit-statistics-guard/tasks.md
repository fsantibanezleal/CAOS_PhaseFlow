# Deposit-statistics live guard: tasks

Status: pending design review.

| Order | Task | Requirements | Completion evidence |
|---|---|---|---|
| 1 | Freeze the feature schema and compute it on every training, held-out, third-split and committed real input. | G-01, G-02, G-05 | `tests/test_stats_guard.py` and feature audit table |
| 2 | Discover one interpretable rule on train seeds only; freeze its JSON before the two evaluations. | G-02, G-03 | versioned rule, split hashes, script log |
| 3 | Run held-out and untouched third-split validation once; apply G-04 without tuning to the latter. | G-03, G-04 | `models/stats-guard-validation.json`, enforce exit code |
| 4 | If G-04 passes, wire warning/abstention into the live lane and preserve measured-ratio precedence. | G-05, G-06, G-07 | artifact, unit and EN/ES browser gates |
| 5 | Rebuild the complete artifact set, update the wiki with successes and failures, then record convergence. | G-01 to G-07 | full bake, guards, source-bound browser QA |
