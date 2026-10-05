# PhaseFlow docs

An open-pit **production schedule**, solved against a certified bound and animated year by year over the
block model. The ultimate pit answers *which* blocks are worth mining; PhaseFlow answers *when*, under slope
precedence in every period and a mining and a plant capacity per period, and, where the economics exist,
*where each block goes*.

![The method ladder: the bounds, the rungs, and which bound scores which plan](assets/the-ladder.svg)

## What it is, and what it is not

**It is** a solver workbench for the constrained pit limit problem (CPIT) and its destination variant
(PCPSP): a certified upper bound computed first (the critical multiplier algorithm, Algorithm 4,
Bienstock-Zuckerberg, the PCPSP LP), a ladder of methods from the classical floor to the published state of
the art and a learned accelerator, each plan scored against the bound of its own problem, three controls on
every case, operability and uncertainty readouts, thirteen cases each with a role, and a browser that
re-solves the synthetic cases live.

**It is not** a mine planning tool (no stockpiles, no blending, no minimum-production rows, no haulage, no
stochastic optimisation), not a claim of optimality on any instance (the one integer optimum quoted is an
external one), and not a source of numbers it does not compute: every result on the pages and in this wiki
is read from the committed artifacts.

## The themes

| theme | start here | what it holds |
|---|---|---|
| methodologies | [methodologies.md](methodologies.md) | the four problems, the bounds, every method with its theory and its measured results, how to read them |
| use cases | [use-cases.md](use-cases.md) | the thirteen cases, the role of each, every bound and plan per case |
| data contract | [data-contract.md](data-contract.md) | inputs, CONTRACT 1 (ingestion), CONTRACT 2 (artifacts), licences, model files |
| architecture | [architecture.md](architecture.md) | the lanes, the bake, the live port, the gate, deploy |
| frameworks | [frameworks.md](frameworks.md) | each engine and library: card, installation, usage, applying it elsewhere |
| guides | [guides.md](guides.md) | bake, bring your own data, retrain, use the app, run the checks |
| design | [design/SDD.md](design/SDD.md) | the software design document: contracts, lanes, oracle, named gates; proposed feature designs |
| validation | [validation/](validation/) | the release records: what each release re-baked and what changed |

Every measured table in this wiki sits between `<!-- generated:... -->` markers and is rewritten from the
committed manifests and model files by `scripts/docs_tables.py`; CI and the deploy fail if any of them
disagrees with the artifacts.

## The one rule

**The bound is never produced by a heuristic**, and every plan is shown with its gap to the bound of its
own problem. A schedule reported without its gap is a number with no scale.

## The trust anchor

MineLib's `newman1`, solved **as published** (its six periods, its eight percent rate, its two capacities):

| quantity | value | source |
|---|---:|---|
| ultimate pit optimum | 26,086,899 | PhaseFlow, equal to the published UPIT optimum |
| CPIT LP bound (joint, Bienstock-Zuckerberg) | 24,486,184 | PhaseFlow; MineLib's results page lists the same CPIT LP bound to the unit |
| CPIT integer optimum | 24,176,864.82 | external: AMPL notebook, Gurobi 13.0.0, MIP gap 1e-9 |
| best PhaseFlow plan (`sliding-window`) | 24,149,869 | 1.37 percent below the LP bound, about 0.11 percent below the integer optimum |
| PCPSP LP bound | 24,486,549 | PhaseFlow; equal to Jelvez et al. 2018, Table 3 |

The full comparison, including the 2018 PCPSP result and the three-way split of the gap, is
[use case 01](use-cases/01_newman1-published.md).

## Defects worth reading about

Each shipped, was caught by a test, a gate or a measurement, and is written up where the method lives,
because the failure mode is more transferable than the fix:

- destination methods that compared values and never priced the plant: on the plant-bound twins they ended
  27 to 39 percent below their own bound, and on a small twin solved exactly the constructive one returned a
  negative NPV where the integer optimum was 59 percent above the fixed cutoff ([09](methodologies/09_destinations.md));
- a Gershon weight that counted precedence paths instead of successors ([03](methodologies/03_toposort.md));
- a smoothing pass that broke capacity and reported an NPV above a certified bound with every control green
  ([10](methodologies/10_operability.md));
- a sliding window that was a greedy wearing the name, and then one that refused to run
  ([05](methodologies/05_sliding-window.md));
- a bisection that stopped on an interval width rather than a duality certificate
  ([02](methodologies/02_the-bound.md));
- a confounded sweep that produced two wrong answers about when the learned rung fails, and a bound
  surrogate that predicted more capacity lowering a bound ([08](methodologies/08_when-the-surrogate-fails.md));
- inference features hard-coded at (1.0, 1.0) while training used real ones, and a browser forward pass with
  the wrong activations ([07](methodologies/07_learned.md));
- an ONNX parity check that compared saturated outputs and recorded an error of exactly zero
  ([data-contract/05](data-contract/05_model-files.md));
- an ingestion gate that promised a cycle check it did not run ([data-contract/02](data-contract/02_ingestion-gate.md));
- an ensemble perturbation that was not mean-preserving, and a value of information that came out negative
  because it was the wrong quantity ([11](methodologies/11_uncertainty.md));
- two copies of `react-router`, which crashed every route while the HTTP check reported 200
  ([architecture/07](architecture/07_deploy.md)).
