# scipy and HiGHS · 02 · Where it solves something

| where | problem | solver call | stop rule |
|---|---|---|---|
| joint bound (BZ) restricted master | LP over the contracted partition | `linprog(method="highs")` | converged pricing, then one exact certifying closure |
| joint bound pricing | maximum closure on the time-expanded graph | `csgraph.maximum_flow` (integer capacities, node weights rounded UP, so the error can only over-estimate) | compiled search; certified after |
| sliding window | MILP per slide, cumulative binaries | `milp` | relative gap 3 percent, no time limit |
| C-PIT[D] and OPBSP-[D] | MILP per neighbourhood | `milp` | relative gap 1e-4, no time limit |
| PCPSP LP | one sparse LP over every block | `linprog(method="highs")`, presolve on | optimal, reported with its status |

**No wall-clock limits in the bake.** Every MILP stops on a relative gap, never on time: a time limit makes
the answer depend on the machine and its load, and a bake whose artifacts are evidence must be reproducible
from its inputs and seeds. Until oreblocks 0.4.1 the exact search stopped on eight seconds of CPU and the
headline gap was not reproducible.

**A solver failure never loses the incumbent.** The local searches catch a solver exception on one
neighbourhood and keep the current plan; every accepted plan is re-checked for feasibility before it
replaces the incumbent.
