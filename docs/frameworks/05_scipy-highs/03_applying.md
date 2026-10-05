# scipy and HiGHS · 03 · On your own instances

- **Budgets are measured, not guessed.** The PCPSP LP has about `n(T-1) + mT + nT + RT` rows; the bake
  refuses it above 1.6 million rows (the largest twin here is about 1.44 million and takes up to two hours
  on one core). The joint bound refuses above 130,000 nodes or 1.4 million edges of the time-expanded graph,
  because its certifying closure is pure Python. A case above a budget keeps a valid, looser bound and says
  why.
- **The sliding window's cost is the candidate set.** At 1.6 window capacities the largest case asks for a
  few thousand candidates per slide; a cap of 6,000 refuses rather than starves. On a bigger instance,
  lower the window or raise the cap knowingly.
- **Gaps are properties of the problem.** Change a relative gap to trade time for quality; never add a time
  limit to a bake whose output will be committed.
- **Parallelise across cases, not inside one.** HiGHS's LP is mostly serial, so a bake is shortened by
  running cases in separate processes with few BLAS threads each ([guides/01](../../guides/01_bake-the-artifacts.md)).
