# 12 · Control: capacity barely binds (`ctrl-abundant`)

**Family:** `control`. **Role in the argument**, as the case source states it:

> Loose-capacity diagnostic. The best CPIT schedule approaches the certified bound, but classical schedules still lose value because period timing and slope precedence matter at a positive discount rate. The zero-rate, single-period ctrl-degenerate case is the exact collapse control; this one is not.

## The instance

- **deposit**: seeded `porphyry` twin, 24 x 24 x 12 = 6,912 blocks, seed 7, 45-degree slopes
- **data**: synthetic, license-free; the per-block schedule ships to the browser
- **scenario**: 8 periods at a rate of 0.10, first period undiscounted; capacity mining 2.50, processing 2.00 of the pit's per-period resource

## A loose-capacity diagnostic, not a collapse

The small porphyry with mining capacity 2.50 and plant capacity 2.00 of the pit's per-period resource, over
eight periods at ten percent. Capacity barely binds, but discounting and slope precedence still decide when
each block is mined, so the methods still differ: the best plan approaches the bound while the classical
plans lose value to timing. Loose capacity alone does not make the choice of extraction period irrelevant.
The exact collapse control is `ctrl-degenerate`.

## Bounds

<!-- generated:case-bounds:ctrl-abundant -->
<!-- /generated -->

## Every method on this case

The best plan is marked; destination plans are measured against the PCPSP LP, every other plan against the
CPIT bound the case uses. Coherence is the mean over periods of the connected components and the share of
the largest one.

<!-- generated:case:ctrl-abundant -->
<!-- /generated -->

*Tables generated from `data/derived/manifests/ctrl-abundant.json` by `scripts/docs_tables.py`.*
