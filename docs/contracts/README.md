# Contracts

| Contract | Schema | Producer | Consumer and gate |
|---|---|---|---|
| Schedule trace v1 | `../../data/derived/` plus `../../frontend/src/lib/contract.types.ts` | `data-pipeline/pipeline/core/trace.py` | `scripts/check_artifacts.py`, frontend contract tests |
| Manifest v1 | `../../data/derived/manifests/` | pipeline manifest writer | artifact provenance and browser contract gates |

The product's detailed field and licensing rules remain in [the data contract](../data-contract/03_trace-and-manifest.md).
