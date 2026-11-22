# Re-planning value: requirements

Status: reviewed design; implementation and release gates are named below.

| ID | EARS requirement | Named verification gate |
|---|---|---|
| RV-001 | WHEN the risk ensemble runs, THE fixed-policy baseline SHALL be one candidate schedule selected by highest mean NPV across the frozen realisations, and every re-plan SHALL start from that same schedule. | `tests/adversarial/test_replanning.py::test_adversarial_replan_starts_from_one_best_fixed_policy` |
| RV-002 | WHEN a re-plan is scored, THE schedule SHALL remain feasible and its NPV SHALL not fall below the starting schedule under the same realisation. | `tests/adversarial/test_replanning.py::test_adversarial_replan_cannot_lose_its_incumbent` |
| RV-003 | THE trace SHALL identify the restricted exact-local-search method, frozen settings and elapsed time, and SHALL report re-planning value as the mean re-planned NPV minus the best fixed-policy mean. | `tests/adversarial/test_replanning.py::test_adversarial_replanning_uses_the_fixed_policy_baseline` |
| RV-004 | THE product SHALL describe the result as a lower bound on EVPI from a local-search heuristic, not as a globally optimal two-stage stochastic solution. | `tests/adversarial/test_replanning.py::test_adversarial_replanning_is_labelled_as_a_lower_bound` |
