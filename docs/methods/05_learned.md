# The learned lane

Two models. Neither certifies anything, and that is not a disclaimer, it is the design: the certified
bound always comes from the critical multiplier algorithm or from Bienstock-Zuckerberg, and every
learned prediction is scored against the exact quantity it approximates, on deposits the model never
saw.

## 1. The expected-time surrogate

**The problem it solves.** The best published rounding heuristic (ExTS) needs the LP relaxation first,
because its block weight is the LP's expected extraction time

```
E_b = sum_{t=1..T} t (x*_bt - x*_b,t-1) + (T + 1) (1 - x*_bT)
```

and that is a sequence of maximum-closure solves. When a user is dragging a discount-rate slider, that
sequence is the thing standing between the gesture and the answer.

**What it does.** Predicts `E_b / (T + 1)` directly from twelve features: block value, tonnage, depth
fraction, the size and value of the cone above it, grade, radial position, whether it is in the
ultimate pit, and the scenario's rate, capacities and horizon. A schedule then comes out with **no LP
solve at all**.

**How it is scored.** Four numbers, and the last two are the ones that decide.

- **Spearman rank correlation** against the true `E_b`. The surrogate is used as a SORT KEY, so what
  matters is the order it puts blocks in, not whether it nails the value.
- **mean absolute error** on the fraction, for scale.
- **the NPV of the schedule it produces against the NPV of the schedule the TRUE expected times
  produce**, on held-out deposits. A surrogate with a beautiful correlation and a worse plan is not
  useful, and this is the number that says so. Reported as a MEDIAN, a P10 and a MINIMUM, plus the name
  of the worst case, because a mean hides exactly the failure a user would hit.
- **the rate at which it beats greedy**, as a RATE and not a ratio.

### The metric that was wrong, and why it is worth recording

The first version reported "NPV versus greedy" as a mean of per-case ratios. It came out as
**1.37e14**. Greedy occasionally produces a near-zero NPV on a held-out deposit, and dividing by that
produces a number with no meaning that would still have looked like a triumph on a slide.

It is now a rate: the fraction of held-out cases where the learned schedule beats the greedy one. The
general form of the mistake is worth naming, because it is easy to repeat: **a ratio whose denominator
can approach zero is not a summary statistic.**

## 2. The bound surrogate

Predicts `bound / upit_value` from eleven deposit-summary features plus the scenario, so a sensitivity
surface over discount rate and capacity can be drawn instantly instead of after a few hundred closure
solves. The exact bound is computed for the selected point, so the surface is always anchored by at
least one true value, and the held-out relative error is shown next to it.

## Leakage safety is by DEPOSIT, never by row

Two scenarios of the same deposit share almost all of their block-level features. A row-wise split
would let the model memorise the deposit and then score itself on a copy of it, and the resulting
number would mean nothing.

The split here is on the **generator seed**: twelve seeds for training, six disjoint seeds held out,
four archetypes and five scenarios each, which is 240 training instances and 120 held-out ones. The
training script asserts the two seed sets are disjoint rather than leaving it to a comment.

## Why numpy, and why ONNX anyway

The models are small multilayer perceptrons and the training loop is explicit Adam, so the whole
vertical is inspectable in one file: no optimiser state behind an API, no framework version to
reproduce, no hidden default that changes the answer between releases.

They are still exported to **real ONNX graphs**, with the standardisation folded into the graph as a
Sub and a Div so the browser feeds raw features and cannot get the normalisation wrong. The export is
then **executed with onnxruntime and compared against the numpy forward pass**, and a disagreement
above 1e-5 raises rather than writing the file. Without that check, the artifact the browser loads is
not provably the model that was evaluated, and the held-out scores on screen would be about a different
set of weights.

## What the learned lane is NOT allowed to do

- It never produces a bound. Not a heuristic bound, not an estimated bound, not a bound "for speed".
- Its schedule is a schedule like any other and carries the same gap to the same certified bound.
- Its held-out scores sit on the screen next to its output, including the worst case, so a reader can
  see what the acceleration cost in quality rather than being told it is fine.
