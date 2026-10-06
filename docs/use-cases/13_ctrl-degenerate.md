# 13 · Control: rate zero, capacity unlimited (`ctrl-degenerate`)

**Family:** `control`. **Role in the argument**, as the case source states it:

> The degenerate case. CPIT collapses to the ultimate pit: the mined set must equal the exact pit block for block and the bound must equal its value. A failure here is a bug, not a result.

## The instance

- **deposit**: seeded `porphyry` twin, 24 x 24 x 12 = 6,912 blocks, seed 7, 45-degree slopes
- **data**: synthetic, license-free; the per-block schedule ships to the browser
- **scenario**: 1 period at a rate of 0.00, first period undiscounted; capacity mining 50.00 of the pit's per-period resource

## The collapse control

One period, zero discount, a single resource at fifty times the pit's need. CPIT collapses to the ultimate
pit: the mined set must equal the exact pit block for block, the bound must equal its value, and every
method's gap must be zero. A failure here is a bug, not a result. The ensemble is not run (a single period
has no schedule to stress), and the joint bound is not needed (one resource: the critical multiplier
algorithm is already exact).

## Bounds

<!-- generated:case-bounds:ctrl-degenerate -->
| bound | value | time | detail |
| --- | ---: | ---: | --- |
| ultimate pit (UPIT, exact, undiscounted) | 473,615,066 |  | 4,621 of 6,912 blocks; no time, no capacity |
| Algorithm 4 (min over single-resource LPs) | 473,615,066 | 98 ms | 1 maximum closures |
| joint LP (Bienstock-Zuckerberg) | not computed | - | one resource: there is nothing to join, and Algorithm 4 on a single resource is the critical multiplier algorithm, which solves the LP relaxation exactly |
| PCPSP LP (HiGHS, destinations free) | 473,615,066 | 236 ms | 60,813 rows, status optimal |
| used for every CPIT gap on this case | Algorithm 4 |  |  |
<!-- /generated -->

## Every method on this case

The best plan is marked; destination plans are measured against the PCPSP LP, every other plan against the
CPIT bound the case uses. Coherence is the mean over periods of the connected components and the share of
the largest one.

<!-- generated:case:ctrl-degenerate -->
| method | rung | NPV | measured against | gap | time | components / largest share (mean per period) |
| --- | --- | ---: | --- | ---: | ---: | --- |
| `bench-by-bench` | classical | 473,615,066 | Algorithm 4 | 0.00% | 88 ms | 1.0 / 100% |
| `nested-shells` | classical | 473,615,066 | Algorithm 4 | 0.00% | 78 ms | 1.0 / 100% |
| `toposort-greedy` **(best)** | classical | 473,615,066 | Algorithm 4 | 0.00% | 74 ms | 1.0 / 100% |
| `toposort-gershon` | classical | 473,615,066 | Algorithm 4 | 0.00% | 218 ms | 1.0 / 100% |
| `toposort-expected` | sota | 473,615,066 | Algorithm 4 | 0.00% | 172 ms | 1.0 / 100% |
| `shift-local-search` | sota | 473,615,066 | Algorithm 4 | 0.00% | 34 ms | 1.0 / 100% |
| `sliding-window` | sota | 473,615,066 | Algorithm 4 | 0.00% | 1.7 s | 1.0 / 100% |
| `cpitD-local-search` | sota | 473,615,066 | Algorithm 4 | 0.00% | 271 ms | 1.0 / 100% |
| `learned-expected-time` | learned | 473,615,066 | Algorithm 4 | 0.00% | 151 ms | 1.0 / 100% |
| `destination-toposort` | beyond | 473,615,066 | PCPSP LP | 0.00% | 311 ms | 1.0 / 100% |
| `destination-sliding-window` | beyond | 473,615,066 | PCPSP LP | 0.00% | 2.0 s | 1.0 / 100% |
| `destination-local-search` | beyond | 473,615,066 | PCPSP LP | 0.00% | 927 ms | 1.0 / 100% |
| `min-width` | beyond | 473,615,066 | Algorithm 4 | 0.00% | 357 ms | 1.0 / 100% |
<!-- /generated -->

*Tables generated from `data/derived/manifests/ctrl-degenerate.json` by `scripts/docs_tables.py`.*
