# scripts/

Everything here runs from the repository root inside the project's own `.venv`; nothing uses a global
interpreter. Running the product from a fresh clone is [`local/`](local/README.md): numbered scripts in
`.sh` and `.ps1`, each printing the next command.

## Run it locally: `local/`

| script | what it does |
|---|---|
| `00_install-prereqs` | checks python, node and git against the versions CI pins |
| `01_init` | one virtualenv, the requirements, `npm ci`, `.env` from `.env.example`, a sandbox bake if `data/derived/` is empty |
| `02_generate-data` | bakes the artifacts: a sandbox by default, `--release` / `-Release` for the committed set; cases side by side (`PHASEFLOW_BAKE_JOBS` / `-Jobs`) |
| `03_dev` | overlays `data/derived` into the frontend and starts Vite |

## Guards: run in CI and before deploy (cheap, never train; ADR-0074)

| script | what it enforces |
|---|---|
| `check_artifacts.py` | CONTRACT 2 on the committed evidence: index, manifests and traces agree; byte sizes; lane equals the gate; the engine pin equals the baking version; roles equal the case source; every plan within capacity and under its own bound; a PCPSP LP for every destination plan, never below the joint CPIT LP; no per-block data for a non-redistributable case |
| `docs_tables.py --check` | every generated table in `docs/` equals what the manifests and model files say |
| `check_readme_numbers.py` | the README's trust-anchor table equals the `newman1` artifact; no control bytes |
| `check_content_standards.py` | no em-dash and no pictographic emoji in tracked content (ADR-0067) |
| `check_template_residue.py` | no archetype template leftovers in the product (ADR-0057, ADR-0061) |
| `check_ci_budget.py` | trunk-only CI triggers and no training step in any workflow |

## Evidence tools: offline

| script | what it does |
|---|---|
| `fetch_minelib.py` | downloads MineLib instances into `$PHASEFLOW_DATA_DIR/minelib` (or the git-ignored `data/raw/minelib`); academic download, never committed |
| `docs_tables.py` | rewrites the measured tables of `docs/` from the manifests and model files (`--manifests DIR` previews a sandbox bake) |
| `compare_rebake.py` | compares a candidate bake with the committed evidence and lists every changed number for review |

## The learned lane: offline only

| script | what it does |
|---|---|
| `train_learned.py` | trains both models by deposit seed and writes the weights, metrics, failure study and training report (hours) |
| `rescore_guard.py` | re-scores the guard rules from the committed study, without retraining |
| `validate_guard.py` | measures the shipped rule on a third disjoint seed set |
| `export_surrogate_parity.py` | writes the fixture that holds the browser's forward pass and features to the Python models |
| `reexport_onnx.py` | re-exports and re-verifies the ONNX graphs from the committed weights |

The order after a retrain is in [docs/guides/03](../docs/guides/03_retrain-the-learned-models.md).
