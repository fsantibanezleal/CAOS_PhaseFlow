# When the learned surrogate fails

The expected-time surrogate's held-out median is 0.9997 of the exact-ExTS plan and its **worst case is
0.344**. A worst case is a footnote until you can say when it happens, and "when" was the open
question this page answers. It is also why this product carries no manuscript: characterising a
failure mode is a research question, and until it is answered a method has a caveat rather than a
guard.

## The method

The same discipline as the model's own split. A candidate rule is read off the deposits the model
TRAINED on, then measured on deposits neither the model nor the rule has seen. Three rules are
evaluated rather than one, because the training failures are consistent with more than one of them
and choosing by eye is how a coincidence becomes a finding.

A **failure** is a case whose learned plan is worth less than 90 percent of the plan the true expected
times produce. That is not a constant of nature: it is the line below which this product stops
presenting the learned rung as an alternative and starts presenting it as a warning.

The population: 4 archetypes x 5 scenarios x 12 training seeds = 240 training cases, and the same
across 6 disjoint seeds = 120 held-out cases. Failures are RARE: 6 of 240 and 5 of 120, about 4
percent.

## What the training deposits suggested, and what the held-out ones did to it

All six training failures are `core_halo` deposits. That reads as a clean archetype story: a thin
high-grade core inside a low-grade halo, where the ordering is delicate.

It does not survive. **Three of the five held-out failures are `vein`.**

| | core_halo | layered | porphyry | vein |
|---|---|---|---|---|
| training failures | 6 / 60 | 0 / 60 | 0 / 60 | 0 / 60 |
| **held-out failures** | **2 / 30** | 0 / 30 | 0 / 30 | **3 / 30** |

The refuted hypothesis is the useful part of this page. An orebody archetype is a LABEL and the sweep
has four of them; a pattern that lines up with a label across six cases lines up with a lot of things.

## What survived

The failures concentrate in the SCENARIO, not the orebody:

| discount rate | 0.08 | 0.10 | 0.15 | 0.20 |
|---|---|---|---|---|
| training failures | 0 / 48 | 1 / 96 | 0 / 48 | 5 / 48 |
| held-out failures | 0 / 24 | 0 / 48 | 1 / 24 | 4 / 24 |

And it is the reading with a mechanism rather than a coincidence:

> A high discount rate makes the value of a plan depend on precisely WHEN each block is taken. The
> surrogate is trained and scored as a SORT KEY: it is asked for the order, not the timing. Where the
> objective is most sensitive to timing is exactly where a model that only knows the order has the
> least to give.

## The three rules, measured on deposits none of them had seen

| rule | flags | precision | recall | worst UNflagged case |
|---|---|---|---|---|
| `archetype in [core_halo], rate >= 0.10, horizon >= 10` | 12 / 120 | 0.17 | 0.40 | 0.824 |
| **`discount rate >= 0.15`** (shipped) | 48 / 120 | 0.10 | **1.00** | **0.932** |
| `rate >= 0.20 and horizon >= 12` | 24 / 120 | 0.17 | 0.80 | 0.879 |

The shipped rule is chosen for **recall**. A false positive costs a reader a warning they did not
need; a false negative costs them a plan worth a third of the alternative with no warning at all. The
column that matters most is the last one: on the held-out set, **a case this rule does not flag never
lost more than 7 percent**. The archetype rule cannot say that, and it is the rule the training data
pointed at.

Precision is necessarily poor and that is arithmetic, not a defect: flagging 40 percent of cases to
catch a 4 percent failure population is what a recall-first guard on a rare event looks like.

## The caveat that stays on it

The held-out numbers for the shipped rule are honest but **not clean**. The holdout is what refuted
the archetype rule, so it also motivated the switch to this one; a third split would be needed to call
its precision and recall unbiased. That is stated here rather than left for a reader to notice.

## Where it shows up

Next to the method selector, not here. A warning on a documentation page is a caveat; the same fact
where a reader picks the method is a guard. The learned rung carries `unreliable` in the artifact, the
selector marks it, and the method note spells out the numbers behind the flag.

The full study, every case with its ratio and its covariates for both splits, is committed as
`models/learned-failure-modes.json`.
