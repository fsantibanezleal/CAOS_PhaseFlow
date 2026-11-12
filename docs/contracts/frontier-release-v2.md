# Frontier release receipt, version 2

The v2 receipt records the SHA-256 digest of the complete synthetic evaluation split in `split_sha256` and the frozen
training/validation split in `training_split_sha256`. Both are required, lowercase 64-character SHA-256 values. The
training receipt, source commits, checkpoint hashes, feature contract, all thirteen case statuses, and trace hashes
remain bound as before.

Contract 2.1.0 also requires `tonnage_coverage` and `positive_value_coverage` in each `partial` case row. A partial plan
is feasible but must retain both measures in the durable receipt; a failure row keeps its reason and does not invent
coverage. These fields are copied from the independently validated per-case evaluation and checked against the
contract's inclusive `[0, 1]` range.

## Why the shape changed

The first candidate shape had one digest for a single combined split. The original synthetic test sample was consumed
and its outputs were lost before a release receipt could be created. The replacement sample has new test seeds while
retaining the original training and validation rows. A single digest could not identify both the model's training
partition and the independent sample used to evaluate it. The v2 shape records both identities so a receipt cannot
silently present the replacement test sample as the training split.

No v1 receipt was released or deployed. Candidate v1 receipts are not release evidence for the recovery sample. The
v2 receipt is emitted only after the new synthetic evaluation and all thirteen product-case outcomes have been
validated together. The 2.1.0 extension makes partial-schedule coverage explicit in the case-level release ledger.
