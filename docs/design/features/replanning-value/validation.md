# Re-planning value: adversarial validation

| requirement | adversarial check | gate |
|---|---|---|
| RV-001 | Plant candidate schedules whose winners vary by realisation; assert every restricted search receives the same highest-mean fixed policy. | `tests/adversarial/test_replanning.py::test_adversarial_replan_starts_from_one_best_fixed_policy` |
| RV-002 | Plant a search result below the incumbent and prove the ensemble rejects it rather than reporting negative or silently clamping it. | `tests/adversarial/test_replanning.py::test_adversarial_replan_cannot_lose_its_incumbent` |
| RV-003 | Plant a candidate portfolio with positive value-of-plan-selection and a no-op re-plan; assert re-planning value is zero and records the restricted exact-local-search settings. | `tests/adversarial/test_replanning.py::test_adversarial_replanning_uses_the_fixed_policy_baseline` |
| RV-004 | Plant a trace using the retired Gershon re-solve or wording that calls the estimate EVPI; prove validation rejects it. | `tests/adversarial/test_replanning.py::test_adversarial_replanning_is_labelled_as_a_lower_bound` |
