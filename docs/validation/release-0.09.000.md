# PhaseFlow 0.09.000 validation record

Date: 2026-10-08. Baseline: released 0.08.000. Issue: #40. Every case was re-baked: this release changes
the engine (oreblocks 0.6.3), the learned model and the ensemble readout, so every number below is new and
the comparison with 0.08.000 is a list of changes, not a check that nothing moved.

Engine: `oreblocks` 0.6.3 from PyPI (oreblocks #30 to #35); the published wheels of 0.6.2 and 0.6.3 were
each diffed against the source the bake ran, file for file, identical apart from line endings.

## What changed and the evidence for it

The three items the 0.08 record left open (backlog BL-049, BL-053, BL-054).

- **The value of re-planning was zero by construction (BL-049).** Each realisation was re-solved by a fresh
  Gershon plan (gaps of 19 to 92 percent) and compared with fixed plans that include the sliding window (1
  to 6 percent), taking the larger: the fixed plan won on every realisation of every case and the column
  read 0.000. Each realisation is now re-planned by the exact restricted re-solve started from the best
  fixed plan (16 rounds, neighbourhoods of up to 180 blocks), which only accepts proven improvements: the
  number is non-negative without a maximum, costs seconds per case, and is measured on every case below.
  `tests/test_pipeline.py::test_the_value_of_replanning_is_measured_not_a_floor` holds it.
- **The learned lane on a real deposit was a lottery (BL-054).** On `kd-declared` the 0.08 model reached
  0.413 of the exact ExTS plan after 0.856 for the 0.07 model. The hypothesis this round started from, the
  untrained `tonnage_norm` input, was wrong: the 0.08 record had measured it (0.01 percent), and a
  per-feature diagnosis confirmed it. On KD no input leaves the training range, yet holding any one
  geometry feature at its training mean moved the model from 0.413 to about 0.8. Measured on cached data
  (six training seeds): five seeds of the same model reached 0.717 to 0.879 on KD while agreeing within
  0.013 on held-out twins; training on newman1 as well lowered KD (0.812); dropping the radial input broke
  the held-out twins (median 0.772); and training past ten epochs bought nothing on the twins (median 0.938
  at 10 and 0.935 to 0.937 at 60) while costing transfer (one seed fell to 0.155 at 60). The model is now
  the mean of five members trained for ten epochs, without the untrained input, and training refuses any
  input that is constant in its rows.
- **The sliding window's hard slides (BL-053), partly.** oreblocks 0.6.2 handed every window a feasible
  start through `highspy`; easy windows then closed at the root in seconds, but the first case of this
  bake came out worse (`twin-vein` 0.17 to 1.315 percent): at the 3 percent window gap a warm start anchors
  HiGHS, which proves the gap from the start at once and stops near it. 0.6.3 keeps the plan as a FLOOR and
  solves each window cold: `twin-vein` 0.097 percent and `twin-porphyry-s` 1.113 in the window-only probes,
  every window guaranteed its plan. What remains is the proof on a loose window LP (root heuristics and a
  tree at about 16 s a node on the hard `twin-layered` window); a node limit does not help it. Backlog
  BL-055.

## Before and after

| case | best plan 0.08.000 | best plan 0.09.000 | sliding window before / after | learned / exact ExTS before / after | value of re-planning before / after |
|---|---|---|---:|---:|---:|
| `newman1-published` | `sliding-window` 1.37% | `sliding-window` 1.40% | 1.37% / 1.40% | 1.001 / 0.999 | 0.000% / 0.030% |
| `zuck-small-declared` | `sliding-window` 2.81% | `sliding-window` 1.98% | 2.81% / 1.98% | - / - | 0.000% / 0.074% |
| `kd-declared` | `sliding-window` 6.23% | `sliding-window` 6.46% | 6.23% / 6.46% | 0.413 / 0.899 | 0.000% / 0.045% |
| `twin-porphyry-s` | `sliding-window` 1.34% | `sliding-window` 1.11% | 1.34% / 1.11% | 0.965 / 0.974 | 0.000% / 0.007% |
| `twin-porphyry-l` | `sliding-window` 1.57% | `sliding-window` 1.58% | 1.57% / 1.58% | 0.959 / 0.973 | 0.000% / 0.007% |
| `twin-core-halo` | `sliding-window` 3.18% | `sliding-window` 3.05% | 3.18% / 3.05% | 0.808 / 0.873 | 0.000% / 0.006% |
| `twin-layered` | `cpitD-local-search` 3.55% | `cpitD-local-search` 3.55% | 6.38% / 6.12% | 0.871 / 0.881 | 0.000% / 0.156% |
| `twin-vein` | `sliding-window` 0.17% | `sliding-window` 0.10% | 0.17% / 0.10% | 0.830 / 0.816 | 0.000% / 0.024% |
| `regime-high-discount` | `sliding-window` 2.35% | `sliding-window` 1.92% | 2.35% / 1.92% | 0.978 / 0.994 | 0.000% / 0.014% |
| `regime-mill-bound` | `sliding-window` 3.57% | `sliding-window` 3.80% | 3.57% / 3.80% | 1.026 / 1.018 | 0.000% / 0.036% |
| `regime-mining-bound` | `sliding-window` 2.87% | `sliding-window` 2.68% | 2.87% / 2.68% | 0.896 / 0.954 | 0.000% / 0.182% |
| `ctrl-abundant` | `cpitD-local-search` 0.26% | `cpitD-local-search` 0.26% | 0.87% / 0.65% | 0.993 / 0.991 | 0.000% / 0.002% |
| `ctrl-degenerate` | `bench-by-bench` 0.00% | `bench-by-bench` 0.00% | 0.00% / 0.00% | 1.000 / 1.000 | - / - |

Read the sliding-window column for what it is. The window solves now run on the HiGHS inside `highspy`
1.15.1, not the one scipy bundles, and stop on the same 3 percent window gap: on the same parameters the
method improved on six cases and lost 0.01 to 0.23 points on four (newman1, KD, mill-bound,
porphyry-l). Those four are the solver taking another path to a solution inside the same tolerance, not a
change of method, and they are recorded rather than tuned away. The trust anchor moves accordingly:
`newman1` is 24,142,200 (1.40 percent below its joint LP bound, 0.143 percent below the external integer
optimum), where 0.08 had 24,149,869 (1.37, 0.112).

| case | destination plan 0.08.000 | destination plan 0.09.000 | gap to its PCPSP bound before / after |
|---|---:|---:|---:|
| `newman1-published` | 24,151,564 | 24,142,200 | 1.37% / 1.41% |
| `twin-porphyry-s` | 313,204,288 | 314,279,336 | 1.03% / 0.69% |
| `twin-porphyry-l` | 435,739,549 | 435,284,800 | 1.42% / 1.52% |
| `twin-core-halo` | 121,612,412 | 110,244,976 | 7.77% / 16.39% |
| `twin-layered` | 1,239,325,459 | 1,225,030,048 | 9.24% / 10.29% |
| `twin-vein` | 300,153,975 | 300,153,975 | 18.95% / 18.95% |
| `regime-high-discount` | 251,018,180 | 251,355,084 | 2.12% / 1.99% |
| `regime-mill-bound` | 206,469,921 | 206,495,929 | 0.56% / 0.55% |
| `regime-mining-bound` | 182,788,398 | 182,965,952 | 2.77% / 2.67% |
| `ctrl-abundant` | 437,965,112 | 438,028,477 | 0.20% / 0.18% |
| `ctrl-degenerate` | 473,615,066 | 473,615,066 | 0.00% / 0.00% |

The destination plan for `twin-core-halo` degraded from 7.77% to 16.39%: the PCPSP LP for core-halo
exceeds the 1,100,000-row solver budget, so the bound is the Lagrangian dual (both releases). The
destination sliding window now runs cold (floor-only, 0.6.3), which for this topology produces a 27.26%
gap start; the destination local search recovers to 16.39% but cannot reach the 7.77% warm-started
result of 0.08. The CPIT rung (3.05%) still improved. Backlog BL-056.

**The learned model, held out.** Twins: median 0.926 to 0.941, P10 0.817 to 0.836, worst 0.702 to 0.710,
Spearman 0.807 to 0.814, failure rate (below 0.90) 39 to 34 percent, beating greedy 94.4 to 92.1 percent;
the medians at 1,008 and 6,912 blocks are now 0.939 and 0.941 (0.945 and 0.913 before), so the size gap
closed. Real deposits (`real_holdout`, never training data): KD 0.899 (members 0.754 to 0.888), newman1
0.999. KD informed the choice of the training budget, so it is a validation deposit now; zuck-small has no
grade field and cannot be scored. The failure study's shipped rule followed the data from `core_halo` to
`vein` (held-out recall 0.55, precision 0.74; third split recall 0.43, precision 0.53).

## Bake cost

Wall times per case on the release workstation, six cases side by side (two BLAS threads each), in minutes:

| case | whole case | PCPSP bound | CPIT sliding window | re-cut sliding window |
|---|---:|---:|---:|---:|
| `newman1-published` | 2.1 | 0.1 (HiGHS) | 0.7 | 0.8 |
| `zuck-small-declared` | 134.7 | - | 124.5 | - |
| `kd-declared` | 594.7 | - | 578.5 | - |
| `twin-porphyry-s` | 112.9 | 6.2 (HiGHS) | 36.4 | 69.5 |
| `twin-porphyry-l` | 307.8 | 111.1 (HiGHS) | 115.7 | 77.6 |
| `twin-core-halo` | 1,141.7 | 2.9 (dual) | 80.6 | 1,058.2 |
| `twin-layered` | 1,283.6 | 3.8 (dual) | 809.0 | 470.8 |
| `twin-vein` | 105.1 | 19.8 (dual) | 29.9 | 51.9 |
| `regime-high-discount` | 55.0 | 8.6 (HiGHS) | 16.2 | 29.2 |
| `regime-mill-bound` | 217.2 | 14.4 (HiGHS) | 89.9 | 111.7 |
| `regime-mining-bound` | 50.7 | 43.0 (HiGHS) | 3.3 | 3.6 |
| `ctrl-abundant` | 19.9 | 1.1 (HiGHS) | 5.1 | 12.9 |
| `ctrl-degenerate` | 0.2 | 0.0 (HiGHS) | 0.0 | 0.1 |
