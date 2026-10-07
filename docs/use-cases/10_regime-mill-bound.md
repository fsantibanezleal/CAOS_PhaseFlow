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
| bound | value | time | detail |
| --- | ---: | ---: | --- |
| ultimate pit (UPIT, exact, undiscounted) | 473,615,066 |  | 4,621 of 6,912 blocks; no time, no capacity |
| Algorithm 4 (min over single-resource LPs) | 129,686,447 | 34.7 s | 173 maximum closures |
| joint LP (Bienstock-Zuckerberg) | 129,686,447 | 19.3 s | 16 iterations on 82,944 nodes, 722,832 edges; slack of Algorithm 4: 0.0000% |
| PCPSP LP (HiGHS, destinations free) | 207,638,997 | 27.4 min | 805,800 rows, status optimal |
| used for every CPIT gap on this case | joint LP |  |  |
<!-- /generated -->

## Every method on this case

The best plan is marked; destination plans are measured against the PCPSP LP, every other plan against the
CPIT bound the case uses. Coherence is the mean over periods of the connected components and the share of
the largest one.

<!-- generated:case:regime-mill-bound -->
| method | rung | NPV | measured against | gap | time | components / largest share (mean per period) |
| --- | --- | ---: | --- | ---: | ---: | --- |
| `bench-by-bench` | classical | 27,438,402 | joint LP | 78.84% | 120 ms | 7.3 / 79% |
| `nested-shells` | classical | 37,413,391 | joint LP | 71.15% | 105 ms | 11.5 / 25% |
| `toposort-greedy` | classical | 37,580,828 | joint LP | 71.02% | 99 ms | 20.4 / 50% |
| `toposort-gershon` | classical | 91,229,398 | joint LP | 29.65% | 371 ms | 41.1 / 36% |
| `toposort-expected` | sota | 110,317,471 | joint LP | 14.94% | 34.8 s | 5.2 / 70% |
| `exts-two-resource` | sota | 110,317,471 | joint LP | 14.94% | 34.9 s | 5.1 / 70% |
| `shift-local-search` | sota | 111,801,028 | joint LP | 13.79% | 62 ms | 4.1 / 77% |
| `sliding-window` **(best)** | sota | 125,059,538 | joint LP | 3.57% | 3.01 h | 11.7 / 55% |
| `cpitD-local-search` | sota | 112,013,221 | joint LP | 13.63% | 1.7 s | 5.1 / 76% |
| `learned-expected-time` | learned | 113,137,323 | joint LP | 12.76% | 297 ms | 54.5 / 28% |
| `destination-toposort` | beyond | 190,273,768 | PCPSP LP | 8.36% | 38.0 s | 22.5 / 55% |
| `destination-sliding-window` | beyond | 206,393,886 | PCPSP LP | 0.60% | 2.17 h | 33.0 / 44% |
| `destination-local-search` | beyond | 206,469,921 | PCPSP LP | 0.56% | 3.3 s | 33.2 / 44% |
| `min-width` | beyond | 125,049,310 | joint LP | 3.58% | 107 ms | 11.2 / 56% |
<!-- /generated -->

*Tables generated from `data/derived/manifests/regime-mill-bound.json` by `scripts/docs_tables.py`.*
