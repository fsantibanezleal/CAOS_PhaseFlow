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
- Teichteil-Königsbuch et al. (2023), graph policy with schedule generation for resource-constrained project scheduling, https://doi.org/10.1609/icaps.v33i1.27244
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
per-case checks. Academic MineLib files remain in the configured external data root. The repository does
not redistribute per-block data or per-block schedules for MineLib instances.

## Repository workflow and data roots

The product is instantiated from CAOS Product Template `0.15.000` and pins CAOS App Shell `0.23.0`.
The numbered PowerShell and Bash entrypoints share the template's receipt-based `scripts/local/workflow.py`;
the product-specific JSON plan invokes the actual PhaseFlow registry pipeline, stages the trained models,
computes readiness from staged outputs, and runs PhaseFlow's artifact and document validators. A complete
candidate is written under external `CAOS_TEMP_ROOT`, bound to its source and payload hashes, and promoted
only after explicit admission. `CAOS_DATA_ROOT` contains raw academic MineLib downloads; the legacy
`PHASEFLOW_DATA_DIR` remains an explicit alias. Neither source data nor temporary candidates fall back to
a repository path. The requirements, design, and validation record is
[the repository workflow feature](features/repository/requirements.md).

## Technology and versions

The table records every pinned direct dependency of the scientific, development, notebook, and frontend environments. Python versions come from exact requirement files; JavaScript versions are the resolutions in `frontend/package-lock.json`.

| component | package | version | use | alternative considered |
|---|---|---|---|---|
| pipeline | `scipy` | `1.18.1` | scientific routines and HiGHS-backed optimisation (`requirements-precompute.txt`) | No substitute is retained; changing this pin requires the named contract and release gates. |
| pipeline | `onnx` | `1.22.0` | portable learned-model interchange (`requirements-precompute.txt`) | No substitute is retained; changing this pin requires the named contract and release gates. |
| pipeline | `onnxruntime` | `1.28.0` | CPU learned-model inference and export parity (`requirements-precompute.txt`) | No substitute is retained; changing this pin requires the named contract and release gates. |
| frontier training | `torch` | `2.14.1` | masked PPO graph actor-critic in a separate training-only environment (`requirements-frontier-training.txt`; official CPU wheels) | A hand-maintained autodiff/training stack would add unreviewed numerical risk; this dependency is absent from CI, deployment and the runtime pipeline. |
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
| frontend | `@fasl-work/caos-app-shell` | `0.23.0` | shared navigation, documentation, compact tab density, bounded mobile story stage, shell gate and workbench/story primitives (`frontend/package-lock.json`); release tag `v0.23.000` | Product-owned shell primitives would fork shared accessibility and layout fixes. |
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
| bake | peak memory not yet instrumented; no fixed estimate claimed | clean candidate directory under the configured external data root | solver and case dependent; each manifest records method timings, while full-run elapsed time is recorded separately | external `CAOS_VENVS_ROOT/phaseflow/.venv-pipeline` with a repository alias; MineLib cache stays under external `CAOS_DATA_ROOT` |
| tests | peak memory not yet instrumented | temporary solver files under the configured external temp root | OreBlocks 0.6.6 source: 88 tests passed in 610.10 seconds; PhaseFlow artifact-drift checks remain blocked on a fresh full rebake | external `CAOS_VENVS_ROOT/phaseflow/.venv-notebooks` with a repository alias and the locked `frontend/` Node environment |
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
| BS-2 | beyond | State-conditioned frontier policy: a graph-conditioned actor selects only currently eligible, resource-feasible blocks from the partial schedule state | Independently validate every output; report completeness/coverage, NPV, comparable certified gap, runtime, memory and every failure on frozen seed/family-disjoint tests and all declared cases | `docs/design/features/learned-frontier/`; adversarial action-mask and leakage tests; independent schedule validator; two bilingual notebook pairs; full 0.12.000 bake |

## Beyond the state of the art

**BS-1, expected-time ensemble policy.** Hypothesis: a five-member ensemble trained on deposit-disjoint synthetic instances can rank blocks by expected extraction time and produce a feasible precedence-safe CPIT schedule whose discounted NPV is competitive with exact expected-time ordering, while avoiding an LP solve at inference. Method: train each member on the same train-only normalization with frozen, distinct seeds; average predictions; run the shared TopoSort constructor; compare against the classical constructor, sliding-window look-ahead, exact expected-time ordering and exact local-search results under identical deposits and constraints. Evaluation: use seed-disjoint holdout deposits, retain each case and seed, report NPV ratios, feasibility, timing and uncertainty, and test the ONNX and browser implementations against Python. The claim is limited to this benchmark and does not imply a field-wide performance improvement. A result that misses the hypothesis remains in the report and notebook.

**BS-2, state-conditioned frontier policy.** A second learned scheduler is approved for design by Felipe (2026-11-01); the method remains unimplemented. An autoregressive graph-conditioned actor scores feasible blocks using the current partial schedule, period and remaining resources, with explicit stop-period and stop-schedule actions. Its masked PPO training return uses the same discounted-value objective as the CPIT evaluator, without a second discount. The independent validator, rather than the mask alone, certifies every output. Training, validation and test partitions are disjoint by generator seed and graph family; all 13 product cases remain sealed until the checkpoint/settings freeze. We report incomplete coverage and negative results and make no performance claim without paired evidence. The versioned SDD amendment fixes the compute cap and names the method/code/data/docs/browser gates. The active 0.11.000 baseline bake must finish unchanged; this result-changing method targets a separate full 0.12.000 bake.

The three feature designs are proposals: the deposit-statistics live guard, the
learned destination policy, and a scalable sliding window on larger instances
have not passed implementation or empirical gates. The separately approved
state-conditioned scheduler has its own versioned 0.12.000 amendment; only
isolated feasibility, replay and validation primitives are implemented so far.
Until the corresponding gates pass, the UI must not claim these methods exist.

The uncertainty re-planning estimate uses one fixed policy selected by expected
NPV, then exact local search in restricted C-PIT[D] neighborhoods on each
realisation. The outer neighborhood search remains heuristic and reports a
lower bound on EVPI. It is distinct from the three open product-quality units.

## Visualization catalog

PhaseFlow applies the six visualization purposes from the universal CAOS visualization contract to open-pit scheduling.
The selected case and method drive the App stage, story, readouts and linked panels. Every numeric headline and callout
is derived from the current case manifest or schedule trace; the MineLib cases remain aggregate-only and never render
block geometry that the licence does not permit us to redistribute.

| ID | User question | Data contract | Kind | Interaction | Linked views and appearance |
|---|---|---|---|---|---|
| V1 | Where is the selected pit and what has the chosen schedule extracted? | `case-manifest`, `schedule-trace` | Physical system | Select case, method and period; rotate and zoom the pit; choose schedule, grade or mined-block colour | Links the 3D pit to the period profile, case readouts and the selected schedule. App stage and story step `deposit`. Geometry appears only for cases whose replay payload permits it. |
| V2 | Which bench, section or predecessor neighborhood controls this part of the plan? | `schedule-trace`, `case-manifest` | Key component | Choose bench and section; select a block or bench; inspect its grade, value, period and immediate precedence context | Links the 2D bench/profile section to V1 and the selected-period panel. App sub-view and story step `constraints`. |
| V3 | How do precedence and per-period capacities shape feasible extraction? | `schedule-trace`, `case-manifest` | Domain diagram | Scrub the period; compare mining and processing use with their limits; select a period to highlight the same blocks in V1 | Links the capacity profile and precedence explanation to V1, V2 and V4. App sub-view and story step `constraints`. |
| V4 | How do production, discounted value and remaining capacity evolve over the horizon? | `schedule-trace` | State and dynamics | Scrub or play the period cursor; inspect tonnes, value, capacity and schedule completeness at that period | Links the time series to the period-coloured V1 scene and the selected-period readout. App sub-view and story step `schedule`. |
| V5 | How does the selected method turn its ordering or search into a feasible schedule? | `schedule-trace`, `learned-model`, `learned-study` | Method at work | Select a method and period; advance through the schedule; inspect its inputs, constructor/search steps, feasibility and evidence state | Links the method explanation to the same blocks and period in V1 and the capacity/precedence views V2-V4. Methodology explanation, App panel and story step `method`. |
| V6 | What changes when the same case is scheduled by another method, and what decision is supported? | `schedule-trace`, `case-manifest` | Comparison and decision | Compare methods on shared axes; select a result to load its schedule; read its matching bound, feasibility, runtime and limitations | Links the comparison to V1-V5 for that exact method and case. App comparison view, Benchmark and story step `compare`. |

The guided story has four directly addressable steps: `/story/deposit`, `/story/method`, `/story/constraints` and
`/story/compare`. Each step uses the selected case's evidence for a numbered finding, one primary stage, at least three
callouts with units and a docked panel. Step changes pause on user interaction; browser history and the selected case
remain synchronized. The story exits to `/app` with the same case, method and period. Reduced-motion preferences remove
camera and value animation without removing state or labels.
The `/story` route uses the Shell's `immersiveRoutes` framing so the scene and evidence panel use the desktop viewport
without the ordinary site header and footer; the Shell retains product identity and returns phone layouts to document
scrolling. This route-level framing is shared Shell behavior rather than product-owned shell CSS.

Physical geometry is available only for the synthetic twins and product-owned controls. MineLib replay remains excluded
because the academic source licence permits aggregate results only. The current source has no telemetry or operational
mine feed: story verbs describe the computational workflow and never imply a live mine or field recommendation.

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
| P-17 | WHEN the frontier policy emits a block assignment, THE assignment SHALL be unassigned, precedence eligible in that period and within every residual resource capacity. | `tests/test_frontier_policy.py`; adversarial action-mask tests |
| P-18 | WHEN a frontier schedule is exported, THE independent product validator SHALL recompute precedence, resource use, uniqueness, period bounds and discounted NPV. | pipeline integration tests; `scripts/check_artifacts.py` |
| P-19 | WHEN frontier features are normalized, THE normalizer SHALL use training-only statistics and reject forbidden identifiers, non-finite inputs and unapproved missing/constant features. | `tests/adversarial/test_frontier_features.py`; training-receipt validator |
| P-20 | WHEN the frontier policy is trained, ITS train, validation and test partitions SHALL be disjoint by seed and synthetic graph family; product cases SHALL remain sealed until the checkpoint and settings are frozen. | split-manifest tests; test-access receipt |
| P-21 | WHEN frontier inference is repeated with identical inputs and checkpoint, THE action sequence, schedule, objective and coverage SHALL be identical. | deterministic replay test; checkpoint/config checksum receipt |
| P-22 | WHEN a frontier schedule is partial or unavailable, THE trace and app SHALL show coverage or the failure reason and SHALL NOT present the schedule as complete. | trace contract tests; EN/ES replay browser gate |
| P-23 | WHEN the frontier method is released, THE all-case artifacts SHALL use one source version, engine pin, feature contract and frozen checkpoint and SHALL retain every case failure. | 0.12.000 external bake receipt; artifact, manifest, index and readiness checks |
| P-24 | WHEN the frontier policy is exposed in the web app, THE browser SHALL replay the committed schedule and SHALL NOT load or execute the training checkpoint. | frontend trace/replay tests; no-live-model browser assertion |
| P-25 | WHEN frontier training inputs or weights are persisted, THEY SHALL remain under the configured device data/training/model roots; CI and deployment SHALL never train. | `scripts/check_base_integrity.py`; training runner tests; `scripts/check_ci_budget.py` |
| P-26 | WHEN the frontier method is taught, THE EN/ES notebooks SHALL execute the product observation, mask, training and frozen evaluation code and interpret numeric results and failures. | notebook content gate; fresh-kernel execution and byte-stable `--check` |
| P-27 | WHEN the showcase is enabled, THE App SHALL implement the six-view catalog and four evidence-bound story routes with one case/method/period state, linked scene and panels, accessible controls and reduced-motion behavior. | `docs/design/features/showcase/validation.md`; `npm run verify:showcase`; installed shell G21; EN/ES desktop and mobile visual review |

## Deploy driver

The product template's CI runs static and scientific contract checks on every change. Release deployment is gated on a clean production build, the full shell gate, artifact and provenance checks, bilingual/theme/browser checks, and the Pages workflow. A direct route or artifact that returns HTML in place of JSON blocks release. Local checks are not evidence of remote deployment; the Pages run and live route/artifact checks are separate release records.

## Risks and kill criteria

- If a schedule breaches a period capacity or the bound is below a feasible
  objective, stop the release; never explain it away as a high NPV.
- If the full bake mixes engine versions or source roles and artifact roles differ,
  stop the release and rebuild the complete set.
- If a learned guard misses more failures than its predeclared gate or requires
  an unavailable synthetic archetype label, abstain on the live lane.
- If the frontier actor selects a masked action, the independent validator fails,
  or a checkpoint/config hash differs, reject the method result and the bake.
- If training reaches its frozen compute cap without a reproducible checkpoint,
  keep the negative receipt and do not expand the budget after test access.
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
| Frontier scheduler | Offline actor training, feasible-action masking, independent validation and committed replay are specified by `features/learned-frontier/SDD-amendment-0.12.000.md`; isolated mask/replay/validator primitives have partial implementation, while training, pipeline integration and release evidence remain pending. |

## Convergence record

This SDD backfills a shipped product and is awaiting independent review.
The existing requirements are checked by the named gates above.
Feature records name their approval and implementation state individually. The frontier
policy direction is approved, its reviewed SDD amendment fixes the implementation and
evaluation boundary, and its code/results remain pending until the full 0.12.000 vertical
and convergence gates pass. No design proposal is evidence of a measured result.
