# 11 · Geological uncertainty, framed as practice

Deterministic CPIT takes one block model as truth, and that model is an estimate: a kriged grade is a
conditional mean, a smoother, so a schedule optimised on it is optimised for a deposit that does not
exist. This page says what PhaseFlow does about that, and what it does not claim.

## 1. What this is NOT

It is not a two-stage stochastic integer program. Ramazan and Dimitrakopoulos
([doi:10.1007/s11081-012-9186-2](https://doi.org/10.1007/s11081-012-9186-2)) solve one over an ensemble
of simulated orebodies and report "approximately 10% higher NPV than the schedule derived from the
traditional approach" on one Australian gold mine. That is a different and much larger model, and a
spread of NPVs on screen called "stochastic optimisation" would be animating an assumption.

Two numbers that are routinely conflated are kept apart. A frequently quoted figure, that accounting for
geological uncertainty predicts an NPV 50 percent below the conventional forecast, is one gold-mine example
that Meagher, Dimitrakopoulos and Avis ([doi:10.1134/S1062739114030132](https://doi.org/10.1134/S1062739114030132))
summarise from Dimitrakopoulos, Farrelly and Godoy (2002); the original was not obtained, so it is
attributed exactly that way. The 50 percent is about a **forecast** being wrong; the 10 percent is about a
**plan** being better.

## 2. What it is: the practice

Blom, Pearce and Cote ([arXiv:2403.18213](https://arxiv.org/abs/2403.18213)) describe Rio Tinto's
planners:

> "In practice, mining engineers using this platform solve a stochastic problem by solving many instances
> of a deterministic one. Across these instances, parameters that capture aspects such as price and grade
> are varied to reflect the uncertainty present in the original problem. Key strategic decisions are made
> by analysing the resulting plans across these scenarios."

So: build an ensemble, evaluate EVERY candidate plan of the ladder against EVERY realisation without
re-optimising it, and report what a single number cannot say.

![Plans read by their spread: the robust choice is not always the best on average](../assets/ensemble-fan.svg)

## 3. The ensemble has to be built correctly, and two ways are wrong

$$
v^{(k)}_b=p_b\,\bigl(1+\sigma\,\xi^{(k)}_b\bigr),\qquad \xi^{(k)}\ \text{spatially correlated},\qquad \mathbb E\bigl[v^{(k)}\bigr]=p .
$$

- **Uncorrelated noise is the wrong model.** Independent per-block error averages out over a pushback and
  makes uncertainty look harmless; real grade error is correlated over tens of metres. The perturbation
  smooths a white field with a separable box kernel and applies it multiplicatively in log space, so
  values keep their sign and the ore/waste classification can flip near the cutoff. A test asserts that
  neighbouring blocks move together more than distant ones.
- **A biased ensemble corrupts the one number it exists to report.** Box smoothing does not preserve the
  mean of a finite field, so the multiplier is centred before it is scaled; without that the "is the
  single-model forecast optimistic" readout measures the generator's bias. A test asserts mean
  preservation within 2 percent.

Twelve realisations per case (six above 25,000 blocks), $\sigma=0.25$, seeded.

## 4. What is reported

$$
\text{robust}=\arg\max_{\pi}\ P_{10}\bigl[\mathrm{NPV}(\pi;v^{(k)})\bigr],\qquad
\text{VoR}=\mathbb E_k\Bigl[\max_{\pi}\mathrm{NPV}(\pi;v^{(k)})\Bigr]-\max_{\pi}\mathbb E_k\bigl[\mathrm{NPV}(\pi;v^{(k)})\bigr].
$$

- the **NPV distribution** of each plan across the ensemble, with P10 and P90;
- the **robust choice by P10**, which can differ from the best plan on average;
- the **optimism of the single-model forecast**: mean-model value minus expected value across realisations;
  positive means the single-model number flatters;
- the **value of re-planning** once the realisation is known.

That last quantity is not EVPI: true EVPI needs the globally optimal schedule for every realisation. The
reported re-plan starts from one fixed candidate selected by its expected NPV and runs OreBlocks' exact
C-PIT[D] neighbourhood search on each perturbed value field. Each restricted neighbourhood is solved to
the declared MIP gap, and the feasible incumbent is preserved; the outer randomized search is still a
heuristic, so the mean improvement is a **lower bound** on EVPI. The trace records the selected fixed
policy, the exact-local-search settings and elapsed time. Its reference never switches between fixed
candidates after the realisation is observed.

The re-plan does not compute a certified bound. It reuses the feasible fixed schedule and solves local
restricted MILPs, making the uncertainty readout distinct from the case's offline certified bound. Its
method label and cost are recorded in the trace; the result is not a global two-stage stochastic optimum.

## 5. Measured on every case, and what the value of re-planning says here

<!-- generated:ensemble -->
| case | realisations | best by expected NPV | best by P10 | optimism of the single model (best plan) | value of re-planning | note |
| --- | ---: | --- | --- | ---: | ---: | --- |
| [`newman1-published`](../cases/01_newman1-published.md) | 12 | `sliding-window` | `sliding-window` | 403,215 | 0.000% |  |
| [`zuck-small-declared`](../cases/02_zuck-small-declared.md) | 12 | `sliding-window` | `sliding-window` | -1,689,916 | 0.000% |  |
| [`kd-declared`](../cases/03_kd-declared.md) | 12 | `sliding-window` | `sliding-window` | -1,170,622 | 0.000% |  |
| [`twin-porphyry-s`](../cases/04_twin-porphyry-s.md) | 12 | `sliding-window` | `sliding-window` | 1,468,124 | 0.000% |  |
| [`twin-porphyry-l`](../cases/05_twin-porphyry-l.md) | 12 | `sliding-window` | `sliding-window` | -1,859,010 | 0.000% |  |
| [`twin-core-halo`](../cases/06_twin-core-halo.md) | 12 | `sliding-window` | `sliding-window` | -829,946 | 0.000% |  |
| [`twin-layered`](../cases/07_twin-layered.md) | 12 | `cpitD-local-search` | `cpitD-local-search` | 1,245,862 | 0.000% |  |
| [`twin-vein`](../cases/08_twin-vein.md) | 12 | `sliding-window` | `sliding-window` | -2,685,382 | 0.000% |  |
| [`regime-high-discount`](../cases/09_regime-high-discount.md) | 12 | `sliding-window` | `sliding-window` | 1,186,350 | 0.000% |  |
| [`regime-mill-bound`](../cases/10_regime-mill-bound.md) | 12 | `sliding-window` | `sliding-window` | 1,033,910 | 0.000% |  |
| [`regime-mining-bound`](../cases/11_regime-mining-bound.md) | 12 | `sliding-window` | `sliding-window` | 1,010,480 | 0.000% |  |
| [`ctrl-abundant`](../cases/12_ctrl-abundant.md) | 12 | `cpitD-local-search` | `cpitD-local-search` | 551,122 | 0.000% |  |
| [`ctrl-degenerate`](../cases/13_ctrl-degenerate.md) | not run | - | - | - | - | a single-period scenario has no schedule to stress |
<!-- /generated -->

**Read the value-of-re-planning column as a measured lower bound.** A zero means the frozen local search
found no improvement from its single fixed-policy start on this finite set of realisations. It does not
mean that knowing the realisation has no value, and it does not establish a global stochastic optimum.

## 6. The label that stays on it

The ensemble is **synthetic** geological uncertainty from a seeded generator, not a conditional simulation
with drillhole data behind it. That sentence travels with the artifact and appears on every surface that
shows the result.

## Where it lives

`oreblocks.perturb_values`, `oreblocks.evaluate_across` (engine);
`data-pipeline/pipeline/stages/evaluate.py::run_ensemble` (12 realisations, sigma 0.25, seed 31) and
`ensemble_summary` in every manifest.
