# 04 · Porphyry twin, small (`twin-porphyry-s`)

**Family:** `deposit`. **Role in the argument**, as the case source states it:

> The smaller porphyry: the browser re-solves its bound and three plans in about two seconds and draws the learned plan at once, so it is the case to drag the controls on.

## The instance

- **deposit**: seeded `porphyry` twin, 24 x 24 x 12 = 6,912 blocks, seed 7, 45-degree slopes
- **data**: synthetic, license-free; the per-block schedule ships to the browser
- **scenario**: 8 periods at a rate of 0.10, first period undiscounted; capacity mining 0.80, processing 0.50 of the pit's per-period resource

## The case to drag the controls on

A seeded porphyry (24 x 24 x 12 blocks, seed 7, 45-degree slopes) under eight periods at ten percent, with
mining capacity 0.80 and plant capacity 0.50 of the pit's per-period resource. It is license-free, so the
whole per-block schedule ships to the browser, and small enough that the browser re-solves its bound and
three plans in about two seconds after drawing the learned plan at once. It is the case the parity tests
hold the browser engine to.

## What to read in it

- The step from greedy and Gershon to the expected-time rungs, then the sliding window's look-ahead on top:
  the clearest ladder in the matrix.
- The destination rungs at full size: the plant takes half the pit's ore tonnage, so which ore it gets is
  the decision, and the re-cut on the PCPSP LP is where that value shows (compare the destination plans with
  the best CPIT plan in the table).
- The joint LP equals Algorithm 4 here (one resource determines the LP), so the CPIT gaps are pure plan
  distance plus integrality.

## Bounds

<!-- generated:case-bounds:twin-porphyry-s -->
| bound | value | time | detail |
| --- | ---: | ---: | --- |
| ultimate pit (UPIT, exact, undiscounted) | 473,615,066 |  | 4,621 of 6,912 blocks; no time, no capacity |
| Algorithm 4 (min over single-resource LPs) | 234,230,542 | 25.5 s | 215 maximum closures |
| joint LP (Bienstock-Zuckerberg) | 234,230,542 | 7.7 s | 14 iterations on 55,296 nodes, 479,584 edges; slack of Algorithm 4: 0.0000% |
| PCPSP LP (HiGHS, destinations free) | 316,475,407 | 17.9 min | 534,896 rows, status optimal |
| used for every CPIT gap on this case | joint LP |  |  |
<!-- /generated -->

## Every method on this case

The best plan is marked; destination plans are measured against the PCPSP LP, every other plan against the
CPIT bound the case uses. Coherence is the mean over periods of the connected components and the share of
the largest one.

<!-- generated:case:twin-porphyry-s -->
| method | rung | NPV | measured against | gap | time | components / largest share (mean per period) |
| --- | --- | ---: | --- | ---: | ---: | --- |
| `bench-by-bench` | classical | 107,531,529 | joint LP | 54.09% | 105 ms | 6.6 / 87% |
| `nested-shells` | classical | 130,810,346 | joint LP | 44.15% | 97 ms | 2.9 / 90% |
| `toposort-greedy` | classical | 117,596,778 | joint LP | 49.79% | 95 ms | 10.9 / 87% |
| `toposort-gershon` | classical | 187,236,535 | joint LP | 20.06% | 348 ms | 50.4 / 41% |
| `toposort-expected` | sota | 223,413,685 | joint LP | 4.62% | 25.6 s | 10.5 / 78% |
| `exts-two-resource` | sota | 223,413,685 | joint LP | 4.62% | 25.7 s | 10.5 / 78% |
| `shift-local-search` | sota | 224,241,882 | joint LP | 4.26% | 67 ms | 6.8 / 85% |
| `sliding-window` **(best)** | sota | 231,083,498 | joint LP | 1.34% | 29.7 min | 16.5 / 70% |
| `cpitD-local-search` | sota | 224,340,746 | joint LP | 4.22% | 1.0 s | 7.1 / 86% |
| `learned-expected-time` | learned | 215,693,991 | joint LP | 7.91% | 177 ms | 67.8 / 44% |
| `destination-toposort` | beyond | 285,163,568 | PCPSP LP | 9.89% | 61.7 s | 27.1 / 65% |
| `destination-sliding-window` | beyond | 312,574,802 | PCPSP LP | 1.23% | 106.1 min | 27.9 / 73% |
| `destination-local-search` | beyond | 313,204,288 | PCPSP LP | 1.03% | 2.5 s | 28.1 / 73% |
| `min-width` | beyond | 231,067,281 | joint LP | 1.35% | 210 ms | 15.9 / 70% |
<!-- /generated -->

*Tables generated from `data/derived/manifests/twin-porphyry-s.json` by `scripts/docs_tables.py`.*
