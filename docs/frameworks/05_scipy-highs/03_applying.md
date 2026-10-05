# scipy and HiGHS · 03 · On your own instances

- **Budgets are measured, not guessed.** The PCPSP LP has about `n(T-1) + mT + nT + RT` rows; HiGHS gets
  it up to 1.1 million rows (1,082,684 rows solved in 2.65 hours in the release bake, while 1,435,220
  rows had not finished in six and a half hours). Above that the bake does not give up the bound: it
  computes the same value through the LP's Lagrangian dual, one maximum closure per iteration and a small
  HiGHS master LP ([methodologies/02](../../methodologies/02_the-bound.md), section 5.2). The joint CPIT
  bound refuses above 130,000 nodes or 1.4 million edges of the time-expanded graph, because its
  certifying closure is pure Python; a case above that budget keeps the valid, looser Algorithm 4 bound
  and says why.
- **On a larger LP, try the dual before a bigger machine.** Where the coupling rows are few (here the
  `R T` capacity rows) and what remains is a closure, a flow or another problem with integral solutions,
  the Lagrangian dual reaches the LP value with a combinatorial solver, and every iterate is already a
  valid bound. HiGHS's interior-point method was slower than its simplex on these LPs.
- **The sliding window's cost is the candidate set.** At 1.6 window capacities the largest case asks for a
  few thousand candidates per slide; a cap of 6,000 refuses rather than starves. On a bigger instance,
  lower the window or raise the cap knowingly.
- **Gaps are properties of the problem.** Change a relative gap to trade time for quality; never add a time
  limit to a bake whose output will be committed.
- **Parallelise across cases, not inside one.** HiGHS's LP is mostly serial, so a bake is shortened by
  running cases in separate processes with few BLAS threads each ([guides/01](../../guides/01_bake-the-artifacts.md)).
