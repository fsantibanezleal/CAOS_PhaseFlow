# 12 · Reading the results

How to read the numbers the ladder produces, which comparisons are legitimate, and what the controls
prove and do not prove. Every table on this page is generated from the committed manifests.

## 1. The ladder at a glance

Each method across the whole case matrix: how many cases it ran on, its gap distribution against the bound
of its own problem, how often it was the best comparable plan, and its median cost.

<!-- generated:ladder -->
| method | rung | measured against | cases run | median gap | best gap | worst gap | best plan on | median time |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `bench-by-bench` | classical | CPIT bound | 13 / 13 | 51.78% | 0.00% | 103.85% | 0 | 163 ms |
| `nested-shells` | classical | CPIT bound | 13 / 13 | 42.13% | 0.00% | 71.15% | 0 | 159 ms |
| `toposort-greedy` | classical | CPIT bound | 13 / 13 | 46.28% | 0.00% | 80.00% | 1 | 158 ms |
| `toposort-gershon` | classical | CPIT bound | 13 / 13 | 24.05% | 0.00% | 92.14% | 0 | 545 ms |
| `toposort-expected` | sota | CPIT bound | 13 / 13 | 7.31% | 0.00% | 21.35% | 0 | 52.6 s |
| `exts-two-resource` | sota | CPIT bound | 12 / 13 | 6.05% | 0.33% | 21.23% | 0 | 59.1 s |
| `shift-local-search` | sota | CPIT bound | 13 / 13 | 4.26% | 0.00% | 17.28% | 0 | 104 ms |
| `sliding-window` | sota | CPIT bound | 13 / 13 | 2.35% | 0.00% | 6.38% | 10 | 32.6 min |
| `cpitD-local-search` | sota | CPIT bound | 13 / 13 | 4.22% | 0.00% | 16.91% | 2 | 1.0 s |
| `learned-expected-time` | learned | CPIT bound | 12 / 13 | 11.93% | 0.00% | 65.68% | 0 | 293 ms |
| `destination-toposort` | beyond | PCPSP LP | 11 / 13 | 9.89% | 0.00% | 18.99% | n/a | 47.5 s |
| `destination-sliding-window` | beyond | PCPSP LP | 11 / 13 | 1.58% | 0.00% | 19.29% | n/a | 38.7 min |
| `destination-local-search` | beyond | PCPSP LP | 11 / 13 | 1.42% | 0.00% | 18.95% | n/a | 2.6 s |
| `min-width` | beyond | CPIT bound | 13 / 13 | 2.36% | 0.00% | 6.39% | 0 | 245 ms |
<!-- /generated -->

## 2. Only compare through the same bound of the same problem

| comparison | legitimate | why |
|---|---|---|
| classical against sota against learned, same case | yes | same problem, same bound |
| `min-width` against the plan it smooths | yes | a feasible CPIT plan under the same capacities; the difference is what operability changes in NPV, almost always a cost (a 0.01 percent gain on `twin-vein`) |
| `learned-expected-time` against `toposort-expected` | yes | that is the plan it approximates (the ratio is recorded per case) |
| a destination plan against a CPIT plan, by NPV | as a VALUE of the destination freedom only | different problems; each destination plan is scored against the PCPSP LP |
| a destination plan's gap against a CPIT plan's gap | **no** | different bounds |
| a gap on a `declared` case against a published gap | **no** | a scenario declared by this product, not the published one |
| `newman1` CPIT against the 2018 PCPSP result | only as a cross-problem reference | the 2018 objective and LP bound are for PCPSP |
| `newman1` CPIT against the external CPIT integer optimum | yes, attributed | same named model; an external solve, not a PhaseFlow certificate |

The best plan of a case (`best` in the manifest, the default method in the app) is chosen among the
classical, sota and learned rungs only, ties broken by name so a bake is reproducible. The beyond rungs
never compete for it: the destination plans solve another problem and `min-width` is the best plan traded
for workability.

## 3. Which part of a gap belongs to whom

With $V$ a feasible CPIT value, $U_A$ the Algorithm 4 bound, $U_J$ the joint LP and $Z^{*}$ the integer
optimum, in value units:

$$
U_A-V=\underbrace{(U_A-U_J)}_{\text{bound slack}}+\underbrace{(U_J-Z^{*})}_{\text{integrality}}+\underbrace{(Z^{*}-V)}_{\text{method loss}} .
$$

The two recorded bounds measure the first term wherever the joint LP ran. The second is the instance's
integrality gap, which no method can close; the third is the method's own loss. Neither is known without
an integer optimum, which exists for one case, `newman1`, through an external exact solve
([use case 01](../use-cases/01_newman1-published.md)). Percent gaps have different denominators and are not
added.

**What a large gap can mean, and how the matrix separates it:**

1. the method is losing: visible when the exact re-solve or the sliding window materially beats the
   rounding on the same case;
2. the bound is loose: visible when the joint LP tightens Algorithm 4 ([02](02_the-bound.md), section 6);
3. the instance is hard: both bounds agree and every method sits far from them.

## 4. The controls, and what they prove

Three controls run on every case, because a wrong schedule looks exactly like a right one on a chart:

- **duality**: at rate 0 with unlimited capacity CPIT collapses to the ultimate pit, so the relaxation
  must return the exact pit block for block, with the pit coming from a different code path (a maximum
  closure); the value error is recorded;
- **bound**: the certified bound must sit above every plan of its own problem;
- **order invariance**: at rate 0 with unlimited capacity the value cannot depend on the order, so every
  TopoSort weighting must return the same number.

A fourth check stands in front of every artifact: every plan of every method, the beyond ones included,
is verified for precedence in every period and for every capacity, and its value must stay below the bound
of the problem it solves; where both relaxations exist the PCPSP LP must sit above the joint CPIT LP.
Each exists because the corresponding defect once produced a plausible number every other gate accepted
(23 committed plans across 13 cases once exceeded a period capacity by up to 447 percent with all gates
green, because the gates read schemas and never `resourceUse` against `resourceLimit`).

<!-- generated:controls -->
| case | duality (pit set) | duality error | bound >= plans | order invariance | order error | best comparable gap | worst comparable gap |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| [`newman1-published`](../use-cases/01_newman1-published.md) | pass | 0.00e+00 | pass | pass | 0.00e+00 | 1.37% | 6.41% |
| [`zuck-small-declared`](../use-cases/02_zuck-small-declared.md) | pass | 0.00e+00 | pass | pass | 0.00e+00 | 2.82% | 51.78% |
| [`kd-declared`](../use-cases/03_kd-declared.md) | pass | 0.00e+00 | pass | pass | 0.00e+00 | 6.23% | 65.68% |
| [`twin-porphyry-s`](../use-cases/04_twin-porphyry-s.md) | pass | 0.00e+00 | pass | pass | 0.00e+00 | 1.34% | 54.09% |
| [`twin-porphyry-l`](../use-cases/05_twin-porphyry-l.md) | pass | 0.00e+00 | pass | pass | 0.00e+00 | 1.57% | 60.05% |
| [`twin-core-halo`](../use-cases/06_twin-core-halo.md) | pass | 0.00e+00 | pass | pass | 0.00e+00 | 3.18% | 103.85% |
| [`twin-layered`](../use-cases/07_twin-layered.md) | pass | 0.00e+00 | pass | pass | 0.00e+00 | 3.55% | 19.36% |
| [`twin-vein`](../use-cases/08_twin-vein.md) | pass | 0.00e+00 | pass | pass | 0.00e+00 | 0.17% | 92.14% |
| [`regime-high-discount`](../use-cases/09_regime-high-discount.md) | pass | 0.00e+00 | pass | pass | 0.00e+00 | 2.35% | 61.18% |
| [`regime-mill-bound`](../use-cases/10_regime-mill-bound.md) | pass | 0.00e+00 | pass | pass | 0.00e+00 | 3.57% | 78.84% |
| [`regime-mining-bound`](../use-cases/11_regime-mining-bound.md) | pass | 0.00e+00 | pass | pass | 0.00e+00 | 2.87% | 75.38% |
| [`ctrl-abundant`](../use-cases/12_ctrl-abundant.md) | pass | 0.00e+00 | pass | pass | 0.00e+00 | 0.26% | 7.02% |
| [`ctrl-degenerate`](../use-cases/13_ctrl-degenerate.md) | pass | 0.00e+00 | pass | pass | 0.00e+00 | 0.00% | 0.00% |
<!-- /generated -->

**The controls prove the machinery is consistent; they do not prove any plan is good.**

## 5. The two control cases

`ctrl-degenerate` has one period, zero discount and unlimited capacity: every plan and the bound equal the
exact ultimate pit, and the recorded gap range is zero. That is the collapse control.

`ctrl-abundant` relaxes capacity but keeps eight periods, positive discount and slope precedence. It is a
sensitivity diagnostic, not a collapse: discounted timing and precedence still separate the methods, and
its row in the controls table shows by how much. Loose capacity alone does not make the choice of
extraction period irrelevant.

## Where it lives

`data-pipeline/pipeline/stages/evaluate.py::run_controls`, `pipeline/core/manifest.py::best_comparable`,
`data-pipeline/pipeline/pipeline.py::_validate` (the per-plan check at bake time) and
`scripts/check_artifacts.py` (the same check on the committed artifacts, in CI and before deploy).
