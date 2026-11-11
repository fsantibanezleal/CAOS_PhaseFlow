#!/usr/bin/env python3
"""Evaluate one frozen frontier ensemble once on the sealed synthetic test partition."""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import time

import numpy as np
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "data-pipeline"))

from pipeline.model.frontier_data import GENERATOR_VERSION, generate_graph  # noqa: E402
from pipeline.model.frontier_policy import validate_split_manifest  # noqa: E402
from pipeline.model.frontier_runtime import PeakRSS  # noqa: E402
from pipeline.model.frontier_splits import build_split_manifest, manifest_sha256  # noqa: E402
from pipeline.model.frontier_evaluation import RUN_NAME, seed_clustered_interval, target_version  # noqa: E402
from pipeline.model.frontier_release import validate_training_members  # noqa: E402
from pipeline.model.frontier_policy import Assignment, validate_schedule  # noqa: E402

MANIFEST_PATH = ROOT / "docs/design/features/learned-frontier/split-manifest.json"
CASE_INDEX = ROOT / "data/derived/manifests/index.json"
def _under(path: Path, parent: Path) -> bool:
    try:
        path.resolve().relative_to(parent.resolve())
        return True
    except ValueError:
        return False


def _atomic_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".pending")
    temporary.write_text(
        json.dumps(payload, ensure_ascii=False, sort_keys=True, indent=2, allow_nan=False) + "\n",
        encoding="utf-8",
    )
    os.replace(temporary, path)


def _test_ledger_path(data_root: Path, split_hash: str) -> Path:
    return data_root / f"synthetic-test-{split_hash}.ledger.json"


def _open_test_ledger(path: Path, identity: dict, manifest: dict) -> dict:
    """Create or resume the split-wide ledger without repeating a started case."""
    if path.exists():
        ledger = json.loads(path.read_text(encoding="utf-8"))
        if ledger.get("identity") != identity:
            raise ValueError("the sealed synthetic test split was already opened by a different evaluation")
        if ledger.get("status") in {"complete", "consumed-results-lost"}:
            raise ValueError(f"the sealed synthetic test split is {ledger['status']} and cannot be evaluated again")
        if ledger.get("status") != "started" or not isinstance(ledger.get("cases"), dict):
            raise ValueError("the synthetic test ledger is malformed or in an unknown state")
        rows = {row["case_id"]: row for row in manifest["test"]}
        for case_id, state in ledger["cases"].items():
            if (case_id not in rows or not isinstance(state, dict)
                    or state.get("status") not in {"started", "complete", "partial", "failed", "unavailable"}):
                raise ValueError("the synthetic test ledger contains an unknown case or state")
            if state["status"] == "started":
                row = rows[case_id]
                ledger["cases"][case_id] = {
                    "status": "unavailable",
                    "result": {
                        "case_id": case_id, "seed": row["seed"], "family": row["family"],
                        "size": row["size"], "status": "unavailable",
                        "failure_reason": "previous process stopped after opening this case; it was not rerun",
                    },
                }
            elif (not isinstance(state.get("result"), dict)
                    or state["result"].get("case_id") != case_id
                    or state["result"].get("status") != state["status"]):
                raise ValueError("the synthetic test ledger contains an incomplete or mismatched case result")
        _atomic_json(path, ledger)
        return ledger
    ledger = {
        "schema_version": "1.0.0", "status": "started", "identity": identity,
        "cases": {}, "started_at_utc": datetime.now(timezone.utc).isoformat(),
    }
    _atomic_json(path, ledger)
    return ledger


def _record_case(path: Path, ledger: dict, case_id: str, result: dict) -> None:
    json.dumps(result, ensure_ascii=False, allow_nan=False)
    ledger["cases"][case_id] = {"status": result["status"], "result": result}
    _atomic_json(path, ledger)


def _frozen_manifest() -> tuple[dict, str]:
    if not CASE_INDEX.is_file() or not MANIFEST_PATH.is_file():
        raise ValueError("the committed case index and frozen split ledger are required")
    index = json.loads(CASE_INDEX.read_text(encoding="utf-8"))
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    expected = build_split_manifest([row["case_id"] for row in index["cases"]])
    expected_hash = manifest_sha256(expected)
    if manifest != {"sha256": expected_hash, "manifest": expected}:
        raise ValueError("the split ledger differs from the frozen graph generator or current product case index")
    validate_split_manifest(manifest["manifest"])
    return manifest["manifest"], expected_hash


def _source_commit() -> str:
    return subprocess.run(
        ["git", "rev-parse", "HEAD"], cwd=ROOT, capture_output=True, text=True, check=True,
    ).stdout.strip()


def _validate_frozen_method_source(training_commit: str, evaluation_commit: str) -> None:
    """Allow result/reporting changes while proving the trained policy contract stayed frozen."""
    protected = [
        "data-pipeline/pipeline/model/frontier_data.py",
        "data-pipeline/pipeline/model/frontier_features.py",
        "data-pipeline/pipeline/model/frontier_policy.py",
        "data-pipeline/pipeline/model/frontier_ppo.py",
        "data-pipeline/pipeline/model/frontier_release.py",
        "data-pipeline/pipeline/model/frontier_splits.py",
        "requirements-frontier-training.txt",
        "scripts/train_frontier_policy.py",
        "data-pipeline/pipeline/model/frontier_evaluation.py",
        "docs/design/features/learned-frontier/split-manifest.json",
        "docs/design/features/learned-frontier/training-protocol-amendment-01.md",
        "docs/design/features/learned-frontier/training-protocol-amendment-02.md",
    ]
    changed = subprocess.run(
        ["git", "diff", "--name-only", training_commit, evaluation_commit, "--", *protected],
        cwd=ROOT, capture_output=True, text=True, check=True,
    ).stdout.splitlines()
    if changed:
        raise ValueError("frozen training method, data or protocol changed before evaluation: " + ", ".join(changed))


def _load_frozen_ensemble(model_run: Path, data_run: Path, *, source_commit: str, split_hash: str):
    receipt_path = data_run / "ensemble-receipt.json"
    contract_path = data_run / "training-contract.json"
    normalization_path = data_run / "feature-normalizer.json"
    if not all(path.is_file() for path in (receipt_path, contract_path, normalization_path)):
        raise ValueError("training receipt, contract and normalizer must all exist under the external data root")
    receipt = json.loads(receipt_path.read_text(encoding="utf-8"))
    contract = json.loads(contract_path.read_text(encoding="utf-8"))
    normalization = json.loads(normalization_path.read_text(encoding="utf-8"))
    if receipt.get("complete") is not True or receipt.get("method") != "frontier-policy":
        raise ValueError("the five-member frontier training run is incomplete")
    if receipt.get("source_commit") != source_commit or receipt.get("split_sha256") != split_hash:
        raise ValueError("training receipt source commit or split ledger differs from the declared frozen training source")
    if receipt.get("training_contract") != contract or receipt.get("normalization") != normalization:
        raise ValueError("training receipt, standalone contract and normalizer disagree")
    expected_seeds = [1103, 2207, 3301, 4409, 5519]
    members = receipt.get("members")
    validate_training_members(members, expected_seeds)
    expected_root = model_run.resolve()
    loaded = []
    for row in members:
        checkpoint = Path(row["checkpoint"]).expanduser().resolve()
        if not _under(checkpoint, expected_root):
            raise ValueError("a member checkpoint is outside the approved external model root")
        import torch
        from pipeline.model.frontier_ppo import load_checkpoint

        model = load_checkpoint(checkpoint, expected_sha256=row["checkpoint_sha256"])
        expected_mean = torch.as_tensor(normalization["mean"], dtype=model.feature_mean.dtype)
        expected_scale = torch.as_tensor(normalization["scale"], dtype=model.feature_scale.dtype)
        if not torch.equal(model.feature_mean, expected_mean) or not torch.equal(model.feature_scale, expected_scale):
            raise ValueError("a checkpoint's normalization buffers differ from the frozen training receipt")
        loaded.append(model)
    return loaded, receipt, contract


def _classical_greedy_baseline(graph) -> dict:
    """Run PhaseFlow's real feasible TopoSort baseline on the exact generated CPIT instance."""
    import oreblocks as ob

    instance = graph.instance
    n_blocks = len(instance.values)
    pstart = [0]
    plist: list[int] = []
    for predecessors in instance.predecessors:
        plist.extend(predecessors)
        pstart.append(len(plist))
    precedence = ob.Precedence(
        pstart=np.asarray(pstart, dtype=np.int64), plist=np.asarray(plist, dtype=np.int64),
    )
    cpit = ob.Cpit(
        name=f"synthetic-{graph.family}-{graph.seed}",
        n_blocks=n_blocks,
        n_periods=instance.capacities.shape[0],
        discount_rate=instance.discount_rate,
        value=instance.values.copy(),
        limit=instance.capacities.T.copy(),
        sense=np.full(instance.capacities.T.shape, "L", dtype="<U1"),
        coef=instance.resources.T.copy(),
        resource_names=("mining", "processing"),
    )
    started = time.monotonic()
    schedule = ob.toposort_schedule(
        cpit, precedence, weight="greedy", allowed=np.ones(n_blocks, dtype=bool),
    )
    runtime_seconds = time.monotonic() - started
    assignments = tuple(
        Assignment(block, int(period)) for block, period in enumerate(schedule.period_of_block) if period >= 0
    )
    independently_checked_npv = validate_schedule(instance, assignments)
    if not np.isclose(schedule.npv, independently_checked_npv, rtol=1e-10, atol=1e-8):
        raise ValueError("classical TopoSort objective differs from independent CPIT recomputation")
    positive = np.maximum(instance.values, 0.0)
    selected = np.fromiter((assignment.block for assignment in assignments), dtype=np.int64)
    selected_tonnage = float(graph.tonnage[selected].sum()) if selected.size else 0.0
    total_tonnage = float(graph.tonnage.sum())
    selected_positive = float(positive[selected].sum()) if selected.size else 0.0
    total_positive = float(positive.sum())
    return {
        "method": "toposort-greedy", "npv": independently_checked_npv,
        "normalized_npv": independently_checked_npv / max(float(np.abs(instance.values).sum()), 1e-12),
        "feasible": True, "assignments": len(assignments), "all_blocks_scheduled": len(assignments) == n_blocks,
        "tonnage_coverage": selected_tonnage / total_tonnage if total_tonnage else 0.0,
        "positive_value_coverage": selected_positive / total_positive if total_positive else 0.0,
        "runtime_seconds": runtime_seconds,
    }


def evaluate(args: argparse.Namespace) -> int:
    from pipeline.model.frontier_ppo import INFERENCE_CAP_SECONDS, replay_frontier_ensemble
    from train_frontier_policy import _check_environment

    _check_environment()
    frozen_version = target_version(ROOT)
    if (ROOT / "VERSION").read_text(encoding="utf-8").strip() != frozen_version:
        raise ValueError(f"the synthetic test partition opens only from the approved {frozen_version} source")
    dirty = subprocess.run(["git", "status", "--porcelain"], cwd=ROOT, capture_output=True, text=True, check=True)
    if dirty.stdout.strip():
        raise ValueError("synthetic test evaluation requires the clean frozen product source")
    evaluation_commit = _source_commit()
    manifest, split_hash = _frozen_manifest()
    model_root = Path(args.model_root).expanduser().resolve()
    approved_model_root = Path(args.approved_model_root).expanduser().resolve()
    data_root = Path(args.data_root).expanduser().resolve()
    approved_data_root = Path(args.approved_data_root).expanduser().resolve()
    if not _under(model_root, approved_model_root) or _under(model_root, ROOT):
        raise ValueError("the model root must remain under the approved external model root")
    if not _under(data_root, approved_data_root) or _under(data_root, ROOT):
        raise ValueError("the data root must remain under the approved external data root")
    if _under(model_root, data_root) or _under(data_root, model_root):
        raise ValueError("model and data roots must remain separate")
    if not RUN_NAME.fullmatch(args.run_name):
        raise ValueError("run name does not match the frozen safe-name grammar")
    model_run, data_run = model_root / args.run_name, data_root / args.run_name
    if not model_run.is_dir() or not data_run.is_dir():
        raise ValueError("the named external model and training-data runs must exist")
    output = data_run / "synthetic-test-evaluation.json"
    if output.exists():
        raise ValueError("the sealed synthetic test partition may be evaluated only once per frozen run")
    training_receipt_path = data_run / "ensemble-receipt.json"
    if not training_receipt_path.is_file():
        raise ValueError("the complete frozen training receipt is required before evaluation")
    training_source_commit = json.loads(training_receipt_path.read_text(encoding="utf-8")).get("source_commit")
    if not isinstance(training_source_commit, str) or len(training_source_commit) != 40:
        raise ValueError("the training receipt must identify its full source commit")
    _validate_frozen_method_source(training_source_commit, evaluation_commit)
    training_receipt_sha256 = hashlib.sha256(training_receipt_path.read_bytes()).hexdigest()
    training_receipt = json.loads(training_receipt_path.read_text(encoding="utf-8"))
    identity = {
        "run_name": args.run_name,
        "product_version": frozen_version,
        "training_source_commit": training_source_commit,
        "evaluation_source_commit": evaluation_commit,
        "training_receipt_sha256": training_receipt_sha256,
        "checkpoint_sha256": [row["checkpoint_sha256"] for row in training_receipt["members"]],
        "split_sha256": split_hash,
        "generator_version": GENERATOR_VERSION,
    }
    ledger_path = _test_ledger_path(data_root, split_hash)
    ledger = _open_test_ledger(ledger_path, identity, manifest)
    models, receipt, contract = _load_frozen_ensemble(
        model_run, data_run, source_commit=training_source_commit, split_hash=split_hash,
    )

    cases: list[dict] = []
    for row in manifest["test"]:
        case_id = f"synthetic-{row['family']}-{row['seed']}"
        previous = ledger["cases"].get(case_id)
        if previous is not None and previous["status"] != "started":
            cases.append(previous["result"])
            continue
        ledger["cases"][case_id] = {"status": "started", "result": None}
        _atomic_json(ledger_path, ledger)
        started = time.monotonic()
        memory = PeakRSS()
        inference_seconds = 0.0
        inference_started: float | None = None
        baseline: dict | None = None
        try:
            with memory:
                graph = generate_graph(row["seed"], row["family"], row["size"])
                baseline = _classical_greedy_baseline(graph)
                inference_started = time.monotonic()
                result = replay_frontier_ensemble(
                    graph.instance, graph.node_features, models, tonnage=graph.tonnage,
                )
                inference_seconds = time.monotonic() - inference_started
            elapsed = time.monotonic() - started
            complete_schedule = len(result.assignments) == row["size"] and result.stopped == "horizon-complete"
            case_result = {
                "case_id": case_id, "seed": row["seed"], "family": row["family"], "size": row["size"],
                "status": "complete" if complete_schedule else "partial", "failure_reason": None,
                "feasible": True, "assignments": len(result.assignments), "npv": result.npv,
                "normalized_npv": result.npv / max(float(np.abs(graph.instance.values).sum()), 1e-12),
                "tonnage_coverage": result.tonnage_coverage,
                "positive_value_coverage": result.positive_value_coverage,
                "classical_baseline": baseline,
                "classical_normalized_npv": baseline["normalized_npv"],
                "frontier_minus_classical_normalized_npv": result.npv
                / max(float(np.abs(graph.instance.values).sum()), 1e-12) - baseline["normalized_npv"],
                "case_seconds": elapsed, "inference_seconds": inference_seconds,
                "peak_memory_bytes": memory.peak_bytes,
                "stop_reason": result.stopped,
            }
            _record_case(ledger_path, ledger, case_id, case_result)
            cases.append(case_result)
        except TimeoutError as exc:
            if inference_started is not None:
                inference_seconds = time.monotonic() - inference_started
            failed_case = {
                "case_id": case_id, "seed": row["seed"], "family": row["family"], "size": row["size"],
                "status": "unavailable", "failure_reason": str(exc),
                "case_seconds": time.monotonic() - started, "inference_seconds": inference_seconds,
                "peak_memory_bytes": memory.peak_bytes,
            }
            if baseline is not None:
                failed_case["classical_baseline"] = baseline
                failed_case["classical_normalized_npv"] = baseline["normalized_npv"]
            _record_case(ledger_path, ledger, case_id, failed_case)
            cases.append(failed_case)
        except (ValueError, RuntimeError, FloatingPointError) as exc:
            if inference_started is not None:
                inference_seconds = time.monotonic() - inference_started
            failed_case = {
                "case_id": case_id, "seed": row["seed"], "family": row["family"], "size": row["size"],
                "status": "failed", "failure_reason": f"{type(exc).__name__}: {exc}",
                "case_seconds": time.monotonic() - started, "inference_seconds": inference_seconds,
                "peak_memory_bytes": memory.peak_bytes,
            }
            if baseline is not None:
                failed_case["classical_baseline"] = baseline
                failed_case["classical_normalized_npv"] = baseline["normalized_npv"]
            _record_case(ledger_path, ledger, case_id, failed_case)
            cases.append(failed_case)

    counts = {status: sum(row["status"] == status for row in cases)
              for status in ("complete", "partial", "failed", "unavailable")}
    numeric = [row["normalized_npv"] for row in cases if row.get("feasible") is True]
    result = {
        "schema_version": "1.0.0", "method": "frontier-policy", "evaluation": "sealed-synthetic-test",
        "evaluated_at_utc": datetime.now(timezone.utc).isoformat(), "product_version": frozen_version,
        "source_commit": evaluation_commit, "training_source_commit": training_source_commit,
        "engine_version": "oreblocks==0.6.6",
        "generator_version": GENERATOR_VERSION, "split_sha256": split_hash,
        "training_data_sha256": contract["training_data_sha256"],
        "feature_contract_sha256": contract["feature_contract_sha256"],
        "training_receipt_sha256": training_receipt_sha256,
        "checkpoint_sha256": [row["checkpoint_sha256"] for row in receipt["members"]],
        "inference_cap_seconds_per_case": INFERENCE_CAP_SECONDS,
        "cases": cases,
        "summary": {
            **counts,
            "cases": len(cases),
            "mean_normalized_npv_feasible": float(np.mean(numeric)) if numeric else None,
            "median_normalized_npv_feasible": float(np.median(numeric)) if numeric else None,
            "normalized_npv_seed_clustered_interval": seed_clustered_interval(cases),
            "classical_normalized_npv_seed_clustered_interval": seed_clustered_interval(
                cases, metric="classical_normalized_npv",
            ),
            "frontier_minus_classical_normalized_npv_seed_clustered_interval": seed_clustered_interval(
                cases, metric="frontier_minus_classical_normalized_npv",
            ),
        },
        "interpretation": "Synthetic held-out schedules only; no product-case or operating-mine claim.",
    }
    _atomic_json(output, result)
    ledger["status"] = "complete"
    ledger["completed_at_utc"] = datetime.now(timezone.utc).isoformat()
    ledger["result_sha256"] = hashlib.sha256(output.read_bytes()).hexdigest()
    _atomic_json(ledger_path, ledger)
    print(f"synthetic frontier evaluation written to {output}; cases={len(cases)}; counts={counts}")
    has_unavailable_case = any(row["status"] in {"failed", "unavailable"} for row in cases)
    return 2 if len(cases) != len(manifest["test"]) or has_unavailable_case else 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--run-name", required=True)
    parser.add_argument("--model-root", required=True)
    parser.add_argument("--approved-model-root", required=True)
    parser.add_argument("--data-root", required=True)
    parser.add_argument("--approved-data-root", required=True)
    args = parser.parse_args()
    try:
        return evaluate(args)
    except (ValueError, OSError, subprocess.SubprocessError, KeyError, TypeError) as exc:
        print(f"frontier evaluation: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
