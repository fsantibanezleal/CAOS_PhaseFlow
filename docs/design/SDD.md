# PhaseFlow software design document

Status: retrospective design record for the existing product; review pending.
PhaseFlow predates its current design record. This document records what the shipped system does and
the gates that can disprove its claims.
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
| Notebook model inputs | Fresh-kernel `--check` runs copy released `models/` inputs into their temporary worktree, preserve source artifacts, and clean up | `docs/design/features/notebook-runner-models/`; `tests/test_check_notebooks.py::test_adversarial_runner_copies_released_models_into_the_check_worktree` |

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
| pipeline | `oreblocks` | `0.6.6` | scheduling engine and MILP rungs (`requirements.txt`), including bounded OPBSP proof receipts | A product-local solver would duplicate tested scheduling and solver integration. |
| notebooks | `matplotlib` | `3.11.2` | notebook plots (`notebooks/requirements.txt`) | No substitute is retained; changing this pin requires the named contract and release gates. |
| notebooks | `nbclient` | `0.11.0` | fresh-kernel notebook execution (`notebooks/requirements.txt`) | No substitute is retained; changing this pin requires the named contract and release gates. |
| notebooks | `nbformat` | `5.11.1` | notebook structure and deterministic serialization (`notebooks/requirements.txt`) | No substitute is retained; changing this pin requires the named contract and release gates. |
| notebooks | `ipykernel` | `7.4.0` | Python notebook kernel (`notebooks/requirements.txt`) | No substitute is retained; changing this pin requires the named contract and release gates. |
| frontend | `@fasl-work/caos-app-shell` | `0.19.9` | shared navigation, documentation, shell gate and workbench primitives (`frontend/package-lock.json`); release tag `v0.19.009` | Product-owned shell primitives would fork shared accessibility and layout fixes. |
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
## Method scope and boundaries

PhaseFlow evaluates published scheduling methods and the proposed BS-1 expected-time policy on bounded cases. No universal algorithmic novelty or field-wide performance claim is made.

## Research basis used by the notebook curriculum

- Blom, Pearce and Cote, stochastic mine-planning practice: https://arxiv.org/abs/2403.18213.
- Ramazan and Dimitrakopoulos, stochastic integer programming: https://doi.org/10.1007/s11081-012-9186-2.
- Newman, Open-Pit Block-Sequencing Formulations: https://doi.org/10.1287/inte.2013.0731.
- Meagher, Dimitrakopoulos and Avis, geological uncertainty and NPV: https://doi.org/10.1134/S1062739114030132.
- Kingma and Ba, Adam optimization: https://arxiv.org/abs/1412.6980.
- Bai et al. (2018), minimum mining width and pushback design: https://doi.org/10.17159/2411-9717/2018/v118n5a8.

## Resources

| stage | memory | disk | time | where it runs |
|---|---|---|---|---|
| bake | peak memory not yet instrumented; no fixed estimate claimed | clean candidate directory under the configured external data root | solver and case dependent; each manifest records method timings, while full-run elapsed time is recorded separately | isolated `.venv-pipeline`; MineLib source cache stays local |
| tests | peak memory not yet instrumented | temporary solver files under the configured external temp root | OreBlocks 0.6.6 source: 88 tests passed in 610.10 seconds; PhaseFlow artifact-drift checks remain blocked on a fresh full rebake | isolated `.venv-notebooks` and `frontend/` Node environment |
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

| id | tier | method | acceptance criterion | gate |
|---|---|---|---|---|
| M-1 | classical | Greedy/TopoSort constructive CPIT scheduling with the published pit precedence and period capacities | Returns a traced feasible schedule and preserves the declared resource, precedence and discount rules | `scripts/check_artifacts.py`; classical feasibility controls |
| M-2 | sota | Sliding-window MILP look-ahead over the same CPIT candidates and capacities | Produces a feasible schedule; records the window, candidate budget, objective and explicit refusal conditions | pipeline tests; level-3 sliding-window notebook; artifact guard |
| M-3 | sota | Published destination-choice binary formulation and node-bounded C-PIT[D] neighborhood search | Separates constructive, restricted solver results with proof status and full exact results; restricted search never degrades its seed | pipeline tests; level-3 destination-choice notebook |
| M-4 | sota | Deterministic scenario re-planning from one fixed pre-draw policy using exact local neighborhood search | Reports the policy comparison as a lower bound on EVPI and preserves paired draw values | pipeline tests; level-3 re-planning notebook |
| BS-1 | beyond | Expected-time ensemble policy: five seed-disjoint learned predictors rank blocks, then precedence-safe TopoSort constructs the schedule | On deposit-disjoint holdouts, compare feasibility and discounted NPV with M-1 through M-3 and exact ExTS; report transfer failures and per-case results | adversarial feature/training tests; ONNX and browser parity; level-4 bilingual learned-planning notebook; rebaked manifests |

## Beyond the state of the art

**BS-1, expected-time ensemble policy.** Hypothesis: a five-member ensemble trained on deposit-disjoint synthetic instances can rank blocks by expected extraction time and produce a feasible precedence-safe CPIT schedule whose discounted NPV is competitive with exact expected-time ordering, while avoiding an LP solve at inference. Method: train each member on the same train-only normalization with frozen, distinct seeds; average predictions; run the shared TopoSort constructor; compare against the classical constructor, sliding-window look-ahead, exact expected-time ordering and exact local-search results under identical deposits and constraints. Evaluation: use seed-disjoint holdout deposits, retain each case and seed, report NPV ratios, feasibility, timing and uncertainty, and test the ONNX and browser implementations against Python. The claim is limited to this benchmark and does not imply a field-wide performance improvement. A result that misses the hypothesis remains in the report and notebook.

The product-quality backlog still has three open units: a deposit-statistics live
guard, a second learned schedule rung, and a scalable sliding window on larger
instances. Their requirements, design and tasks live under `docs/design/features/`.
Until their gates pass, the UI must not claim they exist.

The uncertainty re-planning estimate uses one fixed policy selected by expected
NPV, then exact local search in restricted C-PIT[D] neighborhoods on each
realisation. The outer neighborhood search remains heuristic and reports a
lower bound on EVPI. It is distinct from the three open product-quality units.

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
| P-13 | WHEN the uncertainty ensemble reports re-planning value, THE calculation SHALL compare one highest-expected-value fixed schedule with a feasible C-PIT[D] local search started from that same schedule for each realisation. | `tests/adversarial/test_replanning.py::test_adversarial_replan_starts_from_one_best_fixed_policy`; `tests/adversarial/test_replanning.py::test_adversarial_replanning_uses_the_fixed_policy_baseline` |
| P-14 | WHEN a learned model is trained, THE trainer SHALL reject any non-finite or zero-variance input feature rather than silently assign it unit scale. | `tests/adversarial/test_training_features.py::test_adversarial_training_rejects_constant_features`; `::test_adversarial_training_names_non_finite_features` |
| P-15 | WHEN the expected-time model is trained and loaded, THE offline and browser lanes SHALL average the same five members and reject schema or scale mismatches. | `tests/adversarial/test_training_features.py::test_expected_time_ensemble_averages_five_members_and_roundtrips`; `frontend/test/surrogate-parity.test.ts` |
| P-16 | WHEN a notebook loads a released model under `--check`, THE isolated fresh-kernel worktree SHALL include the model while preserving committed files and cleaning up its temporary copy. | `tests/test_check_notebooks.py::test_adversarial_runner_copies_released_models_into_the_check_worktree` |

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

| Requirement | PhaseFlow implementation |
|---|---|
| Bilingual content | EN/ES page content follows the shell language control; both languages are checked on rendered pages. |
| Theme | Light/dark tokens are used by product-owned drawings and charts. |
| Shared application shell | The shell supplies the six routes, page structure, workbench, architecture modal and navigation. |
| Full scientific workflow | Offline processing, evaluation, export and replay/live separation are documented and gated. |
| Focus simulation | The Focus route preserves state when returning to the workbench and recomputes from its controls. |
| Responsive behavior | Route sizes, charts and navigation are measured across supported viewports. |
| Design before new work | New feature designs name requirements, implementation boundaries and adversarial verification gates. |
| Shared base adoption | Shell behavior comes from an exact released package pin; defects are resolved in that shared package. |

## Convergence record

This SDD backfills a shipped product and is awaiting independent review.
The existing requirements are checked by the named gates above.
The three feature designs are proposals; their code and claimed outcomes remain pending
until review and their own convergence evidence.
