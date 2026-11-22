# 08 · When the learned surrogate fails

A worst case is a footnote until you can say when it happens. This page is the measured answer for the
expected-time surrogate of [07](07_learned.md), and the discipline that keeps the answer from being a
story told after the fact.

## 1. The method

- A **failure** is a held-out case whose learned plan is worth less than **0.90** of the plan the true
  expected times produce. Not a constant of nature: the line below which the product stops presenting
  the learned method as an alternative and presents it as a warning.
- A candidate rule is read off the deposits the model **trained** on, measured on deposits neither the
  model nor the rule has seen (**held out**), and measured again on a **third** disjoint seed set that
  had no part in choosing it. Six candidate rules are evaluated, not one.
- The shipped rule is chosen by **F2** (recall weighted four times precision), and a rule that flags
  more than **half** of the training cases is not eligible: a warning on most cases is the background,
  not a warning. Without that cap, a rule over all four archetypes flagged every held-out case and won on
  recall alone.
- The population: four archetypes, nine crossed scenarios, two grid sizes, twelve training seeds, six
  held-out seeds and six validation seeds.

## 2. Where the failures are

Failures per archetype and per size, on both splits, with the held-out distribution of the share:

<!-- generated:learned-study:archetype -->
| archetype | training cases below 0.90 | held-out cases below 0.90 | held-out median | held-out P10 | held-out minimum |
| --- | ---: | ---: | ---: | ---: | ---: |
| core_halo | 71 / 216 | 37 / 108 | 0.935 | 0.848 | 0.736 |
| layered | 59 / 216 | 26 / 108 | 0.943 | 0.877 | 0.854 |
| porphyry | 5 / 216 | 2 / 108 | 0.997 | 0.948 | 0.880 |
| vein | 138 / 216 | 80 / 108 | 0.867 | 0.773 | 0.710 |
| **all** | **273 / 864** | **145 / 432** |  |  |  |
<!-- /generated -->

<!-- generated:learned-study:size -->
| size | training cases below 0.90 | held-out cases below 0.90 | held-out median | held-out P10 | held-out minimum |
| --- | ---: | ---: | ---: | ---: | ---: |
| 1,008 blocks | 139 / 432 | 82 / 216 | 0.939 | 0.795 | 0.710 |
| 6,912 blocks | 134 / 432 | 63 / 216 | 0.941 | 0.861 | 0.791 |
| **all** | **273 / 864** | **145 / 432** |  |  |  |
<!-- /generated -->

The failures concentrate on the shapes where the ORDER of extraction is delicate: a thin rich core inside
a low-grade halo, and a narrow vein whose value sits along a strike. A rank-only surrogate that is good
on average loses most there, and it does so on both splits, which is what makes it a property of the
orebody rather than of a sample.

## 3. The rules, measured on deposits none of them had seen

<!-- generated:learned-study:rules -->
| rule (read off the training deposits) | held-out cases flagged | precision | recall | worst unflagged share |
| --- | ---: | ---: | ---: | ---: |
| `archetype in ['core_halo', 'layered', 'porphyry', 'vein'], discount rate >= 0.05, horizon >= 6` | 432 / 432 | 0.34 | 1.00 | - |
| `discount rate >= 0.15` | 192 / 432 | 0.32 | 0.43 | 0.710 |
| `archetype in ['core_halo', 'layered', 'porphyry', 'vein']` | 432 / 432 | 0.34 | 1.00 | - |
| `archetype == vein` **(selected candidate; not shipped)** | 108 / 432 | 0.74 | 0.55 | 0.736 |
| `discount rate >= 0.20 and horizon >= 12` | 0 / 432 | - | 0.00 | 0.710 |
| `no rule` | 0 / 432 | - | 0.00 | 0.710 |
<!-- /generated -->

## 4. And on the third split, which had no part in choosing the candidate rule

<!-- generated:learned-study:guard -->
|  | held out (chose the rule) | third split (clean) |
| --- | ---: | ---: |
| cases | 432 | 432 |
| failures (below 0.90) | 145 | 133 |
| flagged by the rule | 108 | 108 |
| precision | 0.741 | 0.528 |
| recall | 0.552 | 0.429 |
| worst unflagged share | 0.736 | 0.732 |
| median share | - | 0.944 |
| P10 share | - | 0.858 |
<!-- /generated -->

Read the recall row before anything else. The selected `vein` candidate catches fewer than half of
the failures on the untouched third split, and also misses the required precision and worst-unflagged
thresholds. It is **not shipped** as a live guard. The deployed `core_halo` rule is a separate older
model: on the same third split it reaches precision 0.620, recall 0.472 and worst-unflagged share
0.773, also below the release thresholds. Neither archetype rule is reliable enough to label a live
deposit safe or unsafe.

## 5. What the study protects against: a confounded sweep

The first sweep had five scenarios that moved the discount rate and the plant capacity TOGETHER, at a
correlation of -0.735. Two wrong conclusions came out of it, one after the other: first an archetype
story (all training failures were core-halo), then, when the held-out set seemed to refute it, a
discount-rate story with a plausible mechanism and a held-out recall of 1.00, which a third split cut
to 0.625. The confound also broke the bound surrogate, which predicted the bound falling as capacity
rose while scoring a 1.40 percent mean error: in that sweep, capacity WAS a proxy for rate. The sweep is
crossed now (capacity fractions independent of the rate), the models were retrained on it, and the
monotonicity of the bound surrogate is measured, not assumed ([07](07_learned.md)).

The general lesson is the reason this page exists: **a sweep that moves two inputs together cannot
separate them, and every model and every rule fitted on it inherits the confusion.**

## 6. What the product does about it

**Measure, do not predict.** Every baked case also contains the exact plan the learned method
approximates, on the same instance against the same bound, so the reliability signal is the RATIO
between them: a fact about that case, not a forecast about cases like it. `measuredVsExact` in the
trace, the percentage next to the method selector, and the flag raised off the measurement.

**A real block model is outside the study, and one case shows what that means.** The splits are all
twins. On the two real models with a grade field the 0.08 retrain moved in opposite directions: `newman1`
from 0.953 to 1.001 of the exact ExTS plan, `kd-declared` from 0.856 to 0.413. Measured with both models
and both capacity inputs, the KD drop is the retrained model's (0.413 with the instance's capacities and
0.474 with the old fixed input, against 0.867 and 0.856 for the 0.07.006 model), and not the input that
was constant in training (`tonnage_norm`, whose first-layer weights were never trained: holding it at its
training value moves KD by 0.01 percent). The measurement flags the KD row, which is what it is for;
validating on real models is open work (backlog BL-054).

**The rule cannot travel to the live lane.** It is a rule over the archetype LABEL, and a real deposit
does not arrive with one. In the live lane the exact plan arrives a second or so after the learned one
and the share is then measured on screen ([07](07_learned.md), section 3); until it arrives, the learned
plan is labelled a preview. A guard over deposit STATISTICS, fitted on the training seeds and validated
on both other splits, remains open work (backlog BL-034); no statistical feature rule has passed its
design or validation gates.

## Where it lives

`scripts/train_learned.py::characterise_failures` (rules, F2, the half-cap), `scripts/validate_guard.py`
(the third split), `scripts/rescore_guard.py` (re-scoring without retraining);
`models/learned-failure-modes.json` (both splits, every case with its covariates) and
`models/guard-validation.json` (the third split).
