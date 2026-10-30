# Re-planning value: tasks

Status: implementation in progress.

| Order | Task | Requirements | Completion evidence |
|---|---|---|---|
| 1 | Choose one best fixed schedule by expected score over the seeded realisations. | RV-001, RV-003 | adversarial control-flow test |
| 2 | Re-solve each perturbed CPIT instance from that schedule with OreBlocks exact local search and frozen budgets. | RV-001, RV-002 | adversarial incumbent test and pipeline integration test |
| 3 | Score the result against the fixed schedule's expected value; persist method, settings and elapsed time. | RV-003 | trace schema, artifact guard, docs tables |
| 4 | Update EN/ES interpretation, run a fresh all-case rebake and compare every field. | RV-004 | release validation record and browser gates |
