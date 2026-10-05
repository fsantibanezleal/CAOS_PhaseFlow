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

| quantity | PhaseFlow CPIT | Jelvez et al. 2018 PCPSP |
|---|---|---|
| ultimate pit optimum | 26,086,899 | 26,086,899 |
| certified LP bound, joint (Bienstock-Zuckerberg) | 24,486,184 | 24,486,549 (PCPSP LP) |
| best feasible schedule (`sliding-window` for PhaseFlow) | 24,149,869 | 24,176,861 |
| gap to each problem's LP bound | 1.37% | 1.26% |

The ultimate pit reproduces exactly. The bound has a direct check on the same problem:
[MineLib's results page](https://minelib.org/v1/Results.xhtml) lists a CPIT LP upper bound of
24,486,184 for `newman1`, and PhaseFlow's 24,486,184.09 reproduces it to the unit. The ORDERING is a
second check: a CPIT LP bound must sit BELOW a PCPSP LP bound, because PCPSP is the richer problem, and
it does, by 365 units in 24.5 million. The schedule sits below the 2018 PCPSP feasible result, but the
two gap percentages use different LP bounds and must not be read as a like-for-like method contest. It
sits above the best known feasible CPIT value MineLib still lists, 23,483,671 (4.1%), which predates
both the 2018 results and the external optimum below. The best plan is the sliding time window
(Cullenbine, Wood and Newman), solved as a MILP per window on an LP-guided candidate set. The 2018 PCPSP
numbers are from Tables 3 and 4 of [Jelvez, Morales and Nancel-Penard](https://www.delphoslab.cl/Publicaciones/2018/Jelvez_et_al_MPES2018.pdf).

An [external AMPL/Gurobi notebook](https://colab.ampl.com/notebooks/minelib-in-ampl-and-amplpy.html)
later reports an integer optimum of 24,176,864.82 for Newman1 CPIT, with a matching MIP best bound.
Relative to that external result, PhaseFlow's feasible plan is 0.112% lower. Most of the displayed
1.37% LP-bound gap is integrality gap rather than a loss of the scheduling method. This external
certificate was not produced by PhaseFlow; [the source comparison](docs/use-cases/01_newman1-published.md)
shows the inputs, calculations and limits.

These four numbers are read out of `data/derived/manifests/newman1-published.json` by
`scripts/check_readme_numbers.py`, which CI runs: the previous version of this table was two releases
stale and said the exact local search was NOT implemented while it was rung 9 of the ladder and the
best method on this very case.

**The walls carry the schedule.** Drawing the mined blocks gives a growing solid that is not a pit.
Carving them away and colouring by grade gives a pit whose final frame shows no schedule at all
(measured on a real engine: 25 percent of the model ever visible, 65 percent of that surface
unscheduled mid-animation, 100 percent at the end). PhaseFlow colours the **void boundary**: each
standing block adjacent to an already-mined one takes the period of the neighbour that exposed it. The
pit wall is then 100 percent period-coloured at every frame including the last, and it is what the
discipline already draws (Chicoisne et al. Figure 1d; Morales et al. pit profiles).

**The cutoff grade is an output, and the relaxation chooses it.** When the plant binds, which ore gets
the plant is the decision. A rule that compares a block's two values sends every marginal ore block to
the plant and starves the richer ore below; the PCPSP LP prices that opportunity cost (Lane's
mill-limited cutoff). HiGHS solves that LP up to 1.1 million rows; above that PhaseFlow reaches the same
value through its Lagrangian dual, one maximum closure per iteration, and says which method produced each
number. PhaseFlow fixes each block where the LP sends it (the re-cut), schedules that
instance with ExTS and the sliding window, then searches destinations exactly. On a 320-block twin solved
exactly, choosing destinations is worth about 59 percent over the fixed cutoff; on `twin-porphyry-s` the
destination plan is 35 percent above the best fixed-cutoff plan and 1.03 percent from its own bound.

**The learned plan is instant, and scored as it lands.** In the browser, every control change draws a
learned plan on the next frame (a small MLP predicts the LP expected times, no LP solve); the exact
bound and plans follow from a worker within a few seconds, replace it, and the share of the exact plan
it reached is shown. Where the surrogate fails is measured on three disjoint seed sets and stated.

**Spatial coherence is measured, not assumed.** The algorithm's own authors warn that block-level
schedules scatter across the mine. PhaseFlow reports connected components per period, the share in
the largest, and the narrowest mined run, next to the NPV that would otherwise flatter it.

**Everything is documented where it is measured.** The [docs wiki](docs/README.md) has a page per method
(theory, equations, references, and its results on every case), a page per case, the data contract, the
architecture, the frameworks and the guides; its measured tables are generated from the committed
artifacts and checked in CI.

## Run it

Numbered scripts, in the order you run them. Each ends by printing the next command. Full detail,
options and the release gates: [`scripts/local/README.md`](scripts/local/README.md).

```powershell
.\scripts\local\00_install-prereqs.ps1     # check python 3.12+, node 20+, git
.\scripts\local\01_init.ps1                # venv, deps, frontend packages, artifacts if empty
.\scripts\local\03_dev.ps1                 # http://localhost:5173
```

```bash
./scripts/local/00_install-prereqs.sh
./scripts/local/01_init.sh
./scripts/local/03_dev.sh
```

The MineLib instances are an academic download and are never redistributed:
`python scripts/fetch_minelib.py --all` puts them in the machine's data folder (`PHASEFLOW_DATA_DIR`) or
a git-ignored one. `02_generate-data` bakes into `build/local` unless you pass `--release`, so it cannot
overwrite the committed evidence by accident; the whole set takes hours and runs cases side by side
(`PHASEFLOW_BAKE_JOBS`). `npm test` runs the engine, parity, contract and design-token gates.

## Shape

| path | what |
|---|---|
| `data-pipeline/` | repo-local tooling, invoked by path. **Not a package.** |
| `data/derived/` | the committed evidence: one trace and one manifest per case |
| `frontend/src/engine/` | the TypeScript live lane: max-flow, the critical multiplier bound, TopoSort, the learned forward pass, the worker |
| `frontend/src/content/` | the five reading pages: topics, data panels read from the artifacts, figures |
| `models/` | the learned models, their metrics and the failure study, committed |
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
