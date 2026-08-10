# Destinations: when the cutoff grade becomes an output

## The distinction, in one sentence

CPIT fixes each block's destination **before** the model runs, folded into a single net value. PCPSP
lets the model choose. Jelvez, Morales and Nancel-Penard
([doi:10.1007/978-3-319-99220-4_18](https://doi.org/10.1007/978-3-319-99220-4_18)) put it exactly:

> "The Precedence Constrained Production Scheduling Problem (PCPSP) extends the last one mainly by
> considering multiple possible destinations for the blocks (therefore the model decides which one is
> the optimal choice) and respecting general side constraints, such as blending."

That step is not accounting. It is a different problem over a richer feasible set, which is why the
PCPSP rung's NPV is **not comparable** with the CPIT rungs and the app says so instead of ranking them
together.

## Why it is visible rather than academic

In CPIT the cutoff grade is a number somebody decided in advance and baked into `p_b`. In PCPSP the
model sends a block to the plant only while plant capacity remains and the plant is worth more than
the dump for that block. When the plant fills, the same block goes to waste.

So the **effective cutoff rises exactly in the periods where processing binds**, and it comes out of
the schedule rather than into it. On screen that is blocks changing destination when the mill-capacity
slider moves, which is the reason the distinction matters to a viewer rather than only to a reader.

`destination_toposort` reports the effective cutoff per period: the lowest grade actually sent to the
plant in that period.

## `opbsp-exact`: the same problem solved exactly

Jelvez et al.'s fully binary formulation, their equations (3)-(10): a block goes to exactly one
destination, so `x_bdt` is binary rather than fractional, and OPBSP solutions are feasible for PCPSP,
which means an OPBSP objective can be scored against a published PCPSP bound.

The model here is in `z_bdt in {0,1}`, "block `b` extracted in period `t` and sent to destination `d`",
so one binary family carries both decisions and nothing is linearised:

```
max   sum_{b,d,t}  discount[t] * value[b,d] * z_bdt
s.t.  sum_{d,t} z_bdt <= 1
      sum_{d,s<=t} z_bds  <=  sum_{d,s<=t} z_ads     for (a a predecessor of b), all t
      sum_{b,d} coef[r][b,d] * z_bdt  <=  limit[r][t]
      z_bdt = 0 wherever the destination is forbidden
```

The precedence row is the cumulative form: by period `t`, `b` has been mined at most as much as `a`
has.

**It returns `None` above a size budget** rather than passing a heuristic answer off as an exact one.
A first draft of this module linearised the destination premium with an average discount factor and
still called itself exact; that was wrong and was replaced rather than documented.

## What is deliberately absent

**Stockpiles.** A stockpile is not a third destination. The metal reclaimed is (tonnes out) times
(average grade of the pile), and that average grade is itself a ratio of decision variables, so the
honest model is **bilinear**. The published linear models exist precisely for that reason and their
technique is to fix the stockpile grade as a PARAMETER and search over it (Rezakhah, Moreno and Newman,
[doi:10.1016/j.cor.2019.02.001](https://doi.org/10.1016/j.cor.2019.02.001)). The value is fragile too:
at 5 and 10 percent annual degradation, what a stockpile provides falls by **37 and 69 percent**
(Rezakhah and Newman, [doi:10.1016/j.cor.2018.11.009](https://doi.org/10.1016/j.cor.2018.11.009)).

What industry does under scale pressure is documented as well, and it is not encouraging: remove the
stockpiles, which produces plans that underestimate capacity and flexibility, and reintroducing them
afterwards does not work (Blom, Pearce and Cote, arXiv:2403.18213).

**Blending and other general side constraints.** The `.pcpsp` reader carries
`NGENERAL_SIDE_CONSTRAINTS` and the solver does not solve them. An instance that declares them is not
being solved as posed, and that is stated rather than left for a reader to discover.

## Lane's cutoff grade, for comparison

`lane_cutoffs` computes what Lane's theory says the cutoff should be, from the same economics, so the
number a CPIT instance folds into its values can be shown next to it.

Two results the implementation reproduces and the tests assert:

- the **mine-limiting cutoff equals break-even**, which is a result and not an oversight: when the
  shovels are the bottleneck the scarce hour is a mining hour, and ore and waste consume it
  identically, so the opportunity cost cancels out of the ore-versus-waste comparison.
- the economic cutoff **declines over the life of a mine**, because the opportunity cost `d * NPV +
  fixed` falls as there is less value left to delay.

## What this product CALLS, and what it only ships

`destination_toposort` is the rung in the ladder. `solve_opbsp_exact` and `lane_cutoffs` are in the
engine, are tested there, and are NOT called by PhaseFlow: the exact OPBSP model is a MILP over
`blocks x destinations x periods` binaries and does not fit the bake's budget, and the cutoff policy
is reported by the destination rung as an OUTPUT rather than taken from Lane's formula as an input.

They are described on this page because the page is about the destination problem and they are part of
it. They are not part of what the thirteen committed cases exercise, and that distinction belongs here
rather than in a reader's assumption.

(`lane_cutoffs` also carried a real error until `oreblocks` 0.5.1: its market-limiting cutoff divided
the opportunity cost by recovery where Lane multiplies, inflating it by `1/recovery^2`.)

