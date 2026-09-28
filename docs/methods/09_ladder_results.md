# Reading the results

How to read the numbers the ladder produces, and which comparisons are legitimate.

## Only compare through the same bound

Two CPIT schedules are comparable when they solve the same case and are measured against the same
certified CPIT bound. The App shows which bound it selected. The destination and operability rows
retain the case bound in the artifact for schema consistency, but the App does not display a CPIT
gap for them or place them in the bound chart.

## Which comparisons are legitimate

| comparison | legitimate | why |
|---|---|---|
| classical against sota, same case | yes | same problem, same bound |
| learned against `toposort-expected`, same case | yes | that is what it approximates |
| `beyond` against anything, by NPV | **no** | see below |
| a gap on a `declared` case against a published gap | **no** | different scenario |
| Newman1 CPIT against the 2018 PCPSP gap | **no** | the published 2018 objective and LP bound are for PCPSP |
| Newman1 CPIT against the attributed external CPIT integer result | qualified | same named CPIT model, subject to source-model parity |

## Why the `beyond` rungs are not NPV-comparable

**`destination-toposort`** solves PCPSP, not CPIT. The destination is a decision rather than an input,
so the feasible set is richer and the objective is a different function. Its NPV can be higher or lower
than a CPIT plan's and neither direction means what it looks like. What it is FOR is the effective
cutoff it produces, which is a number CPIT cannot produce at all.

**`min-width`** does not re-impose capacity after moving blocks. It is an operability VIEW of a plan,
and its NPV records the transformed geometry rather than a competing feasible answer. It can even
exceed the CPIT upper bound because the transformed schedule can breach a period capacity.

Both carry a note saying so, and a test asserts the note exists.

## Which gap belongs to whom

Let `V` be a feasible CPIT schedule value, `U_A` the Algorithm 4 bound, `U_J` the joint LP bound,
and `Z_IP` the unknown integer optimum. In objective-value units, the accounting identity is

```
U_A - V = (U_A - U_J) + (U_J - Z_IP) + (Z_IP - V).
```

The two recorded bounds measure the first term when the joint bound tightens Algorithm 4. The
second term is the LP integrality gap; the third is loss of the feasible method. Neither is known
without an integer optimum. An [external exact solve for Newman1](../cases/newman1-external-optimum.md)
reports that optimum, so the terms can be shown for that one case with explicit attribution.
Percent gaps use their own bound as denominator, so percentages cannot simply be added.
For other cases, the Analysis tab shows the bounds and their difference without claiming the
unmeasured two terms are known.

## What a large gap actually tells you

Three different things, and the case matrix is designed to separate them:

1. **The heuristic is losing.** Visible when `cpitD-local-search` materially beats
   `toposort-expected`: the exact re-solve is finding value the rounding missed.
2. **The bound is loose.** Visible when BZ tightens Algorithm 4 by a large margin.
3. **The instance is hard.** Visible when both bounds agree and every method sits far from them, which
   is the honest case where a better answer needs a better method rather than a better implementation.

## What the controls actually show

`ctrl-degenerate` has one period, zero discount, and unlimited capacity. Its schedules and bound
agree with the exact ultimate pit: the recorded gap range is zero. That is the collapse control.

`ctrl-abundant` relaxes capacity but retains eight periods, positive discount, and slope precedence.
Its best comparable method is 0.26% below the certified bound, while the classical methods are
5.57% to 7.02% below. Loose capacity alone does not make their choices of extraction period equal.
The `destination-toposort` row solves a different problem and is excluded from this comparison.
These numbers come from the committed `ctrl-abundant` manifest and
must be checked again after a rebake.
