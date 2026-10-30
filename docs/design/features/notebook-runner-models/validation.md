# Notebook runner model inputs: validation

| requirement | adversarial check | gate |
|---|---|---|
| NRM-001 | A notebook loads a released model from `models/` while running under `--check`; assert success, unchanged source bytes, and an empty caller temp root after cleanup. (local-only: requires the separately provisioned fresh-kernel notebook environment.) | `tests/test_check_notebooks.py::test_adversarial_runner_copies_released_models_into_the_check_worktree` |

The check runs against a fresh kernel in the notebook environment, so the
model-load evidence covers the same runner path used for the release freshness
gate.
