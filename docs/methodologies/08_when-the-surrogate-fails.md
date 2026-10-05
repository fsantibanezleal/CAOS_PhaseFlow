# When the learned surrogate fails

The expected-time surrogate's held-out median is 0.963 of the exact-ExTS plan and its worst case is
0.561. A worst case is a footnote until you can say when it happens. This page is the answer, and it
took three measurements to get, two of which contradicted each other.

## The method

A candidate rule is read off the deposits the model TRAINED on, measured on deposits neither the model
nor the rule has seen, and measured AGAIN on a third disjoint set that had no part in choosing it.
Five rules are evaluated rather than one, and the shipped one is picked by F2 rather than by eye.

A **failure** is a case whose learned plan is worth less than 90 percent of the plan the true expected
times produce. Not a constant of nature: the line below which this product stops presenting the
learned rung as an alternative and starts presenting it as a warning.

The population is 4 archetypes x 9 scenarios x seeds: 432 training cases, 216 held out, 216 validation.

## Act one: an archetype story

With the first sweep, all six training failures were `core_halo`. Clean, and worth distrusting: an
archetype is a LABEL and the sweep had four of them.

## Act two: the holdout appeared to refute it

Three of the five held-out failures were `vein`, so archetype looked like a coincidence and the
DISCOUNT RATE looked like the cause, with a mechanism to match: heavy discounting makes a plan's value
depend on precise timing, and a surrogate scored as a sort key has the least to give there. The rule
`discount rate >= 0.15` had a held-out recall of 1.00.

On a third split it had a recall of **0.625**. That was the first sign that something was wrong with
the study rather than with the rule.

## Act three: the sweep itself was the problem

The five scenarios ran the discount rate and the plant capacity TOGETHER, at a correlation of
**-0.735**. Two consequences, and the second one is what exposed the first:

- the bound surrogate trained on that sweep predicted the certified bound FALLING as capacity rose, on
  every deposit, while scoring a 1.40 percent mean held-out error. More capacity cannot lower an LP
  bound. It had learned capacity as a proxy for rate, because in that sweep it was one;
- with rate and capacity confounded and only five points, the expected-time study could not separate
  the scenario from the orebody either.

The sweep is CROSSED now, nine scenarios at a correlation of +0.234, and both models were retrained on
it. The bound surrogate is monotone in capacity on **100 percent** of held-out deposits and monotone
in rate on 100 percent, and its error improved to 1.16 percent. And the orebody signal is not a
coincidence at all:

| failures | core_halo | layered | porphyry | vein |
|---|---|---|---|---|
| training | **80 / 108** | 0 / 108 | 2 / 108 | 6 / 108 |
| held out | **36 / 54** | 0 / 54 | 0 / 54 | 3 / 54 |

Two thirds of `core_halo` cases fail. `layered` never fails, on either split. The mechanism is the one
the shape suggests: a thin high-grade core inside a low-grade halo makes the ORDER of extraction
delicate in a way a rank-only surrogate cannot see, and it is delicate at every discount rate.

## The rules, measured on deposits none of them had seen

| rule | flags | precision | recall | worst UNflagged |
|---|---|---|---|---|
| `archetype in [core_halo, porphyry, vein]` | 162 / 216 | 0.24 | 1.00 | 0.914 |
| **`archetype == core_halo`** (shipped) | **54 / 216** | **0.67** | **0.92** | **0.851** |
| `discount rate >= 0.15` (act two's answer) | 96 / 216 | 0.18 | 0.44 | 0.652 |
| `rate >= 0.20 and horizon >= 12` | 0 / 216 | - | 0.00 | 0.561 |

Chosen by **F2**, recall weighted four times precision. Recall alone picks the first row, which flags
three cases in four: a warning on three quarters of everything is not a warning, it is the background.

## And then the third split, which had no part in choosing it

| | held out (chose the rule) | third split (clean) |
|---|---|---|
| cases | 216 | 216 |
| failures | 39 | 44 |
| recall | 0.92 | **0.82** |
| precision | 0.67 | **0.67** |
| worst UNflagged | 0.851 | 0.785 |

It holds. Precision is identical, recall falls by 0.10 rather than by 0.375, and that difference
between the two rules on a clean split is the whole reason the study was worth redoing.

## What the product actually does about it

**Measure, do not predict.** Every baked case contains the exact plan the learned rung approximates,
solved on the same instance against the same bound, so the reliability signal is the RATIO between
them: a fact about that case rather than a forecast about cases like it. `measuredVsExact` in the
artifact, the percentage next to the method selector, and the flag raised off the measurement.

**And the rule cannot travel to the live lane.** It is about the OREBODY, and a real deposit does not
arrive with an archetype label. So the live lane has no usable guard today: the scenario rule that
could have been applied there has a recall of 0.44, which is not a guard, it is a coin. What would fix
it is a rule over deposit STATISTICS rather than the label, fitted on the training seeds and validated
on both other splits. That is real work, it is not done, and it is why this rung is a product feature
with a measured guard rather than a contribution with a claim behind it.

The studies are committed: `models/learned-failure-modes.json` (train and holdout, every case with its
covariates) and `models/guard-validation.json` (the third split).
