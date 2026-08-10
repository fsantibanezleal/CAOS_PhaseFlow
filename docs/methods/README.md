# The method ladder

Every rung PhaseFlow runs, what it claims, and what it is not allowed to claim. Each has its own deep
page. The rule that governs all of them: **the bound is never produced by a heuristic**, and every
schedule is shown with its gap to that bound.

| # | method | rung | page | claim |
|---|---|---|---|---|
| 1 | `bench-by-bench` | classical | [01](01_classical.md) | a schedule, deliberately bad: the floor |
| 2 | `nested-shells` | classical | [01](01_classical.md) | the industry's four-step chain |
| 3 | `toposort-greedy` (GrTS) | classical | [01](01_classical.md) | the obvious baseline |
| 4 | `toposort-gershon` (GeTS) | classical | [01](01_classical.md) | successor-cone weights, Gershon 1987a |
| 5 | `sliding-window` | classical | [01](01_classical.md) | Cullenbine et al. 2011, the industrial baseline |
| - | **critical multiplier** | bound | [02](02_the_bound.md) | the exact CPIT LP relaxation, no LP solver |
| - | **Bienstock-Zuckerberg** | bound | [02](02_the_bound.md) | the JOINT bound over all resources |
| 6 | `toposort-expected` (ExTS) | sota | [03](03_rounding.md) | seeded by the LP expected extraction times |
| 7 | `exts-two-resource` | sota | [03](03_rounding.md) | Algorithm 4: one relaxation per resource |
| 8 | `shift-local-search` | sota | [04](04_local_search.md) | pull value forward, push cost back |
| 9 | `cpitD-local-search` | sota | [04](04_local_search.md) | the EXACT restricted re-solve |
| 10 | `learned-expected-time` | learned | [05](05_learned.md) | ExTS quality with NO LP solve |
| 11 | `destination-toposort` | beyond | [06](06_destinations.md) | PCPSP: the cutoff becomes an OUTPUT |
| 12 | `min-width` | beyond | [07](07_operability.md) | operability, and what it costs |
| - | ensemble | beyond | [08](08_uncertainty.md) | what geological uncertainty does to a plan |

## Two pages that are not about a rung

- [09, reading the results](09_ladder_results.md): which comparisons are legitimate and which are not.
- [10, when the surrogate fails](10_when_the_surrogate_fails.md): the learned rung's worst case is
  0.344, and this is the measured answer to WHEN, including the archetype hypothesis the held-out
  deposits refuted.

## What "rung" means

- **classical**: what a planner or a textbook would do, including the four-step nested-shells chain
  that commercial packages implement. Present so the SOTA rungs have something to beat, and because a
  method comparison with no floor in it is a marketing chart.
- **sota**: the published state of the art for this problem, implemented rather than cited.
- **learned**: a model that ACCELERATES something exact, scored against the exact quantity on data it
  never saw. It never certifies anything.
- **beyond**: a different problem or a different question. These are **not NPV-comparable** with the
  rest, and the app says so rather than putting them in the same ranking.

## The one rule

Two schedules can only be compared through the same bound. That is why the bound section is separate
from the method list: it is not a rung, it is the yardstick, and where two bounds exist the tighter one
is used for every gap on the case and the difference between them is reported.
