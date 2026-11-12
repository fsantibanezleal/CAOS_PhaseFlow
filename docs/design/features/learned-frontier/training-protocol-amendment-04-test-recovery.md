# Frontier evaluation amendment 04: replacement after writer interruption

**Status:** frozen before opening the replacement sample. The policy, trained checkpoints, objective, comparator, metrics, uncertainty procedure, and acceptance rules remain unchanged. This amendment replaces only the incomplete recovery sample from amendment 03.

## Amendment 03 outcome

The sample in `test-split-recovery-01.json` (seeds 500000–500499; digest `b89ead07e878fe6101395bda0dc7d6c4f787506c0a58c11d458e40fc92fda62b`) was opened under evaluator source `3bf7b3de8881be5ecbaeaa3829bdaee714d09c45`. The external case ledger durably records 360 completed evaluations, each a feasible but partial schedule, followed by one case whose state is `started`. A Windows `PermissionError` prevented the final atomic ledger replacement. The process did not evaluate the remaining 139 cases. This sample is consumed and will not be resumed, summarized as a complete sample, or reopened.

Inspection of the interrupted ledger exposed a resume-path defect: actual split rows contain `family`, `seed`, and `size`, while the recovery reader attempted to index them by a nonexistent `case_id`. The correction derives the stable case key from family and seed. The atomic writer now uses a unique pending path and retries transient Windows sharing denials. These changes affect result persistence and continuation behavior only; the trained method and all decision rules are byte-identical to the frozen training source.

## Frozen replacement sample

The new manifest `test-split-recovery-02.json` is generated and checked by `scripts/build_frontier_recovery_manifest.py`. It uses seeds 600000 through 600499, the same `funnel` family and ordered size strata, and the unchanged training and validation rows. The test split is disjoint from the training, validation, original consumed test, and both consumed recovery samples. Its digest is recorded in the committed manifest and verified by the evaluator before case access.

Only the existing v4 ensemble is eligible. No training, checkpoint selection, model change, threshold adjustment, or parameter tuning is allowed. The real greedy TopoSort baseline, all case outputs, failure states, coverage and objective metrics, and seed-cluster bootstrap remain exactly as specified in amendment 03 and SDD amendment 0.12.000. Product cases remain closed until this full 500-case run is complete and its receipt passes validation.

The amendment 03 ledger and its 360 case records remain external and immutable. They are retained as evidence of the interrupted attempt, not merged into the new sample and not used for a performance estimate.
