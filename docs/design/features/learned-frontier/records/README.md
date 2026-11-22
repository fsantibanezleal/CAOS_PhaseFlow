# Frontier training and validation records

These records are a sanitized, checksummed summary of the v4 training run and a
descriptive replay of its checkpoint-selection validation partition. The full
receipt, block graphs, training arrays, and model weights remain in their
external roots; this folder contains no local drive paths or weights.

`training-summary.json` preserves the source commit, engine and product
versions, frozen split and feature digests, training budget, per-member
validation history, checkpoint hashes, and the SHA-256 of the original receipt.
Its omission of location fields does not replace or modify the source receipt.

`validation-diagnostic.json` contains all 200 validation case summaries and
their independently checked feasibility results. These cases were used for
checkpoint selection. Their replay is post-selection diagnostics only; it is
not an independent test, does not establish performance on unseen cases, and
does not reopen the consumed synthetic test partition or any product case.

The figures in the manuscript and the evidence-focused notebooks read these
files directly. `build_figures.py` regenerates the manuscript's vector figures
from the repository root without access to private model or training paths.
