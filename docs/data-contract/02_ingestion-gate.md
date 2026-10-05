# 02 · CONTRACT 1, ingestion: accept, flag or reject

`data-pipeline/pipeline/io/contract.py::validate_instance`. A file stops being bytes and becomes an
instance here, and a bad file is **rejected with a reason** rather than silently coerced into a
plausible-looking pit. Legal but notable conditions are **flagged**: accepted, recorded in the manifest
and shown on screen. Every check below exists because the corresponding failure is a real failure mode of
published files or of this pipeline.

## 1. Rejections

| code | rule | why it exists |
|---|---|---|
| `empty` | at least one block | |
| `prec-shape` | the precedence covers exactly the blocks the values cover | a length mismatch turns an index into the wrong block |
| `prec-range` | every arc points at a block id in `0..n-1` | |
| `objective-nan` | no NaN or infinity outside the forbidden-destination sentinel | one NaN makes every sum NaN |
| `prec-direction` | at least 99 percent of arcs point UPWARD (levels increase upward, predecessors sit above) | a file read with the wrong vertical convention grows a pit from the bottom |
| `prec-cycle` | no cycle, checked whenever some arcs do not rise strictly | a cycle never releases its blocks in the TopoSort walk; they and everything under them stay unmined, silently |
| `coef-negative` | every resource coefficient is non-negative | the critical multiplier algorithm requires it |
| `zero-tonnage` | the extraction resource is strictly positive on every block | a block with zero tonnage is mined "free" |
| `discount-range` | rate in [0, 0.5] per period | |
| `no-periods` | at least one period | |
| `capacity-nonpositive` | every per-period capacity is positive | |

**The cycle check is free when the file is well formed.** Arcs that strictly rise in level cannot close a
loop, so an instance whose arcs all point up is acyclic by construction; all 233,640 arcs of `newman1`,
`kd` and `zuck_small` rise strictly. Only when some arcs are flat or point down (allowed up to 1 percent,
flagged) does the gate run Kahn's algorithm, and a cycle is a rejection.

## 2. Flags

| code | condition | what the reader is told |
|---|---|---|
| `capacity-cannot-exhaust` | total capacity over the horizon is below the model tonnage | the plan will not mine the whole ultimate pit within the horizon (a real scenario and a common mistake, so it is said out loud) |
| `capacity-slack` | total capacity above three times the model tonnage | capacity will barely bind; the schedule is driven by precedence and discounting |
| `no-discount` | rate is zero | the period order cannot change the objective |
| `slope-unusual` | slope angle outside 20 to 80 degrees | |
| `prec-not-upward` | some arcs do not rise strictly | the count; the cycle check ran |

## 3. Instance-level checks before the gate

| check | where | failure |
|---|---|---|
| the tonnage column is finite and strictly positive | MineLib reader | refused: "the per-instance column map is wrong and must not be guessed" |
| the grade field is a finite mass fraction in [0, 1] | MineLib reader | refused |
| a published `.pcpsp` reduces to the case's CPIT (two destinations, same blocks, periods, rate, values, coefficients and limits) | MineLib reader | refused |
| synthetic destination economics reduce to the CPIT values and coefficients | twin builder | refused |

## 4. Outliers and missing data, case by case

| situation | handling |
|---|---|
| a destination forbidden by a sentinel value | the destination is marked forbidden; the CPIT value is the best ALLOWED destination; no plan may send the block there (the schedule valuer raises) |
| a block whose net value is hugely negative but finite | legal; it is waste, and the ultimate pit excludes it unless something below pays for it |
| no grade field (`zuck_small`) | `gradeSource: null` in the trace; the learned rung is skipped with the reason; grade charts are replaced by strip ratio |
| no destination economics (`kd`, `zuck_small`) | the three destination rungs are skipped with the reason; nothing is reconstructed from the CPIT value, which cannot recover a discarded alternative |
| the published scheduling file is unreachable | the scenario is declared and marked `declared: true`; gaps are against this product's bound |
| a capacity so loose or so tight that the problem degenerates | flagged (above), never silently "fixed" |
| non-numeric columns | kept as labels |

## 5. What the report carries

`ContractReport{accepted, rejected[], flagged[], facts}` (`facts`: block, arc, resource and period
counts). A rejected instance stops the bake for that case with every reason joined into the error. The
flags of an accepted one ride into the trace (`contract.flags`) and the manifest (`flags`), and the app
shows them on the case.

## Where it lives

`data-pipeline/pipeline/io/contract.py` (the gate), `pipeline/model/instances.py` (readers and the
instance-level checks), `tests/test_pipeline.py` (`test_contract_*`: downward precedence, zero tonnage, a
cycle among flat arcs, flat arcs without a cycle, an under-capacity scenario).
