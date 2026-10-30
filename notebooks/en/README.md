# PhaseFlow notebooks

This English path moves from CPIT decisions and data provenance through certified bounds, scheduling and destination strategies, geological uncertainty, learned surrogates, and operability. Its reproducible 48-block teaching case is built by PhaseFlow's pipeline and solved by the pinned OreBlocks package; MineLib manifests provide separate aggregate context.

## Topic 01: CPIT problem and scheduling

- 01-problem/01-problem-and-published-data.ipynb : level 1: formulate the period decision, distinguish synthetic data from MineLib aggregates, run a first schedule, and inspect resource load.
- 01-problem/02-bound-and-feasible-plan.ipynb : level 2: compute per-resource certificates, compare four package methods against one bound, plot resource use and gaps, and run independent controls.
- 01-problem/03-sliding-window-and-expected-ordering.ipynb : level 3: run the literature-backed sliding-window heuristic on the same input as Expected, compare measured values and gaps, and explain candidate-prefix and optimistic-tail limits.

## Topic 02: destination choice

- 02-destination-choice/01-first-destination-schedule.ipynb : level 1: construct a destination-aware case, run a first joint period-and-destination plan, and reconcile plant, waste, value and resource use.
- 02-destination-choice/02-destination-strategies-and-cutoffs.ipynb : level 2: compare fixed and adaptive destination decisions, then measure how cutoffs change the feasible plan and its economic interpretation.
- 02-destination-choice/03-published-binary-formulation.ipynb : level 3: run the published binary formulation on the same instance and compare its exact result with package heuristics and the LP relaxation.

The topic has a level-3 lesson because the persisted destination-choice dossier and SDD identify the published binary formulation as the comparison baseline. The destination-choice study makes no level-4 method claim.

## Topic 03: geological uncertainty

- 03-uncertainty/01-single-plan-risk.ipynb : level 1: build a deterministic plan, generate spatially correlated synthetic value realisations, and measure the fixed plan's exposure.
- 03-uncertainty/02-compare-risk-aware-candidates.ipynb : level 2: score several package-generated plans on identical draws and compare expected return with lower-tail P10.
- 03-uncertainty/03-replanning-across-realisations.ipynb : level 3: select one highest-mean fixed policy before observing outcomes, then re-solve every draw with restricted exact C-PIT[D] local search from that same incumbent and compare paired gains. This is deterministic scenario re-planning with a heuristic lower bound, not a two-stage stochastic integer program.
- 03-uncertainty/04-learned-expected-time-ensemble.ipynb : level 4: inspect the expected-time ensemble policy, reproduce its schedule on a declared synthetic deposit, evaluate deposit-disjoint transfer, and interpret the failure tail and its guard.

The level-3 lesson executes deterministic scenario re-planning as described in the persisted research, and compares it with fixed candidates on identical draws. It is explicitly a heuristic practice comparison, not two-stage stochastic integer programming or EVPI. The level-4 lesson covers proposed expected-time ensemble from the SDD and retains both the held-out median and failure tail.

## Topic 04: learned surrogates

- 04-learned-surrogates/01-learned-preview.ipynb : level 1: load committed expected-time and bound models, construct a feasible learned schedule, and measure it against exact ExTS.
- 04-learned-surrogates/02-cross-case-validation.ipynb : level 2: compare paired plan-value ratios across four generated archetypes and inspect the guard on held-out and clean splits. No level 3: PhaseFlow's dossier evaluates its own surrogate and names no runnable learned CPIT reference implementation for this case.

## Topic 05: operability

- 05-operability/01-coherence-and-width.ipynb : level 1: measure period fragmentation and bench width, apply the feasible width post-process, and inspect its measured change.
- 05-operability/02-width-tradeoffs.ipynb : level 2: compare targets and starting schedules, verify package controls, and chart width reduction against signed NPV change and capacity refusals. No level 3: published width design models pushbacks in a different optimization problem, with no runnable comparator for PhaseFlow's constrained post-process.

Install the exact environment from the repository root with python -m pip install -r notebooks/requirements.txt. Execute every notebook with python scripts/run_notebooks.py. Before a release, run python scripts/run_notebooks.py --check --tmp <external-temp-root> and python scripts/check_notebooks.py.
