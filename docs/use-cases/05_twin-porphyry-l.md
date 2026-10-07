# 05 · Porphyry twin, large (`twin-porphyry-l`)

**Family:** `deposit`. The case the app opens on. **Role in the argument**, as the case source states it:

> The hero case. Big enough that the pit wall reads as benches rather than voxels, and license-free, so its whole per-block schedule ships to the browser.

## The instance

- **deposit**: seeded `porphyry` twin, 28 x 28 x 14 = 10,976 blocks, seed 7, 45-degree slopes
- **data**: synthetic, license-free; the per-block schedule ships to the browser
- **scenario**: 10 periods at a rate of 0.10, first period undiscounted; capacity mining 0.72, processing 0.45 of the pit's per-period resource

## The default case

The largest porphyry (28 x 28 x 14 = 10,976 blocks, seed 7) under ten periods at ten percent, mining 0.72
and plant 0.45 of the pit's per-period resource. It opens the app: big enough that the pit wall reads as
benches rather than voxels, and license-free, so its whole schedule replays and re-solves in the browser.

## What to read in it

The same ladder as the small porphyry at a size where the expensive rungs show their cost (the PCPSP LP
and the two sliding windows dominate the bake). Its time-expanded graph (109,760 nodes) fits the joint
bound's budget, so its CPIT gaps are measured against the joint LP.

## Bounds

<!-- generated:case-bounds:twin-porphyry-l -->
| bound | value | time | detail |
| --- | ---: | ---: | --- |
| ultimate pit (UPIT, exact, undiscounted) | 774,543,970 |  | 7,402 of 10,976 blocks; no time, no capacity |
| Algorithm 4 (min over single-resource LPs) | 326,536,185 | 73.6 s | 266 maximum closures |
| joint LP (Bienstock-Zuckerberg) | 326,536,185 | 33.0 s | 16 iterations on 109,760 nodes, 972,904 edges; slack of Algorithm 4: 0.0000% |
| PCPSP LP (HiGHS, destinations free) | 442,009,363 | 2.65 h | 1,082,684 rows, status optimal |
| used for every CPIT gap on this case | joint LP |  |  |
<!-- /generated -->

## Every method on this case

The best plan is marked; destination plans are measured against the PCPSP LP, every other plan against the
CPIT bound the case uses. Coherence is the mean over periods of the connected components and the share of
the largest one.

<!-- generated:case:twin-porphyry-l -->
| method | rung | NPV | measured against | gap | time | components / largest share (mean per period) |
| --- | --- | ---: | --- | ---: | ---: | --- |
| `bench-by-bench` | classical | 130,457,207 | joint LP | 60.05% | 219 ms | 10.3 / 75% |
| `nested-shells` | classical | 178,634,641 | joint LP | 45.29% | 188 ms | 7.9 / 68% |
| `toposort-greedy` | classical | 168,760,440 | joint LP | 48.32% | 169 ms | 14.2 / 76% |
| `toposort-gershon` | classical | 248,020,634 | joint LP | 24.05% | 707 ms | 64.3 / 32% |
| `toposort-expected` | sota | 302,668,911 | joint LP | 7.31% | 73.8 s | 9.8 / 71% |
| `exts-two-resource` | sota | 312,945,550 | joint LP | 4.16% | 74.1 s | 14.0 / 60% |
| `shift-local-search` | sota | 314,247,298 | joint LP | 3.76% | 104 ms | 10.8 / 72% |
| `sliding-window` **(best)** | sota | 321,394,155 | joint LP | 1.57% | 2.60 h | 16.8 / 51% |
| `cpitD-local-search` | sota | 314,277,465 | joint LP | 3.75% | 603 ms | 11.2 / 72% |
| `learned-expected-time` | learned | 290,266,121 | joint LP | 11.11% | 289 ms | 61.9 / 42% |
| `destination-toposort` | beyond | 391,770,770 | PCPSP LP | 11.37% | 2.1 min | 41.3 / 57% |
| `destination-sliding-window` | beyond | 435,005,094 | PCPSP LP | 1.58% | 34.5 min | 40.8 / 50% |
| `destination-local-search` | beyond | 435,739,549 | PCPSP LP | 1.42% | 1.3 s | 40.8 / 50% |
| `min-width` | beyond | 321,363,929 | joint LP | 1.58% | 245 ms | 15.7 / 51% |
<!-- /generated -->

*Tables generated from `data/derived/manifests/twin-porphyry-l.json` by `scripts/docs_tables.py`.*
