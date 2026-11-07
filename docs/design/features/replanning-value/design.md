# Re-planning value: design

Status: reviewed 2026-10-31 against the PhaseFlow trace and OreBlocks 0.6.6 receipt API for
backlog BL-049. Its full-case rebake and
result-dependent acceptance remain pending.

The current trace calculation is not a re-planning comparison: it re-solves with Gershon weights and
then takes the per-realisation maximum over every fixed candidate plan. That baseline can choose a
different policy after observing each realisation. The replacement uses one fixed policy selected by
its expected value across the frozen realisation set, then improves that policy separately for each
realisation using OreBlocks' node-bounded C-PIT[D] neighbourhood MILPs with proof receipts.

![The same ex-ante policy anchors every paired re-planning comparison](../../../assets/replanning-value.svg)

*Figure: choose one fixed policy before observing value draws; for each draw, start local search from that policy and compare both schedules on the same values. The average feasible gain is a lower bound on EVPI.*

Each MILP re-solve may stop at its deterministic node budget; a feasible incumbent remains useful,
and its receipt records whether the restricted neighbourhood was proven optimal. The outer randomized
neighbourhood search is a heuristic and does not certify the global optimum. Therefore the output remains a lower
bound on EVPI. The reported baseline is `max_m mean_k NPV(plan_m, realization_k)`. The re-plan term is
`mean_k NPV(replan_k, realization_k)`, where every `replan_k` starts from the one baseline schedule.
No per-realisation maximum over the candidate portfolio is used as the fixed baseline.

The search uses frozen neighbourhood size, round count, seed derivation, 2,000-node per-neighbourhood
limit and MIP gap target. Every trace records the method, those settings and total measured elapsed time.
A returned incumbent is accepted only when OreBlocks verifies that the full schedule improves the
start plan. Realisation and fixed-plan NPVs are computed
from the same perturbed value vector. One-period and above-budget cases retain their explicit skip
reasons.

The implementation is reviewed for BL-049 only. It does not claim a global two-stage stochastic
optimum, and it does not close the separate large-window or learned-destination work.
