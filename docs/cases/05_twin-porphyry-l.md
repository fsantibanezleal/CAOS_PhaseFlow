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
| Algorithm 4 (min over single-resource LPs) | 326,536,185 | 93.1 s | 266 maximum closures |
| joint LP (Bienstock-Zuckerberg) | 326,536,185 | 38.0 s | 16 iterations on 109,760 nodes, 972,904 edges; slack of Algorithm 4: 0.0000% |
| PCPSP LP (HiGHS, destinations free) | 442,009,363 | 98.6 min | 1,082,684 rows, status optimal |
| used for every CPIT gap on this case | joint LP |  |  |
<!-- /generated -->

## Every method on this case

The best plan is marked; destination plans are measured against the PCPSP LP, every other plan against the
CPIT bound the case uses. Coherence is the mean over periods of the connected components and the share of
the largest one.

<!-- generated:case:twin-porphyry-l -->
| method | family | NPV | measured against | gap | time | components / largest share (mean per period) |
| --- | --- | ---: | --- | ---: | ---: | --- |
| `bench-by-bench` | Reference methods | 130,457,207 | joint LP | 60.05% | 153 ms | 10.3 / 75% |
| `nested-shells` | Reference methods | 178,634,641 | joint LP | 45.29% | 143 ms | 7.9 / 68% |
| `toposort-greedy` | Reference methods | 168,760,440 | joint LP | 48.32% | 145 ms | 14.2 / 76% |
| `toposort-gershon` | Reference methods | 248,020,634 | joint LP | 24.05% | 571 ms | 64.3 / 32% |
| `toposort-expected` | Published methods | 302,668,911 | joint LP | 7.31% | 93.3 s | 9.8 / 71% |
| `exts-two-resource` | Published methods | 312,945,550 | joint LP | 4.16% | 93.4 s | 14.0 / 60% |
| `shift-local-search` | Published methods | 314,247,298 | joint LP | 3.76% | 108 ms | 10.8 / 72% |
| `sliding-window` **(best)** | Published methods | 321,380,848 | joint LP | 1.58% | 2.29 h | 13.5 / 55% |
| `cpitD-local-search` | Published methods | 314,277,465 | joint LP | 3.75% | 555 ms | 11.2 / 72% |
| `learned-expected-time` | Learned methods | 294,357,113 | joint LP | 9.85% | 228 ms | 78.7 / 37% |
| `destination-toposort` | Additional analyses | 391,770,770 | PCPSP LP | 11.37% | 112.8 s | 41.3 / 57% |
| `destination-sliding-window` | Additional analyses | 434,585,393 | PCPSP LP | 1.68% | 2.11 h | 41.2 / 53% |
| `destination-local-search` | Additional analyses | 435,284,800 | PCPSP LP | 1.52% | 2.5 s | 41.5 / 53% |
| `min-width` | Additional analyses | 321,364,047 | joint LP | 1.58% | 400 ms | 12.7 / 55% |
| `frontier-policy` | Additional analyses | 277,296,868 | joint LP | 15.08% | 2.3 min | 52.5 / 32% |
<!-- /generated -->

*Tables generated from `data/derived/manifests/twin-porphyry-l.json` by `scripts/docs_tables.py`.*
