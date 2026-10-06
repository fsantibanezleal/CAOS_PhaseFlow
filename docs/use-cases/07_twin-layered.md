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

What the bake measured here:

- **The sliding window loses on this deposit.** It ends at 6.38 percent where ExTS and both local searches
  reach 3.55, and it cost 802 minutes, most of it in a few windows whose first feasible solution was far
  from the LP (the fifth: a 172 percent gap at the root). The best plan is the exact neighbourhood search.
- **Destinations are worth 15.6 percent** over the best CPIT plan, and the destination plans sit 9.24
  percent under the dual bound; the re-cut window took another 538 minutes. The whole case took 22.4
  hours, the longest of the release.
- **Gershon's weight loses narrowly to greedy** (19.36 against 17.01 percent), and the learned rung reaches
  0.871 of the exact ExTS plan, below the 0.90 line, so it is flagged.

## Bounds

<!-- generated:case-bounds:twin-layered -->
| bound | value | time | detail |
| --- | ---: | ---: | --- |
| ultimate pit (UPIT, exact, undiscounted) | 2,960,091,528 |  | 14,400 of 14,400 blocks; no time, no capacity |
| Algorithm 4 (min over single-resource LPs) | 1,111,128,369 | 106.5 s | 129 maximum closures |
| joint LP (Bienstock-Zuckerberg) | not computed | - | time-expanded graph is 144,000 nodes and 1,291,200 edges, above the 130,000/1,400,000 budget. Pricing would be fast, but the bound is only worth reporting once it has been CERTIFIED by one exact solve, and that solve is the pure-Python max-flow. Algorithm 4's certified but looser bound is used |
| PCPSP LP by its Lagrangian dual (destinations free) | 1,365,530,202 | 68.8 s | 1,435,220 rows, above the HiGHS budget; 109 closure iterations, converged; rounding slack 398,125 |
| used for every CPIT gap on this case | Algorithm 4 |  |  |
<!-- /generated -->

## Every method on this case

The best plan is marked; destination plans are measured against the PCPSP LP, every other plan against the
CPIT bound the case uses. Coherence is the mean over periods of the connected components and the share of
the largest one.

<!-- generated:case:twin-layered -->
| method | rung | NPV | measured against | gap | time | components / largest share (mean per period) |
| --- | --- | ---: | --- | ---: | ---: | --- |
| `bench-by-bench` | classical | 899,817,036 | Algorithm 4 | 19.02% | 249 ms | 2.0 / 85% |
| `nested-shells` | classical | 906,350,215 | Algorithm 4 | 18.43% | 240 ms | 1.0 / 100% |
| `toposort-greedy` | classical | 922,170,649 | Algorithm 4 | 17.01% | 222 ms | 16.1 / 72% |
| `toposort-gershon` | classical | 896,014,136 | Algorithm 4 | 19.36% | 793 ms | 11.2 / 52% |
| `toposort-expected` | sota | 1,071,675,842 | Algorithm 4 | 3.55% | 106.7 s | 2.6 / 92% |
| `exts-two-resource` | sota | 1,071,675,842 | Algorithm 4 | 3.55% | 106.9 s | 2.6 / 92% |
| `shift-local-search` | sota | 1,071,675,842 | Algorithm 4 | 3.55% | 106 ms | 2.6 / 92% |
| `sliding-window` | sota | 1,040,267,686 | Algorithm 4 | 6.38% | 13.37 h | 6.7 / 86% |
| `cpitD-local-search` **(best)** | sota | 1,071,699,061 | Algorithm 4 | 3.55% | 1.1 s | 3.2 / 91% |
| `learned-expected-time` | learned | 933,372,664 | Algorithm 4 | 16.00% | 296 ms | 35.2 / 69% |
| `destination-toposort` | beyond | 1,199,918,922 | PCPSP LP | 12.13% | 53.1 s | 5.8 / 89% |
| `destination-sliding-window` | beyond | 1,228,207,800 | PCPSP LP | 10.06% | 8.97 h | 3.9 / 91% |
| `destination-local-search` | beyond | 1,239,325,459 | PCPSP LP | 9.24% | 2.6 s | 4.0 / 91% |
| `min-width` | beyond | 1,071,699,061 | Algorithm 4 | 3.55% | 508 ms | 3.2 / 91% |
<!-- /generated -->

*Tables generated from `data/derived/manifests/twin-layered.json` by `scripts/docs_tables.py`.*
