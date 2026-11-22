# Frontier policy training protocol amendment 02

**Status:** adopted for a fresh immutable run after the incomplete v2 member audit. This amendment changes only the timing of the first validation; run `20261106-bs2-ppo-v1` and `20261106-bs2-ppo-v2` remain immutable failed attempts.

## Evidence prompting the amendment

Run `20261106-bs2-ppo-v2` used the 32,768-transition validation interval from amendment 01. Seed 1103 reached exactly 32,768 transitions, then exhausted its 7,170-second effective training deadline during the PPO update (`last_update.interrupted=1`). Its terminal receipt records 7,180.546875 process CPU seconds, stop reason `cpu-cap`, and an empty `validation_history`. The independently recomputed hashes match `best.pt` and `final.pt`, but the release validator rejects the member because no validation event selected the checkpoint. This is a training-budget failure, not a policy result.

## Revised first-validation schedule

Keep the model, PPO optimizer and coefficients, reward, graph generator, train/validation/test split, five member seeds, one-million transition maximum, 7,200-second per-member CPU cap, 24-hour total wall cap, validation set and checkpoint-selection rule unchanged. The first full validation is now scheduled after 8,192 transitions (two 4,096-decision rollouts). Subsequent full validations retain the 32,768-transition interval. Each member receipt records both `first_validation_after` and `validation_interval`; the ensemble receipt repeats both settings. This moves the first validation earlier within the same fixed member budget; the next run must establish whether the complete pass finishes.

The validator still checks the effective CPU and wall deadlines before each validation case and each policy action. An incomplete pass is discarded and cannot select a checkpoint. Checkpoint selection requires a finite completed validation record and matching selected-checkpoint SHA-256. The finalization reserve remains 30 CPU seconds and 60 wall seconds (or five percent for smaller caps). No budget is extended, no partial validation is promoted, and no test or product case is opened before every member and the frozen ensemble receipt pass their structural checks.

## Verification and run boundary

- The unit test proves the first event occurs at the configured early threshold and later events use the regular interval.
- The trainer records both schedule values in every member receipt and the ensemble receipt.
- The empty-history v2 member remains rejected by `validate_training_members`; the old run is never resumed or pooled.
- The next attempt requires a new run name and a clean source commit containing this amendment. If validation again cannot complete, preserve that run as a budget failure and revise only through another recorded protocol amendment.
