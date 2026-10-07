# Architecture: how the product is put together

| # | page | what it settles |
|---|---|---|
| 01 | [overview](architecture/01_overview.md) | the three lanes, the flow, the folders, the one thing the architecture protects |
| 02 | [determinism and the trace](architecture/02_determinism-and-trace.md) | a bake as a pure function of its inputs; the replay artifact |
| 03 | [the live-vs-replay gate](architecture/03_the-gate.md) | which cases re-solve in the browser, decided by measurement |
| 04 | [the live lane is TypeScript](architecture/04_live-lane-typescript.md) | the port, the two computations per control change, how the port is checked |
| 05 | [the bake](architecture/05_precompute-pipeline.md) | the stages, what `run_ladder` guarantees, what it costs, `--jobs` |
| 06 | [the learned lane as a component](architecture/06_learned-lane.md) | its boundaries: training, split, artifact, consumers |
| 07 | [deploy](architecture/07_deploy.md) | GitHub Pages, what CI enforces, what only a browser gate can see |

The data contracts (inputs, CONTRACT 1, CONTRACT 2, licences, model files) have their own theme:
[data-contract.md](data-contract.md). Binding decision: ADR-0057 (product-repo archetype), with ADR-0055
(deploy class) and ADR-0074 (CI never trains).
