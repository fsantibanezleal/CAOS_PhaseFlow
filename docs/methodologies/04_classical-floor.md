# 04 · The classical floor: bench by bench and nested shells

What a planner or a textbook would do. These rungs are here so the state-of-the-art rungs have
something to beat: a method comparison with no floor in it is a marketing chart. Both are built in the
most FAVOURABLE reading of the classical practice, because a weak straw man flatters every rung above it.
(The two classical TopoSort weights, greedy and Gershon, are on [03](03_toposort.md).)

## 1. `bench-by-bench`

Mine the top bench out completely, then the next. Its weight is the level, so the topological order is
a strict descent through the benches:

$$
w^{\text{bench}}_b=\text{level}_b\cdot 10^{6}-\epsilon\, b .
$$

It is not a straw man: it is what a schedule degenerates to when nobody optimises, and its gap is the
number every other rung implicitly claims to improve on. On deposits whose value sits deep it is
strongly negative in the early periods (a gap above 100 percent means a negative NPV).

## 2. `nested-shells`: the industry's four-step chain as a weight

Chicoisne et al. ([doi:10.1287/opre.1120.1050](https://doi.org/10.1287/opre.1120.1050), section 1,
Figure 1) describe industrial practice in four steps:

1. a decreasing sequence of cost vectors $\pi^1>\pi^2>\dots>\pi^k$ is chosen and $\mathrm{UPL}(\pi^i)$ is
   solved for each; it is well known (Lerchs and Grossmann 1965, Matheron 1975) that this gives
   **nested** pits $P^1\subseteq P^2\subseteq\dots\subseteq P^k$;
2. **pushbacks** are the differences of consecutive pits, $F^i=P^i\setminus P^{i-1}$;
3. pushbacks are subdivided into **bench-phases**;
4. bench-phases are assigned to **periods** so that capacities hold. Only then is each block given a
   destination, usually by a cutoff grade.

PhaseFlow collapses the chain into a weight. The ultimate pit is solved for twelve descending revenue
factors from 1.0 to 0.35, scaling the positive values only:

$$
P(\rho)=\arg\max_{x\ \text{closed}}\ \sum_b\bigl(\rho\,p_b^{+}+p_b^{-}\bigr)x_b,\qquad \rho_1>\rho_2\ \Rightarrow\ P(\rho_2)\subseteq P(\rho_1),
$$

and a block's shell is the smallest revenue factor at which it is still in the pit; inner shells are
mined first:

$$
w^{\text{shell}}_b=-\min\{k:\ b\in P(\rho_k)\}.
$$

Descending order matters for cost as well as correctness: each pit is contained in the previous one,
so every solve after the first runs on the shrinking difference and the twelve closures cost little
more than one.

![Nested pits by revenue factor become the pushback order](../assets/nested-shells.svg)

**What this gives the classical method that reality does not.** Every shell is taken, in order, with no
manual pushback selection and no smoothing, and capacity is respected by the same walk the other rungs
use. In practice, as Morales, Jelvez, Nancel-Penard, Marinho and Guimaraes record (APCOM 2015, 1040-1051,
[delphoslab.cl](https://delphoslab.cl/Publicaciones/2015/MJNMG_A2015.pdf)), "only steps 1 and 3 are
based on optimization models or known algorithms, but the pushback selection is made by the planner",
and "compliance with the constraints is something that the planner must ensure".

## 3. Why the shell order caps the schedule: the gap problem

Meagher, Dimitrakopoulos and Avis ([doi:10.1134/S1062739114030132](https://doi.org/10.1134/S1062739114030132))
review why nested pits make poor pushbacks: "(a) not considering requirements in grade and ore quality
parameters; (b) ignoring the in-situ grade uncertainty; (c) large variations in size of the pushbacks,
or so-termed 'gap' leading to impractical results; (d) not considering discounting during the
optimization". A pit for one revenue factor "may be disconnected", so a single pushback can have
sections physically far apart, and the Lerchs-Grossmann algorithm offers no way to produce a closure of
a given size. Their conclusion is the sentence that justifies this product:

> "It is impossible to generate a truly optimal production schedule using sub-optimally designed
> pushbacks."

**How large is the difference in practice?** Smaller than often claimed, and this product does not
oversell it. Morales et al. 2015 ran two direct-block-scheduling engines against MineLib and Whittle on
three instances; total discounted values differ by low single-digit percentages (McLaughlin: Whittle
1,492 M against BOS2 1,510 M, 1.2 percent). What differs enormously is the geometry and the effort:
"the schedule using Whittle required about 15 hours of a well-qualified planner for a series of tests",
against one to one and a half hours for a single optimisation run, and "very big differences" in pit
geometry, "especially in the first time periods". A frequently repeated claim of a 47 percent NPV gain
on a Brazilian iron ore project was found only in secondary summaries and is **not** used here.

## 4. Measured on every case

<!-- generated:methods:bench-by-bench,nested-shells -->
<!-- /generated -->

## Where it lives

`data-pipeline/pipeline/stages/solve.py::_bench_weights`, `::_shell_weights` (the weights);
`oreblocks.max_closure_within` (the nested closures); `oreblocks.toposort_schedule` (the walk).
