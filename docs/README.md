# PhaseFlow docs

An open-pit **production schedule**, solved with a certified bound and animated year by year over the
block model. The ultimate pit answers *which* blocks are worth mining; PhaseFlow answers *when*.

## Start here

| | |
|---|---|
| **[methods/](methods/README.md)** | the ladder: every rung, what it claims, and what it is not allowed to claim |
| [methods/02_the_bound.md](methods/02_the_bound.md) | the certified bound, both of them, and why there are two |
| [methods/09_ladder_results.md](methods/09_ladder_results.md) | how to read the numbers, and which comparisons are legitimate |
| [methods/10_when_the_surrogate_fails.md](methods/10_when_the_surrogate_fails.md) | the learned rung's worst case is 0.344, and this is WHEN |
| [cases/README.md](cases/README.md) | the case matrix, each case's ROLE, and the data that is actually reachable |
| [architecture.md](architecture.md) | the three lanes, the contracts, determinism, the gate, deploy |
| [guides.md](guides.md) | bake the artifacts, bring your own block model |
| [frameworks.md](frameworks.md) | one card per engine: what, why this one, the exact pin |
| [`scripts/local/`](../scripts/local/README.md) | run it locally, numbered in the order you run them |

## The one rule

**The bound is never produced by a heuristic**, and every schedule is shown with its gap to it. A
schedule reported without its gap is a number with no scale, and this product does not print one.

## The ladder at a glance

| rung | what it means | count |
|---|---|---|
| `classical` | what a planner, a textbook or a commercial package would do | 5 |
| `sota` | the published state of the art, implemented rather than cited | 4 |
| `learned` | a model that ACCELERATES something exact, scored against the exact quantity on data it never saw | 1 |
| `beyond` | a different problem or a different question, and NOT NPV-comparable with the rest | 2 |

Plus two bounds (the critical multiplier algorithm and Bienstock-Zuckerberg), three controls, a
spatial-coherence measurement per period, and an uncertainty ensemble.

## The trust anchor

The published MineLib `newman1.cpit`, solved **as published**: its own six periods, its own eight
percent discount rate, its own two capacities.

| quantity | PhaseFlow | published |
|---|---|---|
| ultimate pit optimum | 26,086,899 | 26,086,899 |
| certified LP bound (BZ, joint) | 24,486,184 | 24,486,549 (PCPSP LP) |
| best feasible schedule | 23,876,000 approx | 24,176,861 |
| optimality gap | 2.49% | 1.26% |

The bound ordering is the check: the CPIT LP bound must sit below the PCPSP LP bound, because PCPSP is
the richer problem.

## What is deliberately not here

No stockpiles (the blended-grade model is bilinear), no blending or other general side constraints, no
minimum-production constraints (the solver raises rather than solving a different problem), and no
two-stage stochastic integer programming. Each is named with its reason in
[methods/06_destinations.md](methods/06_destinations.md) and
[methods/08_uncertainty.md](methods/08_uncertainty.md).

## Bugs worth reading about

Each of these shipped, was caught by a test or a gate, and is written up where the method lives, because
the failure mode is more transferable than the fix:

- a sliding window that **double-booked capacity** and collapsed the objective to a third while every
  feasibility check passed ([01](methods/01_classical.md))
- a bisection that stopped on an **interval width** rather than a duality certificate
  ([02](methods/02_the_bound.md))
- smoothing that checked precedence in **one direction** ([07](methods/07_operability.md))
- an ensemble perturbation that was **not mean-preserving**, biasing the one number it existed to report
  ([08](methods/08_uncertainty.md))
- a value of information that came out **negative** because it was the wrong quantity
  ([08](methods/08_uncertainty.md))
- a learned metric that came out as **1.37e14** because it divided by a near-zero denominator
  ([05](methods/05_learned.md))
- an archetype story for the learned rung's worst case that six training deposits supported and five
  held-out ones **refuted** ([10](methods/10_when_the_surrogate_fails.md))
- two copies of `react-router`, which crashed every route while the HTTP check reported 200
  (`deployments/phaseflow.md` in CAOS_MANAGE)
