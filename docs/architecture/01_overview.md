# Architecture, overview

PhaseFlow is an instance of the CAOS product-repo archetype ([ADR-0057]): offline-pipeline-heavy,
backend-free, deployed as a static site that replays committed artifacts. What follows describes THIS
product, not the archetype.

## The one thing the architecture exists to protect

**The bound is never produced by a heuristic, and it is never produced in the browser without being
checked against the offline lane.** Everything below is in service of that: two lanes that compute the
same quantities two different ways, a parity test that compares them, and a contract that will not let
a schedule reach the page without the bound it is measured against.

## Three lanes

| Lane | Where | What it does |
|---|---|---|
| **Offline (the bake)** | `data-pipeline/`, plain scripts run by path | Solves the whole method ladder per case and writes the committed artifacts |
| **Live (the browser)** | `frontend/src/engine/` | Re-solves in TypeScript when a control moves, so the focus route answers a gesture |
| **Replay** | `frontend/` | Always present. The page paints from the committed artifact before anything is computed |

There is **no Pyodide lane and no backend**. The live lane is a TypeScript port of the engine, not a
Python runtime shipped to the client: a max-flow on typed arrays, the parametric pit family, the
TopoSort rounding and the shift local search. That choice is what makes a control feel like a control,
and it is also the risk, which is why `frontend/test/parity.test.ts` asserts the two lanes agree on the
precedence graph, the pit membership, the value and the bound.

## The engine is a dependency, not a folder

PhaseFlow declares **no package of its own** (`conventions/no-internal-packages.md`). The scheduling
engine is [`oreblocks`](https://pypi.org/project/oreblocks/), a separate repo with a published PyPI
project, consumed pinned. `data-pipeline/` is repo-local tooling invoked by path, never installed,
never imported as a library by anything outside this repo.

## The flow

```
data/raw/minelib/            MineLib .cpit / .pcpsp, plus the seeded twin generator
        |
        v  CONTRACT 1  (ingestion: columns, units, ranges, the licence assertion)
   oreblocks: bound -> schedule -> improve, per method, per case
        |
        v  CONTRACT 2  (the artifact, mirrored in frontend/src/lib/contract.types.ts)
data/derived/<case>/trace.json  +  data/derived/manifests/<case>.json  +  index.json
        |
        v
   frontend/ replays it, and re-solves live where a control asks it to
```

## What each folder is

| Path | Role |
|---|---|
| `data-pipeline/pipeline/stages/` | the bake, one file per stage: ingest, solve, evaluate, export |
| `data-pipeline/pipeline/core/` | the contracts, the trace builder, the lane gate |
| `data-pipeline/pipeline/model/` | the learned lane: features, training, the verified ONNX export |
| `frontend/src/engine/` | the TypeScript live engine and its parity surface |
| `frontend/src/viz/` | the 3D stage, the sections, the charts, the ladder panels |
| `models/` | the trained weights and the training report, committed |
| `data/derived/` | the committed artifacts the site replays |

[ADR-0057]: ../../../conventions/architecture/0-archetype/ADR-0057-product-repo-archetype.md
