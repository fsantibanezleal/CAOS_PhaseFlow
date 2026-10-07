# 07 · The learned lane

Two models. Neither certifies anything, and that is the design rather than a disclaimer: the bound
always comes from the critical multiplier algorithm, Algorithm 4 or Bienstock-Zuckerberg, and every
learned prediction is scored against the exact quantity it approximates, on deposits the model never
saw. Where it fails is the subject of its own page ([08](08_when-the-surrogate-fails.md)).

![Two paths to the same TopoSort walk: the exact relaxation and the surrogate](../assets/surrogate-path.svg)

## 1. The expected-time surrogate

**The problem it solves.** The best rounding (ExTS, [03](03_toposort.md)) needs the LP relaxation
first, because its weight is the relaxation's expected extraction time; that relaxation is tens of
maximum closures, and in the browser it is about one to four seconds per change on the larger cases.
When a reader drags a slider, that is what stands between the gesture and the answer.

**What it predicts.** Each block's expected extraction time as a fraction of the horizon, from eleven
features a block and a scenario carry: the block's value and grade, its depth fraction, the
size and value of the cone above it, its radial distance from the centre, whether it is in the ultimate
pit, the discount rate, the two capacity fractions and the number of periods. The plan is the same
TopoSort walk with the predicted weight, and it costs one forward pass:

$$
\hat E_b=(T+1)\,\sigma\!\Bigl(W_3\,\mathrm{ReLU}\bigl(W_2\,\mathrm{ReLU}(W_1\tilde f_b+b_1)+b_2\bigr)+b_3\Bigr),\qquad \tilde f_b=\frac{f_b-\mu}{s}.
$$

**The model.** Five multilayer perceptrons, each with hidden layers of 48 and 24 ReLU units and a
sigmoid output, trained on the same rows with five seeds and averaged (the formula above is one member;
$\hat E_b$ is the mean of the five). Each is trained with explicit Adam (Kingma and Ba, [arXiv:1412.6980](https://arxiv.org/abs/1412.6980)) on a
squared loss, written in numpy so the whole vertical is inspectable in one file: no optimiser state
behind an API, no framework version to reproduce.

**Why five members, and why no tonnage feature (0.09.000).** Two findings on the real `kd-declared`
deposit, where the 0.08 model reached 0.413 of the exact ExTS plan after 0.856 for the 0.07 model.

- *A single training run is a lottery off the twins.* Five seeds of the same model on the same cached rows
  reached 0.717, 0.843, 0.879, 0.772 and 0.781 on KD while agreeing within 0.013 on held-out twins
  (median 0.930 to 0.943). On KD no input leaves the training range (no row beyond three standard
  deviations), yet holding any one geometry feature at its training mean moved a single model from 0.413
  to about 0.8: each run learns its own joint relations among the geometry features, and which of them
  hold on a real deposit is luck. The mean of the five reached 0.886 on KD, 0.996 on newman1 and a
  held-out twin median of 0.945, as good as the best single seed everywhere. Averaging is the standard
  remedy for that variance (Breiman, bagging, [doi:10.1007/BF00058655](https://doi.org/10.1007/BF00058655)).
- *An input that never varies in training is never trained.* Every training twin has uniform block
  tonnage, so `tonnage_norm` was 1.0 on every training row; after centring its input was zero, its 48
  first-layer weights got no gradient and kept their random initial values (norm 2.84, against 2.83
  expected from the initialisation), and they acted on every real deposit whose tonnage varies. The
  0.08 record measured that this was not what moved KD, but weights nobody trained do not ship: the
  feature is gone, and `train_mlp` refuses any input that is constant in the training rows.

Two remedies were measured and rejected on the same cached data. Training on a real deposit as well
(newman1 under the nine training scenarios, weighted twenty times) lowered KD to 0.812. Dropping the
radial distance, which assumes a centred orebody, left KD at 0.839 and broke the held-out twins (median
0.772, worst 0.099). The real deposits stay a held-out CHECK (`real_holdout` in the training report),
never training data.

**What it is trained on, and why each choice was made.**

- **The target is the tightest single-resource relaxation's $E_b$**, the one the `toposort-expected`
  rung schedules from. An earlier version trained on the resource-0 relaxation and was then compared
  against a rung seeded by a different relaxation.
- **The sweep crosses nine scenarios** (horizons of 6 to 12 periods, rates of 5 to 20 percent, capacity
  fractions crossed rather than tied to the rate) over four archetypes (porphyry, vein, layered,
  core-halo). An earlier five-scenario sweep moved rate and capacity together at a correlation of
  -0.735, and both models learned one as a proxy for the other ([08](08_when-the-surrogate-fails.md)).
- **Two grid sizes, 12 x 12 x 7 and 24 x 24 x 12** (1,008 and 6,912 blocks), because a model trained
  only on small deposits is used on the product's 6,912 to 14,400-block cases; trained on the small size
  alone, its in-browser plans reached 0.63 to 0.92 of the exact ExTS plan.
- **The capacity fractions at inference are read off the instance** (per-period limit over pit resource
  total per period). An earlier version hard-coded them to (1.0, 1.0) at inference while training on the
  real ones, and the in-ladder results were 0.50 to 0.95 of the exact plan.

**The split is by deposit, never by row.** Two scenarios of one deposit share almost every block
feature, so a row split would let the model score itself on a copy of what it memorised. Twelve
generator seeds train, six disjoint seeds are held out, and a third set of six seeds measures the guard
chosen on the first two; the scripts assert the sets are disjoint. (Every generated deposit's id carries
a fixed `train-` prefix whatever its split; the seed is what decides the split.)

**How it is scored.** The number that decides usefulness is not the error of the prediction but the
value of the plan it produces against the plan the true expected times produce, on deposits it never
saw, reported as a median, a tenth percentile and a minimum, plus the rate at which it beats greedy.
"NPV versus greedy" was once reported as a mean of per-case ratios and came out as 1.37e14, because
greedy occasionally produces a near-zero NPV on a held-out deposit: a ratio whose denominator can
approach zero is not a summary statistic.

<!-- generated:learned-metrics -->
| model | measure | value |
| --- | --- | ---: |
| expected-time surrogate | held-out Spearman rank correlation with the true E_b | 0.807 |
|  | held-out mean absolute error of E_b / (T + 1) | 0.046 |
|  | held-out plan value / exact ExTS plan: median | 0.926 |
|  | same: tenth percentile | 0.817 |
|  | same: minimum | 0.702 |
|  | the worst held-out case | core_halo, seed 223, 10 periods, rate 0.2, 24x24x12 |
|  | held-out cases where it beats greedy TopoSort | 94.4% |
|  | held-out median at 1,008 blocks | 0.945 |
|  | held-out median at 6,912 blocks | 0.913 |
|  | training rows / held-out rows (blocks) | 3,421,440 / 1,710,720 |
| bound surrogate | held-out relative error: mean | 2.31% |
|  | same: 90th percentile | 5.48% |
|  | same: maximum | 13.64% |
|  | held-out deposits where more capacity never lowers the bound | 96.3% |
|  | held-out deposits where a higher rate never raises the bound | 92.6% |
|  | training / held-out instances | 864 / 432 |
<!-- /generated -->

## 2. The bound surrogate and the sensitivity surface

The second model predicts the certified bound as a fraction of the ultimate-pit value, from eleven
summary statistics of a deposit (size, fractions of blocks and of value in the pit, mean and
90th-percentile grade, ore fraction, strip ratio) and the scenario (rate, two capacity fractions,
horizon):

$$
\hat\beta(s)=\sigma\bigl(\mathrm{MLP}(g_{\text{deposit}},\eta,f_0,f_1,T)\bigr)\approx\frac{Z^{\text{bound}}(s)}{Z^{\text{UPIT}}} .
$$

Its use is the sensitivity surface: the bound over a grid of rates and plant capacities is a few hundred
closures per point, fine once and impossible across a grid. The surface is **anchored** (the exact bound
at the case's own point is drawn on it) and the held-out error is shown beside it. An error metric is
not enough: the first version scored a low mean error and predicted the bound FALLING as capacity rose,
which an LP bound cannot do. So the physics is checked before the model may draw anything:

$$
\frac{\partial\hat\beta}{\partial f_1}\ge 0,\qquad \frac{\partial\hat\beta}{\partial\eta}\le 0,
$$

measured per held-out deposit by holding everything else and sweeping one feature; the rates are in
the table above, and the panel refuses to draw a plane from a model that breaks them.

## 3. In the browser: the instant plan

The learned rung's job in the product is the instant plan. On every control change in the focus view,
the browser rebuilds the precedence for the slope, solves the ultimate pit, computes the twelve features
(rounded to single precision as the pipeline does), runs the forward pass and walks TopoSort: the learned
plan, drawn on the next frame. When the control has been still for 220 ms a worker computes the bounds
and the exact plans; when they arrive the exact plan replaces the learned one and the HUD shows the
learned plan's share of the exact ExTS plan and how much sooner it came:

$$
\text{share}=\frac{\mathrm{NPV}(\text{learned})}{\mathrm{NPV}(\text{ExTS exact})},\qquad \text{speed-up}=\frac{t_{\text{exact}}}{t_{\text{learned}}} .
$$

A newer setting discards older answers, so the screen never shows a plan for a setting no longer
selected. The forward pass and the feature builder are held to outputs the Python models wrote by a
parity test (1e-9 on the model, 1e-6 on the features). The browser forward pass once used tanh layers
and a linear head while the model is trained with ReLU and a sigmoid head; on the model's input range it
drew -1.64 to 1.69 where the model gives 0.23 to 0.89. The shared forward and the Python-written fixture
are what prevent that now.

<!-- generated:learned-preview -->
| case | blocks | learned plan | exact solve | speed-up | share of exact ExTS | learned gap | exact ExTS gap |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `ctrl-abundant` | 6,912 | 66 ms | 920 ms | 14x | 0.993 | 1.07% | 0.33% |
| `regime-high-discount` | 6,912 | 39 ms | 1,302 ms | 33x | 0.978 | 10.75% | 8.73% |
| `regime-mill-bound` | 6,912 | 48 ms | 1,252 ms | 26x | 1.026 | 12.70% | 14.94% |
| `regime-mining-bound` | 6,912 | 57 ms | 2,050 ms | 36x | 0.896 | 17.14% | 7.53% |
| `twin-core-halo` | 14,400 | 149 ms | 3,776 ms | 25x | 0.808 | 27.47% | 10.29% |
| `twin-layered` | 14,400 | 111 ms | 3,562 ms | 32x | 0.871 | 15.97% | 3.55% |
| `twin-porphyry-l` | 10,976 | 108 ms | 3,657 ms | 34x | 0.959 | 11.12% | 7.31% |
| `twin-porphyry-s` | 6,912 | 57 ms | 1,694 ms | 30x | 0.967 | 7.80% | 4.62% |
| `twin-vein` | 14,400 | 149 ms | 3,038 ms | 20x | 0.830 | 18.27% | 1.54% |

Measured 2026-10-05 on node v24.14.1, the browser engine's TypeScript, single thread; each committed twin at its own baked setting; exact = bound per resource, three TopoSorts and a shift search.
<!-- /generated -->

## 4. In the offline ladder

`learned-expected-time` is a rung like the others, with the same gap to the same bound. Because every
baked case also contains the exact plan it approximates, the measured ratio to it is recorded per case
(`measuredVsExact` in the trace) and the flag is raised off the measurement, not off a forecast.

<!-- generated:learned-ladder -->
| case | learned plan gap | exact ExTS gap | learned / exact ExTS | note |
| --- | ---: | ---: | ---: | --- |
| [`newman1-published`](../use-cases/01_newman1-published.md) | 2.42% | 2.54% | 1.001 |  |
| [`zuck-small-declared`](../use-cases/02_zuck-small-declared.md) | not run | - | - | no source grade field for the learned input features |
| [`kd-declared`](../use-cases/03_kd-declared.md) | 65.68% | 16.89% | 0.413 |  |
| [`twin-porphyry-s`](../use-cases/04_twin-porphyry-s.md) | 7.91% | 4.62% | 0.965 |  |
| [`twin-porphyry-l`](../use-cases/05_twin-porphyry-l.md) | 11.11% | 7.31% | 0.959 |  |
| [`twin-core-halo`](../use-cases/06_twin-core-halo.md) | 27.55% | 10.29% | 0.808 |  |
| [`twin-layered`](../use-cases/07_twin-layered.md) | 16.00% | 3.55% | 0.871 |  |
| [`twin-vein`](../use-cases/08_twin-vein.md) | 18.26% | 1.54% | 0.830 |  |
| [`regime-high-discount`](../use-cases/09_regime-high-discount.md) | 10.77% | 8.73% | 0.978 |  |
| [`regime-mill-bound`](../use-cases/10_regime-mill-bound.md) | 12.76% | 14.94% | 1.026 |  |
| [`regime-mining-bound`](../use-cases/11_regime-mining-bound.md) | 17.16% | 7.53% | 0.896 |  |
| [`ctrl-abundant`](../use-cases/12_ctrl-abundant.md) | 1.07% | 0.33% | 0.993 |  |
| [`ctrl-degenerate`](../use-cases/13_ctrl-degenerate.md) | 0.00% | 0.00% | 1.000 |  |
<!-- /generated -->

## 5. ONNX: exported and verified, not used by the browser

The weights are also exported to ONNX graphs, with the input standardisation folded in as a Sub and a
Div, and `export_onnx` RUNS the exported graph under onnxruntime and compares it with the numpy forward
pass to 1e-5 before the file is written (the result is `onnx_parity_max_abs_err` in the model file). That
makes the models portable to any ONNX consumer. The browser does NOT use them: it runs the same function
from the JSON weights with a plain TypeScript forward pass, because two small MLPs do not justify a WASM
runtime, and the parity fixture holds that pass to the trained function.

## What the learned lane is not allowed to do

- It never produces a bound: not a heuristic one, not an estimated one, not one "for speed".
- Its plan is a plan like any other and carries the same gap to the same bound.
- Its held-out scores sit next to its output, worst case included.

## Where it lives

`data-pipeline/pipeline/model/{features,learned}.py`, `scripts/train_learned.py` (training, by seed),
`models/*.json` and `*.onnx` (committed weights and metrics), `frontend/src/engine/learned.ts`,
`boundSurrogate.ts` and `solver.worker.ts` (the browser lane), `frontend/test/surrogate-parity.test.ts`
(the fixture) and `frontend/scripts/measure-learned-preview.mjs` (the timing table). Retraining is offline only
(ADR-0074): see [guides/03](../guides/03_retrain-the-learned-models.md).
