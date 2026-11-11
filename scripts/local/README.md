# Local workflow

Run commands from any directory using the entrypoint's absolute path, or from the repository root as below.
The numbered steps share workflow.py and the declarative workflow.json. The flat setup/dev/precompute entrypoints forward to the same helper. Flat precompute also stages externally; only --release/-Release requests local artifact replacement.

## 00: system prerequisites

PowerShell: ./scripts/local/00_install-prereqs.ps1

Bash: bash scripts/local/00_install-prereqs.sh

The default checks Python>=3.12, Node ^22.12.0 || ^24.0.0 || >=26.0.0 and git. Newer compatible installations are accepted.
Only -Install / --install requests installation of missing prerequisites, through winget on Windows or Homebrew
where available. Otherwise the command explains the manual repair. No global Python package is installed.
PYTHON can select an existing interpreter path, including one containing spaces.

## 01: initialize

PowerShell: ./scripts/local/01_init.ps1

Bash: bash scripts/local/01_init.sh

Initialization copies nonsecret .env.example defaults only if .env is absent. Existing .env bytes are preserved;
dotenv assignments are literal values, never shell commands. Exported process variables take precedence.
Set an absolute external CAOS_VENVS_ROOT in the process environment or an existing .env before initialization.
Declared runtimes are provisioned at CAOS_VENVS_ROOT/environment_namespace/runtime. There is no repository or system-temp fallback. Missing, internal, redirected or non-directory targets refuse before .env creation or dependency installation. Runtime lookup creates nothing. Existing repository aliases are accepted only when they resolve to the exact declared external runtime. Historical internal environments must be preserved separately; initialization never moves or overwrites them.

Declared external venvs and locked frontend dependencies are provisioned. Recursive requirements and package-lock
fingerprints are stamped only after a successful install; a matching installation is reused. A failed native
process is a failure, while successful native stderr warnings remain warnings.

Optional -Notebooks / --notebooks provisions the notebook environment. See the product notes below for the optional GPU lane.
Complete shipped artifacts avoid acquisition or generation. If required artifacts are genuinely absent, initialization
runs the complete external sandbox generation path and reports the explicit promotion command needed before dev.
It never silently replaces committed artifacts or starts a science bake as part of an ordinary complete checkout.

## 02: external data generation and explicit promotion

Configure CAOS_TEMP_ROOT as an external scratch root before generation. No system-temp or repository fallback is used.
PowerShell: ./scripts/local/02_generate-data.ps1

Bash: bash scripts/local/02_generate-data.sh

Each invocation creates a fresh external caos-local-* stage. All measured summaries, process records, exported models
and local checkpoints remain there. The complete real producer plan is in workflow.json; no stage inherits a
repository output default. Pinned source caches, when needed, use external CAOS_DATA_ROOT. This operation can be
expensive and may require source acquisition and generation dependencies; opening shipped artifacts does not.

After generation, the command prints the stage and next command. Promotion requires explicit intent:

PowerShell: ./scripts/local/02_generate-data.ps1 -Release -FromStage '<external stage>'

Bash: bash scripts/local/02_generate-data.sh --release --from-stage '<external stage>'

Without a supplied stage, explicit release mode first generates a fresh complete stage. It rechecks current source
and payload fingerprints, versions, whole catalog/readiness, and the existing semantic/schema validators before
replacement. Mixed, partial, changed or invalid candidates cannot replace old files. Prepared incoming trees and
backups support rollback if any artifact/model-directory promotion fails. Every recoverable target is attempted;
if restoration fails, the error names original and restoration failures and all retained recovery paths.
Preserve those paths until recovery is complete; never delete backups merely to silence an error. Checkpoints are never release payloads.
Here release means local artifact promotion; it creates no Git tag, software release, deployment or publication.

## 03: development services

PowerShell: ./scripts/local/03_dev.ps1

Bash: bash scripts/local/03_dev.sh

The helper verifies initialized dependencies, the frontend lock fingerprint, shipped artifacts and free loopback
ports. It runs the existing frontend predev copy, starts Vite directly, and supervises an active API where declared.
The API must answer health before the frontend starts. Child failure exits nonzero; Ctrl+C stops only this
workflow's process trees. It does not kill a pre-existing process or install dependencies during startup.

## Checks

Run the focused behavioral suite with the initialized pipeline interpreter:

python -m pytest tests/test_local_bootstrap.py tests/test_bootstrap_regressions.py tests/test_bootstrap_admission.py -q

The fixtures execute fake producers and local HTTP/frontend subprocesses in external temporary repositories,
not training or release promotion in this checkout. Use the existing smoke scripts for the full product gates.
Actual installed app launch, API operations, release publication and deployment require their own observed receipts.

## PhaseFlow configuration

The primary environment is `.venv-pipeline`, created from the pinned precompute and development requirements under `CAOS_VENVS_ROOT/phaseflow`. The optional `.venv-notebooks` is created only with `-Notebooks` / `--notebooks` under the same external namespace. Repository paths are aliases to those external runtimes; initialization refuses an internal or redirected environment. The API remains dormant; this workflow starts only the static Vite site.

A full release stage trains the learned bundle inside that external stage, validates its third-seed guard, runs all thirteen registry cases against OreBlocks 0.6.6, rebuilds the index, exports surrogate parity and browser-preview timing receipts, and computes staged readiness. It then checks the complete inventory, every artifact, every catalogued document and readiness against the staged tree. Version-stamped model reports are produced in the stage; they are never copied forward as authored inputs. The release-stage receipt binds recursive requirements, the catalog and schemas, producer and validator code, product metadata, model bytes and all generated artifact bytes. Any source or payload change invalidates the stage.

Set `CAOS_VENVS_ROOT` to an external runtime root, `CAOS_DATA_ROOT` to an external data directory containing the MineLib cache and `CAOS_TEMP_ROOT` to an external scratch directory. The product maps `CAOS_DATA_ROOT` to its legacy `PHASEFLOW_DATA_DIR` reader when needed; an explicitly set `PHASEFLOW_DATA_DIR` retains precedence. Both roots must be outside this repository. Raw MineLib files and local generation candidates remain external. Compact, licensed aggregate release artifacts and catalogued trained models are the only generated payloads promoted into the repository.

The bootstrap regression suite exercises prerequisite checks, environment fingerprints, source-bound stage admission, complete readiness inventory, rollback recovery, executable shell entries and supervised process cleanup in isolated fixtures. It does not install dependencies, train models or promote the live product during those tests. Run it with the pinned pipeline interpreter:

` .venv-pipeline/Scripts/python.exe -m pytest tests/test_local_bootstrap.py tests/test_bootstrap_regressions.py tests/test_bootstrap_admission.py -q `

The deployment workflow, release publication, manuscript publication and live browser verification remain separate release gates.
