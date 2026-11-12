# Frontier release receipt, version 3

The v3 receipt retains the distinct SHA-256 identities for the frozen training/validation split and independent
synthetic test sample introduced in v2. It also makes partial-schedule coverage mandatory in the case ledger.

For each `partial` case, `tonnage_coverage` and `positive_value_coverage` are finite values in `[0, 1]`. The candidate
builder copies these measurements from the independently validated evaluation row. Complete schedules carry their
trace digest; failed and unavailable cases retain a reason and do not receive fabricated coverage. Thus every case
status remains countable, and a feasible partial plan cannot be mistaken for a complete plan.

## Why this is a major contract step

Adding required fields to partial case records changes the shape of the receipt. A v2 consumer cannot rely on the new
coverage values, so this schema is identified as `phaseflow.frontier-release/v3` and the catalog moves from 2.0.0 to
3.0.0. No v2 receipt was released or deployed; this version is the first candidate shape intended for the PhaseFlow
0.12.000 release.

The receipt does not include training weights or per-block schedules from licensed MineLib cases. Synthetic twins may
retain their redistributable period vectors in their trace; MineLib outcomes remain period aggregates only.
