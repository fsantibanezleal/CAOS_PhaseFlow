# scripts/

Everything here runs from the repository root inside the project's own `.venv`; nothing uses a global
interpreter. Running the product from a fresh clone is [`local/`](local/README.md): numbered scripts in
`.sh` and `.ps1`, each printing the next command.

## Run it locally: `local/`

| script | what it does |
|---|---|
| `00_install-prereqs` | checks python, node and git against the versions CI pins |
| `01_init` | one virtualenv, the requirements, `npm ci`, `.env` from `.env.example`, a sandbox bake if `data/derived/` is empty |
| `02_generate-data` | trains the learned models and creates the complete source-bound artifact/model stage under external `CAOS_TEMP_ROOT`; `--release --from-stage` explicitly validates and promotes that exact stage |
| `03_dev` | overlays `data/derived` into the frontend and starts Vite |

## Guards: run in CI and before deploy (cheap, never train; ADR-0074)

| script | what it enforces |
|---|---|
| `check_artifacts.py` | CONTRACT 2 on the committed evidence: index, manifests and traces agree; byte sizes; lane equals the gate; the engine pin equals the baking version; roles equal the case source; every plan within capacity and under its own bound; a PCPSP LP for every destination plan, never below the joint CPIT LP; no per-block data for a non-redistributable case |
| `check_internal_names.py` | internal method labels stay out of reader-facing notebooks, manuscripts, README and app strings (template 0.14.000 gate) |
| `docs_tables.py --check` | every generated table in `docs/` equals what the manifests and model files say |
| `check_readme_numbers.py` | the README's trust-anchor table equals the `newman1` artifact; no control bytes |
| `check_content_standards.py` | no em-dash and no pictographic emoji in tracked content (ADR-0067) |
| `check_template_residue.py` | no archetype template leftovers in the product (ADR-0057, ADR-0061) |
| `check_ci_budget.py` | trunk-only CI triggers and no training step in any workflow |

## Evidence tools: offline

| script | what it does |
|---|---|
| `fetch_minelib.py` | downloads MineLib instances into external `$CAOS_DATA_ROOT/minelib` (`PHASEFLOW_DATA_DIR` is a compatibility alias); academic download, never committed |
| `docs_tables.py` | rewrites the measured tables of `docs/` from the manifests and model files (`--manifests DIR` previews a sandbox bake) |
| `compare_rebake.py` | compares a candidate bake with the committed evidence and lists every changed number for review |

## The learned lane: offline only

| script | what it does |
|---|---|
| `train_learned.py` | trains both models by deposit seed into the selected external `CAOS_MODELS_ROOT` (hours); the staged bake invokes it before artifact generation |
| `rescore_guard.py` | re-scores the guard rules from the committed study, without retraining |
| `validate_guard.py` | measures the shipped rule on a third disjoint seed set |
| `export_surrogate_parity.py` | writes the fixture that holds the browser's forward pass and features to the Python models |
| `reexport_onnx.py` | re-exports and re-verifies the ONNX graphs from the committed weights |

The order after a retrain is in [docs/guides/03](../docs/guides/03_retrain-the-learned-models.md).

The state-conditioned frontier policy has its own, external CPU training environment. See
[`docs/frameworks/08_pytorch-frontier.md`](../docs/frameworks/08_pytorch-frontier.md) and use the paired
`setup-frontier-training.ps1` or `setup-frontier-training.sh` script. The frozen trainer is
`train_frontier_policy.py`; `--check` validates its contract without training. Run
`evaluate_frontier_policy.py` once on the sealed synthetic test partition, then
`evaluate_frontier_product_cases.py` once on all 13 held-out PhaseFlow cases using external `CAOS_DATA_ROOT`
inputs and the complete 0.11.000/OreBlocks 0.6.6 baseline under external `CAOS_TEMP_ROOT`. The synthetic
evaluator writes a split-wide ledger under external `CAOS_DATA_ROOT` before opening each case and persists
each case result before continuing. Completed rows can be reused to assemble a receipt after an interruption;
a case whose output was lost is marked unavailable and is never rerun. The ledger is keyed by the frozen split,
training receipt, checkpoints, and source commits, so a different run name cannot reopen the same partition.
Product-case rows carry an assembled-instance SHA-256 and paired per-method NPV/runtime evidence; only
synthetic twins retain per-block schedules. Neither evaluation exports any MineLib block schedule to the repository.

`diagnose_frontier_validation.py --data-root <external-run>` performs a descriptive replay of the frozen five-member
ensemble on the checkpoint-selection validation split only. It checks the training source and checkpoint hashes,
independently validates each schedule, and refuses to overwrite an existing diagnostic. Its output is post-selection
evidence, not a test metric; it never opens synthetic test or product cases. The state-conditioned policy manuscript's
`build_figures.py` reads the frozen training record and this validation diagnostic to generate its vector figures.
