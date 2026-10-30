# Methodologies: the problems, bounds, and method comparisons

Every method PhaseFlow runs, what it claims, what it is not allowed to claim, and what it measured on
every case. The rule that governs all of them: **the bound is never produced by a heuristic**, and every
plan is shown with its gap to the bound of its own problem.

![Method comparison map: bounds and which bound scores each plan](assets/the-ladder.svg)

## Read in order

| # | page | what it settles |
|---|---|---|
| 01 | [the formulations](methodologies/01_formulations.md) | UPIT, CPIT, PCPSP and OPBSP stated exactly; inclusion; complexity; what the LP gives |
| 02 | [the certified bound](methodologies/02_the-bound.md) | the critical multiplier algorithm, Algorithm 4, Bienstock-Zuckerberg, the PCPSP LP; every bound of every case |
| 03 | [TopoSort](methodologies/03_toposort.md) | the walk, the three weights, Gershon's set sum, Algorithm 4's plan side |
| 04 | [foundational schedules](methodologies/04_foundational-schedules.md) | bench by bench, nested shells, the gap problem |
| 05 | [the sliding time window](methodologies/05_sliding-window.md) | a MILP per window, the LP-guided candidate set, the best CPIT method |
| 06 | [local search](methodologies/06_local-search.md) | shifts and bounded C-PIT[D] neighborhood MILPs |
| 07 | [the learned lane](methodologies/07_learned.md) | the expected-time and bound surrogates, the instant plan in the browser |
| 08 | [when the surrogate fails](methodologies/08_when-the-surrogate-fails.md) | where, measured on three disjoint seed sets |
| 09 | [destinations](methodologies/09_destinations.md) | the cutoff as an output; the re-cut on the PCPSP LP |
| 10 | [operability](methodologies/10_operability.md) | coherence per period, minimum width, its cost |
| 11 | [geological uncertainty](methodologies/11_uncertainty.md) | the ensemble as practice, and what it does not claim |
| 12 | [reading the results](methodologies/12_reading-the-results.md) | legitimate comparisons, the gap split, the controls |

## Methods and evidence

| method | family | page | description |
|---|---|---|---|
| `bench-by-bench` | Reference methods | [04](methodologies/04_foundational-schedules.md) | a deliberately simple feasible schedule |
| `nested-shells` | Reference methods | [04](methodologies/04_foundational-schedules.md) | the industrial four-step chain, in its most favourable reading |
| `toposort-greedy` (GrTS) | Reference methods | [03](methodologies/03_toposort.md) | the value-weighted baseline |
| `toposort-gershon` (GeTS) | Reference methods | [03](methodologies/03_toposort.md) | successor-cone value (Gershon 1987a) |
| critical multiplier | Certified bounds | [02](methodologies/02_the-bound.md) | the exact CPIT LP for one resource, with no LP solver |
| Algorithm 4 | Certified bounds | [02](methodologies/02_the-bound.md) | the smallest single-resource bound, certified |
| Bienstock-Zuckerberg | Certified bounds | [02](methodologies/02_the-bound.md) | the joint CPIT LP over all resources |
| PCPSP LP | Certified bounds | [02](methodologies/02_the-bound.md) | the yardstick of every destination plan |
| `toposort-expected` (ExTS) | Published methods | [03](methodologies/03_toposort.md) | seeded by the LP expected extraction times |
| `exts-two-resource` | Published methods | [03](methodologies/03_toposort.md) | Algorithm 4's plan side: one relaxation per resource, best plan |
| `shift-local-search` | Published methods | [06](methodologies/06_local-search.md) | pull value forward, push cost back |
| `sliding-window` | Published methods | [05](methodologies/05_sliding-window.md) | Cullenbine, Wood and Newman 2011, a MILP per window |
| `cpitD-local-search` | Published methods | [06](methodologies/06_local-search.md) | bounded restricted C-PIT[D] MILPs with solver receipts |
| `learned-expected-time` | Learned methods | [07](methodologies/07_learned.md) | the ExTS order with no LP solve, measured against ExTS on every case |
| `destination-toposort` | Proposed analyses | [09](methodologies/09_destinations.md) | PCPSP with fixed destinations from the LP's re-cut, then ExTS |
| `destination-sliding-window` | Proposed analyses | [09](methodologies/09_destinations.md) | PCPSP re-cut scheduled by the sliding window |
| `destination-local-search` | Proposed analyses | [09](methodologies/09_destinations.md) | OPBSP-[D] from the best re-cut and CPIT plans |
| `min-width` | Proposed analyses | [10](methodologies/10_operability.md) | a more workable plan, capacity kept, and its cost |
| ensemble | Proposed analyses | [11](methodologies/11_uncertainty.md) | every plan across correlated realisations |

Learned predictions accelerate a defined computation and are scored against its exact quantity on unseen data;
they never certify a bound. Destination schedules solve a different problem and are scored against the PCPSP LP.
Operability and uncertainty ask different questions about feasible plans. These results remain separate from the
default CPIT plan comparison.

## The one rule

Two plans can only be compared through the same bound of the same problem. That is why the bound pages
are separate from the method list: the bound is not a method, it is the yardstick, and where two CPIT
bounds exist the tighter one is used for every CPIT gap on the case and the difference is reported.
