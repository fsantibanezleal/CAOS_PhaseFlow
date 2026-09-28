# Sliding-window scale: requirements

Status: proposed for review under ADR-0075. Backlog BL-036.
The committed 0.07.002 artifacts show `sliding-window` on only Newman1
(1,060 blocks). The other twelve cases record a refusal: the required first
candidate set is 3,328 to 14,400 blocks, above `SW_CAND_MAX = 1,500`.
Silently starving the MILP would yield a poor but superficially feasible plan.

| ID | EARS requirement | Named verification gate |
|---|---|---|
| W-01 | WHEN a window is solved, THE candidate pool SHALL cover the declared window capacity or THE solver SHALL refuse with the required candidate count. | `oreblocks` sliding-window starvation tests; `tests/test_window_scale.py::test_no_starved_window` |
| W-02 | THE expanded method SHALL produce a feasible schedule on at least one committed case larger than Newman1 without lowering the baseline method's NPV on that case. | `scripts/pilot_window_scale.py --enforce`; `scripts/check_artifacts.py` capacity rows |
| W-03 | THE pilot SHALL report candidates, binary variables, sparse nonzeros, peak memory, solver status, runtime and NPV for each attempt, including refusals. | `scripts/pilot_window_scale.py`; committed `models/window-scale-pilot.json` |
| W-04 | THE release SHALL use a predeclared per-case compute budget and preserve the existing explicit skip reason when that budget is exceeded. | `tests/test_window_scale.py::test_budget_refuses`; trace `skipped_methods` |
| W-05 | THE same inputs, seed and solver settings SHALL reproduce the schedule's objective and period assignments within documented numeric tolerances on a second local run. | `scripts/pilot_window_scale.py --repeat` |
| W-06 | THE app and wiki SHALL show which larger cases ran, which skipped, and the actual candidate/solver costs without calling the method universal. | `scripts/check_artifacts.py`; EN/ES Methods browser gate |

Acceptance first targets `ctrl-abundant` (6,912 blocks; 4,621 candidates
needed), then `regime-mining-bound` (3,328 needed). Candidate inflation alone
is not accepted if the solver exceeds the declared budget. The pilot budget
is 10 minutes and 4 GiB peak memory per case on the reference machine;
otherwise the design needs a stronger formulation or a compiled solver before
the rung is extended. The exact budget and machine are logged, not hidden.
