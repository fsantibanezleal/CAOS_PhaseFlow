# Geological uncertainty, framed so the claim is bounded

Kriging is a smoother. It returns a conditional mean, so a schedule optimised on a single interpolated
block model is optimised for a deposit that does not exist. Meagher, Dimitrakopoulos and Avis
([doi:10.1134/S1062739114030132](https://doi.org/10.1134/S1062739114030132)) summarise the consequence
from an open-pit gold example: "the consideration of geological uncertainty predicts a NPV that is 50%
less than that forecasted via conventional modeling."

## What this is NOT

It is not a two-stage stochastic integer program. Ramazan and Dimitrakopoulos
([doi:10.1007/s11081-012-9186-2](https://doi.org/10.1007/s11081-012-9186-2)) do that and report
"approximately 10% higher NPV than the schedule derived from the traditional approach" on an Australian
gold mine. That is a different and much larger model, and putting a spread of NPVs on screen and
calling it stochastic optimisation would be precisely the animating-an-assumption failure this product
exists to avoid.

Two numbers that are routinely conflated and are kept apart here: the **50 percent** is about a
FORECAST being wrong; the **10 percent** is about a PLAN being better. They are different claims.

## What it is

What planners actually do, in Blom, Pearce and Cote's words (arXiv:2403.18213):

> "In practice, mining engineers using this platform solve a stochastic problem by solving many
> instances of a deterministic one. Across these instances, parameters that capture aspects such as
> price and grade are varied to reflect the uncertainty present in the original problem. Key strategic
> decisions are made by analysing the resulting plans across these scenarios."

So: build an ensemble, solve the deterministic problem on each realisation, evaluate EVERY candidate
plan against EVERY realisation, and report what a single number cannot say.

## The ensemble has to be built correctly, and two ways are wrong

**Uncorrelated noise is the wrong model.** Independent per-block error averages out over a pushback, so
an uncorrelated ensemble makes uncertainty look harmless. Real grade error is correlated over tens of
metres, which is why whole benches come in rich or poor together. The perturbation here smooths a white
field with a separable box kernel and applies it multiplicatively in log space, so values keep their
sign and the ore/waste classification can genuinely flip near the cutoff. A test asserts neighbouring
blocks move together more than distant ones.

**A biased ensemble corrupts the one number the module exists to report.** Box smoothing does not
preserve the mean of a finite field, so the multiplier has to be centred before it is scaled. Without
that, the "is the single-model forecast optimistic" readout measures the bias of the generator. A test
asserts mean preservation to within 2 percent.

## What is reported

- the **NPV distribution** of each candidate plan across the ensemble, with P10 and P90.
- the **robust choice by P10**, which is often not the plan with the best expected value. A plan that is
  best on average can be third-best when things go badly, and that is the decision a planner actually
  faces.
- the **optimism of the single-model forecast**: mean-model value minus expected value across
  realisations, per plan. Positive means the single-model number flatters.
- the **value of re-planning** once the realisation is known.

## The naming error, and why it is written down

That last quantity was first called EVPI. It is not. True EVPI needs the per-realisation **optimum**,
and the per-realisation solve available here is a heuristic, so this understates by whatever that
heuristic loses. It is a **lower bound** on EVPI.

Worse, computed naively it came out **negative** on a real case (-0.148 percent on the published
`newman1` instance), because a fixed plan can beat a heuristic re-solve on a lucky realisation. A
negative value of information is a naming error, not a finding. The fix is to take the maximum of the
re-solve and every candidate already evaluated, which makes the quantity a proper lower bound and
non-negative, and a test asserts both.

## The per-realisation solve is deliberately the cheap one

The re-solve runs with `bound=False` and Gershon's successor-cone weight, so each realisation costs one
maximum closure and a topological pass instead of a parametric family of closures per resource. The
ensemble compares NPVs across realisations and never reads a bound, so computing one is a factor of a
hundred spent on a discarded number. That is not a hypothetical: with the bound left on, the first full
thirteen-case bake ran for four hours and finished ONE case, stuck in this loop.

The consequence is stated rather than hidden: a weaker per-realisation solve makes the reported value of
re-planning a LOOSER lower bound, which is what it already was. The trace carries `resolveMethod` so the
number is never read without knowing what produced it.

## The label that stays on it

The ensemble is **synthetic** geological uncertainty from a seeded generator, not a conditional
simulation with drillhole data behind it. That sentence travels with the artifact and appears on every
surface that shows the result.
