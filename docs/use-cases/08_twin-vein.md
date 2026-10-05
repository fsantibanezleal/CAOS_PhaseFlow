# 08 · Vein twin (`twin-vein`)

**Family:** `deposit`. **Role in the argument**, as the case source states it:

> A narrow high-grade body. The stress test for spatial coherence (the optimiser wants the vein and the vein is not a workable shape) and for Gershon's weight, which opens the whole strike length at once because every block above the vein unlocks it. With the core-halo it is one of the two archetypes on which the learned rung fails most.

## The instance

- **deposit**: seeded `vein` twin, 30 x 30 x 16 = 14,400 blocks, seed 11, 45-degree slopes
- **data**: synthetic, license-free; the per-block schedule ships to the browser
- **scenario**: 10 periods at a rate of 0.10, first period undiscounted; capacity mining 0.70, processing 0.40 of the pit's per-period resource

## A narrow high-grade body

A vein (30 x 30 x 16 = 14,400 blocks, seed 11), ten periods at ten percent, mining 0.70 and plant 0.40. The
stress test for two things:

- **Spatial coherence.** The optimiser wants the vein and the vein is not a workable shape; the components
  per period and the min-width rung show it ([10](../methodologies/10_operability.md)). Here the smoothing
  removes only 15 of 1,479 narrow blocks, because the capacity refuses 175 of its moves, and it ends 0.01
  percent ABOVE the sliding-window plan it smooths: an absorbed block that moves to an earlier period can
  pay.
- **Gershon's blind spot.** Every block above the vein has the vein in its successor set, so the Gershon
  order opens the whole strike length at once and pays for its waste early; on this archetype it loses to
  greedy ([03](../methodologies/03_toposort.md)).

It is also one of the two archetypes where the learned rung fails most often. Before oreblocks 0.6.0 this
case's smoothed plan reported an NPV above the certified bound, because `min-width` broke capacity; that is
the defect that put a capacity check on every rung.

At this size two bounds change. The time-expanded graph (144,000 nodes, 1,291,200 edges) is above the joint
bound's certification budget, so the CPIT gaps are measured against Algorithm 4; and its PCPSP LP (1,435,220 rows) is above the HiGHS row budget, so the destination plans are measured against the LP's Lagrangian dual by maximum closures on the same graph ([02](../methodologies/02_the-bound.md), section 5.2): the LP value up to the rounding slack the table records.

## Bounds

<!-- generated:case-bounds:twin-vein -->
<!-- /generated -->

## Every method on this case

The best plan is marked; destination plans are measured against the PCPSP LP, every other plan against the
CPIT bound the case uses. Coherence is the mean over periods of the connected components and the share of
the largest one.

<!-- generated:case:twin-vein -->
<!-- /generated -->

*Tables generated from `data/derived/manifests/twin-vein.json` by `scripts/docs_tables.py`.*
