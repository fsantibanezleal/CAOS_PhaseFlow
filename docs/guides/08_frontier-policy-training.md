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
An incomplete run preserves each successful member's checkpoint and receipt, marks failed members with their
failure record, marks unstarted members, and writes an incomplete ensemble receipt. It is not a complete ensemble.

## Run from a clean 0.12.000 source

The working tree must be clean and the product version must match the version declared by the reviewed SDD
amendment. Use a unique run name. The approved data and model roots contain the generated training receipt and
checkpoints respectively; both roots must be outside the checkout.

```powershell
$run = "frontier-0.12.000-r01"
$venv = Join-Path $env:CAOS_VENVS_ROOT "phaseflow-frontier"
$baseline = Join-Path $env:CAOS_TEMP_ROOT "phaseflow-0.11.000-full-0.6.6-20261031\results"
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

## Open the frozen evaluations once

After all five members are complete, run the sealed synthetic test exactly once. It reports each seed and retains
partial schedules; failed and unavailable cases make the command return nonzero.

```powershell
& "$venv\Scripts\python.exe" scripts/evaluate_frontier_policy.py `
  --run-name $run `
  --model-root $env:CAOS_MODELS_ROOT `
  --approved-model-root $env:CAOS_MODELS_ROOT `
  --data-root $env:CAOS_DATA_ROOT `
  --approved-data-root $env:CAOS_DATA_ROOT
```

Only after that receipt is complete, open the 13 product cases once. Supply the external root containing the
MineLib cache and twin inputs. Per-block assignments are recorded only for redistributable synthetic cases;
licensed MineLib cases retain aggregate metrics and explicit failures.

```powershell
& "$venv\Scripts\python.exe" scripts/evaluate_frontier_product_cases.py `
  --run-name $run `
  --model-root $env:CAOS_MODELS_ROOT `
  --approved-model-root $env:CAOS_MODELS_ROOT `
  --data-root $env:CAOS_DATA_ROOT `
  --approved-data-root $env:CAOS_DATA_ROOT `
  --case-data-root $env:CAOS_DATA_ROOT `
  --approved-case-data-root $env:CAOS_DATA_ROOT `
  --baseline-root $baseline `
  --approved-baseline-root $env:CAOS_TEMP_ROOT
```

Both scripts refuse a dirty source, mismatched split or unsupported product version. The product-case script also
requires the completed synthetic test ledger, the complete exact 0.11.000/OreBlocks 0.6.6 baseline, and binds each
row to an input-instance digest plus per-method paired NPV/runtime evidence. It excludes baseline rows on a
different objective. The test report also carries a seed-clustered 95% percentile-bootstrap interval with 10,000
resamples and fixed RNG seed 5519; failures remain explicit and are not scored. Per-case inference time and sampled
process peak resident memory are recorded. Neither script changes the repository or edits the frozen result after
the one-shot evaluation.

The method contract, transition equations, ablations and acceptance criteria are in the
[versioned amendment](../design/features/learned-frontier/SDD-amendment-0.12.000.md). The executable
evaluation, product-case adapter, training/evaluation notebooks and trace-backed app review remain separate
release gates; none is implied by this training guide.
