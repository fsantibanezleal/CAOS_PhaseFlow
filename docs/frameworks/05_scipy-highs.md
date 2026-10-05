# 05 · scipy and HiGHS: the LP and MILP solver

**What it is.** scipy's `optimize.milp` and `optimize.linprog(method="highs")` call HiGHS (Huangfu and Hall,
*Mathematical Programming Computation* 10(1):119-142, 2018,
[doi:10.1007/s12532-017-0130-5](https://doi.org/10.1007/s12532-017-0130-5)), an open-source LP and MILP
solver; `scipy.sparse.csgraph.maximum_flow` is the compiled max-flow behind the joint bound's pricing.

**Pin.** `scipy==1.18.0`, through `oreblocks[milp]` in `requirements.txt` and pinned in
`requirements-precompute.txt`.

**Why this one.** It is open source, it ships with scipy (no separate binary, no licence server), and it
is strong enough for every exact sub-problem in the ladder. A commercial solver would solve the full
sliding-window model per window instead of a candidate set, and the exact searches on larger
neighbourhoods; that is the price of an open stack, and the pages that depend on it say so.

**What would make us change it.** Instances where the PCPSP LP or the window models exceed what HiGHS
solves in a bake's budget; the answer there is column generation for the PCPSP LP (as BZ does for CPIT)
rather than a different general solver.

| page | content |
|---|---|
| [installation](05_scipy-highs/01_installation.md) | the pin and what happens without it |
| [usage](05_scipy-highs/02_usage.md) | the five places HiGHS solves something, with their settings |
| [applying](05_scipy-highs/03_applying.md) | budgets, gaps and reproducibility on your own instances |
