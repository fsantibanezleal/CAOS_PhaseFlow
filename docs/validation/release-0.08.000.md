# PhaseFlow 0.08.000 validation record

Date: 2026-10-05. Baseline: released 0.07.006. Issue: #37. Every case was re-baked: this release changes
the science, so every number below is new and the comparison with 0.07.006 is a list of changes, not a
check that nothing moved.

Engine: `oreblocks` 0.6.1 (CAOS_OreBlocks#28), installed editable from the pull request's branch. The ten
cases started first and `kd-declared` ran it at 02239bc (the re-cut); the three 14,400-block twins at
76455f2, which adds the Lagrangian dual and makes both PCPSP methods report the LP's size. Neither
difference reaches a case solved by HiGHS, and the reproducibility check below confirms it.

## What changed and the evidence for it

The review read the engine, the pipeline, the models, the browser and the committed results, and every
claim was checked against what the code computes. Each defect below was fixed in this release.

**Engine (oreblocks 0.6.0 and 0.6.1)**

- **Gershon's weight counted precedence paths, not successors.** A block reachable along k paths was
  counted k times; the browser engine had the same defect and also added the block's own value. The
  successor sets are now bitsets built in reverse topological order and tested against the set
  definition. Gershon's gap moved on every non-degenerate case (table below).
- **`min-width` broke capacity.** It moved blocks between periods with no capacity check; on `twin-vein`
  its NPV, 288,885,486, sat above the certified bound, 285,385,073, and the bound control skipped the
  `beyond` rows, so every control stayed green. It now keeps capacity and precedence and is under its
  bound on every case.
- **The sliding window refused on twelve of thirteen cases.** Its candidate set had to cover the window
  and the whole remaining horizon, and the relaxation argument was accepted and never read. The set is
  now the LP's own prefix sized by the window's tonnage; the rung runs on every case.
- **The destination rungs did not use the destination decision.** They compared a block's two values,
  so every marginal ore block took plant tonnage the richer ore below needed. Settled by exact integer
  solves on a 320-block plant-bound twin: exact OPBSP 10.37 M (MIP bound 10.50 M) against exact CPIT
  6.53 M, PCPSP LP 11.01 M, and the old rung -0.79 M. The rungs are now the re-cut: each block fixed
  where the PCPSP LP sends it, scheduled by ExTS and the sliding window, then searched exactly with every
  destination free, starting from the best of those plans and the best CPIT plan.
- **The PCPSP LP stopped scaling at about 1.4 million rows.** HiGHS solved 1,082,684 rows in 2.65 hours
  and had not finished 1,435,220 rows after six and a half; its interior-point method was slower than
  the simplex. Above 1.1 million rows the bound is now the LP's Lagrangian dual by maximum closures,
  valid at every iteration and equal to the LP up to the rounding slack (Geoffrion 1974); where both
  ran, 316,476,932 against 316,475,407 on `twin-porphyry-s`, 4.8 parts per million apart. Both methods
  report the LP's size (the dual first reported its closure graph's arcs as rows).

**Pipeline and models**

- **The learned rung saw capacity fractions of (1.0, 1.0) at inference** while trained on each
  scenario's real ones, was trained on 1,008-block twins only although the product's twins are 6,912 to
  14,400 blocks, and learned the resource-0 relaxation's times while ExTS schedules from the tightest
  one. Fixed all three; retrained on two grid sizes; the guard is capped at flagging half the cases.
- **The learned rung had no consumer.** The browser now draws the learned plan on the next frame of
  every control change (42 to 126 ms, against 0.9 to 3.6 s for the exact live solve) and replaces it
  with the exact plan from a worker, showing the share it reached.
- **The browser's bound surrogate ran tanh layers and a linear head** against a model trained with ReLU
  and a sigmoid; on the model's input range the browser drew -1.64 to 1.69 where the model gives 0.23
  to 0.89. One forward pass is now shared and held to a Python-written fixture.
- **The ONNX parity check compared saturated outputs** and recorded an error of exactly 0.0. It now
  samples the model's own input range and refuses a saturated sample: 9.6e-7 and 3.7e-7.
- **CONTRACT 1 promised a cycle check it did not run.** Acyclicity is now proven when every arc rises
  and checked with Kahn's algorithm otherwise.
- **The manifest's bound summary is a whitelist**, and the dual's keys were not on it; caught before the
  twin bake landed and tested. Every rung is checked for precedence, capacity and its own bound at bake
  time and in `check_artifacts.py`.
- **The release bake ran cases one after another** while the scripts promised ninety minutes; it now
  runs them side by side (`run.py all --jobs N`).

**Browser and pages**

- **The default case could open on a blank 3D pit.** The 0.08 build loses its WebGL context once after
  the first frame under headless Chromium; three.js restores its state, but the stage renders on demand
  and never redrew, with its "drawn" flag set. The stage now redraws on the restore event, and
  `npm run verify:stage` reads the canvas: 22.4 percent of the stage is the model and 11.8 percent
  carries period colour on the default case, against 0.0 without the fix.
- **Bound tables** printed "-0.000%" where column generation ends inside its tolerance, "over budget"
  for a case whose single resource makes Algorithm 4 exact, and wall times in thousands of seconds.
- **The five reading pages** were rewritten as full-width topics with every number read from the
  artifacts; the footer is one line. The docs wiki was rebuilt as methodologies, use cases, data
  contract, architecture, frameworks and guides, with sixteen theme-aware diagrams and measured tables
  generated from the artifacts and checked in CI.

**Recorded, not fixed**

- **The value of re-planning is 0.000 percent on every case.** The per-realisation re-solve never beats
  the fixed best plan, so this lower bound on the value of information carries none in this release
  (backlog BL-049).
- **The exact local search starts from the shift plan, not the sliding window's.** What it would add
  from the window's plan is not measured here.
- **KD's CPIT sliding window takes hours** at the 6,000-candidate cap on 219,778 arcs (bake cost below).

## Before and after

The best comparable plan, Gershon's gap, and the learned plan as a share of the exact ExTS plan of the
same case (0.07.006 from the committed manifests of that release, its learned share computed from the two
NPVs):

| case | best plan 0.07.006 | best plan 0.08.000 | GeTS gap before / after | learned / exact ExTS before / after |
|---|---|---|---:|---:|
| `newman1-published` | `sliding-window` 1.37% | `sliding-window` 1.37% | 6.71% / 4.13% | 0.953 / 1.001 |
| `zuck-small-declared` | `cpitD-local-search` 16.91% | `sliding-window` 2.81% | 40.47% / 32.71% | - / - |
| `kd-declared` | `cpitD-local-search` 15.02% | `sliding-window` 6.23% | 59.82% / 51.70% | 0.856 / 0.413 |
| `twin-porphyry-s` | `cpitD-local-search` 4.22% | `sliding-window` 1.34% | 46.61% / 20.06% | 0.933 / 0.965 |
| `twin-porphyry-l` | `cpitD-local-search` 3.75% | `sliding-window` 1.57% | 56.04% / 24.05% | 0.890 / 0.959 |
| `twin-core-halo` | `cpitD-local-search` 8.41% | `sliding-window` 3.18% | 101.01% / 25.10% | 0.499 / 0.808 |
| `twin-layered` | `cpitD-local-search` 3.55% | `cpitD-local-search` 3.55% | 19.01% / 19.36% | 0.886 / 0.871 |
| `twin-vein` | `cpitD-local-search` 0.62% | `sliding-window` 0.17% | 82.98% / 92.14% | 0.701 / 0.830 |
| `regime-high-discount` | `cpitD-local-search` 8.04% | `sliding-window` 2.35% | 51.90% / 23.20% | 0.939 / 0.978 |
| `regime-mill-bound` | `cpitD-local-search` 13.63% | `sliding-window` 3.57% | 64.05% / 29.65% | 0.919 / 1.026 |
| `regime-mining-bound` | `cpitD-local-search` 7.46% | `sliding-window` 2.87% | 65.72% / 27.71% | 0.864 / 0.896 |
| `ctrl-abundant` | `cpitD-local-search` 0.26% | `cpitD-local-search` 0.26% | 6.34% / 2.14% | 0.991 / 0.993 |
| `ctrl-degenerate` | `toposort-greedy` 0.00% | `toposort-greedy` 0.00% | 0.00% / 0.00% | 1.000 / 1.000 |

Reading it: the sliding window, which ran on one case of thirteen, is now the best plan on ten of the
twelve non-trivial cases; on `twin-layered` it ends at 6.38 percent behind ExTS's 3.55, and on
`ctrl-abundant` the exact neighbourhood search edges it out. Gershon's weight now follows its published
definition (each successor counted once): that improved it by 2.6 to 75.9 points on ten cases and made it
worse on two, the vein (82.98 to 92.14) and the layered deposit (19.01 to 19.36), where opening what unlocks
much is the wrong order; a correction, not a tuning. The learned rung improved on every twin but the
layered one (0.886 to 0.871) and fell on the real KD model (F30, recorded above).

The destination plans, against the best CPIT plan of the same case and against their own bound:

| case | best CPIT plan (0.08) | destination plan 0.07.006 | destination plan 0.08.000 | gain over CPIT 0.08 | gap to the PCPSP bound 0.08 |
|---|---:|---:|---:|---:|---:|
| `newman1-published` | 24,149,869 | 22,383,694 | 24,151,564 | +0.01% | 1.37% |
| `twin-porphyry-s` | 231,083,498 | 151,307,611 | 313,204,288 | +35.54% | 1.03% |
| `twin-porphyry-l` | 321,394,155 | 183,041,910 | 435,739,549 | +35.58% | 1.42% |
| `twin-core-halo` | 94,279,051 | 31,347,200 | 121,612,412 | +28.99% | 7.77% (dual) |
| `twin-layered` | 1,071,699,061 | 906,174,919 | 1,239,325,459 | +15.64% | 9.24% (dual) |
| `twin-vein` | 284,898,844 | 194,114,582 | 300,153,975 | +5.35% | 18.95% (dual) |
| `regime-high-discount` | 180,294,048 | 106,480,135 | 251,018,180 | +39.23% | 2.12% |
| `regime-mill-bound` | 125,059,538 | 62,366,794 | 206,469,921 | +65.10% | 0.56% |
| `regime-mining-bound` | 182,599,408 | 80,886,097 | 182,788,398 | +0.10% | 2.77% |
| `ctrl-abundant` | 427,644,503 | 310,907,103 | 437,965,112 | +2.41% | 0.20% |
| `ctrl-degenerate` | 473,615,066 | 473,615,066 | 473,615,066 | +0.00% | 0.00% |

In 0.07.006 every destination plan sat below the best CPIT plan of its own case, except on the degenerate
control where every plan ties; in 0.08.000 none does.
Where only the fleet binds (`regime-mining-bound`) the gain is 0.1 percent and the PCPSP LP equals the CPIT
bound, as Lane's mine-limited cutoff predicts. `min-width` is under its bound on all thirteen cases.

## Reproducibility

The release bake ran from the working tree over a day of commits, and its cases started at different
times (09:15 to 16:58). The committed code must reproduce what was committed, so two cases were re-baked
into a sandbox with the final code and compared with `compare_rebake`'s rules: `newman1-published`
(started at 09:15, before the re-cut was committed) and `ctrl-degenerate` (started at 13:23). Both match
the release bake in every value, schedule, bound, control and lane; only wall times and the byte counts
they shift differ. The PCPSP method key is written only where the bound is the Lagrangian dual, which is
why a HiGHS case's record is the one it had before the dual existed.

## Gates executed on the candidate

| Gate | Result |
|---|---|
| `python scripts/check_artifacts.py` | PASS: 13 cases, every rung feasible and under the bound of its own problem |
| `python scripts/check_readme_numbers.py` | PASS: the trust-anchor table matches `newman1-published` |
| `python scripts/docs_tables.py --check` | PASS: every generated table in `docs/` equals the artifacts |
| `python scripts/check_content_standards.py` | PASS |
| `python scripts/check_template_residue.py` | PASS: 329 tracked files |
| `python scripts/check_ci_budget.py` | PASS |
| `ruff check data-pipeline scripts tests` | PASS |
| `pytest` | PASS: 18 tests, one of them a whole sandbox bake |
| `npm test` | PASS: 30 frontend tests and 52 architecture labels inside their viewBox |
| `npm run build` | PASS: TypeScript, Vite and 19 materialised routes |
| `npm run verify:stage` (new) | PASS: the 3D pit is 22.4 percent of the stage, 11.8 percent period colour, both themes |
| `npm run verify:focus` | PASS: the exact worker's plan moves with the capacity control |
| `npm run verify:infeasible` | PASS: the infeasibility label is silent on every committed plan, EN and ES |
| `npm run verify:theme`, `verify:profile`, `verify:grade` | PASS |
| oreblocks `pytest` at the PR head | PASS: 78 tests |

The browser gates ran against the production build (`PHASEFLOW_BASE`, `vite preview`). Each new or
rewritten gate was shown to fail on the defect it guards: `verify:stage` read 0.0 percent with the restore
handler removed, `verify:infeasible` caught KD's old +10.4 percent `min-width` on a preview that still
carried 0.07.006 data, the contract test failed with one bound key undeclared, and the `min-width`
provenance check failed on the 0.07.006 notes.

## Rendered pages inspected

The production build was captured at 1600 x 900 on all five reading pages (every topic) and the App (every
tab, on `twin-porphyry-l`, `newman1-published`, `twin-vein`, `kd-declared`, `twin-layered` and
`twin-core-halo`), in light and dark, English and Spanish: 396 views, each checked automatically for
horizontal overflow, console errors, NaN, undefined and `[object Object]` text, and the footer height, and
read by eye where the release changed something. Defects found that way and fixed in this release: the
default case opening on a blank 3D pit (the WebGL restore), "-0.000%" slack and "over budget" for a
one-resource case, run times printed in milliseconds (9,351,446 ms ran off the method bars), raw rung keys
in Spanish tables, the Benchmark's description of the old destination rung, and the min-width claim. The
footer is one line in English; in Spanish it wraps once inside the shell's fixed 1,200 px box, which
ADR-0016 allows.

## Bake cost

Wall times per case on the release workstation, cases side by side (two BLAS threads each), in minutes:

| case | whole case | PCPSP bound | CPIT sliding window | re-cut sliding window |
|---|---:|---:|---:|---:|
| `newman1-published` | 0.8 | 0.1 (HiGHS) | 0.3 | 0.3 |
| `zuck-small-declared` | 148.5 | - | 132.4 | - |
| `kd-declared` | 655.1 | - | 631.9 | - |
| `twin-porphyry-s` | 154.6 | 17.9 (HiGHS) | 29.7 | 106.1 |
| `twin-porphyry-l` | 351.8 | 159.3 (HiGHS) | 155.9 | 34.5 |
| `twin-core-halo` | 454.6 | 0.7 (dual) | 74.4 | 378.1 |
| `twin-layered` | 1343.8 | 1.1 (dual) | 802.1 | 538.3 |
| `twin-vein` | 77.8 | 15.2 (dual) | 21.5 | 38.7 |
| `regime-high-discount` | 93.3 | 19.7 (HiGHS) | 32.6 | 39.9 |
| `regime-mill-bound` | 339.6 | 27.4 (HiGHS) | 180.8 | 130.2 |
| `regime-mining-bound` | 113.6 | 95.7 (HiGHS) | 7.4 | 8.8 |
| `ctrl-abundant` | 33.6 | 1.7 (HiGHS) | 8.1 | 22.9 |
| `ctrl-degenerate` | 0.2 | 0.0 (HiGHS) | 0.0 | 0.0 |

The sliding windows dominate. Most of their MILPs close at the root node in seconds to minutes; a few do
not, because the window's LP solution is far from integral and the first feasible solution is poor: KD's
last full window ran for hours, and on `twin-layered` the fifth window's root bound was 350.6 M against a
first incumbent of 128.9 M (a 172 percent gap) until a sub-MIP heuristic found 315.3 M after 18 minutes.
The bake keeps the relative gap (3 percent) and no time limit, because a time limit would make the plan
depend on the machine; the cost is stated here and in the bake guides instead.
