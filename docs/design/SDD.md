# PhaseFlow software design document

Status: retrospective design record for the existing product; review pending.
PhaseFlow predates [ADR-0075](https://github.com/fsantibanezleal/CAOS_MANAGE/blob/develop/conventions/architecture/0-archetype/ADR-0075-software-design-document-before-development.md).
This document records what the shipped system does and the gates that can disprove its claims.
New units require their own reviewed feature design before implementation.

## Problem and non-goals

PhaseFlow answers when blocks in an open pit can be extracted under slope precedence,
per-period capacities and discounting, and what NPV a feasible schedule captures.
It compares classical, published and learned scheduling methods against a certified
upper bound. It shows temporal geometry, production, spatial coherence, and the
limits of a schedule rather than presenting a planning number without context.

The core problem is **CPIT**: each block's destination is fixed before scheduling.
The beyond rung uses **PCPSP** to illustrate destination choice and is never included
in CPIT ranking or gap envelopes. A minimum-width view does not reimpose capacity.
The app does not solve stockpiles, blending, geological stochastic programming,
or production mine planning. Its ensemble is seeded synthetic stress analysis.

## Executive brief

Data file: `content/executive.json`

The shell renders the industry problem frame as the first Introduction view. This record identifies the source file; the view itself remains in the data contract and is not duplicated here. Its role-level actions address a general mining audience, not a named client.

## Research basis

The product model and claims are bounded to these primary sources and independent benchmark records:

- Chicoisne et al. (2012), multi-period open-pit planning and parametric maximum closures, https://doi.org/10.1287/opre.1120.1050
- Jelvez et al. (2018), destination-aware open-pit scheduling, https://www.delphoslab.cl/Publicaciones/2018/Jelvez_et_al_MPES2018.pdf
- Rivera Letelier et al. (2020), production scheduling formulation and evaluated methods, https://doi.org/10.1287/opre.2019.1965
- Cullenbine, Wood and Newman (2011), sliding time-window heuristic for open-pit block sequencing, https://doi.org/10.1007/s11590-011-0306-2
- PhaseFlow source repository, deterministic synthetic twins and derived case manifests (MIT project code): https://github.com/fsantibanezleal/CAOS_PhaseFlow
- MineLib Newman1 CPIT benchmark, https://minelib.org/v1/Results.xhtml
- Morales et al. (2015), production schedules and pit-profile visualisation, https://www.delphoslab.cl/Publicaciones/2015/Morales_et_al_APCOM2015.pdf

UNVERIFIED: no claim is made about a universal distribution of mine-block sizes or a general industry-wide economic benefit; published results remain bounded to their study data and formulations.

## Sizing and contracts

| Boundary | Contract | Gate |
|---|---|---|
| Input files | `oreblocks` reads `.cpit`, `.pcpsp`, `.prec` and block models; `pipeline/io/contract.py` validates dimensions, sentinels, capacities and precedence | Python pipeline tests and ingest report in every trace |
| Trace | `phaseflow.schedule-trace/v1`; `pipeline/core/trace.py` produces; `frontend/src/lib/contract.types.ts` mirrors | `scripts/check_artifacts.py`; frontend contract tests |
| Manifest | `phaseflow.manifest/v1`; one case record for engine pins, declared scenario, gate, controls, scoreboard and artifact byte count | `scripts/check_artifacts.py`, `scripts/check_readme_numbers.py` |
| Index | `phaseflow.index/v1`; exactly one default and one entry per committed case | `scripts/check_artifacts.py` |
| Live browser | Only synthetic traces carry block arrays; the live TypeScript engine re-solves selected controls from those arrays | frontend parity and browser gates |

The offline pipeline and pinned `oreblocks` engine are the scientific authority.
The web app reads committed artifacts; it does not silently regenerate benchmark
results. A release bake is all cases at once because mixed engine versions can pass
per-case checks. MineLib files remain in a local ignored cache. The repository does
not redistribute per-block data or per-block schedules for MineLib instances.

## Technology and versions

The table records every pinned direct dependency of the scientific, development, notebook, and frontend environments. Python versions come from exact requirement files; JavaScript versions are the resolutions in `frontend/package-lock.json`.

| component | package | version | use | alternative considered |
|---|---|---|---|---|
| pipeline | `scipy` | `1.18.1` | scientific routines and HiGHS-backed optimisation (`requirements-precompute.txt`) | No substitute is retained; changing this pin requires the named contract and release gates. |
| pipeline | `onnx` | `1.22.0` | portable learned-model interchange (`requirements-precompute.txt`) | No substitute is retained; changing this pin requires the named contract and release gates. |
| pipeline | `onnxruntime` | `1.28.0` | CPU learned-model inference and export parity (`requirements-precompute.txt`) | No substitute is retained; changing this pin requires the named contract and release gates. |
| tests | `pytest` | `9.1.1` | Python contract and scientific tests (`requirements-dev.txt`) | No substitute is retained; changing this pin requires the named contract and release gates. |
| tests | `jsonschema` | `4.26.0` | validate catalogued JSON data contracts (`requirements-dev.txt`) | Handwritten shape checks drift from the consumer schema. |
| tests | `openapi-spec-validator` | `0.9.0` | validate API descriptions when the dormant API lane is activated (`requirements-dev.txt`) | Schema-only checks miss OpenAPI structure and path errors. |
| tests | `fastapi` | `0.143.0` | run the reserved ASGI API boundary in isolated contract tests (`requirements-dev.txt`) | The API remains separate from the static Pages release lane. |
| tests | `httpx` | `0.28.1` | in-process ASGI client for endpoint contract tests (`requirements-dev.txt`) | Network-backed tests would be nondeterministic for the local API contract. |
| tests | `ruff` | `0.15.18` | Python lint and formatting checks (`requirements-dev.txt`) | No substitute is retained; changing this pin requires the named contract and release gates. |
| pipeline | `numpy` | `2.5.1` | numerical arrays and model features (`requirements.txt`) | No substitute is retained; changing this pin requires the named contract and release gates. |
| pipeline | `oreblocks` | `0.6.3` | scheduling engine and MILP rungs (`requirements.txt`) | A product-local solver would duplicate tested scheduling and solver integration. |
| notebooks | `matplotlib` | `3.11.2` | notebook plots (`notebooks/requirements.txt`) | No substitute is retained; changing this pin requires the named contract and release gates. |
| notebooks | `nbclient` | `0.11.0` | fresh-kernel notebook execution (`notebooks/requirements.txt`) | No substitute is retained; changing this pin requires the named contract and release gates. |
| notebooks | `nbformat` | `5.11.1` | notebook structure and deterministic serialization (`notebooks/requirements.txt`) | No substitute is retained; changing this pin requires the named contract and release gates. |
| notebooks | `ipykernel` | `7.4.0` | Python notebook kernel (`notebooks/requirements.txt`) | No substitute is retained; changing this pin requires the named contract and release gates. |
| frontend | `@fasl-work/caos-app-shell` | `0.19.6` | shared navigation, documentation, shell gate and workbench primitives (`frontend/package-lock.json`); release tag `v0.19.006` | Product-owned shell primitives would fork shared accessibility and layout fixes. |
| frontend | `katex` | `0.19.1` | math rendering (`frontend/package-lock.json`) | No substitute is retained; changing this pin requires the named contract and release gates. |
| frontend | `lucide-react` | `1.61.0` | interface icons (`frontend/package-lock.json`) | No substitute is retained; changing this pin requires the named contract and release gates. |
| frontend | `react` | `19.3.1` | component rendering (`frontend/package-lock.json`) | No substitute is retained; changing this pin requires the named contract and release gates. |
| frontend | `react-dom` | `19.3.1` | browser rendering (`frontend/package-lock.json`) | No substitute is retained; changing this pin requires the named contract and release gates. |
| frontend | `react-router` | `8.5.0` | client-side routing (`frontend/package-lock.json`) | No substitute is retained; changing this pin requires the named contract and release gates. |
| frontend | `three` | `0.171.0` | 3D schedule rendering (`frontend/package-lock.json`) | No substitute is retained; changing this pin requires the named contract and release gates. |
| frontend | `uplot` | `1.6.32` | aggregate charts (`frontend/package-lock.json`) | No substitute is retained; changing this pin requires the named contract and release gates. |
| frontend | `zustand` | `5.0.16` | local app state (`frontend/package-lock.json`) | No substitute is retained; changing this pin requires the named contract and release gates. |
| frontend | `@types/node` | `24.19.2` | direct application or build dependency; see its imports and named gates (`frontend/package-lock.json`) | No substitute is retained; changing this pin requires the named contract and release gates. |
| frontend | `@types/react` | `19.3.0` | direct application or build dependency; see its imports and named gates (`frontend/package-lock.json`) | No substitute is retained; changing this pin requires the named contract and release gates. |
| frontend | `@types/react-dom` | `19.3.0` | direct application or build dependency; see its imports and named gates (`frontend/package-lock.json`) | No substitute is retained; changing this pin requires the named contract and release gates. |
| frontend | `@types/three` | `0.171.0` | direct application or build dependency; see its imports and named gates (`frontend/package-lock.json`) | No substitute is retained; changing this pin requires the named contract and release gates. |
| frontend | `@vitejs/plugin-react` | `6.1.1` | direct application or build dependency; see its imports and named gates (`frontend/package-lock.json`) | No substitute is retained; changing this pin requires the named contract and release gates. |
| frontend | `playwright` | `1.64.1` | browser verification (`frontend/package-lock.json`) | No substitute is retained; changing this pin requires the named contract and release gates. |
| frontend | `tsx` | `4.23.11` | direct application or build dependency; see its imports and named gates (`frontend/package-lock.json`) | No substitute is retained; changing this pin requires the named contract and release gates. |
| frontend | `typescript` | `5.9.3` | static type checking (`frontend/package-lock.json`) | No substitute is retained; changing this pin requires the named contract and release gates. |
| frontend | `vite` | `8.3.5` | development and production build (`frontend/package-lock.json`) | No substitute is retained; changing this pin requires the named contract and release gates. |
## Beyond the state of the art

None claimed. PhaseFlow implements and evaluates published methods and engineering integrations on bounded cases. No universal algorithmic novelty or general performance improvement is asserted.

## Research basis used by the notebook curriculum

- Blom, Pearce and Cote, stochastic mine-planning practice: https://arxiv.org/abs/2403.18213.
- Ramazan and Dimitrakopoulos, stochastic integer programming: https://doi.org/10.1007/s11081-012-9186-2.
- Meagher, Dimitrakopoulos and Avis, geological uncertainty and NPV: https://doi.org/10.1134/S1062739114030132.
- Kingma and Ba, Adam optimization: https://arxiv.org/abs/1412.6980.
- Bai et al. (2018), minimum mining width and pushback design: https://doi.org/10.17159/2411-9717/2018/v118n5a8.

## Resources

| stage | memory | disk | time | where it runs |
|---|---|---|---|---|
| bake | peak memory not yet instrumented; no fixed estimate claimed | clean candidate directory under the configured external data root | solver and case dependent; each manifest records method timings, while full-run elapsed time is recorded separately | isolated `.venv-pipeline`; MineLib source cache stays local |
| tests | peak memory not yet instrumented | temporary solver files under the configured external temp root | 173.68 seconds for the current OreBlocks 0.6.3 scientific suite; one stale-artifact guard failed as expected before rebake | isolated `.venv-pipeline` and `frontend/` Node environment |
| build | peak memory not yet instrumented | `frontend/dist/` including committed replay artifacts | Vite build completed in under one second in the current local run; route materialisation followed | Vite production build |
| deploy | no deployment in this change set | GitHub Pages workflow artifact | remote duration is recorded by Actions after a release | GitHub Pages at `https://phaseflow.fasl-work.com` |

## Lanes

| Lane | Work | Driver and limit |
|---|---|---|
| Offline | MineLib ingestion, all 13 method ladders, certified BZ bound, ensemble, learning, trace and manifest bake | Exact and expensive work; full bake is roughly 90 minutes on one core |
| Browser live | Synthetic block models, capacity/rate changes, 3D and 2D views, production charts | Small enough to meet interactive budgets; the app must label a replay-only case |
| Replay | Published and larger declared cases read committed aggregates | MineLib redistribution restriction and larger solve budget |
| Deploy | Static bundle and committed data served by Pages at `phaseflow.fasl-work.com` | `npm run build`, artifact guards, browser QA, then HTTPS and route hydration checks |

The browser's focus view is a separate full-screen route. The profile canvases live
in bounded hosts; `npm run verify:profile` measures their height at desktop and
phone widths after time, control and viewport changes. The measured live fix was
already deployed in 0.07.002; the gate protects it.

## Method ladder

| Method family | Acceptance criterion | Gate |
|---|---|---|
| Bench, nested shells, greedy/TopoSort, Gershon | Returns a traced CPIT feasible schedule with period capacities and slope precedence | `scripts/check_artifacts.py` capacity and shape checks; `npm test` parity |
| Critical multiplier Algorithm 4 | Certified upper bound; cannot be below a feasible CPIT objective | `scripts/check_artifacts.py`; Newman1 source comparison |
| Joint Bienstock-Zuckerberg | Certified CPIT LP bound at convergence; no greater than Algorithm 4 within tolerance; budget/skip recorded | pipeline tests; manifest bound report |
| Shift and exact C-PIT[D] search | Exact restricted solve is labelled separately; result never worse than seed | `npm test` local-search assertion and trace method notes |
| Sliding window | A moving MILP window enforces capacity; refusal is explicit if candidate budget would starve a period | pipeline tests, `skipped_methods`, artifact guard |
| Expected-time surrogate | Produces a feasible CPIT schedule without an LP solve; reports measured ratio to exact ExTS when both are baked | disjoint-deposit evaluation, ONNX parity, artifact guard |
| Bound surrogate | Predicts a sensitivity surface only; an exact bound anchors the selected point and surrogate output never certifies | model export parity and browser sensitivity panel |
| Destination and operability views | Marked `beyond`; never eligible for CPIT best or gap envelope | `best_comparable`, `run_controls`, `scripts/check_artifacts.py` |

The product-quality backlog still has three open units: a deposit-statistics live
guard, a second learned schedule rung, and a scalable sliding window on larger
instances. Their requirements, design and tasks live under `docs/design/features/`.
Until their gates pass, the UI must not claim they exist.

## Cases

The committed case set has a published Newman1 CPIT scenario, declared real
scenarios, synthetic pit shapes, and controls. `ctrl-degenerate` has one period,
zero discount and unlimited capacity; its mined set and value must equal the
exact ultimate pit. `ctrl-abundant` retains eight periods and positive discount:
loose capacity does not imply all scheduling gaps collapse. Every case records
duality, bound dominance and order-invariance controls.

Newman1's CPIT LP bound is compared with the [MineLib CPIT table](https://minelib.org/v1/Results.xhtml).
The 2018 [Jelvez et al. paper](https://www.delphoslab.cl/Publicaciones/2018/Jelvez_et_al_MPES2018.pdf)
reports a **PCPSP** bound and feasible result in its Tables 3 and 4; those
numbers are cross-problem context. An [external AMPL/Gurobi CPIT run](https://colab.ampl.com/notebooks/minelib-in-ampl-and-amplpy.html)
reports an integer optimum for Newman1. It is attributed, not a PhaseFlow
certificate. See [the source comparison](../cases/01_newman1-published.md).

## Oracles

The oracle order is: exact mathematical controls and feasibility; committed
trace/manifest parity; independent published dimensions and LP values; external
integer reference where a like-for-like model exists; rendered EN/ES browser QA.
No single HTTP 200 or green build substitutes for this chain.

## Requirements and named gates

| ID | Requirement | Gate |
|---|---|---|
| P-01 | THE pipeline SHALL reject malformed dimensions, sentinels and invalid schedules before committing a case. | `tests/test_pipeline.py`; `scripts/check_artifacts.py` |
| P-02 | THE manifest SHALL identify the scenario, engine pins, comparable best method and trace byte count. | `scripts/check_artifacts.py`; frontend contract tests |
| P-03 | THE app SHALL derive CPIT best and worst from classical, SOTA and learned rows only. | `scripts/check_artifacts.py` comparable envelope check; browser Controls readout |
| P-04 | WHEN a case lacks a certified joint bound, THE app SHALL show the fallback and its reason. | frontend contract tests; Benchmark bound table browser QA |
| P-05 | WHEN a MineLib case is shipped, THE trace SHALL contain no per-block arrays or per-block schedule. | `scripts/check_artifacts.py` licence boundary |
| P-06 | WHEN a Profile and plan panel is resized or its controls change, THE canvases SHALL remain bounded and stable. | `npm run verify:profile` at 1600x900, 1280x800, 768x900, 390x844 and 320x700 |
| P-07 | WHEN Newman1 evidence is displayed, THE app SHALL distinguish the CPIT LP bound, the 2018 PCPSP result and the attributed external CPIT integer optimum. | `scripts/check_artifacts.py` provenance check; EN/ES Benchmark browser QA; `scripts/check_readme_numbers.py` |
| P-08 | THE learned lane SHALL report held-out and independent validation evidence without presenting a surrogate as a certificate. | `scripts/validate_guard.py`; ONNX parity; `npm test` |
| P-09 | THE deployment SHALL load direct routes and all committed case artifacts over HTTPS. | `npm run build` route materialisation; production browser and data requests |
| P-10 | WHEN the destination rung runs, ITS alternative values and resources SHALL come from a source PCPSP model or seeded synthetic economics, and each period's cash and capacity SHALL reconcile. | `tests/test_pipeline.py::test_destination_periods_use_chosen_destination_values_and_resources`; `scripts/check_artifacts.py` cash and capacity gates |
| P-11 | WHEN a source block model lacks grade, THE trace SHALL name that absence, omit a measured grade curve and skip grade-dependent learned output. | `scripts/check_artifacts.py` grade-source gate; `npm run verify:grade`; EN/ES Zuck Small browser QA |
| P-12 | WHEN a synthetic case enters the live lane, THE browser SHALL use the baked fixed-destination processing coefficient for every block; a positive net-value test is not equivalent. | `scripts/check_artifacts.py` processing-array gate; `frontend/test/parity.test.ts` bound and feasibility checks; `npm run verify:focus` |

## Deploy driver

The product template's CI runs static and scientific contract checks on every change. Release deployment is gated on a clean production build, the full shell gate, artifact and provenance checks, bilingual/theme/browser checks, and the Pages workflow. A direct route or artifact that returns HTML in place of JSON blocks release. Local checks are not evidence of remote deployment; the Pages run and live route/artifact checks are separate release records.

## Risks and kill criteria

- If a schedule breaches a period capacity or the bound is below a feasible
  objective, stop the release; never explain it away as a high NPV.
- If the full bake mixes engine versions or source roles and artifact roles differ,
  stop the release and rebuild the complete set.
- If a learned guard misses more failures than its predeclared gate or requires
  an unavailable synthetic archetype label, abstain on the live lane.
- If the external Newman1 model cannot be shown equivalent coefficient by
  coefficient, keep its optimum attributed and its use limited to reference.
- If a diagram or translated statement conflicts with an artifact or primary
  source, fix the source-bound narrative before promotion.

## ADR fit

| ADR | Fit |
|---|---|
| ADR-0011 | EN/ES content and shell language controls; both languages are checked on rendered pages. |
| ADR-0012 | light/dark theme tokens for all product-owned drawings and charts. |
| ADR-0016 | shared application shell and five substantive documentation pages. |
| ADR-0017 | domain depth and page-area requirements verified by the shell gate. |
| ADR-0057 | product repository architecture and template adoption. |
| ADR-0058 | in-app architecture modal from `frontend/src/architecture.ts`. |
| ADR-0069 | offline processing, evaluation, export, replay/live separation, and complete vertical implementations for shipped methods. |
| ADR-0070 | Focus route for interactive simulation and state-preserving return to the workbench. |
| ADR-0071 | measured route sizing, bounded charts and responsive navigation. |
| ADR-0075 | retrospective SDD plus feature-level requirements and named adversarial gates before new feature work. |
| ADR-0078 | base defects are fixed in the shared base before adopting releases; product pins are exact. |

## Convergence record

This SDD backfills a shipped product and is awaiting review under ADR-0075.
The existing requirements are checked by the named gates above.
The three feature designs are proposals; their code and claimed outcomes remain pending
until review and their own convergence evidence.
