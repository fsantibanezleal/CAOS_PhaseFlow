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
    temporary.write_text(json.dumps(payload, ensure_ascii=False, sort_keys=True, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)


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
        raise ValueError("training receipt source commit or split ledger differs from this frozen evaluator")
    if receipt.get("training_contract") != contract or receipt.get("normalization") != normalization:
        raise ValueError("training receipt, standalone contract and normalizer disagree")
    expected_seeds = [1103, 2207, 3301, 4409, 5519]
    members = receipt.get("members")
    if not isinstance(members, list) or [row.get("seed") for row in members] != expected_seeds:
        raise ValueError("the frozen ensemble does not contain the five reviewed member seeds in order")
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
    source_commit = _source_commit()
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
    models, receipt, contract = _load_frozen_ensemble(
        model_run, data_run, source_commit=source_commit, split_hash=split_hash,
    )

    cases: list[dict] = []
    for row in manifest["test"]:
        case_id = f"synthetic-{row['family']}-{row['seed']}"
        started = time.monotonic()
        memory = PeakRSS()
        inference_seconds = 0.0
        inference_started: float | None = None
        try:
            with memory:
                graph = generate_graph(row["seed"], row["family"], row["size"])
                inference_started = time.monotonic()
                result = replay_frontier_ensemble(
                    graph.instance, graph.node_features, models, tonnage=graph.tonnage,
                )
                inference_seconds = time.monotonic() - inference_started
            elapsed = time.monotonic() - started
            complete_schedule = len(result.assignments) == row["size"] and result.stopped == "horizon-complete"
            cases.append({
                "case_id": case_id, "seed": row["seed"], "family": row["family"], "size": row["size"],
                "status": "complete" if complete_schedule else "partial", "failure_reason": None,
                "feasible": True, "assignments": len(result.assignments), "npv": result.npv,
                "normalized_npv": result.npv / max(float(np.abs(graph.instance.values).sum()), 1e-12),
                "tonnage_coverage": result.tonnage_coverage,
                "positive_value_coverage": result.positive_value_coverage,
                "case_seconds": elapsed, "inference_seconds": inference_seconds,
                "peak_memory_bytes": memory.peak_bytes,
                "stop_reason": result.stopped,
            })
        except TimeoutError as exc:
            if inference_started is not None:
                inference_seconds = time.monotonic() - inference_started
            cases.append({
                "case_id": case_id, "seed": row["seed"], "family": row["family"], "size": row["size"],
                "status": "unavailable", "failure_reason": str(exc),
                "case_seconds": time.monotonic() - started, "inference_seconds": inference_seconds,
                "peak_memory_bytes": memory.peak_bytes,
            })
        except (ValueError, RuntimeError, FloatingPointError) as exc:
            if inference_started is not None:
                inference_seconds = time.monotonic() - inference_started
            cases.append({
                "case_id": case_id, "seed": row["seed"], "family": row["family"], "size": row["size"],
                "status": "failed", "failure_reason": f"{type(exc).__name__}: {exc}",
                "case_seconds": time.monotonic() - started, "inference_seconds": inference_seconds,
                "peak_memory_bytes": memory.peak_bytes,
            })

    counts = {status: sum(row["status"] == status for row in cases)
              for status in ("complete", "partial", "failed", "unavailable")}
    numeric = [row["normalized_npv"] for row in cases if row.get("feasible") is True]
    result = {
        "schema_version": "1.0.0", "method": "frontier-policy", "evaluation": "sealed-synthetic-test",
        "evaluated_at_utc": datetime.now(timezone.utc).isoformat(), "product_version": target_version,
        "source_commit": source_commit, "engine_version": "oreblocks==0.6.6",
        "generator_version": GENERATOR_VERSION, "split_sha256": split_hash,
        "training_data_sha256": contract["training_data_sha256"],
        "feature_contract_sha256": contract["feature_contract_sha256"],
        "training_receipt_sha256": hashlib.sha256(
            (data_run / "ensemble-receipt.json").read_bytes(),
        ).hexdigest(),
        "checkpoint_sha256": [row["checkpoint_sha256"] for row in receipt["members"]],
        "inference_cap_seconds_per_case": INFERENCE_CAP_SECONDS,
        "cases": cases,
        "summary": {
            **counts,
            "cases": len(cases),
            "mean_normalized_npv_feasible": float(np.mean(numeric)) if numeric else None,
            "median_normalized_npv_feasible": float(np.median(numeric)) if numeric else None,
            "normalized_npv_seed_clustered_interval": seed_clustered_interval(cases),
        },
        "interpretation": "Synthetic held-out schedules only; no product-case or operating-mine claim.",
    }
    _atomic_json(output, result)
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
