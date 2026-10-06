# 02 · The certified bound

CPIT is NP-hard, so PhaseFlow does not claim an optimum. It computes a **certified upper bound** first
and reports every plan's distance from it. Three bounds are computed, each for a reason:

| bound | problem | how | when it is exact |
|---|---|---|---|
| critical multiplier algorithm | CPIT, one resource | parametric maximum closures, no LP solver | always, for one resource per period |
| Algorithm 4 | CPIT, several resources | the smallest of the single-resource bounds | when one resource determines the LP |
| joint LP (Bienstock-Zuckerberg) | CPIT, all resources at once | column generation, maximum-closure pricing | it is the LP value |
| PCPSP LP | PCPSP, destinations chosen | one sparse LP by HiGHS; above 1.1 million rows its Lagrangian dual by maximum closures | it is the LP value (the dual: up to the rounding slack) |

![Where a gap comes from on newman1: bound slack, integrality, method loss](../assets/the-two-bounds.svg)

## 1. The LP relaxation, decomposed

Relaxing $x_{bt}\in\{0,1\}$ to $0\le x_{bt}\le 1$ gives a valid upper bound, and the fractional
solution says how much of each block the relaxation wants mined by each period. The difficulty is size:
$nT$ variables and arcs-times-periods precedence rows. Chicoisne, Espinoza, Goycoolea, Moreno and
Rubio ([doi:10.1287/opre.1120.1050](https://doi.org/10.1287/opre.1120.1050)) remove it in two steps.

**Abel summation.** The objective over increments rewrites as a positively weighted sum over the
CUMULATIVE pits:

$$
\sum_{t=1}^{T}d_t\,(x_t-x_{t-1})\cdot p=\sum_{t=1}^{T}\gamma_t\,(x_t\cdot p),\qquad \gamma_t=d_t-d_{t+1}>0,\ \ \gamma_T=d_T .
$$

Discount factors decrease, so every weight is positive, and maximising a positively weighted sum of
independent terms is maximising each term.

**Cumulative capacity.** Relaxing the per-period capacities into $U_t=\sum_{s\le t}c_s$ removes the
only coupling between periods and leaves $T$ independent problems:

$$
\mathrm{CP}(U_t)=\max\ p\cdot x\quad\text{s.t.}\quad x\ \text{closed},\quad a\cdot x\le U_t,\quad 0\le x\le 1 .
$$

Their optima nest (more capacity can only admit a larger pit), so stacking them gives a monotone
solution that is feasible for the original relaxation, and **Theorem 3.1** proves it optimal. With ONE
resource per period nothing was lost.

## 2. The critical multiplier algorithm

Each $\mathrm{CP}(U)$ is solved by pricing the resource. For a multiplier $\lambda$, the ultimate pit
of $p-\lambda a$ is a maximum closure; as $\lambda$ grows every block's value falls in proportion to
its resource use, so the pit shrinks. $z(\lambda)=\mathrm{UPL}(p-\lambda a)$ is convex and piecewise
linear with finitely many break-points whose pits nest (Propositions 3.1 and 3.2). With $b^u\ge U\ge b^l$
the resource use of the two bracketing pits,

$$
\alpha=\frac{b^{u}-U}{b^{u}-b^{l}},\qquad x=\alpha\,x^{l}+(1-\alpha)\,x^{u},\qquad a\cdot x=U,
$$

is optimal, and strong duality states the certificate that it has been found:

$$
\mathrm{CP}(U)=\min_{\lambda\ge 0}\bigl[\,z(\lambda)+\lambda U\,\bigr].
$$

The whole bound is a sequence of maximum closures, $O(mn\log n)$, with **no LP solver**. The authors
measured 12 s on Marvin (53,668 blocks, 606,403 precedences) where CPLEX took more than an hour, and
2 min 36 s on AsiaMine (772,800 blocks) where CPLEX ran for more than ten days. It is also why the bound
is recomputed in the browser when a control moves.

![Parametric pits: each step of z(lambda) is one maximum closure](../assets/parametric-pits.svg)

### The stopping rule is a certificate, not a tolerance

The search refines until the primal estimate and the dual expression agree (relative 1e-9). When they
do, the two bracketing pits are provably consecutive break-points. An earlier version stopped when the
$\lambda$ interval was narrow; a narrow interval can still straddle an unexplored break-point, and the
duality assertion caught it doing so. **A tolerance on an input is not evidence about an output.**

### Two choices that make it fast and keep it right

The break-points do not depend on the period, only the target capacity does, so pits found for one
period are cached and reused by the others, and each new closure is restricted to the smallest known
pit that must contain it. On the published `newman1.cpit` that cut the closure solves from 91 and 89
to 34 and 45 per resource, with identical bounds and schedules (a test asserts it).

## 3. Algorithm 4: two resources

With a mining and a plant capacity in every period, the critical multiplier algorithm cannot run on
the full problem. Algorithm 4 (same paper) drops all resources but one, solves that relaxation exactly,
repeats for each resource, keeps the **smallest** objective as the bound and the best of the feasible
plans each relaxation seeds:

$$
Z^{\text{Alg4}}=\min_{r}\ Z^{\mathrm{LP}}_{\{r\}}\ \ge\ Z^{\mathrm{LP}}_{\text{joint}}\ \ge\ Z^{*}.
$$

Each single-resource problem relaxes the two-resource one, so the bound is certified. It is looser than
the joint LP whenever the resources bind in different periods, and then a reported gap mixes the slack
of the bound with the loss of the plan, which is why the joint bound is computed wherever it can be.

## 4. Bienstock-Zuckerberg: the joint bound

Bienstock and Zuckerberg (IPCO 2010,
[doi:10.1007/978-3-642-13036-6_1](https://doi.org/10.1007/978-3-642-13036-6_1)); the implementable
form is Munoz, Espinoza, Goycoolea, Moreno, Queyranne and Rivera Letelier
([doi:10.1007/s10589-017-9946-1](https://doi.org/10.1007/s10589-017-9946-1)), which recasts it as
column generation. The problem is a **general precedence-constrained problem**:

$$
Z^{*}=\max\ c^{\top}z\quad\text{s.t.}\quad z_i\le z_j\ \ \forall(i,j)\in I,\qquad Hz\le h,\qquad z\in\{0,1\}^{n}.
$$

CPIT becomes one by **time expansion**: node $(b,t)$ is the cumulative variable $x_{bt}$, precedence
arcs repeat in every period, monotonicity adds $x_{bt}\le x_{b,t+1}$, and each capacity row carries a
positive coefficient on $(b,t)$ and a negative one on $(b,t-1)$. Side rows with negative entries are
why this needs BZ rather than a second parametric closure.

![The time-expanded graph and the column-generation loop](../assets/time-expanded-bz.svg)

The restricted master runs over a partition of the nodes into groups whose variables are equated
(orthogonal 0-1 generator columns), which contracts the LP while keeping its structure. Its duals price
the side rows; the pricing problem $\max\ (c-\pi^{\top}H)^{\top}v$ over closures is one maximum closure,
one minimum cut. The partition is refined with the new set,

$$
\{v^j\wedge v\}\ \cup\ \{v^j\setminus v\}\ \cup\ \{v\setminus\textstyle\bigcup_j v^j\},
$$

which keeps the columns orthogonal and adds at most $2r+1$, and it is coarsened only after a strict
improvement, which prevents cycling.

**What it is worth.** $Z^{BZ}=Z^{LP}$, proven, because $\{z: z_i\le z_j\}$ is totally unimodular: the
bound is no tighter than the LP. What BZ gives is the JOINT bound over all resources, which Algorithm 4
cannot, at a scale where a general solver produces nothing. Its authors measured 40 s on `zuck_medium`
against 954,405 s for CPLEX 12.6, which solved only the five smallest of fifteen instances.

**What makes the number trustworthy here.** On a single-resource instance BZ and the critical multiplier
algorithm, two unrelated algorithms, compute the same LP and must agree to machine precision; that is a
test. Pricing uses a compiled maximum flow with node weights rounded UP, so a rounded pricing value can
only over-estimate the closure and stays a bound; the final value is then **certified by one exact
closure at the final dual vector**. That certification is a pure-Python max-flow, and it is what the
budget measures: 130,000 nodes, 1.4 million edges, 240 s. A case above it keeps the Algorithm 4 bound
and says so in the trace. Near-degenerate cases can end a fraction of a part per million above
Algorithm 4 inside the BZ tolerance; the smaller certified value is used and both are recorded.

## 5. The PCPSP LP: the yardstick of the destination plans

The CPIT bound does not bound a plan that chooses destinations: PCPSP is the richer problem and its
optimum can be far above the CPIT LP. Its relaxation is assembled as one sparse LP and solved with HiGHS
(Huangfu and Hall, *Mathematical Programming Computation* 10(1):119-142, 2018,
[doi:10.1007/s12532-017-0130-5](https://doi.org/10.1007/s12532-017-0130-5)): cumulative extraction
$x_{bt}$, destination fractions $y_{bdt}$,

$$
\sum_{d}y_{bdt}=x_{bt}-x_{b,t-1},\qquad \sum_{b,d}q_{rbd}\,y_{bdt}\le c_{rt},\qquad x_{bt}\le x_{at},\qquad x_{bt}\le x_{b,t+1},\qquad 0\le x,y\le 1,
$$

over **every** block of the instance: the ultimate-pit reduction is proven for CPIT and is not assumed
for PCPSP. The model has $nT(1+D)$ variables and about $n(T-1)+mT+nT+RT$ rows (19,080 and 35,204 on
`newman1`). On `newman1.pcpsp` it gives 24,486,549.02, the published PCPSP LP bound (Jelvez et al. 2018,
Table 3) to the unit. Its solution is also read: each block's dominant destination is what the
destination plans are built on ([09](09_destinations.md)).

### 5.1 The row budget, measured

HiGHS solves the LP directly up to **1.1 million rows**. The budget is a measurement, not a guess: the
large porphyry twin (10,976 blocks, 1,082,684 rows) solved in 2.65 hours in the release bake; two of
the three 14,400-block twins (1,435,220 rows) had not finished after six and a half hours with HiGHS's
default method; and the interior-point method was slower than the simplex where both were run
(`twin-porphyry-s`: unfinished at 1,700 s, against about 18 minutes for the simplex).

### 5.2 Above the budget: the Lagrangian dual by maximum closures

![The PCPSP bound by its Lagrangian dual: prices, one closure, and the cutting-plane loop](../assets/pcpsp-lagrangian.svg)

Dualise the $RT$ resource rows with multipliers $\mu_{rt}\ge 0$. What is left couples blocks only
through precedence: each block in each period takes the destination worth most at those prices, and by
Abel summation the cumulative extraction is a maximum closure on the time-expanded graph of section 4,

$$
g_{bt}(\mu)=\max_{d}\Bigl(\gamma_t v_{bd}-\sum_{r}\mu_{rt}\,q_{rbd}\Bigr),\qquad
L(\mu)=\sum_{r,t}\mu_{rt}\,c_{rt}+\max_{x\ \text{closed}}\ \sum_{b,t}\bigl(g_{bt}-g_{b,t+1}\bigr)\,x_{bt},
$$

with $g_{b,T+1}=0$ and a block whose every destination is forbidden priced out of the closure.

- **Every $\mu\ge 0$ gives a valid bound** (weak duality), and the compiled max-flow rounds the weights
  up, so a computed $L(\mu)$ can only over-estimate: the bound holds at any iteration, including one
  stopped early.
- **The best $\mu$ gives the LP value.** The inner problem is a closure, whose constraint matrix is
  totally unimodular, so the Lagrangian subproblem has the integrality property and the dual has no gap
  with the LP (Geoffrion, *Lagrangean relaxation for integer programming*, Mathematical Programming
  Studies, 82-114, 1974, [doi:10.1007/BFb0120690](https://doi.org/10.1007/BFb0120690)). What is
  left is the rounding slack, recorded with the bound.
- **The multipliers** move by a cutting-plane method in the $RT$ prices with a box trust region around
  the best point: a serious step (the new value beats the best by a tenth of the model's predicted
  decrease) doubles the box, a null step shrinks it by 0.7. It stops when the model's lower estimate is
  within $\max(10^{-6}|L|,\,2\,\text{slack})$ of the best value with the box not binding, after 40
  iterations without a serious step, or at 400 iterations. The status, the iteration count, the
  master's gap estimate and the slack go into the bound report.
- **The relaxed solution at the best $\mu$** mines each block whole and sends it to one destination,
  which is what the re-cut fixes, exactly as the LP's dominant destinations are used below the budget.

Where both run they agree: within $2\times10^{-6}$ of the LP on the engine's test instances, and
316,476,932 against 316,475,407 on `twin-porphyry-s` (4.8 parts per million), in 166 seconds in a
standalone run against 17.9 minutes for HiGHS in the release bake. The manifest names the dual where it
was used (`pcpsp_lp_method`; an absent key is the HiGHS LP, so the record of a HiGHS case is the one it
had before the dual existed), and every table that shows the bound says which.

### 5.3 Checks

Three checks make it trustworthy, each visible in the tables below: it reproduces the published value
on `newman1`; where only the fleet binds it equals the CPIT bound (Lane's mine-limited cutoff is
break-even, so the destination freedom is worth nothing there); and it never sits below the joint CPIT
LP, which the artifact check enforces.

## 6. Measured on every case

Every bound of every case, with its time. The slack of Algorithm 4 is the part of a CPIT gap that
belongs to the bound; where the joint LP is above the budget the case keeps Algorithm 4.

<!-- generated:bounds -->
| case | Algorithm 4 | time | joint LP (BZ) | time | slack of Algorithm 4 | PCPSP LP | by | time |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | ---: |
| [`newman1-published`](../use-cases/01_newman1-published.md) | 24,487,410 | 2.1 s | 24,486,184 | 2.7 s | 0.0050% | 24,486,549 | HiGHS LP | 3.2 s |
| [`zuck-small-declared`](../use-cases/02_zuck-small-declared.md) | 719,234,226 | 10.3 min | 719,234,226 | 2.0 min | 0.0000% | - | - | - |
| [`kd-declared`](../use-cases/03_kd-declared.md) | 254,345,711 | 20.4 min | above budget | - | - | - | - | - |
| [`twin-porphyry-s`](../use-cases/04_twin-porphyry-s.md) | 234,230,542 | 25.5 s | 234,230,542 | 7.7 s | 0.0000% | 316,475,407 | HiGHS LP | 17.9 min |
| [`twin-porphyry-l`](../use-cases/05_twin-porphyry-l.md) | 326,536,185 | 73.6 s | 326,536,185 | 33.0 s | 0.0000% | 442,009,363 | HiGHS LP | 2.65 h |
| [`twin-core-halo`](../use-cases/06_twin-core-halo.md) | 97,374,026 | 65.0 s | above budget | - | - | 131,860,392 | Lagrangian dual (74 it.) | 40.9 s |
| [`twin-layered`](../use-cases/07_twin-layered.md) | 1,111,128,369 | 106.5 s | above budget | - | - | 1,365,530,202 | Lagrangian dual (109 it.) | 68.8 s |
| [`twin-vein`](../use-cases/08_twin-vein.md) | 285,385,074 | 112.2 s | above budget | - | - | 370,316,501 | Lagrangian dual (337 it.) | 15.2 min |
| [`regime-high-discount`](../use-cases/09_regime-high-discount.md) | 184,634,637 | 37.6 s | 184,634,637 | 13.6 s | 0.0000% | 256,466,648 | HiGHS LP | 19.7 min |
| [`regime-mill-bound`](../use-cases/10_regime-mill-bound.md) | 129,686,447 | 34.7 s | 129,686,447 | 19.3 s | 0.0000% | 207,638,997 | HiGHS LP | 27.4 min |
| [`regime-mining-bound`](../use-cases/11_regime-mining-bound.md) | 187,991,036 | 52.4 s | 187,991,077 | 22.7 s | none (BZ ended 0.22 ppm above, inside its tolerance) | 187,991,036 | HiGHS LP | 95.7 min |
| [`ctrl-abundant`](../use-cases/12_ctrl-abundant.md) | 428,750,527 | 19.3 s | 428,750,584 | 11.5 s | none (BZ ended 0.13 ppm above, inside its tolerance) | 438,824,759 | HiGHS LP | 99.9 s |
| [`ctrl-degenerate`](../use-cases/13_ctrl-degenerate.md) | 473,615,066 | 98 ms | one resource: Algorithm 4 is exact | - | - | 473,615,066 | HiGHS LP | 236 ms |
<!-- /generated -->

## 7. The gap

$$
\text{gap}=\frac{Z^{\text{bound}}-Z^{\text{plan}}}{Z^{\text{bound}}},
$$

the definition MineLib results are published under (Jelvez et al. 2018, equation 12), always against
the bound of the plan's own problem. The selected bound-to-plan distance can still contain three things
that only an integer optimum separates (bound slack, integrality, method loss); see
[12, reading the results](12_reading-the-results.md) and the [newman1 use case](../use-cases/01_newman1-published.md),
the only case with an external integer optimum.

## Where it lives

`oreblocks.cpit_lp_relaxation`, `oreblocks.cpit_bound_two_resources`, `oreblocks.solve_gpcp_lp`,
`oreblocks.pcpsp_lp_bound` and `oreblocks.pcpsp_lagrangian_bound` (engine, PyPI);
`data-pipeline/pipeline/stages/solve.py::run_ladder` (budgets, `PCPSP_LP_MAX_ROWS`, and the bound report); `frontend/src/engine/cpit.ts` (the browser's critical multiplier algorithm, held
to the trace by `frontend/test/parity.test.ts`).
