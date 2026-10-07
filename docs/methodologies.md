# Methodologies: the problems, the bounds and the method ladder

Every method PhaseFlow runs, what it claims, what it is not allowed to claim, and what it measured on
every case. The rule that governs all of them: **the bound is never produced by a heuristic**, and every
plan is shown with its gap to the bound of its own problem.

![The ladder: bounds, rungs, and which bound scores which plan](assets/the-ladder.svg)

## Read in order

| # | page | what it settles |
|---|---|---|
| 01 | [the formulations](methodologies/01_formulations.md) | UPIT, CPIT, PCPSP and OPBSP stated exactly; inclusion; complexity; what the LP gives |
| 02 | [the certified bound](methodologies/02_the-bound.md) | the critical multiplier algorithm, Algorithm 4, Bienstock-Zuckerberg, the PCPSP LP; every bound of every case |
| 03 | [TopoSort](methodologies/03_toposort.md) | the walk, the three weights, Gershon's set sum, Algorithm 4's plan side |
| 04 | [the classical floor](methodologies/04_classical-floor.md) | bench by bench, nested shells, the gap problem |
| 05 | [the sliding time window](methodologies/05_sliding-window.md) | a MILP per window, the LP-guided candidate set, the best CPIT rung |
| 06 | [local search](methodologies/06_local-search.md) | shifts and the exact C-PIT[D] re-solve |
| 07 | [the learned lane](methodologies/07_learned.md) | the expected-time and bound surrogates, the instant plan in the browser |
| 08 | [when the surrogate fails](methodologies/08_when-the-surrogate-fails.md) | where, measured on three disjoint seed sets |
| 09 | [destinations](methodologies/09_destinations.md) | the cutoff as an output; the re-cut on the PCPSP LP |
| 10 | [operability](methodologies/10_operability.md) | coherence per period, minimum width, its cost |
| 11 | [geological uncertainty](methodologies/11_uncertainty.md) | the ensemble as practice, and what it does not claim |
| 12 | [reading the results](methodologies/12_reading-the-results.md) | legitimate comparisons, the gap split, the controls |

## The ladder

| method | rung | page | claim |
|---|---|---|---|
| `bench-by-bench` | classical | [04](methodologies/04_classical-floor.md) | a schedule, deliberately naive: the floor |
| `nested-shells` | classical | [04](methodologies/04_classical-floor.md) | the industrial four-step chain, in its most favourable reading |
| `toposort-greedy` (GrTS) | classical | [03](methodologies/03_toposort.md) | the obvious baseline |
| `toposort-gershon` (GeTS) | classical | [03](methodologies/03_toposort.md) | the value of everything a block unlocks (Gershon 1987a) |
| critical multiplier | bound | [02](methodologies/02_the-bound.md) | the exact CPIT LP for one resource, with no LP solver |
| Algorithm 4 | bound | [02](methodologies/02_the-bound.md) | the smallest single-resource bound, certified |
| Bienstock-Zuckerberg | bound | [02](methodologies/02_the-bound.md) | the joint CPIT LP over all resources |
| PCPSP LP | bound | [02](methodologies/02_the-bound.md) | the yardstick of every destination plan |
| `toposort-expected` (ExTS) | sota | [03](methodologies/03_toposort.md) | seeded by the LP expected extraction times |
| `exts-two-resource` | sota | [03](methodologies/03_toposort.md) | Algorithm 4's plan side: one relaxation per resource, best plan |
| `shift-local-search` | sota | [06](methodologies/06_local-search.md) | pull value forward, push cost back |
| `sliding-window` | sota | [05](methodologies/05_sliding-window.md) | Cullenbine, Wood and Newman 2011, a MILP per window |
| `cpitD-local-search` | sota | [06](methodologies/06_local-search.md) | the EXACT restricted re-solve |
| `learned-expected-time` | learned | [07](methodologies/07_learned.md) | the ExTS order with no LP solve, measured against ExTS on every case |
| `destination-toposort` | beyond | [09](methodologies/09_destinations.md) | PCPSP: the LP's destinations fixed (the re-cut), then ExTS |
| `destination-sliding-window` | beyond | [09](methodologies/09_destinations.md) | PCPSP: the re-cut scheduled by the sliding window |
| `destination-local-search` | beyond | [09](methodologies/09_destinations.md) | PCPSP: OPBSP-[D] from the best of those and the best CPIT plan |
| `min-width` | beyond | [10](methodologies/10_operability.md) | the best plan made more workable, capacity kept, and what it costs |
| ensemble | beyond | [11](methodologies/11_uncertainty.md) | every plan across correlated realisations |

## What "rung" means

- **classical**: what a planner or a textbook would do. Present so the state of the art has something to
  beat; a method comparison with no floor in it is a marketing chart.
- **sota**: the published state of the art for CPIT, implemented rather than cited.
- **learned**: a model that ACCELERATES something exact, scored against the exact quantity on data it never
  saw. It never certifies anything.
- **beyond**: a different problem (the destination rungs, scored against the PCPSP LP) or a different
  question about the best plan (operability, uncertainty). Beyond rungs never compete for the best plan
  of a case.

## The one rule

Two plans can only be compared through the same bound of the same problem. That is why the bound pages
are separate from the method list: the bound is not a rung, it is the yardstick, and where two CPIT
bounds exist the tighter one is used for every CPIT gap on the case and the difference is reported.
