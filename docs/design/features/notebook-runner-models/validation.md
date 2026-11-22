# Notebook runner model inputs: validation

| requirement | adversarial check | gate |
|---|---|---|
| NRM-001 | A notebook loads a released model from `models/` while running under `--check`; assert success, unchanged source bytes, and an empty caller temp root after cleanup. (local-only: requires the separately provisioned fresh-kernel notebook environment.) | `tests/test_check_notebooks.py::test_adversarial_runner_copies_released_models_into_the_check_worktree` |
| NRM-002 | A notebook imports analysis code and reads committed summaries from `manuscripts/` while running under `--check`; assert the temporary copy is available, unchanged source bytes, omitted caches, and cleanup. | `tests/adversarial/test_run_notebooks_template_0_15_014.py::test_adversarial_check_copies_manuscripts_so_a_notebook_can_import_its_analysis_code` |

The check runs against a fresh kernel in the notebook environment, so the
model-load evidence covers the same runner path used for the release freshness
gate.
