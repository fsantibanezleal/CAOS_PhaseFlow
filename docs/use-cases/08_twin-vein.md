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
| bound | value | time | detail |
| --- | ---: | ---: | --- |
| ultimate pit (UPIT, exact, undiscounted) | 776,841,716 |  | 9,232 of 14,400 blocks; no time, no capacity |
| Algorithm 4 (min over single-resource LPs) | 285,385,074 | 112.2 s | 286 maximum closures |
| joint LP (Bienstock-Zuckerberg) | not computed | - | time-expanded graph is 144,000 nodes and 1,291,200 edges, above the 130,000/1,400,000 budget. Pricing would be fast, but the bound is only worth reporting once it has been CERTIFIED by one exact solve, and that solve is the pure-Python max-flow. Algorithm 4's certified but looser bound is used |
| PCPSP LP by its Lagrangian dual (destinations free) | 370,316,501 | 15.2 min | 1,435,220 rows, above the HiGHS budget; 337 closure iterations, converged; rounding slack 112,396 |
| used for every CPIT gap on this case | Algorithm 4 |  |  |
<!-- /generated -->

## Every method on this case

The best plan is marked; destination plans are measured against the PCPSP LP, every other plan against the
CPIT bound the case uses. Coherence is the mean over periods of the connected components and the share of
the largest one.

<!-- generated:case:twin-vein -->
| method | rung | NPV | measured against | gap | time | components / largest share (mean per period) |
| --- | --- | ---: | --- | ---: | ---: | --- |
| `bench-by-bench` | classical | 172,734,792 | Algorithm 4 | 39.47% | 117 ms | 7.8 / 59% |
| `nested-shells` | classical | 165,147,497 | Algorithm 4 | 42.13% | 113 ms | 5.8 / 75% |
| `toposort-greedy` | classical | 181,068,402 | Algorithm 4 | 36.55% | 110 ms | 7.9 / 83% |
| `toposort-gershon` | classical | 22,428,664 | Algorithm 4 | 92.14% | 415 ms | 24.6 / 66% |
| `toposort-expected` | sota | 280,993,395 | Algorithm 4 | 1.54% | 112.3 s | 9.1 / 73% |
| `exts-two-resource` | sota | 280,993,395 | Algorithm 4 | 1.54% | 112.4 s | 9.1 / 73% |
| `shift-local-search` | sota | 283,568,074 | Algorithm 4 | 0.64% | 73 ms | 5.3 / 88% |
| `sliding-window` **(best)** | sota | 284,898,844 | Algorithm 4 | 0.17% | 21.5 min | 4.9 / 93% |
| `cpitD-local-search` | sota | 283,628,430 | Algorithm 4 | 0.62% | 407 ms | 5.6 / 88% |
| `learned-expected-time` | learned | 233,269,757 | Algorithm 4 | 18.26% | 485 ms | 43.3 / 52% |
| `destination-toposort` | beyond | 299,979,372 | PCPSP LP | 18.99% | 47.5 s | 6.5 / 83% |
| `destination-sliding-window` | beyond | 298,880,354 | PCPSP LP | 19.29% | 38.7 min | 8.0 / 85% |
| `destination-local-search` | beyond | 300,153,975 | PCPSP LP | 18.95% | 2.9 s | 7.7 / 83% |
| `min-width` | beyond | 284,927,516 | Algorithm 4 | 0.16% | 325 ms | 4.6 / 93% |
<!-- /generated -->

*Tables generated from `data/derived/manifests/twin-vein.json` by `scripts/docs_tables.py`.*
