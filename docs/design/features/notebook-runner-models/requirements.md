# Notebook runner model inputs: requirements

| ID | EARS requirement | Verification gate |
|---|---|---|
| NRM-001 | WHEN `scripts/run_notebooks.py --check` executes a notebook that reads a released file under `models/`, THE isolated worktree SHALL contain that model file, preserve the committed model and notebook bytes, and be removed after the check. | `tests/test_check_notebooks.py::test_adversarial_runner_copies_released_models_into_the_check_worktree` |
