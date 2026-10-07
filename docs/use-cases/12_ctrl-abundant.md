# 12 · Control: capacity barely binds (`ctrl-abundant`)

**Family:** `control`. **Role in the argument**, as the case source states it:

> Loose-capacity diagnostic. The best CPIT schedule approaches the certified bound, but classical schedules still lose value because period timing and slope precedence matter at a positive discount rate. The zero-rate, single-period ctrl-degenerate case is the exact collapse control; this one is not.

## The instance

- **deposit**: seeded `porphyry` twin, 24 x 24 x 12 = 6,912 blocks, seed 7, 45-degree slopes
- **data**: synthetic, license-free; the per-block schedule ships to the browser
- **scenario**: 8 periods at a rate of 0.10, first period undiscounted; capacity mining 2.50, processing 2.00 of the pit's per-period resource

## A loose-capacity diagnostic, not a collapse

The small porphyry with mining capacity 2.50 and plant capacity 2.00 of the pit's per-period resource, over
eight periods at ten percent. Capacity barely binds, but discounting and slope precedence still decide when
each block is mined, so the methods still differ: the best plan approaches the bound while the classical
plans lose value to timing. Loose capacity alone does not make the choice of extraction period irrelevant.
The exact collapse control is `ctrl-degenerate`.

## Bounds

<!-- generated:case-bounds:ctrl-abundant -->
| bound | value | time | detail |
| --- | ---: | ---: | --- |
| ultimate pit (UPIT, exact, undiscounted) | 473,615,066 |  | 4,621 of 6,912 blocks; no time, no capacity |
| Algorithm 4 (min over single-resource LPs) | 428,750,527 | 19.3 s | 138 maximum closures |
| joint LP (Bienstock-Zuckerberg) | 428,750,584 | 11.5 s | 13 iterations on 55,296 nodes, 479,584 edges; slack of Algorithm 4: none (BZ ended 0.13 ppm above, inside its tolerance) |
| PCPSP LP (HiGHS, destinations free) | 438,824,759 | 99.9 s | 534,896 rows, status optimal |
| used for every CPIT gap on this case | Algorithm 4 |  |  |
<!-- /generated -->

## Every method on this case

The best plan is marked; destination plans are measured against the PCPSP LP, every other plan against the
CPIT bound the case uses. Coherence is the mean over periods of the connected components and the share of
the largest one.

<!-- generated:case:ctrl-abundant -->
| method | rung | NPV | measured against | gap | time | components / largest share (mean per period) |
| --- | --- | ---: | --- | ---: | ---: | --- |
| `bench-by-bench` | classical | 398,634,010 | Algorithm 4 | 7.02% | 163 ms | 1.4 / 100% |
| `nested-shells` | classical | 404,889,616 | Algorithm 4 | 5.57% | 159 ms | 8.0 / 87% |
| `toposort-greedy` | classical | 401,470,358 | Algorithm 4 | 6.36% | 163 ms | 2.2 / 87% |
| `toposort-gershon` | classical | 419,591,568 | Algorithm 4 | 2.14% | 545 ms | 1.8 / 90% |
| `toposort-expected` | sota | 427,325,801 | Algorithm 4 | 0.33% | 19.5 s | 3.2 / 88% |
| `exts-two-resource` | sota | 427,325,801 | Algorithm 4 | 0.33% | 19.8 s | 3.2 / 88% |
| `shift-local-search` | sota | 427,637,346 | Algorithm 4 | 0.26% | 195 ms | 1.4 / 89% |
| `sliding-window` | sota | 425,008,862 | Algorithm 4 | 0.87% | 8.1 min | 2.0 / 83% |
| `cpitD-local-search` **(best)** | sota | 427,644,503 | Algorithm 4 | 0.26% | 1.1 s | 1.4 / 89% |
| `learned-expected-time` | learned | 424,178,034 | Algorithm 4 | 1.07% | 355 ms | 2.0 / 90% |
| `destination-toposort` | beyond | 437,075,858 | PCPSP LP | 0.40% | 18.8 s | 19.0 / 85% |
| `destination-sliding-window` | beyond | 437,839,664 | PCPSP LP | 0.22% | 22.9 min | 26.8 / 79% |
| `destination-local-search` | beyond | 437,965,112 | PCPSP LP | 0.20% | 6.9 s | 28.2 / 79% |
| `min-width` | beyond | 427,631,216 | Algorithm 4 | 0.26% | 510 ms | 1.4 / 89% |
<!-- /generated -->

*Tables generated from `data/derived/manifests/ctrl-abundant.json` by `scripts/docs_tables.py`.*
