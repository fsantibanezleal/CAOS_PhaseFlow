# Learned destination policy: requirements

Status: proposed for review under ADR-0075. Backlog BL-035.
The candidate learns an ordering policy for the two-destination **PCPSP** model.
It is a schedule-producing method but remains in the `beyond` comparison group:
its NPV cannot be ranked against CPIT schedules or divided by a CPIT LP bound.

| ID | EARS requirement | Named verification gate |
|---|---|---|
| D-01 | THE data producer SHALL use a genuine feasible PCPSP/OPBSP MILP result with solver status, incumbent and MIP bound recorded as the teacher, and SHALL refuse a teacher beyond its variable or time budget. | `tests/test_destination_teacher.py::test_status_and_budget`; `scripts/pilot_destination_teacher.py` receipt |
| D-02 | THE train, model-selection and final test partitions SHALL be disjoint by deposit seed, including all scenarios and blocks for a seed. | `tests/test_destination_policy.py::test_deposit_split` |
| D-03 | THE learned policy SHALL emit a block priority from features available at inference and produce a schedule through a capacity and precedence enforcing decoder. | `tests/test_destination_policy.py::test_decoder_feasible`; `scripts/check_artifacts.py` resource rows |
| D-04 | WHEN a learned destination result is shown, THE app SHALL label it PCPSP, identify its teacher status and held-out baseline comparison, and exclude it from CPIT best/gap selection. | `scripts/check_artifacts.py` comparable-method gate; EN/ES Methods browser gate |
| D-05 | THE model export SHALL reproduce its Python predictions within `1e-6` on a frozen held-out input before it is committed. | `tests/test_destination_policy.py::test_onnx_parity` |
| D-06 | THE final test SHALL report feasible NPV relative to destination-TopoSort and the teacher incumbent, plus worst case, latency and the count where the teacher did not certify an optimum. | `scripts/evaluate_destination_policy.py --frozen`; `models/destination-policy-evaluation.json` |
| D-07 | IF the teacher pilot exceeds the declared local budget or the learned policy does not improve the predeclared held-out objective without a feasibility regression, THEN THE product SHALL report the negative result and shall not promote a second learned rung. | `scripts/pilot_destination_teacher.py --enforce`; `scripts/evaluate_destination_policy.py --enforce` |

The pilot budget is 40,000 binary variables and 60 seconds per small case,
matching the present `oreblocks.solve_opbsp_exact` API. Its `exact` boolean
alone is insufficient as a proof record: D-01 needs the termination status and
best MIP bound. The acceptance objective for model selection is the median
held-out improvement over destination-TopoSort, with no infeasible schedule;
the final test must show a positive median and disclose the worst case.
These thresholds are frozen before model training and never revised on the
final seed set.
