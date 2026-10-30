# PhaseFlow contract catalog

This catalog names the committed data boundaries between the Python bake, the replay bundle, and the browser. The
schemas are versioned independently from the application. A breaking shape change increments a major version; an
optional field increments a minor version; a description-only change increments a patch version. The digest lock is
checked by `scripts/check_contract_versions.py`; `scripts/check_contracts.py` validates every committed document
against its row's schema. The readiness snapshot is recomputed from these rows and the files on disk.

## Contracts

| id | version | owner | schema file | example | documents | producer test | consumer test | missing-data behavior | provider | model io | swap test | status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| case-index | 1.0.0 | `data-pipeline/pipeline/core/manifest.py` | docs/contracts/schemas/index.schema.json | - | `data/derived/manifests/index.json` | `tests/contracts/test_contract_schemas.py::test_every_catalogued_document_matches_its_schema` | `frontend/test/contract.test.ts` | missing: release gates fail before deployment; stale: the index engine version differs from `VERSION` | simulator:`data-pipeline/pipeline` | - | - | real |
| case-manifest | 1.0.0 | `data-pipeline/pipeline/core/manifest.py` | docs/contracts/schemas/manifest.schema.json | - | `data/derived/manifests/*.json, !data/derived/manifests/index.json` | `tests/contracts/test_contract_schemas.py::test_every_catalogued_document_matches_its_schema` | `frontend/test/contract.test.ts` | missing: the release gate reports the missing manifest and blocks promotion | simulator:`data-pipeline/pipeline` | - | - | real |
| schedule-trace | 1.2.0 | `data-pipeline/pipeline/core/trace.py` | docs/contracts/schemas/trace.schema.json | - | `data/derived/*/trace.json` | `tests/contracts/test_contract_schemas.py::test_every_catalogued_document_matches_its_schema` | `frontend/test/contract.test.ts` | missing: the release gate reports the missing trace and blocks promotion | simulator:`data-pipeline/pipeline` | - | - | real |
| learned-model | 1.0.0 | `data-pipeline/pipeline/model/learned.py` | docs/contracts/schemas/learned-model.schema.json | - | `models/expected-time.json, models/bound.json, models/expected-time.onnx, models/bound.onnx` | `tests/contracts/test_contract_schemas.py::test_every_catalogued_document_matches_its_schema` | `frontend/test/contract.test.ts` | missing: learned parity and model checks fail; the exact lane remains authoritative | baseline:`models` | ONNX inputs are normalized case features; outputs are bounded estimates; JSON reports retain training provenance | - | real |
| learned-study | 1.0.0 | `scripts/train_learned.py` and evaluation scripts | docs/contracts/schemas/learned-study.schema.json | - | `models/training-report.json, models/guard-validation.json, models/learned-failure-modes.json, models/surrogate-parity.json, models/learned-preview-timing.json` | `tests/contracts/test_contract_schemas.py::test_every_catalogued_document_matches_its_schema` | `frontend/test/contract.test.ts` | missing: release evidence gate reports absent study evidence and blocks promotion | baseline:`models` | - | - | real |
| readiness | 1.0.0 | `data-pipeline/pipeline/core/readiness.py` | docs/contracts/schemas/readiness.schema.json | - | `data/derived/readiness.json` | `tests/contracts/test_readiness.py::test_committed_snapshot_is_reproducible` | `scripts/check_readiness.py` | missing or stale: the release gate fails | simulator:`data-pipeline/pipeline` | - | - | real |

No API contract is listed: [`app/`](../../app/) is a reserved, dormant boundary. PhaseFlow serves committed documents
from a static site.

## History

| contract | version | date | change | kind |
|---|---|---|---|---|
| case-index | 1.0.0 | 2026-10-28 | Versioned case inventory and its engine-version freshness boundary | initial |
| case-manifest | 1.0.0 | 2026-10-28 | Versioned per-case provenance, metrics, controls, and lane evidence | initial |
| schedule-trace | 1.0.0 | 2026-10-28 | Versioned replay payload for schedules and their audited results | initial |
| schedule-trace | 1.1.0 | 2026-10-30 | Add auditable local-search solver budgets and neighborhood proof receipts | minor |
| schedule-trace | 1.2.0 | 2026-10-30 | Add per-realisation re-planning solver receipts | minor |
| learned-model | 1.0.0 | 2026-10-28 | Versioned learned-model interchange and provenance reports | initial |
| learned-study | 1.0.0 | 2026-10-28 | Versioned training, validation, parity, and failure-mode evidence | initial |
| readiness | 1.0.0 | 2026-10-28 | Versioned per-row readiness snapshot for static deployment | initial |
