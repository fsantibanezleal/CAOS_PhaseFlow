# Notebook runner model inputs: requirements

| ID | EARS requirement | Verification gate |
|---|---|---|
| NRM-001 | WHEN `scripts/run_notebooks.py --check` executes a notebook that reads a released file under `models/`, THE isolated worktree SHALL contain that model file, preserve the committed model and notebook bytes, and be removed after the check. | `tests/test_check_notebooks.py::test_adversarial_runner_copies_released_models_into_the_check_worktree` |
| NRM-002 | WHEN `scripts/run_notebooks.py --check` executes a notebook that imports authored analysis code or reads committed summaries under `manuscripts/`, THE isolated worktree SHALL contain that manuscript tree without Python or notebook cache files, preserve the committed source, and be removed after the check. | `tests/adversarial/test_run_notebooks_template_0_15_014.py::test_adversarial_check_copies_manuscripts_so_a_notebook_can_import_its_analysis_code` |
