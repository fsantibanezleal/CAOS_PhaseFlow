# Learned destination policy: tasks

Status: pending design review.

| Order | Task | Requirements | Completion evidence |
|---|---|---|
| 1 | Extend the engine's exact OPBSP result with solver status, incumbent, best bound and tolerance, preserving its current refusal semantics. | D-01 | `oreblocks` tests and versioned API receipt |
| 2 | Run a fixed small-case teacher pilot, record runtime and terminate by D-07 if over budget. | D-01, D-07 | pilot JSON and enforce exit code |
| 3 | Freeze seed partitions, features, target and acceptance objective; train the priority model. | D-02, D-03 | split and decoder tests |
| 4 | Export ONNX and compare Python/ONNX predictions on held-out deposits. | D-05 | parity gate |
| 5 | Evaluate unchanged policy on final seeds against destination-TopoSort and teacher, including worst case and solver failures. | D-06, D-07 | frozen evaluation JSON |
| 6 | Only after convergence, add a clearly marked PCPSP learned row, docs and bilingual panels, then rebake all cases. | D-03 to D-07 | full artifact and browser gates |
