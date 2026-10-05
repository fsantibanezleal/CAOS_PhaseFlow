# 01 · The formulations: UPIT, CPIT, PCPSP, OPBSP

Every method in this product solves, bounds or approximates one of four problems. They are stated here
exactly, from the primary sources, because the difference between them decides which bound may score
which plan, and a plan scored against the wrong bound is a number with the wrong scale.

MineLib (Espinoza, Goycoolea, Moreno and Newman, *Annals of Operations Research* 206(1):93-114, 2013,
[doi:10.1007/s10479-012-1258-3](https://doi.org/10.1007/s10479-012-1258-3)) publishes instances for
three classical problems; Jelvez, Morales and Nancel-Penard (MPES 2018,
[doi:10.1007/978-3-319-99220-4_18](https://doi.org/10.1007/978-3-319-99220-4_18)) state the distinction
in one paragraph:

> "the simplest problem in open-pit mine production planning is called Ultimate Pit (UPIT) Limit
> Problem and includes the selection of a subset of blocks that contains the maximum undiscounted value
> under slope precedence constraints. The time is not considered in this problem. Second, a generalized
> extension of the ultimate pit limit problem is the Constrained Pit Limit Problem (CPIT). This model
> incorporates temporal dimension, scheduling blocks for extraction over a fixed number of periods,
> maximizing discounted value under both slope precedence and capacity constraints, in which block
> destinations are fixed in advance. The Precedence Constrained Production Scheduling Problem (PCPSP)
> extends the last one mainly by considering multiple possible destinations for the blocks (therefore
> the model decides which one is the optimal choice) and respecting general side constraints, such as
> blending (where the quality of processed material is controlled)."

CPIT fixes the destination in advance; PCPSP lets the model choose. The step between them is not
accounting, it is a different problem with a different optimum and different bounds.

![The four problems and how their feasible sets nest](../assets/problem-ladder.svg)

## 1. UPIT: which blocks are worth mining

Let $\mathcal B$ be the blocks, $\mathcal A$ the immediate precedence arcs, $(a,b)\in\mathcal A$ meaning
block $a$ must be mined before block $b$ (it sits above $b$, inside the slope cone), and
$p_b=\max_d p_{bd}$ the best undiscounted value of block $b$ over its destinations. Chicoisne,
Espinoza, Goycoolea, Moreno and Rubio (*Operations Research* 60(3):517-528, 2012,
[doi:10.1287/opre.1120.1050](https://doi.org/10.1287/opre.1120.1050)), equations (1a)-(1c):

$$
\mathrm{UPL}(p)=\max\sum_{b\in\mathcal B}p_b\,x_b\quad\text{s.t.}\quad x_b\le x_a\ \ \forall(a,b)\in\mathcal A,\qquad x_b\in\{0,1\}.
$$

Lerchs and Grossmann (1965) observed that this is the **maximum closure** of a graph; Picard (1976,
[doi:10.1287/mnsc.22.11.1268](https://doi.org/10.1287/mnsc.22.11.1268)) reduced it to a minimum cut,
so it is solved exactly in polynomial time. The constraint matrix is totally unimodular, so the LP
relaxation already has an integral optimum. Meagher, Dimitrakopoulos and Avis
([doi:10.1134/S1062739114030132](https://doi.org/10.1134/S1062739114030132)): "there is a one-to-one
mapping between feasible pit limit designs and graph closures". UPIT is the subject of the ultimate-pit
products in this line, not of this one; here it is a building block: every bound below is a sequence
of maximum closures.

## 2. CPIT: when to mine each block

Chicoisne et al. 2012, equations (3a)-(3f), in **cumulative** variables: $x_{bt}=1$ when block $b$ has
been mined by the END of period $t$, so a block mined in period four has
$x_{b1}=x_{b2}=x_{b3}=0$ and $x_{b4}=\dots=x_{bT}=1$, and what is mined IN period $t$ is
$x_{bt}-x_{b,t-1}$:

$$
\begin{aligned}
\max\ & \sum_{b\in\mathcal B}\sum_{t=1}^{T}p_{bt}\,\bigl(x_{bt}-x_{b,t-1}\bigr) && \text{(3a)}\\
\text{s.t.}\ & \sum_{b}a_{rb}\,\bigl(x_{bt}-x_{b,t-1}\bigr)\le c_{rt} && \forall r,t\quad\text{(3b)}\\
& x_{bt}\le x_{at} && \forall(a,b)\in\mathcal A,\ \forall t\quad\text{(3c)}\\
& x_{bt}\le x_{b,t+1} && \forall b,\ t<T\quad\text{(3d)}\\
& x_{bt}\in\{0,1\},\quad x_{b0}=0 && \text{(3e, 3f)}
\end{aligned}
$$

with $p_{bt}=p_b/(1+\eta)^{t-1}$, $a_{rb}\ge 0$ the amount of resource $r$ block $b$ consumes, and
$c_{rt}$ the availability of resource $r$ in period $t$.

Three details are real defects when missed, and each produces a plausible number:

1. **Precedence holds in EVERY period** (3c), not once at the end. Imposed only on the final pit, it
   allows a schedule that mines a block in year two under rock removed in year three.
2. **Monotonicity is a constraint** (3d). Dropping it lets a block be un-mined.
3. **The destination is decided before the model runs**, folded into $p_b$. The ore and waste tonnages
   a CPIT schedule reports are an integral of a classification fixed in advance, not decisions.

**The discount convention was checked against the published file, not assumed.** With
$d_t=(1+\eta)^{-(t-1)}$ the first period is undiscounted. On MineLib's `newman1` that gives an
Algorithm 4 bound of 24,487,410, just above the CPIT LP bound MineLib publishes (24,486,184), as a
looser relaxation must; discounting the first period as well gives 22,673,528, below the published LP
bound, which therefore cannot be the file's convention. The engine's `period_one_undiscounted` flag
carries the choice.

**Two resources per period.** Real instances carry the tonnes the fleet moves (every block consumes
it) and the tonnes the plant processes (only ore consumes it). `newman1.cpit` declares 2,000,000 and
1,100,000 per period over six periods at eight percent. In aggregate they are loose (5.6 Mt of rock
against 12 Mt of mining capacity, 3.0 Mt of ore against 6.6 Mt of plant) and they bind only in the
early periods, which is exactly where discounting and capacity fight.

## 3. PCPSP and OPBSP: the destination as a decision

Johnson's general form (T. B. Johnson, *Optimum Open Pit Mine Production Scheduling*, PhD thesis,
UC Berkeley, 1968, [doi:10.21236/AD0672094](https://doi.org/10.21236/AD0672094)), as transcribed by
Chicoisne et al. 2012, equations (2a)-(2g), with $x_{bdt}$ the fraction of block $b$ sent to
destination $d$ by period $t$:

$$
\begin{aligned}
\max\ & \sum_{b,d,t}p_{bdt}\,\bigl(x_{bdt}-x_{b,d,t-1}\bigr)\\
\text{s.t.}\ & \sum_{d,b}a_{bdtr}\,\bigl(x_{bdt}-x_{b,d,t-1}\bigr)\le c_{rt} && \forall r,t\\
& \textstyle\sum_{t,d}\bigl(x_{bdt}-x_{b,d,t-1}\bigr)\le 1 && \forall b\\
& x_{bdt}\le x_{adt},\quad x_{b,d,t-1}\le x_{bdt},\quad x_{bd0}=0,\quad 0\le x_{bdt}\le 1.
\end{aligned}
$$

Every destination carries its own value and its own resource use, so the plant resource is consumed
only by blocks the model sends to the plant. Johnson's 1968 model already contained stockpiling
capacity; its absence from most implementations is a simplification, not a gap in the theory.

Jelvez et al. 2018 propose **OPBSP**, the fully binary version: a block goes to exactly one
destination. "OPBSP solutions are feasible for PCPSP as well", so an OPBSP plan is scored against a
PCPSP bound, which is what this product does: its destination plans have binary destinations and are
scored against the PCPSP LP relaxation (see [09, destinations](09_destinations.md)).

**Inclusion.** Fixing every block to its best destination, which is how the CPIT values are built,
turns a PCPSP instance into its CPIT. So every CPIT plan is a PCPSP plan of the same value:

$$
\mathcal F_{\mathrm{CPIT}}\subseteq\mathcal F_{\mathrm{PCPSP}}\ \Rightarrow\ Z^{*}_{\mathrm{CPIT}}\le Z^{*}_{\mathrm{PCPSP}},\qquad Z^{\mathrm{LP}}_{\mathrm{CPIT}}\le Z^{\mathrm{LP}}_{\mathrm{PCPSP}}.
$$

On `newman1` the two published LP bounds differ by 365 units in 24.5 million, so there the destination
freedom can add almost nothing. On a plant-bound deposit it is worth a great deal: on a 320-block twin
with this product's economics, solved exactly, the PCPSP optimum is about 59 percent above the CPIT
optimum (10.37 M against 6.53 M). The reason is the cutoff grade, see [09](09_destinations.md).

## 4. Complexity, and what is safe to say about it

- **UPIT is polynomial**: maximum closure, a minimum cut.
- **CPIT and PCPSP are NP-hard**: adding a single capacity row to a maximum closure gives the
  precedence-constrained knapsack problem. Caccetta and Hill (*Journal of Global Optimization*
  27(2-3):349-365, 2003, [doi:10.1023/A:1024835022186](https://doi.org/10.1023/A:1024835022186)) is the
  standard citation for branch-and-cut on this problem. The specific "strongly NP-complete" result for
  the precedence-constrained knapsack problem is commonly attributed to Johnson and Niemi (1983); that
  paper was not obtained, so it is **not** cited here.
- The practical statement, from Chicoisne et al. 2012's abstract: "the large size of some real
  instances (3-10 million blocks, 15-20 time periods) has made these models impractical for use in real
  planning applications, thus leading to the use of numerous heuristic methods."

## 5. What the LP relaxation gives, three separate facts

1. **It is a valid upper bound.** Relaxing $x\in\{0,1\}$ to $x\in[0,1]$ can only raise the optimum of a
   maximisation. Every gap here is
   $\text{gap}=(Z^{\text{bound}}-Z^{\text{plan}})/Z^{\text{bound}}$, the definition Jelvez et al. use as
   their equation (12).
2. **Bienstock-Zuckerberg does not tighten it.** Munoz et al.
   ([doi:10.1007/s10589-017-9946-1](https://doi.org/10.1007/s10589-017-9946-1)) prove $Z^{BZ}=Z^{LP}$:
   the algorithm computes the same bound where a general LP solver cannot. See [02](02_the-bound.md).
3. **It carries a schedule.** From the fractional optimum, each block's expected extraction time
   $E_b=\sum_{t=1}^{T}t\,(x^{*}_{bt}-x^{*}_{b,t-1})+(T+1)(1-x^{*}_{bT})$ is the weight that drives the
   best published rounding (Chicoisne et al. section 3.2). The relaxation is not only the yardstick, it
   is the seed of the plan. See [03](03_toposort.md). The PCPSP relaxation seeds the destination plans
   in the same spirit, through its destinations rather than its times ([09](09_destinations.md)).

## 6. The control that inherits from the formulation

At discount rate 0 with unlimited capacity, CPIT collapses to UPIT: the mined set must equal the exact
ultimate pit block for block, and the LP bound must equal the exact UPIT value. That is the duality
control run on every case (see [12, reading the results](12_reading-the-results.md)); an engine that
fails it is broken in a way no visual inspection would catch.

## What this page is not

It does not claim an optimum for any CPIT or PCPSP instance in this product: the only integer optimum
quoted for a product case is an external one for `newman1`
([use case 01](../use-cases/01_newman1-published.md)). Stockpiles, blending rows and minimum-production
rows are part of the wider family and are not solved here ([09](09_destinations.md)).
