# Determinism and the trace

**A bake is a pure function of its inputs.** Every random draw goes through
`core/rng.py :: make_rng(seed)`; nothing uses a global or implicit RNG. Same inputs, byte-identical
artifact, and the pipeline tests assert it. That is what lets the site treat the committed artifact as
evidence rather than as a cache.

Determinism matters more here than in a product that merely plots. The deposit twins are GENERATED,
so a twin whose values shifted between bakes would silently change every number on every page that
mentions it, including the published gap comparisons. The generator seed is part of the case
definition and travels in the manifest.

## The trace

`core/trace.py`, schema `phaseflow.schedule-trace/v1`. It is the compact replay artifact, not the
solver's state:

| key | what |
|---|---|
| `instance` | dims, block and arc counts, source, the synthetic flag |
| `scenario` | periods, discount rate, capacities, whether the scenario is declared or published |
| `methods[]` | per method: rung, NPV, bound, gap, runtime, per-period rows, and the per-block schedule |
| `bound` | both bounds, which one was used, and the tightening between them |
| `ensemble` | the uncertainty readout, or the reason it did not run |
| `learned` | the held-out scores of the learned lane, or absent |
| `blocks` | x, y, level, grade, inPit, per block. **Only for redistributable instances** |

`blocks` is the expensive key and it is conditional: MineLib's licence does not permit shipping the
block data, so a published instance ships numbers and charts and NOT a 3D replay, and the app says so
rather than showing an empty stage. `check_artifacts.py` asserts the negative: a non-redistributable
case that carries `blocks` fails the build.

## The schema id is checked, not assumed

Every consumer verifies it (`expect()` in `frontend/src/lib/artifacts.ts`). A trace from an older
schema fails loudly at load instead of rendering three panels correctly and one silently wrong.

The optional keys above are OPTIONAL in the TypeScript types for the same reason: an artifact baked
before a field existed is a valid artifact of an older schema, and the panel that reads it says the
field is ABSENT rather than treating a missing value as a zero. Typing them as required told every
reader they were always there, and the Analysis tab read `bound.algorithm4` on such a case and
unmounted the entire app.
