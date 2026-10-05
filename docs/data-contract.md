# Data contract: what goes in, what comes out, and what is enforced

Data enters through one enforced contract and leaves through another, and both are checked: at bake time
by the pipeline, and on the committed evidence by CI and the deploy job. Without the first, the product
could not be applied to new data; without the second, the web could drift from what the pipeline produced
while every page still rendered.

![Raw inputs, CONTRACT 1, the ladder, CONTRACT 2, the web](assets/data-contract.svg)

| # | page | what it fixes |
|---|---|---|
| 01 | [inputs](data-contract/01_inputs.md) | the MineLib file formats as measured, the per-instance column map, sentinels, grade fields; the seeded twins and their economics; the scenario fields |
| 02 | [CONTRACT 1, ingestion](data-contract/02_ingestion-gate.md) | every rejection and flag with its reason; how outliers and missing data are handled, case by case |
| 03 | [CONTRACT 2, the artifact](data-contract/03_trace-and-manifest.md) | the trace, manifest and index fields; the three enforcement mechanisms; reproducibility |
| 04 | [licences](data-contract/04_licences.md) | what may be committed and shipped, and where the rule is enforced in code |
| 05 | [model files](data-contract/05_model-files.md) | the learned lane's committed artifacts and the rules they obey |

## Units, everywhere

| quantity | unit |
|---|---|
| block value, NPV, bounds | currency units of the instance (MineLib files do not name one; the twins use one consistently) |
| resource coefficients and capacities | tonnes per period |
| grade | mass fraction in [0, 1] (MineLib percentages are divided by 100) |
| discount rate | per period, the first period undiscounted |
| gaps | percent of the bound of the plan's own problem |
| runtimes | milliseconds of wall time on the baking machine, single thread for the solvers |

## The rule that ties it together

Nothing is silently coerced. A bad input is rejected with its reason; a plausible but suspicious one is
flagged and the flag travels to the screen; a missing field turns off exactly the methods that need it and
the trace says which and why. On the way out, every plan of every method is re-read and checked for
precedence, capacity and its bound before anything is committed.
