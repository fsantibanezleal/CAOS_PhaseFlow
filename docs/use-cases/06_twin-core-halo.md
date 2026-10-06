# 06 · Core and halo twin (`twin-core-halo`)

**Family:** `deposit`. **Role in the argument**, as the case source states it:

> Concentric grade. Nested pits look sensible on this deposit and the schedule still does something different, which is the point of solving rather than nesting. With the vein it is one of the two archetypes on which the learned rung is measured to fail most: a thin rich core makes the order of extraction delicate.

## The instance

- **deposit**: seeded `core_halo` twin, 30 x 30 x 16 = 14,400 blocks, seed 17, 45-degree slopes
- **data**: synthetic, license-free; the per-block schedule ships to the browser
- **scenario**: 10 periods at a rate of 0.10, first period undiscounted; capacity mining 0.70, processing 0.45 of the pit's per-period resource

## Concentric grade

A thin rich core inside a low-grade halo (30 x 30 x 16 = 14,400 blocks, seed 17), ten periods at ten percent,
mining 0.70 and plant 0.45. Nested pits look sensible on this deposit and the schedule still does something
different, which is the point of solving rather than nesting.

## What to read in it

- **The learned rung's hard case.** A thin core makes the order of extraction delicate, and it is one of the
  two archetypes where the surrogate is measured to fail most ([08](../methodologies/08_when-the-surrogate-fails.md));
  the measured share of the exact ExTS plan is in the case table.
- **Greedy against Gershon.** The greedy order chases the core and pays for the halo late; Gershon's set sum
  sees what the core unlocks.
- **The joint bound does not run.** The time-expanded graph is 144,000 nodes and 1,291,200 edges, above the
  certification budget, so the case keeps Algorithm 4 and its gaps include whatever slack that bound has.
- **The PCPSP bound is the dual.** On the same size, its PCPSP LP (1,435,220 rows) is above the HiGHS row budget, so the destination plans are measured against the LP's Lagrangian dual by maximum closures on the same graph ([02](../methodologies/02_the-bound.md), section 5.2): the LP value up to the rounding slack the table records.

## Bounds

<!-- generated:case-bounds:twin-core-halo -->
| bound | value | time | detail |
| --- | ---: | ---: | --- |
| ultimate pit (UPIT, exact, undiscounted) | 210,279,048 |  | 8,051 of 14,400 blocks; no time, no capacity |
| Algorithm 4 (min over single-resource LPs) | 97,374,026 | 65.0 s | 261 maximum closures |
| joint LP (Bienstock-Zuckerberg) | not computed | - | time-expanded graph is 144,000 nodes and 1,291,200 edges, above the 130,000/1,400,000 budget. Pricing would be fast, but the bound is only worth reporting once it has been CERTIFIED by one exact solve, and that solve is the pure-Python max-flow. Algorithm 4's certified but looser bound is used |
| PCPSP LP by its Lagrangian dual (destinations free) | 131,860,392 | 40.9 s | 1,435,220 rows, above the HiGHS budget; 74 closure iterations, converged; rounding slack 48,918 |
| used for every CPIT gap on this case | Algorithm 4 |  |  |
<!-- /generated -->

## Every method on this case

The best plan is marked; destination plans are measured against the PCPSP LP, every other plan against the
CPIT bound the case uses. Coherence is the mean over periods of the connected components and the share of
the largest one.

<!-- generated:case:twin-core-halo -->
| method | rung | NPV | measured against | gap | time | components / largest share (mean per period) |
| --- | --- | ---: | --- | ---: | ---: | --- |
| `bench-by-bench` | classical | -3,749,944 | Algorithm 4 | 103.85% | 180 ms | 4.6 / 81% |
| `nested-shells` | classical | 32,082,725 | Algorithm 4 | 67.05% | 180 ms | 10.4 / 85% |
| `toposort-greedy` | classical | 19,478,724 | Algorithm 4 | 80.00% | 158 ms | 8.9 / 84% |
| `toposort-gershon` | classical | 72,931,999 | Algorithm 4 | 25.10% | 900 ms | 79.1 / 34% |
| `toposort-expected` | sota | 87,353,943 | Algorithm 4 | 10.29% | 65.1 s | 15.4 / 50% |
| `exts-two-resource` | sota | 87,353,943 | Algorithm 4 | 10.29% | 65.3 s | 15.4 / 50% |
| `shift-local-search` | sota | 89,079,079 | Algorithm 4 | 8.52% | 118 ms | 9.6 / 71% |
| `sliding-window` **(best)** | sota | 94,279,051 | Algorithm 4 | 3.18% | 74.4 min | 14.3 / 46% |
| `cpitD-local-search` | sota | 89,185,799 | Algorithm 4 | 8.41% | 368 ms | 10.2 / 71% |
| `learned-expected-time` | learned | 70,548,003 | Algorithm 4 | 27.55% | 257 ms | 72.7 / 42% |
| `destination-toposort` | beyond | 110,093,185 | PCPSP LP | 16.51% | 54.9 s | 15.0 / 51% |
| `destination-sliding-window` | beyond | 121,471,873 | PCPSP LP | 7.88% | 6.30 h | 19.6 / 55% |
| `destination-local-search` | beyond | 121,612,412 | PCPSP LP | 7.77% | 766 ms | 19.4 / 55% |
| `min-width` | beyond | 94,276,667 | Algorithm 4 | 3.18% | 193 ms | 14.1 / 46% |
<!-- /generated -->

*Tables generated from `data/derived/manifests/twin-core-halo.json` by `scripts/docs_tables.py`.*
