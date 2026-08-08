# Reading the results

How to read the numbers the ladder produces, and which comparisons are legitimate.

## Only compare through the same bound

Two schedules are comparable when they are measured against the same yardstick. Every method on a case
carries the SAME bound, and the App shows which of the two bounds that is. The test
`every schedule is measured against the SAME bound` asserts it, because a table whose rows quietly use
different denominators looks exactly like a table whose rows do not.

## Which comparisons are legitimate

| comparison | legitimate | why |
|---|---|---|
| classical against sota, same case | yes | same problem, same bound |
| learned against `toposort-expected`, same case | yes | that is what it approximates |
| `beyond` against anything, by NPV | **no** | see below |
| a gap on a `declared` case against a published gap | **no** | different scenario |
| the `published` case against the published gap | yes | that is the whole point of it |

## Why the `beyond` rungs are not NPV-comparable

**`destination-toposort`** solves PCPSP, not CPIT. The destination is a decision rather than an input,
so the feasible set is richer and the objective is a different function. Its NPV can be higher or lower
than a CPIT plan's and neither direction means what it looks like. What it is FOR is the effective
cutoff it produces, which is a number CPIT cannot produce at all.

**`min-width`** does not re-impose capacity after moving blocks. It is an operability VIEW of a plan,
and its NPV is the price of that operability rather than a competing answer.

Both carry a note saying so, and a test asserts the note exists.

## Which gap belongs to whom

On a case with two binding capacities, a gap of, say, 13 percent is not 13 percent of heuristic loss.
Part of it is the bound. The Analysis tab and the Benchmark page report both bounds and the tightening
between them, so the reader can split it:

```
gap against Algorithm 4  =  (heuristic loss)  +  (bound looseness)
gap against the joint BZ bound  =  (heuristic loss)   [as far as the LP relaxation can say]
```

And even the joint bound is the LP bound, not the integer optimum: the remaining distance to a true
optimum is the integrality gap, which nothing here computes and nothing here claims.

## What a large gap actually tells you

Three different things, and the case matrix is designed to separate them:

1. **The heuristic is losing.** Visible when `cpitD-local-search` materially beats
   `toposort-expected`: the exact re-solve is finding value the rounding missed.
2. **The bound is loose.** Visible when BZ tightens Algorithm 4 by a large margin.
3. **The instance is hard.** Visible when both bounds agree and every method sits far from them, which
   is the honest case where a better answer needs a better method rather than a better implementation.

## The control that should collapse

`ctrl-abundant` loosens capacity until it barely binds. There every method should find nearly the same
plan and the spread between them should collapse toward zero. A product that still shows a large spread
on that case is measuring its own noise, and the case exists so a reader can check that it does not.
