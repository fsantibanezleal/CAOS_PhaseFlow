#!/usr/bin/env python3
"""Assemble validated frontier evaluation rows into an external PhaseFlow bake candidate.

This script never writes into the checkout. It begins with the exact preceding release artifacts,
adds trace-safe aggregates produced by the one-shot evaluator, stamps one product version, and emits
a release receipt for the normal artifact, readiness, contract and browser gates.
"""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import hashlib
import json
import math
from pathlib import Path
import shutil
import subprocess
import sys
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "data-pipeline"))

from pipeline.core import readiness  # noqa: E402
from pipeline.model.frontier_release import validate_release_receipt  # noqa: E402
from frontier_release_contract import RELEASE_SCHEMA, validate_v2_split_hashes  # noqa: E402


def _json(path: Path) -> dict[str, Any]:
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError(f"expected a JSON object at {path}")
    return value


def _write(path: Path, payload: dict[str, Any]) -> bytes:
    encoded = (json.dumps(payload, ensure_ascii=False, sort_keys=True, indent=2) + "\n").encode("utf-8")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(encoded)
    return encoded


def _finite(value: Any, field: str) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
        raise ValueError(f"{field} must be a finite number")
    return float(value)


def _periods(trace: dict[str, Any], result: dict[str, Any]) -> list[dict[str, Any]]:
    periods = result.get("periods")
    horizon = trace["scenario"]["periods"]
    resources = trace["scenario"]["resources"]
    if not isinstance(periods, list) or len(periods) != horizon:
        raise ValueError(f"{trace['caseId']}: frontier evaluation must provide one period row per horizon step")
    needed = (
        "minedTonnes", "oreTonnes", "wasteTonnes", "headGrade", "metal", "value", "discCashFlow",
        "cumNpv", "stripRatio", "resourceUse", "resourceLimit", "components", "largestComponentShare",
        "minWidthBlocks", "blocks",
    )
    checked: list[dict[str, Any]] = []
    cumulative = 0.0
    for index, row in enumerate(periods):
        if not isinstance(row, dict) or row.get("t") != index + 1:
            raise ValueError(f"{trace['caseId']}: period rows must be ordered and one-based")
        if any(key not in row for key in needed):
            raise ValueError(f"{trace['caseId']}: period {index + 1} is missing trace aggregate fields")
        for key in needed:
            if key in {"resourceUse", "resourceLimit"}:
                continue
            value = row[key]
            if key in {"components", "minWidthBlocks", "blocks"}:
                if isinstance(value, bool) or not isinstance(value, int) or value < 0:
                    raise ValueError(f"{trace['caseId']}: {key} must be a non-negative integer")
            else:
                _finite(value, f"period {index + 1}.{key}")
        use, limit = row["resourceUse"], row["resourceLimit"]
        if (not isinstance(use, list) or not isinstance(limit, list)
                or len(use) != len(resources) or len(limit) != len(resources)):
            raise ValueError(f"{trace['caseId']}: period resource vectors differ from the declared scenario")
        for resource_index, resource in enumerate(resources):
            used = _finite(use[resource_index], "resourceUse")
            cap = _finite(limit[resource_index], "resourceLimit")
            expected = resource["limitPerPeriod"][index]
            if abs(cap - expected) > 0.11:
                raise ValueError(f"{trace['caseId']}: period resource limit differs from the case scenario")
            if cap > 0 and used > cap * (1 + 1e-6) + 1e-3:
                raise ValueError(f"{trace['caseId']}: frontier schedule exceeds resource capacity")
        cumulative += float(row["discCashFlow"])
        if abs(cumulative - float(row["cumNpv"])) > 0.02:
            raise ValueError(f"{trace['caseId']}: cumulative NPV does not reconcile by period")
        checked.append(row)
    npv = _finite(result.get("npv"), "npv")
    if abs(cumulative - npv) > 0.02:
        raise ValueError(f"{trace['caseId']}: discounted period cash flow does not reconcile to NPV")
    return checked


def _frontier_method(trace: dict[str, Any], result: dict[str, Any], evaluation: dict[str, Any]) -> dict[str, Any]:
    method_id = "frontier-policy"
    if any(row.get("method") == method_id for row in trace.get("methods", [])):
        raise ValueError(f"{trace['caseId']}: frontier method already exists in the baseline trace")
    used = (trace.get("bound") or {}).get("used", "algorithm4")
    bound = _finite((trace.get("bound") or {}).get(used), f"{trace['caseId']} {used} bound")
    npv = _finite(result.get("npv"), f"{trace['caseId']} NPV")
    if npv > bound * (1 + 1e-9) + 1e-3:
        raise ValueError(f"{trace['caseId']}: frontier NPV exceeds its certified CPIT bound")
    periods = _periods(trace, result)
    assignments = result.get("assignments")
    if isinstance(assignments, bool) or not isinstance(assignments, int) or assignments < 0:
        raise ValueError(f"{trace['caseId']}: assignment count is malformed")
    if sum(row["blocks"] for row in periods) != assignments:
        raise ValueError(f"{trace['caseId']}: per-period blocks do not add to the assignment count")
    n_blocks = trace["instance"]["nBlocks"]
    row: dict[str, Any] = {
        "method": method_id,
        "rung": "beyond",
        "heuristic": True,
        "npv": round(npv, 2),
        "bound": round(bound, 2),
        "gapPct": round(100 * (bound - npv) / bound, 4) if bound > 0 else 0.0,
        "runtimeMs": round(1000 * _finite(result.get("inference_seconds"), "inference_seconds"), 1),
        "minedBlocks": assignments,
        "notes": "State-conditioned frontier policy; every exported assignment passed the independent CPIT validator.",
        "unreliable": False,
        "measuredVsExact": None,
        "flaggedByRule": False,
        "periods": periods,
        "extra": {
            "status": result["status"],
            "tonnageCoverage": round(_finite(result.get("tonnage_coverage"), "tonnage_coverage"), 6),
            "positiveValueCoverage": round(_finite(result.get("positive_value_coverage"), "positive_value_coverage"), 6),
            "stopReason": result.get("stop_reason"),
            "peakMemoryBytes": result.get("peak_memory_bytes"),
            "trainingSourceCommit": evaluation["training_source_commit"],
            "evaluationSourceCommit": evaluation["source_commit"],
            "checkpointSha256": evaluation["checkpoint_sha256"],
            "featureContractSha256": evaluation["feature_contract_sha256"],
        },
    }
    vector = result.get("period_of_block")
    if trace["instance"].get("synthetic"):
        if not isinstance(vector, list) or len(vector) != n_blocks:
            raise ValueError(f"{trace['caseId']}: redistributable twin result requires one period index per block")
        if any(isinstance(value, bool) or not isinstance(value, int) or value < -1 or value >= len(periods)
               for value in vector):
            raise ValueError(f"{trace['caseId']}: synthetic period vector contains an invalid period")
        if sum(value >= 0 for value in vector) != assignments:
            raise ValueError(f"{trace['caseId']}: synthetic period vector does not reconcile to assignment count")
        row["periodOfBlock"] = vector
    elif vector is not None:
        raise ValueError(f"{trace['caseId']}: licensed MineLib schedule must not export per-block assignments")
    return row


def _scoreboard_row(method: dict[str, Any]) -> dict[str, Any]:
    used_periods = [row for row in method["periods"] if row["blocks"] > 0]
    resources = len(method["periods"][0]["resourceUse"]) if method["periods"] else 0
    return {
        "method": method["method"], "rung": method["rung"], "npv": method["npv"],
        "bound": method["bound"], "gap_pct": method["gapPct"], "runtime_ms": method["runtimeMs"],
        "notes": method["notes"], "measured_vs_exact": None,
        "components_mean": round(sum(row["components"] for row in used_periods) / len(used_periods), 3)
        if used_periods else 0.0,
        "largest_share_mean": round(sum(row["largestComponentShare"] for row in used_periods) / len(used_periods), 4)
        if used_periods else 0.0,
        "utilization": [
            [round(row["resourceUse"][resource] / row["resourceLimit"][resource], 4)
             if row["resourceLimit"][resource] > 0 else None for row in method["periods"]]
            for resource in range(resources)
        ],
        "extra": method.get("extra", {}),
    }


def build_candidate(baseline_root: Path, candidate_root: Path, evaluation_path: Path) -> dict[str, Any]:
    """Copy one exact baseline and combine it with one frozen all-case evaluation."""
    baseline_root = baseline_root.resolve()
    candidate_root = candidate_root.resolve()
    if (baseline_root == candidate_root or baseline_root.is_relative_to(candidate_root)
            or candidate_root.is_relative_to(baseline_root)):
        raise ValueError("candidate root must not contain or overwrite its baseline")
    if candidate_root == ROOT or candidate_root.is_relative_to(ROOT):
        raise ValueError("candidate artifacts must stay outside the product repository")
    if candidate_root.exists() and any(candidate_root.iterdir()):
        raise ValueError("candidate root must be new or empty")
    candidate_root.mkdir(parents=True, exist_ok=True)
    shutil.copytree(baseline_root, candidate_root, dirs_exist_ok=True)

    evaluation = _json(evaluation_path)
    version = (ROOT / "VERSION").read_text(encoding="utf-8").strip()
    if evaluation.get("product_version") != version or evaluation.get("engine_version") != "oreblocks==0.6.6":
        raise ValueError("evaluation does not match the candidate product and engine versions")
    for field, size in (("source_commit", 40), ("training_source_commit", 40),
                        ("feature_contract_sha256", 64), ("case_index_sha256", 64),
                        ("split_sha256", 64), ("training_split_sha256", 64)):
        value = evaluation.get(field)
        if not isinstance(value, str) or len(value) != size or any(c not in "0123456789abcdef" for c in value):
            raise ValueError(f"evaluation receipt has an invalid {field}")
    checkpoints = evaluation.get("checkpoint_sha256")
    if (not isinstance(checkpoints, list) or len(checkpoints) != 5
            or any(not isinstance(value, str) or len(value) != 64 for value in checkpoints)):
        raise ValueError("evaluation must name all five frozen checkpoint hashes")

    index_path = candidate_root / "manifests" / "index.json"
    index = _json(index_path)
    baseline_info = evaluation.get("baseline")
    if not isinstance(baseline_info, dict):
        raise ValueError("evaluation must identify the frozen baseline index")
    baseline_index_hash = hashlib.sha256(index_path.read_bytes()).hexdigest()
    if (index.get("engine_version") != baseline_info.get("product_version")
            or baseline_info.get("engine_version") != "oreblocks==0.6.6"
            or baseline_index_hash != baseline_info.get("index_sha256")):
        raise ValueError("candidate baseline index differs from the exact baseline named by evaluation")
    entries = index.get("cases")
    results = evaluation.get("cases")
    if not isinstance(entries, list) or not isinstance(results, list):
        raise ValueError("case index and evaluation must contain their full row lists")
    expected_ids = [entry["case_id"] for entry in entries]
    result_ids = [row.get("case_id") for row in results if isinstance(row, dict)]
    if len(results) != 13 or result_ids != expected_ids:
        raise ValueError("evaluation rows must match all thirteen baseline cases in committed order")
    if (evaluation.get("summary", {}).get("cases") != 13
            or evaluation.get("summary", {}).get("failed", 0) != sum(row.get("status") == "failed" for row in results)
            or evaluation.get("summary", {}).get("unavailable", 0)
            != sum(row.get("status") == "unavailable" for row in results)):
        raise ValueError("all-case status counts disagree with the retained result rows")

    checkpoint_hash = hashlib.sha256(
        json.dumps(checkpoints, separators=(",", ":")).encode("ascii"),
    ).hexdigest()
    case_receipts: list[dict[str, Any]] = []
    status_counts = {name: 0 for name in ("complete", "partial", "failed", "unavailable")}
    for entry, result in zip(entries, results, strict=True):
        case_id = entry["case_id"]
        trace_path = candidate_root / entry["artifact_path"] if "artifact_path" in entry else None
        if trace_path is None:
            manifest = _json(candidate_root / entry["manifest_path"])
            trace_path = candidate_root / manifest["artifact"]["path"]
        trace = _json(trace_path)
        if trace.get("caseId") != case_id:
            raise ValueError(f"{case_id}: baseline trace identity differs from the index")
        baseline_trace_sha256 = hashlib.sha256(trace_path.read_bytes()).hexdigest()
        if result.get("baseline_trace_sha256") != baseline_trace_sha256:
            raise ValueError(f"{case_id}: baseline trace differs from the paired all-case evaluation")
        status = result.get("status")
        if status not in status_counts:
            raise ValueError(f"{case_id}: unsupported retained evaluation status")
        status_counts[status] += 1
        if status in {"complete", "partial"}:
            method = _frontier_method(trace, result, evaluation)
            trace["methods"].append(method)
            if status == "partial":
                for key in ("tonnageCoverage", "positiveValueCoverage"):
                    if not 0 <= method["extra"][key] <= 1:
                        raise ValueError(f"{case_id}: partial coverage must be in [0,1]")
            trace["frontierPolicy"] = {
                "status": status,
                "source": "frozen external training receipt and one-shot product-case evaluation",
                "trainingSourceCommit": evaluation["training_source_commit"],
                "evaluationSourceCommit": evaluation["source_commit"],
                "trainingReceiptSha256": evaluation["training_receipt_sha256"],
                "featureContractSha256": evaluation["feature_contract_sha256"],
                "checkpointSha256": checkpoints,
            }
        else:
            reason = result.get("failure_reason")
            if not isinstance(reason, str) or len(reason.strip()) < 12:
                raise ValueError(f"{case_id}: failure and unavailability require an explicit reason")
            trace["frontierPolicy"] = {"status": status, "reason": reason[:1000]}
            method = None

        trace_bytes = _write(trace_path, trace)
        manifest_path = candidate_root / entry["manifest_path"]
        manifest = _json(manifest_path)
        manifest["engine"]["version"] = version
        manifest["engine"]["source"] = evaluation["source_commit"]
        manifest["artifact"]["bytes"] = len(trace_bytes)
        if method is not None:
            manifest["scoreboard"].append(_scoreboard_row(method))
        manifest["frontier_policy"] = {"status": status, "failure_reason": result.get("failure_reason")}
        _write(manifest_path, manifest)
        case_receipt = {
            "case_id": case_id, "product_version": version,
            "engine_version": "oreblocks==0.6.6", "source_commit": evaluation["source_commit"],
            "checkpoint_sha256": checkpoint_hash,
            "feature_contract_sha256": evaluation["feature_contract_sha256"],
            "status": status, "failure_reason": result.get("failure_reason"),
        }
        if method is not None:
            case_receipt["trace_sha256"] = hashlib.sha256(trace_bytes).hexdigest()
        case_receipts.append(case_receipt)

    index["engine_version"] = version
    _write(index_path, index)
    receipt = {
        "schema": RELEASE_SCHEMA,
        "created_at_utc": datetime.now(timezone.utc).isoformat(),
        "product_version": version,
        "engine_version": "oreblocks==0.6.6",
        "source_commit": evaluation["source_commit"],
        "training_source_commit": evaluation["training_source_commit"],
        "checkpoint_sha256": checkpoint_hash,
        "checkpoint_members_sha256": checkpoints,
        "feature_contract_sha256": evaluation["feature_contract_sha256"],
        "split_sha256": evaluation["split_sha256"],
        "training_split_sha256": evaluation["training_split_sha256"],
        "case_index_sha256": evaluation["case_index_sha256"],
        "baseline": evaluation["baseline"],
        "cases": case_receipts,
        "summary": {"cases": len(case_receipts), **status_counts},
        "redistribution": "Synthetic period vectors only; licensed MineLib schedules remain period aggregates.",
    }
    validate_v2_split_hashes(receipt)
    structural_receipt = dict(receipt)
    structural_receipt["schema"] = "phaseflow.frontier-release/v1"
    validate_release_receipt(structural_receipt, expected_ids)
    _write(candidate_root / "frontier-release-receipt.json", receipt)
    snapshot = readiness.compute(ROOT, derived_root=candidate_root, models_dir=ROOT / "models", version=version)
    readiness.write(candidate_root, snapshot)
    return receipt


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--baseline-root", type=Path, default=ROOT / "data/derived")
    parser.add_argument("--evaluation", type=Path, required=True)
    parser.add_argument("--candidate-root", type=Path, required=True)
    parser.add_argument("--approved-temp-root", type=Path, required=True)
    args = parser.parse_args()
    try:
        candidate = args.candidate_root.resolve()
        approved_temp_root = args.approved_temp_root.resolve()
        if not candidate.is_relative_to(approved_temp_root):
            raise ValueError("candidate root must stay under the explicitly approved external temp root")
        receipt = build_candidate(args.baseline_root, args.candidate_root, args.evaluation)
    except (OSError, ValueError, KeyError, TypeError, subprocess.SubprocessError) as exc:
        print(f"frontier release candidate: {exc}", file=sys.stderr)
        return 1
    print(json.dumps(receipt["summary"], sort_keys=True))
    print(f"candidate written outside the checkout: {args.candidate_root.resolve()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
