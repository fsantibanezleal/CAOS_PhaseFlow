# PyTorch frontier training · 02 · Usage

The policy consumes a named node-feature matrix and the precedence graph. At every decision the environment
recomputes the current period, assigned-block state, residual capacities and feasible frontier. The categorical
distribution receives negative infinity for every inadmissible block; the stop actions remain visible.

For deterministic inference, use `MaskedGraphActorCritic.select_action(..., deterministic=True)` after loading
a checkpoint through `load_checkpoint(path, expected_sha256=...)`. Training samples from the masked categorical
distribution and updates with the frozen PPO configuration in the approved SDD. All training receipts include
the seed, transition count, CPU and wall time, checkpoint hashes, PPO settings, feature-contract digest, split
digest, validation history, device and package versions.

The current supported path is CPU-only. Every inference schedule must pass `validate_schedule` and the separate
result validator before its NPV or coverage enters a trace. Stop actions preserve partial outcomes and reasons.
The policy does not use a learned score as a mathematical bound, and missing or corrupt checkpoint data fails
closed.
