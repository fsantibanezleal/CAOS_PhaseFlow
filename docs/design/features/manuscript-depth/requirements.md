# Manuscript depth: requirements

| ID | EARS requirement | Verification gate |
|---|---|---|
| MD-001 | WHEN a technical report or research manuscript is checked, THE product SHALL measure the printed abstract against its kind-specific floor after expanding document-defined zero-argument macros, computed integer values and empty macro arguments. | `tests/adversarial/test_manuscript_depth_template_0_15_014.py::test_adversarial_values_printed_by_macros_with_empty_braces_count_as_abstract_words` |
| MD-002 | WHEN a manuscript abstract or another section falls below the applicable content floor, THE release check SHALL fail with the measured count and the corresponding floor. | `tests/adversarial/test_manuscript_depth_template_0_15_014.py::test_adversarial_an_abstract_out_of_its_range_fails` |
