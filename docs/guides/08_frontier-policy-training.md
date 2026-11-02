# 08 · Train the state-conditioned frontier policy

This experiment has a separate CPU environment and separate external roots. It is not installed in CI, the
normal pipeline environment, the notebook environment, or the web deployment. Training belongs to the approved
0.12.000 source only, after the complete baseline is frozen and the product requirements for that version have
passed. The current checkout is 0.11.000, so the full training command deliberately refuses to run here.

## Prepare the isolated environment

On Windows, choose an external virtual-environment root and install the exact CPU stack:

```powershell
$venv = Join-Path $env:CAOS_VENVS_ROOT "phaseflow-frontier"
./scripts/setup-frontier-training.ps1 -VenvPath $venv
& "$venv\Scripts\python.exe" scripts/train_frontier_policy.py --check
```

On Linux or macOS:

```bash
./scripts/setup-frontier-training.sh "$CAOS_VENVS_ROOT/phaseflow-frontier"
"$CAOS_VENVS_ROOT/phaseflow-frontier/bin/python" scripts/train_frontier_policy.py --check
```

The check validates the exact CPU PyTorch pin, OreBlocks pin, named feature order, current case index, split
manifest digest, seed and family disjointness, and the sealed 13-case product set. It does not train, read the
synthetic test partition, inspect product traces, or create artifacts. A missing or stale contract stops here.

## Frozen training protocol

Training uses only the train rows from
[`split-manifest.json`](../design/features/learned-frontier/split-manifest.json). The normalizer is fitted
across generated training nodes only; the raw feature bytes, training split, normalizer, generator revision and
feature order are hashed. Each checkpoint carries its own mean and scale as model buffers, and its training
receipt carries the matching hashes. Validation uses only the declared validation partition. The trainer never
loads the test rows or product cases.

The SDD fixes five member seeds, one million environment transitions and two CPU-hours per member, validation
every 50,000 transitions, five consecutive feasible validation checkpoints without improvement as a stop rule,
and a 24-hour wall-clock cap across all five members. No command-line override can silently change those values.
An incomplete run preserves each started member's final checkpoint and receipt, marks unstarted members, and is
not a complete ensemble.

## Run from a clean 0.12.000 source

The working tree must be clean and the product version must match the version declared by the reviewed SDD
amendment. Use a unique run name. The approved data and model roots contain the generated training receipt and
checkpoints respectively; both roots must be outside the checkout.

```powershell
$run = "frontier-0.12.000-r01"
$venv = Join-Path $env:CAOS_VENVS_ROOT "phaseflow-frontier"
& "$venv\Scripts\python.exe" scripts/train_frontier_policy.py `
  --run-name $run `
  --model-root $env:CAOS_MODELS_ROOT `
  --approved-model-root $env:CAOS_MODELS_ROOT `
  --data-root $env:CAOS_DATA_ROOT `
  --approved-data-root $env:CAOS_DATA_ROOT
```

The result is complete only when the external `ensemble-receipt.json` marks all five members complete and each
checkpoint hash, training contract, normalization receipt and validation history verify. A timeout, partial
schedule or negative objective remains in the evidence; it is not repaired or relabeled. Training success alone
does not establish test performance, product-case behavior, comparison with the 0.11.000 baseline, or suitability
for app replay.

The method contract, transition equations, ablations and acceptance criteria are in the
[versioned amendment](../design/features/learned-frontier/SDD-amendment-0.12.000.md). The executable
evaluation, product-case adapter, training/evaluation notebooks and trace-backed app review remain separate
release gates; none is implied by this training guide.
