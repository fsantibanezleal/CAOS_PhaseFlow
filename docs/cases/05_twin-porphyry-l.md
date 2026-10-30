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

The same ladder as the small porphyry at a size where the expensive methods show their cost (the PCPSP LP
and the two sliding windows dominate the bake). Its time-expanded graph (109,760 nodes) fits the joint
bound's budget, so its CPIT gaps are measured against the joint LP.

## Bounds

<!-- generated:case-bounds:twin-porphyry-l -->
| bound | value | time | detail |
| --- | ---: | ---: | --- |
| ultimate pit (UPIT, exact, undiscounted) | 774,543,970 |  | 7,402 of 10,976 blocks; no time, no capacity |
| Algorithm 4 (min over single-resource LPs) | 326,536,185 | 45.9 s | 266 maximum closures |
| joint LP (Bienstock-Zuckerberg) | 326,536,185 | 30.6 s | 16 iterations on 109,760 nodes, 972,904 edges; slack of Algorithm 4: 0.0000% |
| PCPSP LP (HiGHS, destinations free) | 442,009,363 | 71.4 min | 1,082,684 rows, status optimal |
| used for every CPIT gap on this case | joint LP |  |  |
<!-- /generated -->

## Every method on this case

The best plan is marked; destination plans are measured against the PCPSP LP, every other plan against the
CPIT bound the case uses. Coherence is the mean over periods of the connected components and the share of
the largest one.

<!-- generated:case:twin-porphyry-l -->
| method | family | NPV | measured against | gap | time | components / largest share (mean per period) |
| --- | --- | ---: | --- | ---: | ---: | --- |
| `bench-by-bench` | Reference methods | 130,457,207 | joint LP | 60.05% | 134 ms | 10.3 / 75% |
| `nested-shells` | Reference methods | 178,634,641 | joint LP | 45.29% | 138 ms | 7.9 / 68% |
| `toposort-greedy` | Reference methods | 168,760,440 | joint LP | 48.32% | 127 ms | 14.2 / 76% |
| `toposort-gershon` | Reference methods | 248,020,634 | joint LP | 24.05% | 489 ms | 64.3 / 32% |
| `toposort-expected` | Published methods | 302,668,911 | joint LP | 7.31% | 46.0 s | 9.8 / 71% |
| `exts-two-resource` | Published methods | 312,945,550 | joint LP | 4.16% | 46.2 s | 14.0 / 60% |
| `shift-local-search` | Published methods | 314,247,298 | joint LP | 3.76% | 87 ms | 10.8 / 72% |
| `sliding-window` **(best)** | Published methods | 321,380,848 | joint LP | 1.58% | 119.9 min | 13.5 / 55% |
| `cpitD-local-search` | Published methods | 314,277,465 | joint LP | 3.75% | 462 ms | 11.2 / 72% |
| `learned-expected-time` | Learned methods | 290,266,121 | joint LP | 11.11% | 181 ms | 61.9 / 42% |
| `destination-toposort` | Additional analyses | 391,770,770 | PCPSP LP | 11.37% | 54.4 s | 41.3 / 57% |
| `destination-sliding-window` | Additional analyses | 434,585,393 | PCPSP LP | 1.68% | 86.4 min | 41.2 / 53% |
| `destination-local-search` | Additional analyses | 435,284,800 | PCPSP LP | 1.52% | 1.5 s | 41.5 / 53% |
| `min-width` | Additional analyses | 321,364,047 | joint LP | 1.58% | 293 ms | 12.7 / 55% |
<!-- /generated -->

*Tables generated from `data/derived/manifests/twin-porphyry-l.json` by `scripts/docs_tables.py`.*
