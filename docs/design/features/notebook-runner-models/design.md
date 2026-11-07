# Notebook runner model inputs: design

Status: implemented; the fresh-kernel model-load gate is in
`tests/test_check_notebooks.py::test_adversarial_runner_copies_released_models_into_the_check_worktree`.

PhaseFlow notebooks may analyze the released learned-model artifacts under
`models/`. The notebook runner's release check executes copied notebooks in an
isolated repository tree so that it can prove reproducibility without writing
outputs into the checkout. That tree must include every committed input a
notebook can read, including the released models. The source model and committed
notebook remain unchanged, and the runner removes the temporary tree after the
check.

The runner copies `models/` only when it exists. Products that do not ship a
model directory retain the existing behavior. This is a filesystem-input
boundary for the notebook QA lane; it does not train, rewrite, or publish model
artifacts.
