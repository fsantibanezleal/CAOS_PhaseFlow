# PhaseFlow software design document

Status: retrospective design record for the existing product; review pending.
PhaseFlow predates [ADR-0075](https://github.com/fsantibanezleal/CAOS_MANAGE/blob/develop/conventions/architecture/0-archetype/ADR-0075-software-design-document-before-development.md).
This document records what the shipped system does and the gates that can disprove its claims.
New units require their own reviewed feature design before implementation.

## Problem and boundary

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

## Contracts and authoritative data

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

## Lanes and deployment

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

## Method ladder and acceptance

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

## Case taxonomy and evaluation oracle

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
certificate. See [the source comparison](../cases/newman1-external-optimum.md).

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
| P-06 | WHEN a Profile and plan panel is resized or its controls change, THE canvases SHALL remain bounded and stable. | `npm run verify:profile` at 1600x900, 1280x800 and 390x844 |
| P-07 | WHEN Newman1 evidence is displayed, THE app SHALL distinguish the CPIT LP bound, the 2018 PCPSP result and the attributed external CPIT integer optimum. | `scripts/check_artifacts.py` provenance check; EN/ES Benchmark browser QA; `scripts/check_readme_numbers.py` |
| P-08 | THE learned lane SHALL report held-out and independent validation evidence without presenting a surrogate as a certificate. | `scripts/validate_guard.py`; ONNX parity; `npm test` |
| P-09 | THE deployment SHALL load direct routes and all committed case artifacts over HTTPS. | `npm run build` route materialisation; production browser and data requests |

## Risks and stop conditions

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

## Convergence record

This SDD backfills a shipped product and is awaiting review under ADR-0075.
The existing requirements are checked by the named gates above. The three
feature designs are proposals; their code and claimed outcomes remain pending
until review and their own convergence evidence.
