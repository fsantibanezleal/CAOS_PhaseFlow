# From a bound to a plan: the TopoSort family

The bound is not only the yardstick. It is the **seed** of the plan, and that is the single most
reusable idea in this literature.

## The bridge

From the fractional LP optimum, read each block's expected extraction time:

```
E_b = sum_{t=1..T} t (x*_bt - x*_b,t-1)  +  (T + 1) (1 - x*_bT)
```

A block never extracted contributes `T + 1`. Use `w_b = -E_b` as the weight of a topological ordering
and walk it, giving each block the earliest period that is at least its predecessors' periods and whose
remaining resources fit it. Feasibility is by construction.

Chicoisne et al. 2012, section 3.2, Algorithms 2 and 3
([doi:10.1287/opre.1120.1050](https://doi.org/10.1287/opre.1120.1050)).

## Why it matters this much

| weight | AsiaMine, R = 2 | source |
|---|---|---|
| greedy `w = p_b` | 0.138 of the LP bound | the obvious baseline |
| Gershon successor cone | 0.840 | Gershon 1987a |
| expected time `w = -E_b` | **0.972** | Chicoisne et al. 2012 |

Same scheduling code, three weights, and the difference between a useless plan and a near-optimal one.
That table is the entire argument for computing the bound before scheduling: the bound is not overhead
on the way to a number, it is the input to the good answer.

## `exts-two-resource`: Algorithm 4

With two resource constraints the critical multiplier algorithm cannot run directly. Algorithm 4 of the
same paper runs it once per resource, computes expected times from each fractional solution, schedules
from each, keeps the best feasible plan, and takes the smaller of the two relaxed objectives as the
bound.

Both halves are honest: each single-resource relaxation is a relaxation of the two-resource problem, so
each objective is a valid upper bound, and each schedule is feasible for the full problem because the
scheduling walk respects both capacities regardless of which relaxation seeded it.

## An implementation detail that is a real bug elsewhere

The topological order must prefer **high** weight early. The published Algorithm 2 is printed with an
`argmax` and a parenthetical saying "min-weight node", which contradict each other; with `w = -E_b`,
taking the minimum puts the LATEST blocks first and produces a schedule that is almost exactly
backwards. The check that catches it is that expected-time weights must beat greedy weights, which is
a test in this repository rather than a comment.
