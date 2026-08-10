# The live lane is TypeScript, not Python in a browser

The archetype's default live lane is Pyodide: ship a Python runtime to the client and call the same
offline code. PhaseFlow does not do that, and the reason is the interaction it exists to support.

A control on the focus route changes the discount rate or a capacity, and the answer is a whole
re-solve: a parametric family of maximum closures for the bound, then the rounding, then the local
search. Pyodide's start-up alone is several seconds before the first closure runs, and the numeric work
lands in an interpreter inside a WebAssembly runtime. The gesture would not feel like a control.

So `frontend/src/engine/` is a port:

| file | what it is |
|---|---|
| `maxflow.ts` | Dinic on typed arrays, with `maxClosureWithin` for the parametric family |
| `instance.ts` | `buildPrecedence`, mirroring `oreblocks.build_precedence` term for term including the flat index |
| `cpit.ts` | `ParametricPits`, `cpitLpRelaxation`, `toposortSchedule`, `improveSchedule`, `solveCpit` |
| `coherence.ts` | `voidBoundaryPeriods`, which is what the 3D stage colours |

## The obvious objection, and the answer

Two implementations of the same algorithm is two chances to be wrong, and the second one has no
`pytest` behind it. That is exactly right, and it is why the port is not trusted, it is CHECKED:
`frontend/test/parity.test.ts` builds the same instance both ways and asserts

- the precedence graph is arc-for-arc identical (53,900 arcs on the hero case, both sides),
- the ultimate pit membership agrees block by block, with zero disagreements out of 4,621,
- the certified bound agrees to 1e-6, and a live schedule is asserted FEASIBLE and never above
  the bound. There is no NPV equality assertion and there should not be one: the live lane and
  the offline lane run different methods, so equal NPVs would be a coincidence rather than a
  check.

A port that drifts fails a test rather than showing a plausible number, and a plausible number is the
only thing a second implementation is actually dangerous for.

## What the live lane does NOT do

It does not run the MILP rungs (the exact C-PIT[D] re-solve, the exact OPBSP destination model), it
does not compute the Bienstock-Zuckerberg bound, and it does not run the ensemble. Those are offline,
they are in the committed artifact, and the focus route says which method it is currently showing.
