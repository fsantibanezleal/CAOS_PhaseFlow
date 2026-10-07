# 03 · From a bound to a plan: the TopoSort family

The bound is not only the yardstick. It is the **seed** of the plan, and that is the single most
reusable idea in this literature (Chicoisne, Espinoza, Goycoolea, Moreno and Rubio,
[doi:10.1287/opre.1120.1050](https://doi.org/10.1287/opre.1120.1050), section 3.2, Algorithms 2 and 3).

## 1. The walk

A **feasible extraction sequence** is a topological order of the precedence graph: every block after
all the blocks it needs. Given one, a schedule follows by walking it and giving each block the earliest
period that is not before any of its predecessors and whose remaining capacities fit it. Feasibility is
by construction, so the whole quality of the method sits in the ORDER, and the order is produced by a
weight: among the blocks whose predecessors are all placed, take the one with the highest weight next.
The walk is restricted to the ultimate pit, because a schedule never gains by mining outside it. Ties
are broken by block id, so the order is deterministic.

![The walk: order by weight, then the earliest feasible period](../assets/toposort-walk.svg)

**An implementation detail that is a real bug elsewhere.** The published Algorithm 2 is printed with an
`argmax` and a parenthetical saying "min-weight node", which contradict each other; with $w=-E_b$,
taking the minimum puts the LATEST blocks first and produces a schedule that is almost exactly
backwards. The check that catches it is that expected-time weights must beat greedy weights, which is a
test in this repository rather than a comment.

## 2. Three published weights

$$
w^{\mathrm{Gr}}_b=p_b,\qquad w^{\mathrm{Ge}}_b=\sum_{a\in\mathcal B^{+}(b)}p_a,\qquad w^{\mathrm{Ex}}_b=-E_b,
$$

with $\mathcal B^{+}(b)$ the set of every block that has $b$ as a predecessor (everything $b$ unlocks)
and

$$
E_b=\sum_{t=1}^{T}t\,\bigl(x^{*}_{bt}-x^{*}_{b,t-1}\bigr)+(T+1)\bigl(1-x^{*}_{bT}\bigr)
$$

the expected extraction time read from the fractional LP optimum (a block never mined counts $T+1$).

| weight | name | origin | rung here |
|---|---|---|---|
| block value | GrTS | the obvious baseline | `toposort-greedy` (classical) |
| value of the successor cone | GeTS | Gershon 1987a, [doi:10.1007/BF01553529](https://doi.org/10.1007/BF01553529) | `toposort-gershon` (classical) |
| minus the LP expected time | ExTS | Chicoisne et al. 2012 | `toposort-expected` (sota) |

The published spread between them is the argument for computing the bound before scheduling
(Chicoisne et al., Tables 3 and 4, fractions of the LP bound):

| instance | GrTS | GeTS | ExTS |
|---|---:|---:|---:|
| AsiaMine, R = 2 | 0.138 | 0.840 | 0.972 |
| Andina, R = 2 | 0.487 | 0.509 | 0.953 |
| AmericaMine, R = 2 | 0.340 | 0.823 | 0.937 |
| Marvin, R = 1 | 0.856 | 0.867 | 0.957 |

Same scheduling code, three weights, and the difference between a useless plan and a near-optimal one.

## 3. Gershon's weight is a SET sum

Computed by adding each successor's already accumulated weight, a deep block reachable along $k$
precedence paths is counted $k$ times, and on a slope cone with five or nine arcs per block the number
of paths grows geometrically with depth: the weight then measures path multiplicity, not value. Until
oreblocks 0.6.0 the engine did exactly that, and GeTS lost to greedy on seven of twelve cases here. The
successor set of every block is now built as a bitset in reverse topological order, so each block counts
once, and a test compares it with the definition computed the slow way. The browser engine had the same
defect (and also added the block's own value) and was fixed the same way.

Even exact, Gershon's weight has a blind spot the measurements show: it rewards what a block unlocks
and ignores what it costs to reach it. On a narrow vein every block along the strike has the vein in
its successor set, so the order opens the whole strike length at once and pays for its waste early.
The oreblocks 0.6.0 record measured it on 30 x 30 x 16 twins against the Algorithm 4 bound: GeTS beats
greedy on porphyry (0.810 against 0.556) and core-halo (0.779 against 0.136), and loses on the vein
(0.174 against 0.762).

## 4. `exts-two-resource`: the plan side of Algorithm 4

With two resources the critical multiplier algorithm runs once per resource ([02](02_the-bound.md)).
Algorithm 4 computes expected times from each fractional solution, schedules from each, and keeps the
best feasible plan. Both halves are honest: each single-resource objective bounds the two-resource
problem, and each schedule is feasible for the full problem because the walk respects BOTH capacities
regardless of which relaxation seeded it. `toposort-expected` uses the tightest relaxation only, so the
difference between the two rungs is exactly what Algorithm 4's second relaxation adds; on most cases it
adds nothing, and the table below shows where it does.

## 5. Measured on every case

The gap of each TopoSort weighting against the bound the case uses (the joint LP where it ran,
otherwise Algorithm 4), beside the best plan of the case.

<!-- generated:methods:toposort-greedy,toposort-gershon,toposort-expected,exts-two-resource -->
| case | bound | `toposort-greedy` | `toposort-gershon` | `toposort-expected` | `exts-two-resource` | best plan of the case |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| [`newman1-published`](../use-cases/01_newman1-published.md) | joint LP | 3.81% | 4.13% | 2.54% | 2.54% | `sliding-window` 1.37% |
| [`zuck-small-declared`](../use-cases/02_zuck-small-declared.md) | joint LP | 46.28% | 32.71% | 21.35% | 21.23% | `sliding-window` 2.81% |
| [`kd-declared`](../use-cases/03_kd-declared.md) | Algorithm 4 | 31.92% | 51.70% | 16.89% | 16.89% | `sliding-window` 6.23% |
| [`twin-porphyry-s`](../use-cases/04_twin-porphyry-s.md) | joint LP | 49.79% | 20.06% | 4.62% | 4.62% | `sliding-window` 1.34% |
| [`twin-porphyry-l`](../use-cases/05_twin-porphyry-l.md) | joint LP | 48.32% | 24.05% | 7.31% | 4.16% | `sliding-window` 1.57% |
| [`twin-core-halo`](../use-cases/06_twin-core-halo.md) | Algorithm 4 | 80.00% | 25.10% | 10.29% | 10.29% | `sliding-window` 3.18% |
| [`twin-layered`](../use-cases/07_twin-layered.md) | Algorithm 4 | 17.01% | 19.36% | 3.55% | 3.55% | `cpitD-local-search` 3.55% |
| [`twin-vein`](../use-cases/08_twin-vein.md) | Algorithm 4 | 36.55% | 92.14% | 1.54% | 1.54% | `sliding-window` 0.17% |
| [`regime-high-discount`](../use-cases/09_regime-high-discount.md) | joint LP | 56.29% | 23.20% | 8.73% | 8.73% | `sliding-window` 2.35% |
| [`regime-mill-bound`](../use-cases/10_regime-mill-bound.md) | joint LP | 71.02% | 29.65% | 14.94% | 14.94% | `sliding-window` 3.57% |
| [`regime-mining-bound`](../use-cases/11_regime-mining-bound.md) | Algorithm 4 | 56.97% | 27.71% | 7.53% | 7.48% | `sliding-window` 2.87% |
| [`ctrl-abundant`](../use-cases/12_ctrl-abundant.md) | Algorithm 4 | 6.36% | 2.14% | 0.33% | 0.33% | `cpitD-local-search` 0.26% |
| [`ctrl-degenerate`](../use-cases/13_ctrl-degenerate.md) | Algorithm 4 | 0.00% | 0.00% | 0.00% | not run | `toposort-greedy` 0.00% |
| **median** |  | **46.28%** | **24.05%** | **7.31%** | **6.05%** |  |
<!-- /generated -->

## Where it lives

`oreblocks.toposort_order`, `oreblocks.toposort_schedule(weight=...)` (engine);
`data-pipeline/pipeline/stages/solve.py` (the rungs); `frontend/src/engine/cpit.ts` (the browser's
greedy, Gershon and ExTS walks, the Gershon bitsets included).
