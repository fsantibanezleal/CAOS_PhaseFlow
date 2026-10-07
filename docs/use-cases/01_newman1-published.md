# 01 · Newman1, as published (`newman1-published`)

**Family:** `published`. **Role in the argument**, as the case source states it:

> The trust anchor. A published MineLib instance solved with its own periods, its own discount rate and its own two capacities. The 2018 comparison is a PCPSP result, while an external AMPL notebook reports a separate CPIT integer optimum.

## The instance

- **deposit**: MineLib `newman1`, 1,060 blocks; gold-copper test mine; the smallest MineLib instance; its .cpit and .pcpsp model files are the only ones reachable from a script (AMPL mirror)
- **published UPIT optimum**: 26,086,899
- **data**: real; academic download, not redistributed (aggregate results only)
- **scenario**: 6 periods at a rate of 0.08, first period undiscounted; capacity mining 2,000,000 per period, processing 1,100,000 per period

## The published scenario, solved as published

The MineLib `newman1.cpit` file declares six periods, an eight percent rate with the first period
undiscounted, and two capacities per period: 2,000,000 tonnes moved and 1,100,000 tonnes processed. They
are loose in aggregate and bind in the early periods, where discounting wants everything now. The
[AMPL MineLib notebook](https://colab.ampl.com/notebooks/minelib-in-ampl-and-amplpy.html) parses the same
files and reports 1,060 blocks, 3,922 precedence arcs, six periods, two resources and rate 0.08, with
binary extraction, cumulative slope precedence and a discount factor of `(1 + 0.08)^(-t)` for
`t = 0..5`: the same structure as this case.

## Three external references, kept apart

| reference | value | what it is |
|---|---:|---|
| MineLib results page, CPIT LP bound | 24,486,184 | a published CPIT LP upper bound, rounded to the unit (read 2026-10-02) |
| AMPL notebook, Gurobi 13.0.0, MIP gap 1e-9 | 24,176,864.82 | an external CPIT integer optimum with an equal MIP bound |
| Jelvez, Morales and Nancel-Penard 2018, Table 3 | 24,486,549 | the PCPSP LP upper bound (destinations chosen) |
| same, Table 4 | 24,176,861 | the best-known PCPSP/OPBSP feasible plan, 1.26 percent below its LP |

The MineLib results page still lists an older 23,483,671 (4.1 percent) feasible value while describing its
table as current; the 2018 paper's Table 1 lists a 1.26 percent CPIT best-known gap without an objective
value. That source conflict is why every comparison here names its source and date and none silently
takes the largest number. The external CPIT optimum exceeds the 2018 PCPSP feasible value by 3.82 units;
a feasible value is a lower bound on its own optimum, not an upper bound, so this does not violate
problem inclusion. The AMPL log is an external certificate for its model; PhaseFlow has not reproduced its
branch-and-bound tree or compared every parsed coefficient byte for byte.

## What the gap is made of, on the one case where it can be split

![Four value levels for newman1](../assets/the-two-bounds.svg)

In value units, at the precision of the sources (PhaseFlow's Algorithm 4 bound 24,487,410.43, joint LP
24,486,184.09, sliding-window plan 24,149,869.40):

```text
Algorithm 4 bound - PhaseFlow plan
  = (Algorithm 4 bound - joint LP bound)          1,226.34   bound slack
  + (joint LP bound - external integer optimum) 309,319.27   integrality
  + (external integer optimum - PhaseFlow plan)  26,995.42   method loss
```

The plan is 1.37 percent below its joint LP bound but only about 0.11 percent below the external integer
optimum: the 1.26 percent LP integrality gap is most of the LP-referenced gap. Percentages use their own
denominators; add value differences, not displayed percentages. No other case has a verified integer
optimum, so no other case's gap can be split this way.

## Destinations on newman1

The two published LP bounds differ by 365 units in 24.5 million, so the destination freedom can add almost
nothing here, and the destination rungs show exactly that: the re-cut and the destination search end within
a few thousand units of the best CPIT plan. Against the 2018 PCPSP result the comparison is like for like
(both PCPSP plans, both scored against the PCPSP LP), with the caveat that their method and ours differ.

## Lane and licence

Replay: MineLib grants an academic download and not redistribution, so per-block data never enters the
repository or the browser, and the app shows numbers and charts for this case but no 3D replay.

## Bounds

<!-- generated:case-bounds:newman1-published -->
| bound | value | time | detail |
| --- | ---: | ---: | --- |
| ultimate pit (UPIT, exact, undiscounted) | 26,086,899 |  | 1,059 of 1,060 blocks; no time, no capacity |
| Algorithm 4 (min over single-resource LPs) | 24,487,410 | 2.1 s | 79 maximum closures |
| joint LP (Bienstock-Zuckerberg) | 24,486,184 | 2.7 s | 9 iterations on 6,360 nodes, 28,832 edges; slack of Algorithm 4: 0.0050% |
| PCPSP LP (HiGHS, destinations free) | 24,486,549 | 3.2 s | 35,204 rows, status optimal |
| used for every CPIT gap on this case | joint LP |  |  |
<!-- /generated -->

## Every method on this case

The best plan is marked; destination plans are measured against the PCPSP LP, every other plan against the
CPIT bound the case uses. Coherence is the mean over periods of the connected components and the share of
the largest one.

<!-- generated:case:newman1-published -->
| method | rung | NPV | measured against | gap | time | components / largest share (mean per period) |
| --- | --- | ---: | --- | ---: | ---: | --- |
| `bench-by-bench` | classical | 22,915,557 | joint LP | 6.41% | 13 ms | 6.0 / 92% |
| `nested-shells` | classical | 23,839,631 | joint LP | 2.64% | 11 ms | 4.8 / 93% |
| `toposort-greedy` | classical | 23,552,842 | joint LP | 3.81% | 13 ms | 6.8 / 88% |
| `toposort-gershon` | classical | 23,474,084 | joint LP | 4.13% | 25 ms | 12.2 / 75% |
| `toposort-expected` | sota | 23,864,349 | joint LP | 2.54% | 2.2 s | 10.0 / 84% |
| `exts-two-resource` | sota | 23,864,349 | joint LP | 2.54% | 2.2 s | 10.0 / 84% |
| `shift-local-search` | sota | 23,873,589 | joint LP | 2.50% | 11 ms | 9.8 / 83% |
| `sliding-window` **(best)** | sota | 24,149,869 | joint LP | 1.37% | 15.8 s | 11.7 / 89% |
| `cpitD-local-search` | sota | 23,875,538 | joint LP | 2.49% | 1.2 s | 9.2 / 83% |
| `learned-expected-time` | learned | 23,894,774 | joint LP | 2.42% | 23 ms | 8.7 / 91% |
| `destination-toposort` | beyond | 23,864,349 | PCPSP LP | 2.54% | 2.6 s | 10.0 / 84% |
| `destination-sliding-window` | beyond | 24,149,869 | PCPSP LP | 1.38% | 19.3 s | 11.7 / 89% |
| `destination-local-search` | beyond | 24,151,564 | PCPSP LP | 1.37% | 2.6 s | 11.0 / 89% |
| `min-width` | beyond | 24,052,701 | joint LP | 1.77% | 71 ms | 7.3 / 90% |
<!-- /generated -->

*Tables generated from `data/derived/manifests/newman1-published.json` by `scripts/docs_tables.py`.*
