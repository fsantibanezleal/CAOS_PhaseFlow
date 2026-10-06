# 05 · The sliding time window

Cullenbine, Wood and Newman, *A sliding time window heuristic for open pit mine block sequencing*,
Optimization Letters 5:365-377, 2011,
[doi:10.1007/s11590-011-0306-2](https://doi.org/10.1007/s11590-011-0306-2). Enforce every constraint
exactly inside a short window of periods, treat the rest of the horizon as an aggregated tail, fix only
the first period of the answer, slide one period forward, repeat. It is the heuristic industrial
platforms run: Blom, Pearce and Cote ([arXiv:2403.18213](https://arxiv.org/abs/2403.18213)) describe
Rio Tinto's planning system seeding its large neighbourhood search with it, on models of 3.4 million
variables (Oyu Tolgoi) and 6.6 million (the Pilbara).

What makes it a look-ahead is that the window is solved **jointly**: a block worth taking in period one
only because of what it unlocks in period three is visible to the solver. In this product it is the
best CPIT method on most of the case matrix (table below), which is why it is labelled `sota`.

![Three periods solved jointly with an aggregated tail; one fixed; slide](../assets/sliding-window.svg)

## 1. One slide

Each slide is a mixed-integer program in cumulative variables, solved with HiGHS. With $y_{ij}=1$ when
candidate $i$ is mined by the end of slot $j$, the slots being the window's periods plus one tail slot,

$$
\max\ \sum_{i}\sum_{j}p_i\,\bigl(\delta_{j}-\delta_{j+1}\bigr)\,y_{ij}\quad\text{s.t.}\quad
y_{ij}\le y_{i,j+1},\qquad y_{ij}\le y_{aj}\ \ (a\ \text{a predecessor of}\ i),\qquad
\sum_i a_{ri}\bigl(y_{ij}-y_{i,j-1}\bigr)\le c^{\text{win}}_{rj},
$$

where $\delta_j$ is the discount factor of slot $j$. Precedence and monotonicity are rows of two
entries; blocks fixed on earlier slides impose floors. Written with per-slot assignment variables the
matrix grew quadratically in the window and one slide took ninety seconds; the cumulative form is what
makes it run.

**The tail is optimistic by design.** Its capacity is the total of the remaining periods and its
discount factor that of its first period, which over-values tail production: the standard optimistic
relaxation for this heuristic, which keeps the tail from dominating while still telling the window a
horizon exists. The rung's notes say so in every trace.

## 2. The candidate set: the relaxation's own guess

The published method solves the full model per window. Without a commercial solver the window works on
a candidate set, and the choice of that set is the approximation this product makes:

$$
\mathcal C=\Bigl\{\text{the undecided blocks ordered by } E_b,\ \text{taken from the front until}\ \sum_{i\in\mathcal C}a_{0i}\ge 1.6\sum_{t\in\text{window}}c_{0t}\Bigr\}.
$$

Because the relaxation is closed in every period, $E_a\le E_b$ on every arc $(a,b)$, so that prefix is
**closed under precedence**; a test asserts the inequality, and the closure is still completed
explicitly so ties cannot block a candidate. Blocks outside the set are not forbidden; they are decided
on a later slide.

## 3. Three versions, and what each one taught

1. **A greedy wearing the name** (until oreblocks 0.5.0). Each window was scheduled with the same greedy
   TopoSort as another rung, then every placement past the frozen prefix was undone. Since a placement
   consumes only its own period's capacity, nothing inside the window could influence the prefix:
   windows of 1, 2, 3, 5, 8 and T gave bit-identical schedules on three instances. The rung carried
   Cullenbine, Wood and Newman's name for a look-ahead it did not perform.
2. **A real window that refused to run** (0.5.0). Solved jointly, with a candidate set sized to cover
   the window AND the whole remaining horizon, ordered by value density. On real-size cases that asked
   for thousands of blocks above the cap, and the method refused (it raises rather than return a
   starved plan: a flat cap of 150 blocks once cut an objective from 39.7 M to 10.4 M and still looked
   like a schedule). It ran on one case of thirteen; its `relaxation` argument was accepted and never
   read.
3. **LP-guided and sized by the window** (0.6.0). The candidate rule above. It runs on every case and is
   where the look-ahead pays: on `twin-porphyry-s` it moved the best gap from 4.22 to 1.34 percent, on
   `zuck-small-declared` from 16.91 to 2.81.

An earlier bug in the window's bookkeeping is also worth recording: it re-planned blocks that had
already consumed capacity in an earlier window, double-booked the fleet, and collapsed the objective to
a third while every feasibility check passed, because each window was internally consistent. Only the
frozen prefix is a decision; everything after it must be released before the next slide.

## 4. Settings and cost

| setting | value |
|---|---|
| window | 3 periods, 1 fixed per slide, plus one tail slot |
| solver | HiGHS MILP, relative gap 3 percent, no wall-clock limit (a time limit would make the bake depend on the machine) |
| candidates | LP-ordered closed prefix, 1.6 window capacities, at most 6,000 blocks |
| cost | from seconds on `newman1` to about two hours on the largest twins, on one core |

The same window, candidate rule and gap schedule the **re-cut** destination instance
(`destination-sliding-window`, see [09](09_destinations.md)).

## 5. Measured on every case

The sliding window against the rounding and local-search rungs it competes with:

<!-- generated:methods:toposort-expected,shift-local-search,cpitD-local-search,sliding-window -->
| case | bound | `toposort-expected` | `shift-local-search` | `cpitD-local-search` | `sliding-window` | best plan of the case |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| [`newman1-published`](../use-cases/01_newman1-published.md) | joint LP | 2.54% | 2.50% | 2.49% | 1.37% | `sliding-window` 1.37% |
| [`zuck-small-declared`](../use-cases/02_zuck-small-declared.md) | joint LP | 21.35% | 17.28% | 16.91% | 2.81% | `sliding-window` 2.81% |
| [`kd-declared`](../use-cases/03_kd-declared.md) | Algorithm 4 | 16.89% | 15.29% | 15.02% | 6.23% | `sliding-window` 6.23% |
| [`twin-porphyry-s`](../use-cases/04_twin-porphyry-s.md) | joint LP | 4.62% | 4.26% | 4.22% | 1.34% | `sliding-window` 1.34% |
| [`twin-porphyry-l`](../use-cases/05_twin-porphyry-l.md) | joint LP | 7.31% | 3.76% | 3.75% | 1.57% | `sliding-window` 1.57% |
| [`twin-core-halo`](../use-cases/06_twin-core-halo.md) | Algorithm 4 | 10.29% | 8.52% | 8.41% | 3.18% | `sliding-window` 3.18% |
| [`twin-layered`](../use-cases/07_twin-layered.md) | Algorithm 4 | 3.55% | 3.55% | 3.55% | 6.38% | `cpitD-local-search` 3.55% |
| [`twin-vein`](../use-cases/08_twin-vein.md) | Algorithm 4 | 1.54% | 0.64% | 0.62% | 0.17% | `sliding-window` 0.17% |
| [`regime-high-discount`](../use-cases/09_regime-high-discount.md) | joint LP | 8.73% | 8.07% | 8.04% | 2.35% | `sliding-window` 2.35% |
| [`regime-mill-bound`](../use-cases/10_regime-mill-bound.md) | joint LP | 14.94% | 13.79% | 13.63% | 3.57% | `sliding-window` 3.57% |
| [`regime-mining-bound`](../use-cases/11_regime-mining-bound.md) | Algorithm 4 | 7.53% | 7.48% | 7.46% | 2.87% | `sliding-window` 2.87% |
| [`ctrl-abundant`](../use-cases/12_ctrl-abundant.md) | Algorithm 4 | 0.33% | 0.26% | 0.26% | 0.87% | `cpitD-local-search` 0.26% |
| [`ctrl-degenerate`](../use-cases/13_ctrl-degenerate.md) | Algorithm 4 | 0.00% | 0.00% | 0.00% | 0.00% | `toposort-greedy` 0.00% |
| **median** |  | **7.31%** | **4.26%** | **4.22%** | **2.35%** |  |
<!-- /generated -->

## Limits

- The tail is optimistic; the window never sees the true capacity of later periods.
- The candidate set approximates the published full-model window.
- It is the most expensive CPIT rung by two orders of magnitude, and the price is visible in the
  runtime table of [12](12_reading-the-results.md).

## Where it lives

`oreblocks.sliding_window_schedule` (engine, `oreblocks[milp]`); `SW_CAND_MAX`, `SW_COVER` in
`data-pipeline/pipeline/stages/solve.py`.
