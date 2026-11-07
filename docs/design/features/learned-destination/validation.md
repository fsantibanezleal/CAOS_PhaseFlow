# learned-destination: validation boundary

This folder contains a proposed method and its bounded teacher-pilot receipt. The negative pilot is not an implementation of a learned policy and does not establish a performance claim. `scripts/check_sdd.py` checks that the design and requirement records remain structurally complete; the pilot gate is enforced by `scripts/pilot_destination_teacher.py` and its exit code.

| requirement | adversarial check | gate |
|---|---|---|
| LD-001 | Confirm the proposal remains unimplemented and makes no performance claim; check the frozen budgets, receipt fields, all-archetype coverage and recorded negative teacher result. | `tests/test_feature_proposals.py::test_adversarial_proposals_remain_unimplemented_until_evidence_exists`; `tests/test_destination_teacher_pilot.py::test_adversarial_teacher_receipt_refuses_uncertified_over_budget_pilot`; `scripts/check_sdd.py` |
