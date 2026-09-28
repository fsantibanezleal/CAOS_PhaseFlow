# Learned destination policy: design

Status: proposed. [Requirements](requirements.md) and [tasks](tasks.md).

The current `oreblocks.destination_toposort` accepts a priority weight and
then chooses each block's destination against remaining capacity. This gives a
safe decoder for a learned priority: the model changes the order, while the
engine still decides feasibility. It does **not** learn an unconstrained
block-by-block destination label and hope a later repair makes it feasible.

```mermaid
flowchart LR
  A[Small PCPSP twins] --> B[Budgeted OPBSP MILP teacher]
  B --> C[Teacher status, bound, schedule]
  C --> D[Seed-disjoint training]
  D --> E[Priority model and ONNX parity]
  E --> F[Destination TopoSort decoder]
  F --> G[Feasibility and held-out score]
```

The teacher pilot records model dimensions, candidate count, solver version,
wall time, termination status, incumbent and bound. The current engine API
returns a schedule or `None` and an `exact` flag, but not a proof record; that
interface must be extended in the `oreblocks` source before D-01 can pass.
Only certified or explicitly tolerance-bounded teachers may define targets.
A time-limited feasible incumbent can be evaluated as a baseline, not called
the exact optimum. The first pilot uses small synthetic deposits to establish
the compute budget before any broad training run.

Input features reuse measured block geometry/value/grade/precedence and
scenario values, with a separately versioned target and normalization. The
model predicts priority. An ONNX export and its metadata travel with the
committed evaluation; browser inference is optional until its size and latency
are measured. The method row identifies it as PCPSP/beyond and carries its
training provenance. A CPIT bound must never be used to compute its gap.

If the pilot or final evaluation fails D-07, preserve the research receipt and
explicitly leave BL-035 open. No placeholder learned label enters the selector.
