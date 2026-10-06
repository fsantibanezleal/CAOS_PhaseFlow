# 09 · Destinations: the cutoff as an output, and the re-cut

## 1. The distinction, in one sentence

CPIT fixes each block's destination **before** the model runs, folded into a single net value; PCPSP lets
the model choose (Jelvez, Morales and Nancel-Penard,
[doi:10.1007/978-3-319-99220-4_18](https://doi.org/10.1007/978-3-319-99220-4_18)):

> "The Precedence Constrained Production Scheduling Problem (PCPSP) extends the last one mainly by
> considering multiple possible destinations for the blocks (therefore the model decides which one is
> the optimal choice) and respecting general side constraints, such as blending."

That step is not accounting: it is a richer feasible set ([01](01_formulations.md)), so every destination
plan is scored against the PCPSP LP, never against the CPIT bound.

## 2. What the decision is worth, and why a value comparison cannot make it

When the plant binds, the destination decision is a decision about **which ore gets the plant**. A rule
that compares a block's two values cannot make it: a marginal ore block has a positive plant value and a
negative dump value, so the comparison always sends it to the plant, and the plant tonnage it takes is
gone for the richer ore below it.

Lane's cutoff theory (K. F. Lane, *The Economic Definition of Ore: Cut-off Grades in Theory and
Practice*, 1988) names what is missing. With $h$ the processing cost per tonne, $p$ the price, $k$ the
selling cost, $y$ the recovery, $F=\delta V+f$ the cost of time per period (the discount rate times the
remaining value, plus fixed cost) and $M$ the mill capacity:

$$
g_{\text{mine}}=g_{\text{break-even}}=\frac{h}{y\,(p-k)},\qquad g_{\text{mill}}=\frac{h+F/M}{y\,(p-k)} .
$$

With the fleet as the bottleneck the cutoff IS break-even, because ore and waste consume a mining hour
alike and the opportunity cost cancels out of the comparison; with the mill as the bottleneck it rises
by the mill's opportunity cost. (These are the formulas `oreblocks.lane_cutoffs` implements and tests;
its market-limiting cutoff carried a `1/recovery^2` error until oreblocks 0.5.1.) The opportunity cost is
a price on the plant capacity, and the **PCPSP relaxation is what computes it**.

How much it is worth was settled by solving the integer problem exactly on a small twin with this
product's economics and the `twin-porphyry-s` scenario, 320 blocks, HiGHS, 300 s per solve:

| | value |
|---|---:|
| exact CPIT (destinations fixed at the best value) | 6.53 M (MIP bound 6.55 M) |
| exact OPBSP (destinations chosen) | 10.37 M (MIP bound 10.50 M) |
| PCPSP LP | 11.01 M |
| a rule comparing the two values (oreblocks 0.6.0 `destination_toposort`) | -0.79 M |
| the re-cut scheduled by the sliding window (below) | 10.15 M |

The destination freedom is worth about 59 percent there, the PCPSP LP is about 5 percent above the
integer optimum, and the value-comparison rule did not merely miss the gain, it lost money. The three
checks below confirm the LP is right where the freedom is worth nothing: on the mining-bound regime the
PCPSP LP equals the CPIT bound (Lane's mine-limited result), on the degenerate control it is equal, and on
`newman1` it is 365 units above the CPIT LP.

## 3. The re-cut: the relaxation chooses, the CPIT machinery schedules

![Which ore gets a binding plant, and the chain that schedules the re-cut](../assets/the-recut.svg)

1. **Solve the PCPSP LP** ([02](02_the-bound.md), section 5: HiGHS up to 1.1 million rows, its
   Lagrangian dual by maximum closures above that) and read its solution: each block the LP mines goes
   to the destination it sends most of the block to, $d^{*}_b=\arg\max_d\sum_t y^{\mathrm{LP}}_{bdt}$; a
   block the LP leaves unmined keeps every destination. Above the budget the relaxed solution at the
   best multipliers already mines each block whole and sends it to one destination, the one worth most
   at the capacity prices, and that destination is $d^{*}_b$.
2. **Restrict the instance** to those destinations. Its CPIT reduction has values
   $\tilde p_b=p_{b,d^{*}_b}$ and resource coefficients $\tilde a_{rb}=a_{r,b,d^{*}_b}$, so every plan of it
   is a plan of the original PCPSP **with the same value**:
   $\mathcal F_{\text{re-cut}}\subseteq\mathcal F_{\mathrm{PCPSP}}$.
3. **Schedule it as a CPIT**: its own ultimate pit (dumping marginal ore changes values), its own
   critical-multiplier relaxations, then ExTS (`destination-toposort`) and the sliding window with the
   CPIT rung's settings (`destination-sliding-window`).
4. **Search exactly** with every destination free again: the OPBSP-[D] re-solve starts from the best of
   those two plans and the best CPIT plan lifted to PCPSP, so it can never end below CPIT
   (`destination-local-search`).

The OPBSP-[D] restricted model is the C-PIT[D] model of [06](06_local-search.md) with binary destinations
linked to cumulative extraction for the free blocks,

$$
\sum_{d}z_{idt}=y_{it}-y_{i,t-1},\qquad z_{idt}\in\{0,1\},
$$

forbidden destinations at zero and the fixed blocks' destination-specific resource use subtracted.

**Tried first, and dropped.** Walking the PCPSP LP's OWN expected times with its destinations, the way
ExTS walks the CPIT relaxation. On 1,008 blocks it reached 26.41 M where the re-cut reached 34.31 M with
the sliding window (34.81 M after the search; best fixed-cutoff plan 26.78 M; PCPSP LP 36.03 M). The PCPSP
relaxation mines deep cones fractionally from the first period, paying only part of the overburden and
dumping the marginal ore on the way, so its expected times are a poor order for an integer plan; the CPIT
relaxation of the re-cut instance has no such freedom on the destination side.

## 4. Measured on every case with destination economics

Each destination plan with its gap to the PCPSP bound, its value against the best CPIT plan of the same
case, the blocks it sends to each destination and the range of the effective cutoff (the lowest grade
actually sent to the plant in a period). A gap marked "(dual)" is measured against the Lagrangian dual,
the LP value up to its rounding slack, on a case above the HiGHS row budget. Those three 14,400-block twins
sit 7.8 to 18.9 percent under their bounds where every other case sits within 2.8 percent; with the bound
converged, that distance is the relaxation's integrality gap plus what the re-cut misses, which only an
integer solve could separate:

<!-- generated:destinations -->
| case | method | NPV | gap to the PCPSP bound | against best CPIT plan | blocks to plant / dump | blocks changing destination | effective cutoff range (grade) |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| [`newman1-published`](../use-cases/01_newman1-published.md) | `destination-toposort` | 23,864,349 | 2.54% | -1.18% | 572 / 487 | 0 | 0.004749 to 0.01129 |
| [`newman1-published`](../use-cases/01_newman1-published.md) | `destination-sliding-window` | 24,149,869 | 1.38% | +0.00% | 572 / 487 | 0 | 0.004749 to 0.005214 |
| [`newman1-published`](../use-cases/01_newman1-published.md) | `destination-local-search` | 24,151,564 | 1.37% | +0.01% | 572 / 487 | 0 | 0.004749 to 0.005214 |
| [`twin-porphyry-s`](../use-cases/04_twin-porphyry-s.md) | `destination-toposort` | 285,163,568 | 9.89% | +23.40% | 1,692 / 1,999 | 702 | 0.004747 to 0.006918 |
| [`twin-porphyry-s`](../use-cases/04_twin-porphyry-s.md) | `destination-sliding-window` | 312,574,802 | 1.23% | +35.26% | 1,815 / 1,871 | 702 | 0.004747 to 0.007026 |
| [`twin-porphyry-s`](../use-cases/04_twin-porphyry-s.md) | `destination-local-search` | 313,204,288 | 1.03% | +35.54% | 1,840 / 1,846 | 690 | 0.001144 to 0.007026 |
| [`twin-porphyry-l`](../use-cases/05_twin-porphyry-l.md) | `destination-toposort` | 391,770,770 | 11.37% | +21.90% | 2,405 / 2,915 | 967 | 0.004942 to 0.007497 |
| [`twin-porphyry-l`](../use-cases/05_twin-porphyry-l.md) | `destination-sliding-window` | 435,005,094 | 1.58% | +35.35% | 2,580 / 2,717 | 967 | 0.004631 to 0.007497 |
| [`twin-porphyry-l`](../use-cases/05_twin-porphyry-l.md) | `destination-local-search` | 435,739,549 | 1.42% | +35.58% | 2,608 / 2,689 | 955 | 0.001199 to 0.007345 |
| [`twin-core-halo`](../use-cases/06_twin-core-halo.md) | `destination-toposort` | 110,093,185 | 16.51% (dual) | +16.77% | 1,964 / 3,666 | 762 | 0.001713 to 0.001928 |
| [`twin-core-halo`](../use-cases/06_twin-core-halo.md) | `destination-sliding-window` | 121,471,873 | 7.88% (dual) | +28.84% | 2,041 / 3,275 | 762 | 0.00114 to 0.001972 |
| [`twin-core-halo`](../use-cases/06_twin-core-halo.md) | `destination-local-search` | 121,612,412 | 7.77% (dual) | +28.99% | 2,084 / 3,232 | 730 | 0.001137 to 0.001972 |
| [`twin-layered`](../use-cases/07_twin-layered.md) | `destination-toposort` | 1,199,918,922 | 12.13% (dual) | +11.96% | 5,282 / 3,600 | 2,293 | 0.01284 to 0.0198 |
| [`twin-layered`](../use-cases/07_twin-layered.md) | `destination-sliding-window` | 1,228,207,800 | 10.06% (dual) | +14.60% | 5,478 / 3,600 | 2,293 | 0.005845 to 0.0198 |
| [`twin-layered`](../use-cases/07_twin-layered.md) | `destination-local-search` | 1,239,325,459 | 9.24% (dual) | +15.64% | 5,644 / 3,434 | 2,211 | 0.001238 to 0.0198 |
| [`twin-vein`](../use-cases/08_twin-vein.md) | `destination-toposort` | 299,979,372 | 18.99% (dual) | +5.28% | 2,040 / 2,964 | 551 | 0.001136 to 0.01131 |
| [`twin-vein`](../use-cases/08_twin-vein.md) | `destination-sliding-window` | 298,880,354 | 19.29% (dual) | +4.90% | 1,735 / 2,531 | 551 | 0.001138 to 0.01164 |
| [`twin-vein`](../use-cases/08_twin-vein.md) | `destination-local-search` | 300,153,975 | 18.95% (dual) | +5.34% | 2,040 / 2,964 | 551 | 0.001136 to 0.01131 |
| [`regime-high-discount`](../use-cases/09_regime-high-discount.md) | `destination-toposort` | 225,093,470 | 12.23% | +24.85% | 1,715 / 1,981 | 723 | 0.001183 to 0.007356 |
| [`regime-high-discount`](../use-cases/09_regime-high-discount.md) | `destination-sliding-window` | 249,039,950 | 2.90% | +38.13% | 1,782 / 1,858 | 723 | 0.004497 to 0.007409 |
| [`regime-high-discount`](../use-cases/09_regime-high-discount.md) | `destination-local-search` | 251,018,180 | 2.12% | +39.23% | 1,840 / 1,800 | 690 | 0.001277 to 0.007409 |
| [`regime-mill-bound`](../use-cases/10_regime-mill-bound.md) | `destination-toposort` | 190,273,768 | 8.36% | +52.15% | 1,129 / 2,250 | 664 | 0.008898 to 0.01197 |
| [`regime-mill-bound`](../use-cases/10_regime-mill-bound.md) | `destination-sliding-window` | 206,393,886 | 0.60% | +65.04% | 1,175 / 2,103 | 664 | 0.008797 to 0.01193 |
| [`regime-mill-bound`](../use-cases/10_regime-mill-bound.md) | `destination-local-search` | 206,469,921 | 0.56% | +65.10% | 1,176 / 2,102 | 664 | 0.007847 to 0.01193 |
| [`regime-mining-bound`](../use-cases/11_regime-mining-bound.md) | `destination-toposort` | 173,833,945 | 7.53% | -4.80% | 1,707 / 369 | 0 | 0.001137 to 0.001174 |
| [`regime-mining-bound`](../use-cases/11_regime-mining-bound.md) | `destination-sliding-window` | 182,599,408 | 2.87% | +0.00% | 1,703 / 373 | 0 | 0.001137 to 0.001192 |
| [`regime-mining-bound`](../use-cases/11_regime-mining-bound.md) | `destination-local-search` | 182,788,398 | 2.77% | +0.10% | 1,703 / 373 | 0 | 0.001137 to 0.001192 |
| [`ctrl-abundant`](../use-cases/12_ctrl-abundant.md) | `destination-toposort` | 437,075,858 | 0.40% | +2.21% | 3,013 / 1,608 | 669 | 0.001139 to 0.002301 |
| [`ctrl-abundant`](../use-cases/12_ctrl-abundant.md) | `destination-sliding-window` | 437,839,664 | 0.22% | +2.38% | 3,013 / 1,608 | 669 | 0.001139 to 0.002295 |
| [`ctrl-abundant`](../use-cases/12_ctrl-abundant.md) | `destination-local-search` | 437,965,112 | 0.20% | +2.41% | 3,045 / 1,576 | 637 | 0.001139 to 0.002295 |
| [`ctrl-degenerate`](../use-cases/13_ctrl-degenerate.md) | `destination-toposort` | 473,615,066 | 0.00% | +0.00% | 3,682 / 939 | 0 | 0.001137 to 0.001137 |
| [`ctrl-degenerate`](../use-cases/13_ctrl-degenerate.md) | `destination-sliding-window` | 473,615,066 | 0.00% | +0.00% | 3,682 / 939 | 0 | 0.001137 to 0.001137 |
| [`ctrl-degenerate`](../use-cases/13_ctrl-degenerate.md) | `destination-local-search` | 473,615,066 | 0.00% | +0.00% | 3,682 / 939 | 0 | 0.001137 to 0.001137 |
<!-- /generated -->

## 5. Where the destination economics come from

- **`newman1`** reads its cached MineLib `.pcpsp` file, and the pipeline checks that fixing every block to
  its best destination reproduces the `.cpit` values, capacities and coefficients before using it.
- **The twins** build both destination values from their seeded economics (dump: minus the mining cost;
  plant: recovered revenue less processing, less mining) and run the same CPIT-reduction check.
- **The declared `kd` and `zuck_small` scenarios** have no source PCPSP model and no declared processing
  economics, so the destination rungs are skipped and say why: a fixed-destination value cannot recover
  the alternative destination value that was discarded.

The period chart of a destination plan charges each block's CHOSEN destination's value and resources,
including when a nominal ore block goes to the dump; an earlier version charged the CPIT plant value and
plant tonnage regardless, and reported capacity overruns that did not exist.

## 6. `solve_opbsp_exact`: in the engine, not in the bake

Jelvez et al.'s fully binary formulation solved exactly with HiGHS in $z_{bdt}\in\{0,1\}$ ("block $b$
extracted in period $t$ and sent to destination $d$"). It returns `None` above a size budget rather than
passing a heuristic answer off as an exact one, and it is how the 320-block table above was checked. It is
not run on the product's cases, which are far above any exact budget.

## 7. What is deliberately absent

**Stockpiles.** A stockpile is not a third destination. The metal reclaimed is the tonnes reclaimed times
the average grade of the pile, and that average is a ratio of decision variables, so the honest model is
bilinear:

$$
\text{metal}_t=R_t\cdot\frac{M_t}{S_t},\qquad S_t=S_{t-1}+I_t-R_t,\qquad M_t=M_{t-1}+g^{\text{in}}_tI_t-\frac{M_{t-1}}{S_{t-1}}R_t .
$$

The published linear models exist for that reason (Moreno, Rezakhah, Newman and Ferreira,
[doi:10.1016/j.ejor.2016.12.014](https://doi.org/10.1016/j.ejor.2016.12.014); closed access, its specific
linearisations are not transcribed), and the working technique is to fix the stockpile grade as a
parameter and search over it (Rezakhah, Moreno and Newman,
[doi:10.1016/j.cor.2019.02.001](https://doi.org/10.1016/j.cor.2019.02.001)). The value is fragile: at 5 and
10 percent annual degradation what a stockpile provides falls by 37 and 69 percent (Rezakhah and Newman,
[doi:10.1016/j.cor.2018.11.009](https://doi.org/10.1016/j.cor.2018.11.009)). And under scale pressure
industry removes stockpiles, which "produced mine plans that underestimated production capacity and
flexibility", and reintroducing them afterwards "produced unrealistic mine plans or infeasible solutions"
(Blom, Pearce and Cote, [arXiv:2403.18213](https://arxiv.org/abs/2403.18213)).

**Blending and other general side constraints.** The `.pcpsp` reader carries `NGENERAL_SIDE_CONSTRAINTS`
and the solver does not solve them; an instance that declares them is not being solved as posed, and that
is stated.

## Where it lives

`oreblocks.pcpsp_lp_bound(solution=True)`, `oreblocks.pcpsp_lagrangian_bound`,
`PcpspBound.preferred_destination`, `oreblocks.restrict_destinations`, `oreblocks.lift_to_pcpsp`, `oreblocks.exact_destination_local_search`,
`oreblocks.solve_opbsp_exact`, `oreblocks.lane_cutoffs` (engine 0.6.1); the three rungs in
`data-pipeline/pipeline/stages/solve.py`.
