# 01 · Overview

PhaseFlow is an instance of the CAOS product-repo archetype (ADR-0057, in the management repository's
conventions): offline-pipeline-heavy, backend-free, deployed as a static site that replays committed
artifacts and re-solves live where the case allows. What follows describes THIS product.

![The lanes: the offline bake, the committed artifact, the browser](../assets/lanes.svg)

## The one thing the architecture exists to protect

**The bound is never produced by a heuristic, and the browser never shows a number it has not been checked
against.** Two lanes compute the same quantities two different ways, a parity test compares them, and a
contract will not let a plan reach the page without the bound of its own problem.

## Three lanes

| lane | where | what it does |
|---|---|---|
| **offline (the bake)** | `data-pipeline/`, plain scripts run by path | builds each instance through CONTRACT 1, runs the whole ladder, the bounds, the controls and the ensemble, and writes the committed artifacts |
| **live (the browser)** | `frontend/src/engine/` | on a live case, re-solves in TypeScript when a control moves: the learned plan at once, the exact bound and plans in a worker |
| **replay** | `frontend/` | always present: every page paints from the committed artifact before anything is computed |

There is **no Pyodide lane and no backend**. The live lane is a TypeScript port of the engine's numpy subset
(a max-flow on typed arrays, the parametric pits, the TopoSort walks, the shift search, the learned forward
pass), checked against the trace by `frontend/test/parity.test.ts` and `surrogate-parity.test.ts`
([04](04_live-lane-typescript.md)).

## The engine is a dependency, not a folder

PhaseFlow declares **no package of its own**. The engine is [`oreblocks`](https://pypi.org/project/oreblocks/),
a separate repository with a published PyPI project, consumed pinned ([frameworks/01](../frameworks/01_oreblocks.md)).
`data-pipeline/` is repo-local tooling invoked by path, never installed.

## The flow

```text
$PHASEFLOW_DATA_DIR/minelib/   MineLib .blocks/.prec/.cpit/.pcpsp   +   oreblocks.make_twin (seeded)
        |
        v  CONTRACT 1  (accept / flag / reject, with reasons)
   bounds: critical multiplier, Algorithm 4, Bienstock-Zuckerberg, PCPSP LP
   ladder: classical, sota, learned, beyond (re-cut destinations, min-width); controls; ensemble
        |
        v  CONTRACT 2  (trace + manifest + index, re-read and checked; mirrored in contract.types.ts)
data/derived/<case>/trace.json   data/derived/manifests/<case>.json   data/derived/manifests/index.json
        |
        v  copy-data.mjs, Vite build, GitHub Pages
   the App (six tabs, focus view with live re-solve) and five reading pages
```

## What each folder is

| path | role |
|---|---|
| `data-pipeline/pipeline/cases/` | the case registry: deposit, scenario, bilingual title and role |
| `data-pipeline/pipeline/io/` | CONTRACT 1 (`contract.py`), the schema dataclasses, writers |
| `data-pipeline/pipeline/model/` | instance building (MineLib and twins), the learned lane (features, MLP, ONNX export) |
| `data-pipeline/pipeline/stages/` | `solve.py` (bounds and ladder), `evaluate.py` (controls and ensemble) |
| `data-pipeline/pipeline/core/` | the trace and manifest builders, the lane gate, the seeded RNG |
| `data-pipeline/pipeline/pipeline.py` | the orchestrator: one case or all (`--jobs`), the re-read validation |
| `frontend/src/engine/` | the TypeScript live engine and the worker |
| `frontend/src/viz/` | the 3D stage, the sections, the charts |
| `frontend/src/content/` | the five reading pages: topics, data panels, figures |
| `models/` | the trained weights, metrics and studies, committed |
| `data/derived/` | the committed artifacts the site replays |
| `scripts/` | guards (CI), the docs-table generator, training and scoring (offline), local run scripts |
| `docs/` | this wiki |
