# Sequenced local workflow

One standard-library helper implements the four numbered steps; thin parallel shell entrypoints dispatch to it from their own location. A small checked-in JSON configuration declares environments, API activation, required artifacts and actual producer commands. Existing flat commands remain compatible.

Prerequisite checks accept Python 3.12 or newer and Node satisfying the matching package/lock range ^22.12.0 || ^24.0.0 || >=26.0.0; explicit system installation uses a supported platform package manager and never replaces compatible installed software. Initialization copies nonsecret example settings without evaluating dotenv text, preserves an existing file, and fingerprints recursive requirements and the npm lock before successful environment-local installation.

Generation requires an external CAOS_TEMP_ROOT. Each run owns a fresh stage with data/derived, models and checkpoints. Every producer destination is explicit, including measured outputs and ONNX/checkpoint paths. A narrow bridge calls existing producer APIs when a CLI lacks an output option; scientific sources and fingerprint inputs remain unchanged. Source caches use the configured external CAOS_DATA_ROOT. The staged metadata view uses the real catalog/schemas and VERSION for existing artifact/document validators and readiness computation.

Default generation never promotes. If initialization finds missing shipped artifacts, it runs the complete sandbox generation path and then names the explicit release-promotion command required before dev can consume the new set. Shipped complete artifacts need no downloads, fitting or generation.

Explicit release mode validates versions, complete catalog/index coverage, readiness and existing semantic/schema gates before replacing anything. A receipt binds the source/configuration and all staged payload bytes. Prepared incoming directories and backups are confined to the declared canonical target parents; multi-directory replacement rolls back every old target on failure. Checkpoint caches never become release payloads.

Development validates initialized dependencies and free loopback ports, then supervises the frontend plus the API only when configured active. It waits for API health, returns child failures and stops only its own process trees. Tests use fixture subprocesses, never real installation, training or release promotion. Final real initialized app launch remains a separate integration check.

Receipts bind recursive -r/-c pins and the current catalog/schema/validator identity; staged admission metadata
must match the checkout. PhaseFlow explicitly excludes the readiness self-row, yielding five contract records; the staged catalog digest and every remaining row are recomputed.
Rollback tries every target and retains all backups with exact recovery paths on incomplete restoration.
Development verifies primary and active API recursive requirements stamps before any preparation. Declared runtime
directory aliases may resolve externally; payload and recursive deletion paths cannot use that exception.
Standard subprocess.Popen starts each service in its own Windows console group or POSIX session. Cleanup
always targets that recorded group after leader exit; Windows also attempts the tracked PID/tree with taskkill.
Existing app-execution-base venvs remain supported. The existing base-integrity CI guard enforces tracked shell
mode100755. Native stdout/stderr and exit codes retain the existing subprocess.Popen behavior.

The supported existing venv is tested with an HTTP descendant that outlives its launcher and an independent
control server. A taskkill-only red probe and console-group green probe document the bounded Windows behavior;
neither probe installs or migrates a runtime.


PhaseFlow has no authored CSV stage inputs and no readiness exceptions. The workflow copies the current product version and contract catalog into an external stage, copies the trained model files, runs every registered case with that staged model bundle and the declared engine, computes readiness from the staged traces and model files, then validates the full case inventory, contract documents and artifact semantics against the same staged models. Training itself requires an external `CAOS_MODELS_ROOT`; `CAOS_MODEL_SOURCE_ROOT` selects that trained output as a later bake's model input. The receipt binds exact model bytes along with product code, requirements, contracts, validators and artifact payload. Stage writes require a path outside the repository; only the read-only registry validator may inspect the shipped tree. Explicit promotion repeats source and payload checks before replacement and retains recovery backups until every target is restored or promoted.

The generation environment maps shared `CAOS_DATA_ROOT` to the existing `PHASEFLOW_DATA_DIR` reader while preserving an explicitly supplied legacy variable. Generation requires that external data root for academic MineLib files and a separate external `CAOS_TEMP_ROOT`; neither has a repository fallback. The frontend receives only the declared compact `data/derived` root, while API and generation retain the global storage roots. The product-specific follow-up is implemented in `scripts/local/workflow.py`, `scripts/local/producer_bridge.py` and the linked regression tests.
