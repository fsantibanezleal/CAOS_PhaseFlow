# Guide: bring your own block model

PhaseFlow is applicable to a NEW deposit, not only to the thirteen baked cases. That is what makes it
a tool rather than a slideshow. The door is CONTRACT 1,
`data-pipeline/pipeline/io/contract.py`, and the full clause table is in
[`data/README.md`](../../data/README.md).

## The four steps

1. **Put the instance under `data/raw/`** in a MineLib-family format. `data/examples/` holds a tiny
   one that passes, so you can diff against something known good. `raw/` is git-ignored.
2. **Register a case** with its scenario: the number of periods, the discount rate, and one capacity
   per resource per period. The scenario is a DECLARATION and the app labels it as one, because a gap
   against a scenario you chose is not comparable with a published gap.
3. **Bake it into the sandbox**: `./scripts/local/02_generate-data.sh <your-case>`. CONTRACT 1 runs
   first and either accepts the instance, flags it, or rejects it with a reason.
4. **Replay it.** `./scripts/local/03_dev.sh`, and your case appears in the selector like any other.

## What the contract will tell you

Rejections name the clause: a precedence graph pointing downward, a block with zero tonnage, a cycle,
a NaN in the objective, a scenario with no capacity to mine anything. Each of those produces a
plausible-looking pit if you let it through, which is exactly why they are rejections rather than
warnings.

One verdict is a FLAG rather than a rejection: a scenario whose total capacity can never exhaust the
ultimate pit. It is legal, it is a common mistake, and the honest response is to run it and say the
plan is truncated, not to refuse it and not to present a partial plan as a complete one.

## Live or replay

The [lane gate](../architecture/03_the-gate.md) measures your case and decides. Under 30,000 blocks,
300,000 arcs and a 6 MiB trace, and redistributable, it can also be re-solved in the browser when a
control moves. Over any of those it replays from the committed artifact, which is still the whole
product: the live lane is an accelerator, never the source of a number.
