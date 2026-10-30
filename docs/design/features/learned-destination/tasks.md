# Learned destination policy: tasks

Status: pilot measured negative; the learned rung remains unimplemented under D-07.

| Order | Task | Requirements | Completion evidence |
|---|---|---|
| 1 | Extend the exact OPBSP result with solver status, incumbent, best bound and tolerance while preserving exact-only refusal semantics. | D-01 | Complete: OreBlocks 0.6.4 receipt API and engine tests |
| 2 | Run the frozen 40,000-variable, 60-second synthetic teacher pilot and terminate by D-07 if over budget. | D-01, D-07 | Complete with a negative outcome: `teacher-pilot.json`; four archetypes hit the time limit and none produced a positive certified teacher |
| 3 | Freeze seed partitions, features, target and acceptance objective; train the priority model. | D-02, D-03 | Not started: D-07 failed, so no teacher labels are eligible for training |
| 4 | Export ONNX and compare Python/ONNX predictions on held-out deposits. | D-05 | Deferred until a certified teacher and accepted policy exist |
| 5 | Evaluate unchanged policy on final seeds against destination-TopoSort and teacher, including worst case and solver failures. | D-06, D-07 | Deferred; no learned policy is promoted |
| 6 | Only after convergence, add a clearly marked PCPSP learned row, docs and bilingual panels, then rebake all cases. | D-03 to D-07 | Deferred; no learned method enters the product selector |
