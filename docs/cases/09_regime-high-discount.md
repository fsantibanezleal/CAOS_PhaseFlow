# 09 · Impatient capital (`regime-high-discount`)

**Family:** `regime`. **Role in the argument**, as the case source states it:

> Twenty percent per period. High grade is pulled forward hard and the early pit is a visibly different shape from the ten percent case on the same deposit.

## The instance

- **deposit**: seeded `porphyry` twin, 24 x 24 x 12 = 6,912 blocks, seed 7, 45-degree slopes
- **data**: synthetic, license-free; the per-block schedule ships to the browser
- **scenario**: 8 periods at a rate of 0.20, first period undiscounted; capacity mining 0.80, processing 0.50 of the pit's per-period resource

## Impatient capital

The small porphyry under twenty percent per period over eight periods (mining 0.80, plant 0.50). High grade
is pulled forward hard and the early pit is a visibly different shape from the ten percent case on the same
deposit (`twin-porphyry-s`): compare the period-one geometry of the two in the app. Discounting this steep
also makes a plan's value depend on precise timing, which is where a rank-only surrogate has least to give.

## Bounds

<!-- generated:case-bounds:regime-high-discount -->
| bound | value | time | detail |
| --- | ---: | ---: | --- |
| ultimate pit (UPIT, exact, undiscounted) | 473,615,066 |  | 4,621 of 6,912 blocks; no time, no capacity |
| Algorithm 4 (min over single-resource LPs) | 184,634,637 | 18.2 s | 215 maximum closures |
| joint LP (Bienstock-Zuckerberg) | 184,634,637 | 8.1 s | 14 iterations on 55,296 nodes, 479,584 edges; slack of Algorithm 4: 0.0000% |
| PCPSP LP (HiGHS, destinations free) | 256,466,648 | 7.0 min | 534,896 rows, status optimal |
| used for every CPIT gap on this case | joint LP |  |  |
<!-- /generated -->

## Every method on this case

The best plan is marked; destination plans are measured against the PCPSP LP, every other plan against the
CPIT bound the case uses. Coherence is the mean over periods of the connected components and the share of
the largest one.

<!-- generated:case:regime-high-discount -->
| method | family | NPV | measured against | gap | time | components / largest share (mean per period) |
| --- | --- | ---: | --- | ---: | ---: | --- |
| `bench-by-bench` | Reference methods | 71,675,727 | joint LP | 61.18% | 82 ms | 6.6 / 87% |
| `nested-shells` | Reference methods | 88,065,737 | joint LP | 52.30% | 77 ms | 2.9 / 90% |
| `toposort-greedy` | Reference methods | 80,712,545 | joint LP | 56.29% | 77 ms | 10.9 / 87% |
| `toposort-gershon` | Reference methods | 141,804,902 | joint LP | 23.20% | 272 ms | 50.4 / 41% |
| `toposort-expected` | Published methods | 168,506,775 | joint LP | 8.73% | 18.3 s | 10.5 / 78% |
| `exts-two-resource` | Published methods | 168,506,775 | joint LP | 8.73% | 18.3 s | 10.5 / 78% |
| `shift-local-search` | Published methods | 169,738,336 | joint LP | 8.07% | 54 ms | 6.8 / 85% |
| `sliding-window` **(best)** | Published methods | 181,093,517 | joint LP | 1.92% | 15.2 min | 11.4 / 73% |
| `cpitD-local-search` | Published methods | 169,795,008 | joint LP | 8.04% | 706 ms | 7.1 / 86% |
| `learned-expected-time` | Learned methods | 164,747,237 | joint LP | 10.77% | 114 ms | 68.8 / 40% |
| `destination-toposort` | Additional analyses | 225,093,470 | PCPSP LP | 12.23% | 24.2 s | 17.2 / 66% |
| `destination-sliding-window` | Additional analyses | 250,128,042 | PCPSP LP | 2.47% | 28.2 min | 26.6 / 69% |
| `destination-local-search` | Additional analyses | 251,355,084 | PCPSP LP | 1.99% | 2.3 s | 27.4 / 68% |
| `min-width` | Additional analyses | 181,077,136 | joint LP | 1.93% | 173 ms | 10.6 / 73% |
<!-- /generated -->

*Tables generated from `data/derived/manifests/regime-high-discount.json` by `scripts/docs_tables.py`.*
