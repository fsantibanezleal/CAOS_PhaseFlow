# 10 · Mill-bound regime (`regime-mill-bound`)

**Family:** `regime`. **Role in the argument**, as the case source states it:

> Plant capacity binds every period while the shovels idle. This is the regime where a stockpile would pay, and where the app says why it is not offering one.

## The instance

- **deposit**: seeded `porphyry` twin, 24 x 24 x 12 = 6,912 blocks, seed 7, 45-degree slopes
- **data**: synthetic, license-free; the per-block schedule ships to the browser
- **scenario**: 12 periods at a rate of 0.10, first period undiscounted; capacity mining 1.40, processing 0.32 of the pit's per-period resource

## The plant binds every period while the shovels idle

The small porphyry over twelve periods at ten percent with mining capacity 1.40 and plant capacity 0.32 of
the pit's per-period resource: the plant is the bottleneck and the fleet has room to spare.

## What to read in it

- **This is where choosing destinations pays most.** Lane's mill-limited cutoff rises above break-even by
  the plant's opportunity cost; a fixed cutoff sends every marginal ore block to the plant and starves the
  richer ore below. The re-cut on the PCPSP LP dumps that marginal ore, and the distance between the
  destination plans and the best CPIT plan in the table is that decision's value
  ([09](../methodologies/09_destinations.md)).
- **It is also the regime where a stockpile would pay**, deferring low grade to a later free plant, and the
  app says why it does not offer one (bilinear grade, fragile value under degradation).

## Bounds

<!-- generated:case-bounds:regime-mill-bound -->
<!-- /generated -->

## Every method on this case

The best plan is marked; destination plans are measured against the PCPSP LP, every other plan against the
CPIT bound the case uses. Coherence is the mean over periods of the connected components and the share of
the largest one.

<!-- generated:case:regime-mill-bound -->
<!-- /generated -->

*Tables generated from `data/derived/manifests/regime-mill-bound.json` by `scripts/docs_tables.py`.*
