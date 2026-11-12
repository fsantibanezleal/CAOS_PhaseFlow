# Frontier evaluation amendment 05: retained test and product results

**Status:** outcome record. This document does not change the frozen policy, training, comparator, metrics, uncertainty procedure, thresholds, or acceptance rules. It records the completed evaluations and a metadata-only certified-bound correction.

## Frozen ensemble and synthetic test

The evaluated ensemble is `20261111-bs2-ppo-v4`, trained from source commit `4aa49f4e72b2563d652a5636f69c2c5a5582db00`. Evaluation code at `4a106eae922c696856f4aff6f977d0f881d6c29a` was checked against the frozen method files before access. The training split digest is `18860c8a361576ba924ec95fd5dfe9d58c8a37a3466a1c17bb9765ddfc81350c`; the completed test split is the disjoint 500-row manifest `test-split-recovery-02.json`, digest `11f5f8b8e35412e69012cd8905174717820dfc1f55d84e08680845d2a4db5a1f`. The original test and recovery sample 01 remain consumed and are not combined with these results.

All 500 cases completed with status `partial`; there were no failed or unavailable rows. Each returned schedule passed independent precedence, resource and objective validation. Feasibility does not mean useful production coverage:

| Measure | Result |
|---|---:|
| Mean normalized NPV | 0.0008469906 |
| Median normalized NPV | 0 |
| 95% seed-cluster percentile interval for normalized NPV | [0.0005250059, 0.0012700407] |
| Mean greedy TopoSort normalized NPV | -0.1853364 |
| Mean paired frontier-minus-greedy normalized NPV | 0.1861834 |
| 95% seed-cluster interval for paired difference | [0.1618195, 0.2097995] |
| Mean positive-value coverage / median | 0.0021114 / 0 |
| Mean tonnage coverage / median | 0.0011640 / 0 |
| Mean assignments / median | 1.766 / 0 |

Intervals use 10,000 percentile bootstrap replicates over seed clusters, NumPy RNG seed 5519, as predeclared. The positive paired difference is not evidence of a useful schedule: the frontier policy often abstains and leaves the objective at zero, while the greedy baseline can incur negative discounted value. The coverage measures and per-case records prevent this outcome from being summarized as a production improvement. No test sample is reopened or tuned against.

## Product-case evaluation

The 13 registered cases were opened once after the policy and settings were frozen. Eleven produced independently validated partial schedules; two fail-closed rows retain their reasons. MineLib rows contain period aggregates only. The original result receipt has evaluation source `4a106eae922c696856f4aff6f977d0f881d6c29a`; all synthetic schedules remain tied to test digest `11f5f8b8…` and the training digest above.

| Case | Result | Assignments | Positive-value coverage | Tonnage coverage |
|---|---|---:|---:|---:|
| ctrl-abundant | partial | 6,336 | 1.0000 | 0.9167 |
| ctrl-degenerate | failed: one-resource CPIT unsupported | n/a | n/a | n/a |
| kd-declared | partial | 9,460 | 0.5252 | 0.6594 |
| newman1-published | partial | 1,054 | 0.9978 | 0.9947 |
| regime-high-discount | partial | 2,542 | 0.6241 | 0.3678 |
| regime-mill-bound | partial | 1,805 | 0.3569 | 0.2611 |
| regime-mining-bound | partial | 2,076 | 0.4742 | 0.3003 |
| twin-core-halo | partial | 5,132 | 0.2384 | 0.3564 |
| twin-layered | partial | 6,514 | 0.4409 | 0.4524 |
| twin-porphyry-l | partial | 3,716 | 0.5506 | 0.3386 |
| twin-porphyry-s | partial | 2,542 | 0.6241 | 0.3678 |
| twin-vein | partial | 4,832 | 0.4052 | 0.3356 |
| zuck-small-declared | failed: source-backed grade vector unavailable | n/a | n/a | n/a |

All 11 partial schedules have paired rows for the applicable baseline methods. Frontier NPV exceeded the paired value for bench-by-bench in 11/11 cases, nested-shells in 9/11, greedy TopoSort in 9/11, Gershon in 8/11, and learned expected-time in 2/11. It did not exceed expected-time TopoSort, exact expected-time ordering, shift-local-search, sliding-window, or C-PIT[D] local search in any paired case. These are finite registered cases, not a population sample; no confidence interval across these heterogeneous cases is claimed. The low synthetic coverage and two unsupported inputs remain material limitations even where a case-level NPV is larger.

## Bound-metadata amendment and reproducibility

Review found that the evaluator selected the certified Algorithm 4 value while preserving the trace label `bienstock-zuckerberg` on cases where the finite certified joint bound was the selected value. This affected only `certified_bound`, its method label, and the derived gap percentage. It did not change policy inference, assignments, NPV, coverage, paired method values, status, runtime, checkpoint, or either split.

The completed evaluation output remains immutable at its original path. `scripts/amend_frontier_product_bound_metadata.py` writes a separate amended copy after verifying the exact baseline index and each paired trace digest. The copy records the original receipt SHA-256 in its `amendment` field. Its SHA-256 is `d023db6d67823ee189e944b16d0b9ed0e0aaba302d6754a127beb3ac91916bb2`. It corrected 11 successful case rows. The amended receipt was used to create an external candidate; `scripts/check_frontier_release.py` accepted its 13-case ledger and `scripts/check_artifacts.py` accepted its case traces. Candidate summary: 0 complete, 11 partial, 2 failed, 0 unavailable. This structural result is not the required fresh full 0.12.000 all-method bake and is not a deployment receipt.

The repaired evaluator now writes baseline trace digests for fail-closed rows and chooses the same finite bound the producer labels as used. Neither change triggers a repeat of the one-shot product evaluation. Any future policy or method change requires a new, separately frozen training and test design.
