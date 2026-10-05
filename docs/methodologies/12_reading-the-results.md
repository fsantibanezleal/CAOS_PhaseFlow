# 12 · Reading the results

How to read the numbers the ladder produces, which comparisons are legitimate, and what the controls
prove and do not prove. Every table on this page is generated from the committed manifests.

## 1. The ladder at a glance

Each method across the whole case matrix: how many cases it ran on, its gap distribution against the bound
of its own problem, how often it was the best comparable plan, and its median cost.

<!-- generated:ladder -->
<!-- /generated -->

## 2. Only compare through the same bound of the same problem

| comparison | legitimate | why |
|---|---|---|
| classical against sota against learned, same case | yes | same problem, same bound |
| `min-width` against the plan it smooths | yes | a feasible CPIT plan under the same capacities; the difference is the cost of operability |
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
