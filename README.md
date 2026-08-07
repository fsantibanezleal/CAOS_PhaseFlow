# PhaseFlow

[![CI](https://img.shields.io/github/actions/workflow/status/fsantibanezleal/CAOS_PhaseFlow/ci.yml?branch=main&label=CI)](https://github.com/fsantibanezleal/CAOS_PhaseFlow/actions)
[![License](https://img.shields.io/github/license/fsantibanezleal/CAOS_PhaseFlow)](LICENSE)
[![Version](https://img.shields.io/github/v/tag/fsantibanezleal/CAOS_PhaseFlow?label=version&sort=semver)](https://github.com/fsantibanezleal/CAOS_PhaseFlow/tags)
[![Live](https://img.shields.io/badge/live-phaseflow.fasl--work.com-blue)](https://phaseflow.fasl-work.com)

**An open-pit production schedule, solved with a certified bound and animated year by year over the
block model.** The ultimate pit answers *which* blocks are worth mining. PhaseFlow answers *when*,
subject to slope precedence in every period and per-period mining and processing capacity, maximising
discounted NPV.

That is the **constrained pit limit problem** (CPIT). It is NP-hard, so what ships is a **certified
upper bound** plus **feasible heuristic** schedules, with the gap between them on every screen. A
schedule shown without its gap is a number with no scale.

## What makes it worth looking at

**The bound needs no LP solver.** Chicoisne, Espinoza, Goycoolea, Moreno and Rubio
([doi:10.1287/opre.1120.1050](https://doi.org/10.1287/opre.1120.1050), Theorem 3.1) show that for one
resource constraint per period the CPIT LP relaxation is solved exactly in `O(mn log n)`, as a
sequence of parametric nested pits, which are maximum closures, which are minimum cuts. So the
certified bound runs on max-flow machinery, offline in Python and **live in the browser**.

**The trust anchor is a published instance solved as published.** `newman1.cpit`: its own six
periods, its own eight percent rate, its own two capacities.

| quantity | PhaseFlow | published |
|---|---|---|
| ultimate pit optimum | 26,086,899 | 26,086,899 |
| certified LP bound | 24,487,410 | 24,486,549 |
| best feasible schedule | 23,873,589 | 24,176,861 |
| optimality gap | 2.51% | 1.26% |

The bound lands 3.5e-5 from the published value, with the residual in the expected direction because
a single-resource relaxation is looser than the joint bound. The schedule sits below the best known:
this is a heuristic with no exact local search, and that distance is the price of not implementing
the `C-PIT[D]` neighbourhood. Published values: Jelvez, Morales and Nancel-Penard,
[doi:10.1007/978-3-319-99220-4_18](https://doi.org/10.1007/978-3-319-99220-4_18).

**The walls carry the schedule.** Drawing the mined blocks gives a growing solid that is not a pit.
Carving them away and colouring by grade gives a pit whose final frame shows no schedule at all
(measured on a real engine: 25 percent of the model ever visible, 65 percent of that surface
unscheduled mid-animation, 100 percent at the end). PhaseFlow colours the **void boundary**: each
standing block adjacent to an already-mined one takes the period of the neighbour that exposed it. The
pit wall is then 100 percent period-coloured at every frame including the last, and it is what the
discipline already draws (Chicoisne et al. Figure 1d; Morales et al. pit profiles).

**Spatial coherence is measured, not assumed.** The algorithm's own authors warn that block-level
schedules scatter across the mine. PhaseFlow reports connected components per period, the share in
the largest, and the narrowest mined run, next to the NPV that would otherwise flatter it.

## Run it

```bash
python -m venv .venv && .venv/Scripts/pip install -r requirements.txt -r requirements-dev.txt
python scripts/fetch_minelib.py --all      # academic download, git-ignored, never redistributed
python data-pipeline/run.py                # canonical bake, ~25 min
cd frontend && npm ci && npm run dev
```

`python data-pipeline/run.py <case> --output build/sandbox` bakes into a sandbox and never touches
committed evidence. `npm test` runs the engine, parity and product gates.

## Shape

| path | what |
|---|---|
| `data-pipeline/` | repo-local tooling, invoked by path. **Not a package.** |
| `data/derived/` | the committed evidence: one trace and one manifest per case |
| `frontend/src/engine/` | the TypeScript live lane: max-flow, the critical multiplier bound, TopoSort |
| `frontend/src/viz/` | the stage, the profile and plan views, the charts |
| `docs/` | the wiki |
| `app/` | dormant; PhaseFlow needs no backend |

## Honest scope

No stockpiles: an inventory whose reclaimed grade is the blend of what is inside makes the model
bilinear, the published linear models fix that grade as a parameter and search over it
([doi:10.1016/j.cor.2019.02.001](https://doi.org/10.1016/j.cor.2019.02.001)), and at 10 percent annual
degradation the value falls by 69 percent
([doi:10.1016/j.cor.2018.11.009](https://doi.org/10.1016/j.cor.2018.11.009)). No blending or other
general side constraints. No minimum-production constraints: the solver raises rather than quietly
solving a different problem. No stochastic optimisation. Not for production mine planning.

## Engine

[`oreblocks`](https://pypi.org/project/oreblocks/), a published PyPI project, consumed as a pinned
dependency. PhaseFlow declares no package of its own.

MIT. Owner: Felipe Santibanez-Leal.
