# 04 · The live lane is TypeScript, not Python in a browser

The archetype's default live lane is Pyodide: ship a Python runtime and call the offline code. PhaseFlow
does not, because of the interaction it exists to support: a control on the focus view changes the rate, a
capacity or the slope, and the answer is a whole re-solve. Pyodide's start-up alone is seconds before the
first closure, and the numerics would run in an interpreter inside WebAssembly.

## The port

| file | what it is |
|---|---|
| `maxflow.ts` | Dinic on typed arrays, with `maxClosureWithin` for the parametric family |
| `instance.ts` | `buildPrecedence`, mirroring `oreblocks.build_precedence` term for term, flat index included |
| `cpit.ts` | `ParametricPits`, `cpitLpRelaxation` (the critical multiplier algorithm), the greedy, Gershon (cone sets as bitsets) and ExTS walks, the shift search, `solveCpit` |
| `learned.ts` | the twelve block features and the expected-time forward pass (ReLU, sigmoid head) |
| `boundSurrogate.ts` | the bound surrogate's forward pass for the sensitivity surface |
| `coherence.ts` | `voidBoundaryPeriods` (what the 3D stage colours) and per-period components |
| `solver.worker.ts` | the exact solve off the main thread: bounds per resource, three TopoSorts, the shift search; and a `parity` message that re-solves a baked case at its absolute limits for the Benchmark page |

## Two computations per control change

On the next animation frame the main thread rebuilds the precedence for the slope, solves the ultimate pit,
computes the features (rounded to single precision as the pipeline does), runs the forward pass and walks
TopoSort: the **learned plan**, drawn at once. After 220 ms of stillness the setting goes to the worker; when
the exact answer for the same setting arrives it replaces the learned plan and the HUD shows the learned
plan's share of the exact ExTS plan and the speed-up. A newer setting discards older answers.

## The port is not trusted, it is checked

- `parity.test.ts`: on `twin-porphyry-s` the precedence graph is arc-for-arc identical (53,900 arcs), the
  ultimate pit agrees block by block (4,621 blocks, zero disagreements), the plant coefficient comes from the
  baked `processTonnage` (a block may prefer the plant while its net value is negative), the browser's
  bound equals the trace's Algorithm 4 bound to 1e-6, a live plan is feasible and never above the bound, and
  every beyond rung sits under the bound of its own problem. There is no NPV equality assertion: the lanes run
  different methods, so equal NPVs would be a coincidence, not a check.
- `surrogate-parity.test.ts`: the forward passes and the features against outputs the Python models wrote
  (1e-9 and 1e-6). The browser once ran tanh layers and a linear head against a model trained with ReLU and
  a sigmoid; it drew values the model never produces.
- `gershon.test.ts`: the bitset cone sums against the definition computed the slow way.

## What the live lane does NOT do

No MILP rungs (the sliding windows, C-PIT[D], OPBSP-[D]), no joint Bienstock-Zuckerberg bound, no PCPSP LP and
no destination rungs, no ensemble. Those are offline and in the artifact; the focus view says which method
it shows.

## Profile and plan sizing

The section canvases sit in `.pf-canvas-host`, whose height is viewport-bounded; the canvas is absolutely
positioned so writing its pixel size cannot grow the host and loop the `ResizeObserver`, and the observer
remembers the last drawn size so a shrink-and-restore redraws at the restored size. `npm run verify:profile`
measures host and bitmap at five viewports after time, slider changes, shrink and restore.
