# 06 · Local search: shifts and exact neighbourhoods

A rounding produces a feasible plan. Local search is what closes the remaining distance, and which
neighbourhood is searched decides how much closes.

## 1. `shift-local-search`: pull value forward, push cost back

Two moves, both strictly improving under discounting and both feasible by construction:

1. **pull forward**: a block with positive value moves to an earlier period when all its predecessors
   are already at or before that period and the capacity is there;
2. **push back**: a block with negative value moves to a later period when none of its successors is
   scheduled at or before that period and the capacity is there.

Acceptance is on the full schedule, so the objective is monotone:

$$
\text{accept}\iff \mathrm{NPV}(\tau')>\mathrm{NPV}(\tau)\,\bigl(1+10^{-9}\bigr).
$$

This is the shift family of the mine-scheduling metaheuristic literature (Lamghari and Dimitrakopoulos,
[doi:10.1016/j.ejor.2012.05.029](https://doi.org/10.1016/j.ejor.2012.05.029)). It is cheap, it never
loses value and it needs no solver (up to twelve passes). **What it cannot do** is move a block
together with its cone: a block worth pulling forward whose predecessors are not yet clear is invisible
to it, and that is where the remaining value usually is.

## 2. `cpitD-local-search`: the exact restricted re-solve

Chicoisne et al. ([doi:10.1287/opre.1120.1050](https://doi.org/10.1287/opre.1120.1050)) section 3.3,
an enhanced version of Amaya et al. (2009). Fix every block outside a small set $D$ at its incumbent
period and re-solve the restricted problem **exactly** as a mixed-integer program. Three neighbourhood
constructions, chosen with equal probability:

1. a random scheduled block $a$ plus a connected subset of its predecessors $\mathcal B^{-}(a)$;
2. the same with successors $\mathcal B^{+}(a)$;
3. a random scheduled block $a$ at period $t$, plus only blocks scheduled in $t-1$, $t$, $t+1$.

![A neighbourhood re-solved exactly with the rest of the plan fixed](../assets/local-search.svg)

The restricted model carries the real constraints of the whole plan:

$$
\max\sum_{i\in D}\sum_t p_i\,(d_t-d_{t+1})\,y_{it}\quad\text{s.t.}\quad
\sum_{i\in D}a_{ri}\,(y_{it}-y_{i,t-1})\le c_{rt}-\sum_{b\notin D}a_{rb}\,[\tau_b=t],
$$

$$
y_{it}=0\ \ \forall t<\tau_a\ \ (a\notin D\ \text{a predecessor}),\qquad y_{i,\tau_c}=1\ \ (c\notin D\ \text{a successor}).
$$

The capacity used by fixed blocks is subtracted from each period; a fixed predecessor imposes a floor on
when a free block may be mined, and a fixed successor a ceiling. Getting either direction wrong produces
a plan that mines a block before the rock above it and still passes an objective check. Every accepted
re-solve is a proven improvement of the restricted problem, so the objective is again monotone. The
authors measured their heuristic at 0.937 to 0.986 of the bound before local search and 0.955 to 0.997
after an hour of it (CPLEX, neighbourhoods up to 3,250 blocks).

**No wall-clock limit.** Each re-solve stops on a relative MIP gap of 1e-4, never on time. Until
oreblocks 0.4.1 it stopped on eight seconds of CPU, and the product's headline gap was not reproducible
from its inputs and seed, because how much of each re-solve completed depended on the machine's load. A
relative gap is a property of the problem and stops in the same place everywhere; a test asserts two
runs agree block for block.

| setting | value |
|---|---|
| neighbourhood size | up to 180 free blocks |
| rounds | 16, or 10 above 8,000 blocks |
| seed | 11 |
| solver | HiGHS MILP, relative gap 1e-4, no time limit |
| start | the shift plan, which starts from the best Algorithm 4 plan |

The same neighbourhoods with binary destinations are the destination search, OPBSP-[D]
([09](09_destinations.md)).

## 3. Measured on every case

The two local searches beside the rounding they start from. The exact search never loses to the shift
plan it starts from (a test in `frontend/test/parity.test.ts`); where both sit far behind the sliding
window, the remaining distance is the look-ahead neither neighbourhood has ([05](05_sliding-window.md)).

<!-- generated:methods:exts-two-resource,shift-local-search,cpitD-local-search -->
| case | bound | `exts-two-resource` | `shift-local-search` | `cpitD-local-search` | best plan of the case |
| --- | --- | ---: | ---: | ---: | --- |
| [`newman1-published`](../use-cases/01_newman1-published.md) | joint LP | 2.54% | 2.50% | 2.49% | `sliding-window` 1.37% |
| [`zuck-small-declared`](../use-cases/02_zuck-small-declared.md) | joint LP | 21.23% | 17.28% | 16.91% | `sliding-window` 2.81% |
| [`kd-declared`](../use-cases/03_kd-declared.md) | Algorithm 4 | 16.89% | 15.29% | 15.02% | `sliding-window` 6.23% |
| [`twin-porphyry-s`](../use-cases/04_twin-porphyry-s.md) | joint LP | 4.62% | 4.26% | 4.22% | `sliding-window` 1.34% |
| [`twin-porphyry-l`](../use-cases/05_twin-porphyry-l.md) | joint LP | 4.16% | 3.76% | 3.75% | `sliding-window` 1.57% |
| [`twin-core-halo`](../use-cases/06_twin-core-halo.md) | Algorithm 4 | 10.29% | 8.52% | 8.41% | `sliding-window` 3.18% |
| [`twin-layered`](../use-cases/07_twin-layered.md) | Algorithm 4 | 3.55% | 3.55% | 3.55% | `cpitD-local-search` 3.55% |
| [`twin-vein`](../use-cases/08_twin-vein.md) | Algorithm 4 | 1.54% | 0.64% | 0.62% | `sliding-window` 0.17% |
| [`regime-high-discount`](../use-cases/09_regime-high-discount.md) | joint LP | 8.73% | 8.07% | 8.04% | `sliding-window` 2.35% |
| [`regime-mill-bound`](../use-cases/10_regime-mill-bound.md) | joint LP | 14.94% | 13.79% | 13.63% | `sliding-window` 3.57% |
| [`regime-mining-bound`](../use-cases/11_regime-mining-bound.md) | Algorithm 4 | 7.48% | 7.48% | 7.46% | `sliding-window` 2.87% |
| [`ctrl-abundant`](../use-cases/12_ctrl-abundant.md) | Algorithm 4 | 0.33% | 0.26% | 0.26% | `cpitD-local-search` 0.26% |
| [`ctrl-degenerate`](../use-cases/13_ctrl-degenerate.md) | Algorithm 4 | not run | 0.00% | 0.00% | `toposort-greedy` 0.00% |
| **median** |  | **6.05%** | **4.26%** | **4.22%** |  |
<!-- /generated -->

## Requirements and limits

The exact neighbourhood needs a MILP solver and lives behind the `oreblocks[milp]` extra (scipy, which
brings HiGHS). Where it is unavailable the pipeline records `NOT RUN` with the reason and shows the shift
plan in its place, rather than presenting a weaker method under the stronger name. A local optimum of a
neighbourhood is not an optimum of the problem, and the neighbourhoods and rounds here are smaller than
the published hour of CPLEX.

## Where it lives

`oreblocks.improve_schedule` (shifts), `oreblocks.exact_local_search` (C-PIT[D]); the browser engine
runs the shift search on every live re-solve (`frontend/src/engine/cpit.ts`).
