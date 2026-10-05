# 13 · Control: rate zero, capacity unlimited (`ctrl-degenerate`)

**Family:** `control`. **Role in the argument**, as the case source states it:

> The degenerate case. CPIT collapses to the ultimate pit: the mined set must equal the exact pit block for block and the bound must equal its value. A failure here is a bug, not a result.

## The instance

- **deposit**: seeded `porphyry` twin, 24 x 24 x 12 = 6,912 blocks, seed 7, 45-degree slopes
- **data**: synthetic, license-free; the per-block schedule ships to the browser
- **scenario**: 1 period at a rate of 0.00, first period undiscounted; capacity mining 50.00 of the pit's per-period resource

## The collapse control

One period, zero discount, a single resource at fifty times the pit's need. CPIT collapses to the ultimate
pit: the mined set must equal the exact pit block for block, the bound must equal its value, and every
method's gap must be zero. A failure here is a bug, not a result. The ensemble is not run (a single period
has no schedule to stress), and the joint bound is not needed (one resource: the critical multiplier
algorithm is already exact).

## Bounds

<!-- generated:case-bounds:ctrl-degenerate -->
<!-- /generated -->

## Every method on this case

The best plan is marked; destination plans are measured against the PCPSP LP, every other plan against the
CPIT bound the case uses. Coherence is the mean over periods of the connected components and the share of
the largest one.

<!-- generated:case:ctrl-degenerate -->
<!-- /generated -->

*Tables generated from `data/derived/manifests/ctrl-degenerate.json` by `scripts/docs_tables.py`.*
