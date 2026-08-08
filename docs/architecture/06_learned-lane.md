# The learned lane, and how it is scored

`data-pipeline/pipeline/model/`, trained by `scripts/train_learned.py`, weights committed under
`models/`. Two small MLPs, and neither certifies anything: the certified bound always comes from the
critical multiplier algorithm or from Bienstock-Zuckerberg.

## What each model is for

**The expected-time surrogate.** The best published rounding heuristic (ExTS) needs the LP relaxation
first, because its block weight is the expected extraction time, and that is a sequence of maximum
closures. The surrogate predicts that time from twelve block and scenario features, so a schedule
comes out with NO LP solve at all. That is what makes the uncertainty ensemble and the sensitivity
surface affordable.

**The bound surrogate.** Predicts the bound as a fraction of the ultimate-pit value from eleven
deposit summary statistics plus the scenario, so a sensitivity surface can be drawn immediately
instead of after a few hundred closures. The exact bound is always computed for the SELECTED point,
so the surface is anchored by at least one true value.

## The split is by DEPOSIT, never by row

Two scenarios of the same deposit share almost every block-level feature. A row-wise split would let
the model memorise the deposit and then score itself on a copy, and the number would mean nothing.
Twelve generator seeds train, six disjoint seeds are held out, and the script ASSERTS the sets are
disjoint rather than leaving it to a comment.

## The scores, and why they are these scores

| metric | held out | why this one |
|---|---|---|
| Spearman | 0.901 | the prediction is used as a SORT KEY, so rank is what matters, not value |
| NPV vs exact ExTS, median | 0.9997 | the only question that matters is whether the PLAN is as good |
| P10 | 0.9381 | a median hides the tail |
| **minimum** | **0.3439** | and the tail is where a user meets it |
| beats greedy | 97% of cases | a rate, not a ratio of means |
| bound surrogate, mean relative error | 1.40% (p90 3.99%) | it draws a surface, so the typical and the tail both matter |

The worst case is on the page on purpose. A surrogate that produces a plan a third as valuable on one
deposit in six is a property of the method, not a footnote, and it is the reason PhaseFlow does not
claim a contribution here.

**A metric that was wrong.** The first version reported NPV against greedy as a mean of per-case
ratios and came out as 1.37e14, because greedy occasionally produces a near-zero NPV on a held-out
deposit. It is a RATE now. The general form of the mistake is worth naming: a ratio whose denominator
can approach zero is not a summary statistic.

## The export is executed before it is trusted

`export_onnx` folds the standardisation into the graph, then RUNS the exported model under
onnxruntime and compares it against the numpy forward pass to 1e-5 before the file is written. An
ONNX file that loads is not an ONNX file that computes the same function.
