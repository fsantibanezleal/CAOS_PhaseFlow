# Local search: two neighbourhoods, and the difference between them

A rounding heuristic produces a feasible plan. Local search is what closes the last few percent, and
which neighbourhood you use decides how much of it closes.

## `shift-local-search`: pull value forward, push cost back

Two moves, both strictly improving under discounting and both feasible by construction:

1. **Pull forward.** A block with positive value moves to an earlier period when all of its
   predecessors are already at or before that period and the capacity is there.
2. **Push back.** A block with negative value moves to a later period when none of its successors are
   scheduled at or before that period and the capacity is there.

This is the shift family used across the mine-scheduling metaheuristic literature (Lamghari and
Dimitrakopoulos, [doi:10.1016/j.ejor.2012.05.029](https://doi.org/10.1016/j.ejor.2012.05.029); Sari and
Kumral 2016). It is cheap, it never loses value, and it needs no solver.

**What it cannot do**: move a block and its precedence cone TOGETHER. A block that would be worth
pulling forward but whose predecessors are not yet clear is invisible to it, and that is precisely
where the remaining value sits.

## `cpitD-local-search`: the exact restricted re-solve

Chicoisne et al. 2012, section 3.3. Fix every block outside a small set `D` at its incumbent period and
re-solve the restricted problem **exactly** as a mixed-integer program. Three neighbourhood
constructions, chosen with equal probability:

1. a random scheduled block `a`, plus a connected subset of its predecessors `B-(a)`,
2. the same with successors `B+(a)`,
3. a random scheduled block `a` at period `t`, plus only blocks scheduled in `t-1`, `t`, `t+1`.

The restricted model carries the real constraints. Blocks outside `D` are not merely ignored: their
capacity consumption is subtracted from each period's limit, a fixed predecessor imposes a floor on
when a free block may be mined, and a fixed successor imposes a ceiling. Getting either of those
directions wrong produces a plan that mines a block before the rock above it and still passes an
objective check.

Every accepted move is a proven improvement of the restricted problem, so the objective is monotone.
The authors measured their heuristic at 0.937 to 0.986 of the LP bound before local search and 0.955 to
0.997 after an hour of it.

## Measured here

On the published `newman1.cpit`, with the joint Bienstock-Zuckerberg bound as the yardstick:

| method | gap |
|---|---|
| `toposort-expected` | 2.54% |
| `shift-local-search` | 2.50% |
| `cpitD-local-search` | **2.49%** |
| published best known | 1.26% |

The exact neighbourhood wins, and the margin is small on this instance because `newman1` is nearly
closed to begin with. The remaining distance to the published best known is the honest cost of running
sixteen restricted re-solves rather than a long metaheuristic campaign, and it is on the Benchmark page
rather than in a footnote.

## Requirements

The exact neighbourhood needs a MILP solver and lives behind the `oreblocks[milp]` extra (scipy, which
brings HiGHS). Where it is unavailable the pipeline records `NOT RUN` with the reason and shows the
shift plan in its place, rather than silently presenting a weaker method under the stronger name.
