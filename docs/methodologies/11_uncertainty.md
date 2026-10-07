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

That last quantity was first called EVPI. It is not: true EVPI needs the per-realisation OPTIMUM, and the
per-realisation solve here is a heuristic, so the number is a **lower bound** on EVPI. Computed naively it
came out negative on `newman1` (-0.148 percent), because a fixed plan can beat a heuristic re-solve on a
lucky realisation; the re-solve is now the maximum of the heuristic and every candidate already evaluated,
which makes it a proper, non-negative lower bound, and a test asserts both.

**The per-realisation solve is deliberately the cheap one** (Gershon weights and a shift search, no bound):
the ensemble compares NPVs and never reads a bound, and with the bound left on, the first full bake ran for
four hours and finished one case. The trace carries `resolveMethod` so the number is never read without
knowing what produced it.

## 5. Measured on every case, and what the value of re-planning says here

<!-- generated:ensemble -->
| case | realisations | best by expected NPV | best by P10 | optimism of the single model (best plan) | value of re-planning | note |
| --- | ---: | --- | --- | ---: | ---: | --- |
| [`newman1-published`](../use-cases/01_newman1-published.md) | 12 | `sliding-window` | `sliding-window` | 403,617 | 0.000% |  |
| [`zuck-small-declared`](../use-cases/02_zuck-small-declared.md) | 12 | `sliding-window` | `sliding-window` | -1,901,885 | 0.000% |  |
| [`kd-declared`](../use-cases/03_kd-declared.md) | 12 | `sliding-window` | `sliding-window` | -1,269,675 | 0.000% |  |
| [`twin-porphyry-s`](../use-cases/04_twin-porphyry-s.md) | 12 | `sliding-window` | `sliding-window` | 1,478,996 | 0.000% |  |
| [`twin-porphyry-l`](../use-cases/05_twin-porphyry-l.md) | 12 | `sliding-window` | `sliding-window` | -1,873,864 | 0.000% |  |
| [`twin-core-halo`](../use-cases/06_twin-core-halo.md) | 12 | `sliding-window` | `sliding-window` | -817,432 | 0.000% |  |
| [`twin-layered`](../use-cases/07_twin-layered.md) | 12 | `cpitD-local-search` | `cpitD-local-search` | 1,245,862 | 0.000% |  |
| [`twin-vein`](../use-cases/08_twin-vein.md) | 12 | `sliding-window` | `sliding-window` | -2,666,150 | 0.000% |  |
| [`regime-high-discount`](../use-cases/09_regime-high-discount.md) | 12 | `sliding-window` | `sliding-window` | 1,271,549 | 0.000% |  |
| [`regime-mill-bound`](../use-cases/10_regime-mill-bound.md) | 12 | `sliding-window` | `sliding-window` | 932,178 | 0.000% |  |
| [`regime-mining-bound`](../use-cases/11_regime-mining-bound.md) | 12 | `sliding-window` | `sliding-window` | 909,358 | 0.000% |  |
| [`ctrl-abundant`](../use-cases/12_ctrl-abundant.md) | 12 | `cpitD-local-search` | `cpitD-local-search` | 551,122 | 0.000% |  |
| [`ctrl-degenerate`](../use-cases/13_ctrl-degenerate.md) | not run | - | - | - | - | a single-period scenario has no schedule to stress |
<!-- /generated -->

**Read the value-of-re-planning column for what it is.** It is zero on every case. The fixed plans
include the sliding window, within a few percent of the bound, and the cheap per-realisation re-solve
never beats it, so the lower bound collapses to its floor. Zero here does NOT mean that knowing the
realisation is worthless; it means this lower bound is too weak to say anything in this release. A
re-solve strong enough to matter costs a sliding window per realisation (backlog BL-049), and until then
the column is shown with this reading attached.

## 6. The label that stays on it

The ensemble is **synthetic** geological uncertainty from a seeded generator, not a conditional simulation
with drillhole data behind it. That sentence travels with the artifact and appears on every surface that
shows the result.

## Where it lives

`oreblocks.perturb_values`, `oreblocks.evaluate_across` (engine);
`data-pipeline/pipeline/stages/evaluate.py::run_ensemble` (12 realisations, sigma 0.25, seed 31) and
`ensemble_summary` in every manifest.
