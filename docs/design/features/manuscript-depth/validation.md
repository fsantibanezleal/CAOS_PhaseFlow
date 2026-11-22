# Manuscript depth: validation

| requirement | adversarial check | gate |
|---|---|---|
| MD-001 | Zero-argument macros, nested definitions, computed integer values, empty macro arguments, and printed abstract boundaries are checked against rendered word counts. | `tests/adversarial/test_manuscript_depth_template_0_15_014.py::test_adversarial_values_printed_by_macros_with_empty_braces_count_as_abstract_words` |
| MD-002 | An under-floor abstract fails with its measured word count and applicable kind-specific range. | `tests/adversarial/test_manuscript_depth_template_0_15_014.py::test_adversarial_an_abstract_out_of_its_range_fails` |

The product's measured manuscript and abstract inventory is produced by `python scripts/check_manuscript_depth.py . --report`.
