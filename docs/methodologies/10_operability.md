# 10 · Operability: coherence, minimum width, and what they cost

A block-level schedule is free to pick blocks anywhere, and it does. The authors of the algorithm say so
in their final remarks ([doi:10.1287/opre.1120.1050](https://doi.org/10.1287/opre.1120.1050)):

> "It is likely that the C-PIT solutions are such that blocks scheduled in a same time period are
> scattered throughout the mine. This might lead to schedules that require manual intervention by mining
> engineers to consider additional operational constraints [...] exacerbated by the fact that our minimal
> planning units are blocks rather than bench-phases."

A plan with a high NPV and forty disconnected fragments a year is not a mine plan, and **no NPV chart
shows the difference**. So coherence is measured on every plan of every case, and the cost of making the
best plan more workable is reported rather than hidden.

## 1. What is measured, per period

$$
\kappa_t=\#\,\mathrm{components}_6\bigl(\{b:\tau_b=t\}\bigr),\qquad s_t=\frac{|\text{largest component}|}{|\{b:\tau_b=t\}|},
$$

- **connected components** of the blocks mined in the period, with six-neighbour connectivity: blocks that
  touch only along an edge or a corner are not one mining front;
- **the share held by the largest component**: one coherent pushback with a few satellites is operable,
  five equal blobs are five simultaneous fronts;
- **the narrowest run** of consecutive mined blocks along a bench, a crude proxy for minimum mining width.

Bai, Marcotte, Gamache, Gregory and Lapworth
([doi:10.17159/2411-9717/2018/v118n5a8](https://doi.org/10.17159/2411-9717/2018/v118n5a8)) give the
operational reason: conventional methods produce pushbacks with "narrow benches and pit bottom, irregular
boundaries, and multiple separated components", and manual post-modification "destroys value and violates
resource constraints". They target a minimum width of about 100 m.

## 2. `min-width`: an adaptive opening that keeps the plan feasible

A mined block whose run along its bench is narrower than the target (three blocks) is moved to the period
that the majority of its four bench neighbours belong to, provided

$$
\mathrm{run}(b)<w,\qquad \text{precedence holds in both directions},\qquad a_{\cdot b}\le\text{room}(\tau_{\text{new}}),
$$

up to three passes. It is applied to the BEST comparable plan of the case, because the question is what
operability costs the plan a reader would pick.

![One bench before and after: slivers absorbed when capacity allows](../assets/min-width.svg)

**Precedence cuts both ways.** The first version checked only predecessors; moving a block LATER can be
overtaken by a successor already scheduled ahead of it, and the smoothed plan mined blocks before the rock
above them while every value check passed. The test asserts both directions.

**Capacity is kept.** Until oreblocks 0.6.0 moves were made with no capacity check, and a twin's smoothed
plan reported an NPV **above the certified bound** with every control green, because the bound control
skipped the "beyond" rows. Now a move is made only where every resource of the receiving period has room,
the input must be feasible, and the report counts the moves the capacity refused. The result is a
feasible CPIT plan, scored against the CPIT bound like any other. It is excluded from the best plan by
rule, not by construction: smoothing almost always costs value, but absorbing a block into a neighbour's
EARLIER period can gain a little, and on `twin-vein` the smoothed plan ends 0.01 percent above the sliding
window it smooths. The tables report the change with its sign.

**Why the count, not the minimum.** The minimum width over a whole period is dominated by a handful of
isolated blocks that nothing can absorb, so it barely moves; the count of blocks below the target is
what actually responds. A metric that cannot move is decoration.

## 3. Measured on every case

<!-- generated:operability -->
<!-- /generated -->

The NPV cost of the smoothing is small everywhere, and so is its effect on the width count on the
twins: with capacity kept, most slivers sit in periods that have no room for them. That is the honest
limit of a post-process, and the reason the coherence metrics are shown for every plan rather than only
for the smoothed one.

## Limits

- A width in blocks, not metres, and along the two grid axes only.
- A post-process of one plan, not an operability constraint inside the optimisation (Bai et al. enforce
  it inside the pushback design).

## Where it lives

`oreblocks.enforce_min_width`, `oreblocks.schedule_coherence` (engine); `frontend/src/engine/coherence.ts`
(the browser's per-period components, held to the trace).
