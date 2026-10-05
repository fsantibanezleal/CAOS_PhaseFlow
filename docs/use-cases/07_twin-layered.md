# 07 · Layered twin (`twin-layered`)

**Family:** `deposit`. **Role in the argument**, as the case source states it:

> Strong stratification: the pushbacks come out as benches rather than as cones.

## The instance

- **deposit**: seeded `layered` twin, 30 x 30 x 16 = 14,400 blocks, seed 13, 45-degree slopes
- **data**: synthetic, license-free; the per-block schedule ships to the browser
- **scenario**: 10 periods at a rate of 0.10, first period undiscounted; capacity mining 0.70, processing 0.45 of the pit's per-period resource

## Strong stratification

A layered deposit (30 x 30 x 16 = 14,400 blocks, seed 13), ten periods at ten percent, mining 0.70 and plant
0.45. The pushbacks come out as benches rather than as cones, so this is the deposit on which the
bench-by-bench floor and the nested shells are closest to a sensible order (compare their gaps here with the
other twins), and the learned rung's easiest archetype in the failure study
([08](../methodologies/08_when-the-surrogate-fails.md)) is not layered but porphyry: compare its measured
share in the table with the other twins.

At this size two bounds change. The time-expanded graph (144,000 nodes, 1,291,200 edges) is above the joint
bound's certification budget, so the CPIT gaps are measured against Algorithm 4; and its PCPSP LP (1,435,220 rows) is above the HiGHS row budget, so the destination plans are measured against the LP's Lagrangian dual by maximum closures on the same graph ([02](../methodologies/02_the-bound.md), section 5.2): the LP value up to the rounding slack the table records.

## Bounds

<!-- generated:case-bounds:twin-layered -->
<!-- /generated -->

## Every method on this case

The best plan is marked; destination plans are measured against the PCPSP LP, every other plan against the
CPIT bound the case uses. Coherence is the mean over periods of the connected components and the share of
the largest one.

<!-- generated:case:twin-layered -->
<!-- /generated -->

*Tables generated from `data/derived/manifests/twin-layered.json` by `scripts/docs_tables.py`.*
