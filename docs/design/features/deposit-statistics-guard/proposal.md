# Deposit-statistics live guard: requirements

Status: planned. Backlog item 34. No feature code
starts until this design is reviewed. The current `archetype == core_halo` rule
is unavailable on a real deposit because a MineLib file has no archetype label.

The failure event is a learned expected-time schedule with NPV below `0.90`
times exact ExTS on the same instance. Existing independent validation of the
label rule: 44 failures in 216 cases, 36 caught, 18 false flags, 8 missed,
recall `0.818`, precision `0.667`, worst unflagged ratio `0.7852`. These are
the **comparison baseline**, not scores for the proposed rule.

| ID | EARS requirement | Named verification gate |
|---|---|---|
| SG-001 | THE guard SHALL derive all inputs from measured deposit geometry, values, tonnage, grade, precedence and declared scenario, with no synthetic archetype or seed at inference. | `test_stats_guard.py::test_real_input_has_all_features`; schema inspection in `validate_stats_guard.py` |
| SG-002 | THE training procedure SHALL split by deposit seed before fitting transforms, selecting statistics or thresholds. | `test_stats_guard.py::test_disjoint_seed_splits` and `::test_train_only_fit` |
| SG-003 | WHEN a rule is frozen, THE validator SHALL evaluate it unchanged on the 6 held-out and 6 third-split seeds with all four archetypes and crossed scenarios. | `validate_stats_guard.py --frozen`; committed `stats-guard-validation.json` |
| SG-004 | THE third-split result SHALL achieve recall at least `0.818`, precision at least `0.667`, and worst unflagged ratio at least `0.7852` at the fixed `0.90` failure threshold, or the candidate SHALL remain a research result and not ship as a live guard. | `validate_stats_guard.py --frozen --enforce` |
| SG-005 | IF a live deposit lies outside the training support or a required statistic is absent, THEN THE app SHALL say `guard unavailable` with a reason rather than infer safety. | `test_stats_guard.py::test_out_of_support_abstains`; EN/ES live browser gate |
| SG-006 | WHEN exact ExTS exists in the same bake, THE method row SHALL report its measured NPV ratio and shall not substitute a statistical flag. | `check_artifacts.py` learned-row check; frontend learned panel test |
| SG-007 | THE published rule SHALL include its input schema, threshold, split IDs, confusion matrices and worst missed case; THE UI SHALL show the third-split score next to the warning. | `check_artifacts.py` guard provenance check; EN/ES learned panel browser gate |

Convergence requires every named gate, a real-deposit feature extraction
demonstration, and an explicit report of how often the rule abstains on each
committed real case. A rule that meets synthetic scores but abstains on every
real case does not close backlog item 34.
