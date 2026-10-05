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
<!-- /generated -->

## Where it lives

`oreblocks.toposort_order`, `oreblocks.toposort_schedule(weight=...)` (engine);
`data-pipeline/pipeline/stages/solve.py` (the rungs); `frontend/src/engine/cpit.ts` (the browser's
greedy, Gershon and ExTS walks, the Gershon bitsets included).
