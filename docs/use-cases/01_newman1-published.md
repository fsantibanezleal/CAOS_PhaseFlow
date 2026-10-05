# Newman1: LP bound, integer optimum and schedule quality

This page separates three different kinds of evidence for the **published six-period
CPIT scenario**. It is a source record for the [Benchmark page](../../frontend/src/pages/Benchmark.tsx),
not a claim that PhaseFlow ran an exact integer solver.

## The comparable scenario

The [AMPL MineLib notebook](https://colab.ampl.com/notebooks/minelib-in-ampl-and-amplpy.html)
parses `newman1.cpit` and `newman1.prec`, reporting 1,060 blocks, 3,922 precedence arcs,
six periods, two resource constraints and discount rate 0.08. Its CPIT model uses
binary extraction decisions, one extraction at most per block, period capacities,
cumulative slope precedence and a discount factor of `(1 + 0.08)^(-t)` for `t = 0..5`.
These match the declared structure of PhaseFlow's `newman1-published` case.

The 2018 [Jelvez, Morales and Nancel-Penard paper](https://www.delphoslab.cl/Publicaciones/2018/Jelvez_et_al_MPES2018.pdf)
reports `24,176,861` in **Table 4 for PCPSP/OPBSP**, `1.26%` below its
`24,486,549` PCPSP LP bound in Table 3. Its Table 1 separately lists a
`1.26%` CPIT best-known gap without an objective value. PhaseFlow keeps the
Table 4 result as a dated, explicitly **cross-problem** comparison, not a CPIT
objective or CPIT gap. The [MineLib results page](https://minelib.org/v1/Results.xhtml)
still shows the older `23,483,671` and `4.1%` for Newman1 while describing its
table as current. This source conflict is why every comparison names its source
and date. PhaseFlow does not silently choose the largest number from those pages.

## The later external exact solve

The AMPL notebook prints a Gurobi 13.0.0 MIP log with tolerance `1e-9`, an
integer objective of `24,176,864.82482`, the same MIP best bound, and an
optimal termination. The difference from the 2018 feasible value is `3.82`
value units. The notebook's log is an **external** certificate for its model;
PhaseFlow has not independently reproduced its branch-and-bound tree or
compared every parsed input coefficient byte for byte. The notebook's
formulation and reported input dimensions make it a useful independent
reference, with that limit stated. The external CPIT optimum happens to exceed
the 2018 PCPSP **feasible** value by `3.82` units; a feasible value is not an
upper bound, so this ordering is possible.

## What the gaps measure

The committed PhaseFlow `newman1-published` trace records:

| value | amount | status |
|---|---:|---|
| Algorithm 4 upper bound | `24,487,410.43` | PhaseFlow certified resource relaxation |
| Joint CPIT LP upper bound | `24,486,184.09` | PhaseFlow certified LP relaxation |
| MineLib CPIT LP upper bound | `24,486,184` | MineLib results page, rounded to the unit, read 2026-10-02 |
| Integer optimum | `24,176,864.82` | External AMPL/Gurobi log |
| `sliding-window` schedule | `24,149,869.40` | PhaseFlow feasible CPIT result |

![Four value levels for Newman1](../assets/the-two-bounds.svg)

In value units, the decomposition is exact at the precision of the sources:

```text
Algorithm 4 bound - PhaseFlow schedule
  = (Algorithm 4 bound - joint LP bound)          1,226.34
  + (joint LP bound - external integer optimum) 309,319.27
  + (external integer optimum - PhaseFlow plan)  26,995.42
```

The PhaseFlow schedule is `1.3735%` below its joint LP bound, but only
`0.1117%` below the external integer optimum. The `1.2632%` LP integrality
gap makes up most of the LP-referenced gap. Percentages use their own
denominators, so add **value differences**, not displayed percentages.
For other cases, no integer optimum was verified in this pass; their LP-to-plan
distance cannot be partitioned into integrality and feasible-method loss.

## Reproduce the PhaseFlow side

The source artifact is `data/derived/newman1-published/trace.json`, indexed by
`data/derived/manifests/newman1-published.json`. The latter records the
engine pins, scenario, method scoreboard and artifact byte count. Run
`python scripts/check_artifacts.py` and `python scripts/check_readme_numbers.py`
to check the committed evidence. A new full bake also needs the separately
downloaded MineLib input under `data/raw/minelib/`; that input is not
redistributed in this repository.
