# The live-vs-replay gate

`data-pipeline/pipeline/core/gate.py :: classify_lane()`. It decides, by MEASUREMENT and never by
judgement, whether a case can be re-solved in the browser or must be replayed from the committed
artifact. The verdict and every number behind it go into the manifest, and CI fails if `manifest.lane`
disagrees with the gate, so a case can never be labelled live because someone hoped it was.

## The rule

A case is **live** if all of the following hold:

| condition | budget | why this number |
|---|---|---|
| the instance is redistributable | - | MineLib's licence forbids shipping the block data, so a published instance is replay by LICENCE, not by size |
| blocks | `LIVE_BLOCKS = 30,000` | the TypeScript max-flow holds the residual graph in typed arrays; beyond this the allocation and the solve stop being interactive |
| precedence arcs | `LIVE_ARCS = 300,000` | the arc arrays dominate memory, and the graph is what actually gets traversed |
| trace bytes | `LIVE_TRACE_BYTES = 6 MiB` | the per-block schedule has to reach the browser before anything can be re-solved in it |

Otherwise the case is **replay**. Either way a committed artifact ALWAYS exists, so the page paints
from real numbers on first frame and the live lane only ever improves on that (ADR-0054).

`OFFLINE_MS_GATE = 60,000 ms` is not a lane condition. It is a NOTE: a case whose offline solve passes
a minute is recorded as such in the manifest, because a bake that quietly grows is a bake nobody will
notice has grown.

## What the gate does not decide

It does not decide whether the live lane is CORRECT. That is `frontend/test/parity.test.ts`, which
compares the two lanes on the same instance: the precedence arcs, the pit membership block by block,
the objective value and the bound. A case that passes the gate and fails parity is a defect, not a
lane choice.
