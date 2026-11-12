# Frontier evaluation amendment 03: independent test recovery

**Status:** frozen before opening the replacement test sample. This amendment preserves the approved policy, training, validation, baseline, metrics, and acceptance rules. It replaces only the synthetic test sample whose results were irretrievably lost during final serialization.

## Reason and boundary

The original one-shot test sample, split digest `18860c8a361576ba924ec95fd5dfe9d58c8a37a3466a1c17bb9765ddfc81350c`, was evaluated on 2026-11-11. Final serialization failed because a function object was placed in the `product_version` field. Its external ledger marks all 500 cases `unavailable`, records `consumed-results-lost`, and confirms that no per-case result file was written. That sample is consumed. It will not be reopened, reconstructed from memory, or used as a result.

The trained ensemble and all model-selection decisions remain frozen. This amendment does not retrain, change weights, select another checkpoint, tune a parameter, or inspect product cases. It defines a second independent sample so the already approved evaluation can be completed without reusing the consumed sample.

## Frozen test sample

The committed manifest `test-split-recovery-01.json` is generated and checked by `scripts/build_frontier_recovery_manifest.py`. Its full split digest is `b89ead07e878fe6101395bda0dc7d6c4f787506c0a58c11d458e40fc92fda62b`. The 500 test rows use generator seeds 500000 through 500499, the existing `funnel` family, and the exact ordered size strata from the original sample (32 through 8192 blocks). The train and validation rows, generator version, product-case exclusion list, family contract, and all test sizes are byte-for-byte unchanged from the original manifest. The new seeds are disjoint from training, validation, and the consumed 300000 through 300499 test seeds.

The v4 ensemble is the only model evaluated:

| Seed | Selected checkpoint SHA-256 |
|---:|---|
| 1103 | `4753af9ced29a9bc75f64b027529a4c0177d5928c9f4816a50631b33c4d06c63` |
| 2207 | `caf1600e8b8fdfd60c26afee124f177d7f381e9a4299119b2b7d0f82e68af31b` |
| 3301 | `b6df99794298e5420f221ee57511a6a2f231781ab1e94297258cca2f35ebcb2e` |
| 4409 | `61acc411a5e651f40416383e32852fef899230c71d6ab2e901da4690bee1b03b` |
| 5519 | `2239297544e7e2b93e9ae92b2a510b1c9edcd470d1ad84e9e5ee80eefae80674` |

Its training source is `4aa49f4e72b2563d652a5636f69c2c5a5582db00`; its training receipt SHA-256 is `f3669a904e62903910a6fdbc9752f22aacae1a46d02d9f2d8e1a741e46becf7f`; its frozen training split digest remains `18860c8a361576ba924ec95fd5dfe9d58c8a37a3466a1c17bb9765ddfc81350c`. The separate test split digest is recorded independently in the evaluation receipt.

## Evaluation procedure

1. Run `python scripts/build_frontier_recovery_manifest.py --check` from the clean, committed product source. The evaluator independently rebuilds the expected manifest and rejects any altered train, validation, product-case, family, size, seed, or digest field.
2. Use `scripts/evaluate_frontier_policy.py --test-split recovery-01` with the v4 model and data roots. The evaluator verifies the v4 receipt against the original training split, loads only the hash-selected checkpoints, and records both training and test split digests.
3. Before each case, atomically write its `started` state to the external test ledger. After each case, atomically persist the full result, including the real greedy TopoSort baseline. If a process stops after opening a case, that case becomes unavailable and is never rerun. If final summary serialization fails, completed per-case records remain available for audit; the consumed split is not reopened.
4. Report all 500 seeds, including partial, failed and unavailable schedules. Retain feasibility, NPV, normalized NPV, tonnage and positive-value coverage, the actual greedy baseline, paired differences, inference runtime, peak memory and stop reasons. Use the frozen two-sided 95% percentile bootstrap over seed clusters with 10,000 resamples and RNG seed 5519.
5. Do not tune or select on these results. Report a negative or partial outcome if the policy loses or commonly abstains. Do not open the thirteen product cases until this run has completed and its receipt passes validation.

The evaluator persists one result at a time through its atomic case ledger and writes the final summary only after all 500 rows have been read back from that ledger. The original `consumed-results-lost` ledger remains unchanged. The recovery ledger has a new path keyed by its new digest, so the two samples cannot be confused or overwritten.

## Verification and interpretation

`tests/test_frontier_evaluation.py` covers the new split's exact identity and disjointness, rejection of a modified source manifest, and the consumed-split refusal. The full policy validation, greedy comparison, schedule checks, and receipt validation remain those in `SDD-amendment-0.12.000.md` and FP-014/FP-015.

This is a recovery of independent evaluation evidence, not evidence of improvement. The model remains a candidate research method. A successful synthetic test does not establish product-case performance, a MineLib claim, or release eligibility. Product cases still require their separate one-shot evaluation against the exact 0.11.000 baseline; every failure and partial schedule must be retained.
