# Frontier policy training protocol amendment 01

**Status:** adopted for a new, separately frozen run; does not modify or reinterpret run `20261106-bs2-ppo-v1`.

## Evidence prompting the amendment

The original protocol in `SDD-amendment-0.12.000.md` saves a validation checkpoint every 50,000 environment transitions and caps each member at 7,200 process CPU seconds. In the first three completed members of run `20261106-bs2-ppo-v1`, the cap arrived before the first validation event:

| Seed | Transitions | Process CPU seconds | Stop | Validation events |
|---:|---:|---:|---|---:|
| 1103 | 49,152 | 7,202.0625 | CPU cap | 0 |
| 2207 | 49,152 | 7,201.140625 | CPU cap | 0 |
| 3301 | 45,056 | 7,200.703125 | CPU cap | 0 |

The 50,000-transition checkpoint was therefore not reached within the declared cap. These are training-budget failures, not policy outcomes: no validation, sealed synthetic test, or product-case result is inferred from them. The original run remains immutable evidence under its original source commit and protocol.

## Revised protocol for a new run

Keep the model, optimizer, reward, data generator, disjoint split ledger, five member seeds, maximum transitions, 7,200-second per-member CPU cap, 24-hour total wall cap, and checkpoint-selection rule unchanged. Change only the validation interval from 50,000 to 32,768 transitions. Rollouts contain 4,096 decisions, so the first validation is scheduled at 32,768 transitions. The lowest observed cap completion was at 45,056 transitions, leaving three rollout batches after the first validation point.

Validation is part of the member's fixed CPU and wall budgets. The validator checks the remaining budget before each validation case and each schedule action. If the budget expires, it discards that incomplete validation result, stops the member with the applicable cap reason, and does not select or write a checkpoint from the partial pass. The trainer also stops optimization before the hard CPU and wall caps, reserving up to 30 CPU seconds and 60 wall seconds for final and selected checkpoint writes plus the member receipt. For caps below those amounts, the reserve is 5% of the cap. The receipt records both hard caps, reserves and effective training deadlines; measured runtime fields remain actual elapsed time. A checkpoint is eligible only when its finite validation record is complete and its selected SHA-256 is present in the member receipt. The evaluator fails closed otherwise.

The new run uses a unique run name and a clean committed source containing this amendment. The old run is not resumed, overwritten, pooled, or used for checkpoint selection. No synthetic test or product case is opened until all five new members have complete validation-selected checkpoints and the ensemble receipt passes its structural gate.

## Verification

- The training command records `validation_interval=32768` in the frozen ensemble receipt.
- Each member receipt records the hard compute caps and explicit finalization reserve; training stops at the earlier effective deadline.
- Adversarial tests prove a cap during validation leaves no eligible validation selection and the member validator emits no partial report.
- The training receipt validator rejects empty, malformed, non-finite, unordered, or hash-mismatched validation histories.
- The new run is evaluated only from its exact clean source commit and the previously frozen split/data contract.
