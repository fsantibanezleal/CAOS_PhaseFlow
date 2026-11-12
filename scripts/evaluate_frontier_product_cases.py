#!/usr/bin/env python3
"""Evaluate one frozen frontier ensemble once on all 13 held-out PhaseFlow cases."""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import hashlib
import importlib
import json
import math
import os
from pathlib import Path
import subprocess
import sys
import time

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "data-pipeline"))

from pipeline import registry  # noqa: E402
from pipeline.model.frontier_cases import (  # noqa: E402
    adapt_product_case,
    product_period_aggregates,
    validate_product_result,
)
from pipeline.model.frontier_data import GENERATOR_VERSION  # noqa: E402
from pipeline.model.frontier_runtime import PeakRSS  # noqa: E402
from evaluate_frontier_policy import (  # noqa: E402
    _frozen_manifest,
    _recovery_manifest,
    _load_frozen_ensemble,
    _validate_frozen_method_source,
)
from pipeline.model.frontier_evaluation import RUN_NAME, target_version as read_target_version  # noqa: E402

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


def _case_index() -> tuple[list[str], str]:
    if not CASE_INDEX.is_file():
        raise ValueError("the committed PhaseFlow case index is required")
    payload = json.loads(CASE_INDEX.read_text(encoding="utf-8"))
    rows = payload.get("cases")
    if not isinstance(rows, list) or len(rows) != 13:
        raise ValueError("the frontier product evaluation requires the frozen 13-case index")
    case_ids = [row["case_id"] for row in rows]
    if len(set(case_ids)) != 13:
        raise ValueError("the product case index contains duplicate identifiers")
    digest = hashlib.sha256(json.dumps(payload, sort_keys=True, separators=(",", ":")).encode()).hexdigest()
    registered = [case.id for case in registry.list_cases()]
    if len(registered) != 13 or set(registered) != set(case_ids):
        raise ValueError("the active case registry differs in membership from the frozen product index")
    return case_ids, digest


def _baseline_version() -> str:
    major, minor, patch = (int(part) for part in read_target_version(ROOT).split("."))
    if minor < 1:
        raise ValueError("frontier evaluation requires a preceding minor product version")
    return f"{major}.{minor - 1:02d}.{patch:03d}"


def _baseline_cases(
    baseline_root: Path, approved_root: Path, case_ids: list[str], *, expected_version: str,
) -> tuple[dict[str, dict], str]:
    if not _under(baseline_root, approved_root) or _under(baseline_root, ROOT):
        raise ValueError("the 0.11 baseline must remain under its approved external result root")
    index_path = baseline_root / "manifests" / "index.json"
    if not index_path.is_file():
        raise ValueError("the complete, validated previous-release baseline index is required")
    index = json.loads(index_path.read_text(encoding="utf-8"))
    indexed = index.get("cases")
    if (index.get("schema") != "phaseflow.index/v1" or index.get("engine_version") != expected_version
            or index.get("n_cases") != 13 or not isinstance(indexed, list)
            or [row.get("case_id") for row in indexed] != case_ids):
        raise ValueError("the baseline index is incomplete or differs from the frozen product case order/version")
    index_sha = hashlib.sha256(index_path.read_bytes()).hexdigest()
    loaded: dict[str, dict] = {}
    for row in indexed:
        case_id = row["case_id"]
        manifest_path = (baseline_root / row["manifest_path"]).resolve()
        if not _under(manifest_path, baseline_root) or not manifest_path.is_file():
            raise ValueError(f"baseline manifest is missing or outside its root: {case_id}")
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        if (manifest.get("case_id") != case_id
                or manifest.get("engine", {}).get("version") != expected_version
                or manifest.get("engine", {}).get("oreblocks") != "0.6.6"):
            raise ValueError(f"baseline manifest has a mixed case or engine identity: {case_id}")
        artifact = manifest.get("artifact", {})
        trace_path = (baseline_root / artifact.get("path", "")).resolve()
        if (not _under(trace_path, baseline_root) or not trace_path.is_file()
                or trace_path.stat().st_size != artifact.get("bytes")):
            raise ValueError(f"baseline trace is missing or fails its declared byte count: {case_id}")
        trace = json.loads(trace_path.read_text(encoding="utf-8"))
        if trace.get("schema") != "phaseflow.schedule-trace/v1" or trace.get("caseId") != case_id:
            raise ValueError(f"baseline trace has a mixed schema or case identity: {case_id}")
        comparable = [
            method for method in trace.get("methods", [])
            if method.get("rung") in {"classical", "sota", "learned"}
            and isinstance(method.get("npv"), (int, float)) and math.isfinite(method["npv"])
        ]
        if not comparable:
            raise ValueError(f"baseline trace has no comparable CPIT method rows: {case_id}")
        bound_payload = trace.get("bound") or {}
        certified_bound = bound_payload.get("algorithm4")
        if (isinstance(certified_bound, bool) or not isinstance(certified_bound, (int, float))
                or not math.isfinite(certified_bound)):
            certified_bound = None
        loaded[case_id] = {
            "trace_sha256": hashlib.sha256(trace_path.read_bytes()).hexdigest(),
            "methods": comparable,
            "certified_bound": float(certified_bound) if certified_bound is not None else None,
            "bound_method": bound_payload.get("used") if certified_bound is not None else None,
            "published": trace.get("published") or {},
            "trace": trace,
            "manifest": manifest,
        }
    return loaded, index_sha


def _expected_time_comparison(baseline: dict, frontier_npv: float) -> dict:
    method = next((row for row in baseline["methods"] if row["method"] == "toposort-expected"), None)
    certified = method is not None and baseline["certified_bound"] is not None
    return {
        "available": certified,
        "method": "toposort-expected" if certified else None,
        "certificate_complete": certified,
        "npv": float(method["npv"]) if certified else None,
        "frontier_minus_expected_time_npv": frontier_npv - float(method["npv"]) if certified else None,
        "reason_unavailable": None if certified else "the exact expected-time order or its certified bound did not complete",
    }


def _published_reference(published: dict, frontier_npv: float) -> dict:
    value = published.get("best_known")
    comparable = (
        published.get("problem") == "CPIT"
        and isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)
    )
    available = isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)
    return {
        "available": available,
        "objective": published.get("problem"),
        "value": value,
        "source": published.get("source"),
        "comparable_to_frontier_objective": comparable,
        "frontier_minus_published_value": frontier_npv - float(value) if comparable else None,
        "reason_not_comparable": (
            None if comparable else "no published CPIT schedule with a matching objective is declared for this case"
        ),
    }


def _validate_baseline_pairing(baseline: dict, case, source_instance) -> None:
    """Require the same source case, CPIT scenario and aggregate instance as the 0.11 comparator."""
    trace = baseline["trace"]
    trace_instance = trace.get("instance") or {}
    cpit = source_instance.cpit
    precedence = source_instance.precedence
    expected_instance = {
        "source": "twin" if case.deposit.synthetic else "minelib",
        "synthetic": bool(case.deposit.synthetic),
        "nBlocks": int(cpit.n_blocks),
        "nPrecedenceArcs": int(precedence.n_arcs),
        "upitValue": round(float(source_instance.upit_value), 2),
        "upitBlocks": int(source_instance.upit_in_pit.sum()),
    }
    if any(trace_instance.get(key) != value for key, value in expected_instance.items()):
        raise ValueError(f"current case {case.id} differs from the frozen baseline instance contract")
    resource_names = list(cpit.resource_names or ())
    expected_scenario = {
        "periods": int(cpit.n_periods),
        "discountRate": float(cpit.discount_rate),
        "periodOneUndiscounted": bool(cpit.period_one_undiscounted),
        "declared": not bool(case.published),
        "resources": [
            {
                "id": index,
                "name": resource_names[index] if index < len(resource_names) else f"r{index}",
                "limitPerPeriod": [round(float(value), 1) for value in cpit.limit[index]],
            }
            for index in range(int(cpit.n_resources))
        ],
    }
    if trace.get("scenario") != expected_scenario:
        raise ValueError(f"current case {case.id} differs from the frozen baseline scenario")


def evaluate(args: argparse.Namespace) -> int:
    from pipeline.model.frontier_ppo import INFERENCE_CAP_SECONDS, replay_frontier_ensemble
    from train_frontier_policy import _check_environment

    _check_environment()
    target_version = read_target_version(ROOT)
    if (ROOT / "VERSION").read_text(encoding="utf-8").strip() != target_version:
        raise ValueError(f"product-case evaluation opens only from the approved {target_version} source")
    dirty = subprocess.run(["git", "status", "--porcelain"], cwd=ROOT, capture_output=True, text=True, check=True)
    if dirty.stdout.strip():
        raise ValueError("product-case evaluation requires the clean frozen product source")
    source_commit = subprocess.run(
        ["git", "rev-parse", "HEAD"], cwd=ROOT, capture_output=True, text=True, check=True,
    ).stdout.strip()
    case_ids, index_hash = _case_index()
    baseline_version = _baseline_version()
    baseline_root = Path(args.baseline_root).expanduser().resolve()
    approved_baseline_root = Path(args.approved_baseline_root).expanduser().resolve()
    baseline, baseline_index_hash = _baseline_cases(
        baseline_root, approved_baseline_root, case_ids, expected_version=baseline_version,
    )
    manifest, training_split_hash = _frozen_manifest()
    del manifest
    _, test_split_hash, frozen_training_split_hash = _recovery_manifest()
    if frozen_training_split_hash != training_split_hash:
        raise ValueError("the recovery test sample does not preserve the frozen training split")

    model_root = Path(args.model_root).expanduser().resolve()
    approved_model_root = Path(args.approved_model_root).expanduser().resolve()
    data_root = Path(args.data_root).expanduser().resolve()
    approved_data_root = Path(args.approved_data_root).expanduser().resolve()
    case_data_root = Path(args.case_data_root).expanduser().resolve()
    approved_case_data_root = Path(args.approved_case_data_root).expanduser().resolve()
    if not _under(model_root, approved_model_root) or _under(model_root, ROOT):
        raise ValueError("model root must remain under the approved external model root")
    if not _under(data_root, approved_data_root) or _under(data_root, ROOT):
        raise ValueError("data root must remain under the approved external data root")
    if not _under(case_data_root, approved_case_data_root) or _under(case_data_root, ROOT):
        raise ValueError("MineLib and case inputs must remain under the approved external case-data root")
    if _under(model_root, data_root) or _under(data_root, model_root):
        raise ValueError("model and data roots must remain separate")
    if not RUN_NAME.fullmatch(args.run_name):
        raise ValueError("run name does not match the frozen safe-name grammar")
    model_run, data_run = model_root / args.run_name, data_root / args.run_name
    if not model_run.is_dir() or not data_run.is_dir():
        raise ValueError("the named external model and training-data runs must exist")

    synthetic_receipt_path = data_run / "synthetic-test-evaluation.json"
    output = data_run / "product-case-evaluation.json"
    if not synthetic_receipt_path.is_file():
        raise ValueError("the sealed synthetic test evaluation must be recorded before product cases open")
    if output.exists():
        raise ValueError("the 13 product cases may be evaluated only once per frozen training run")
    training_receipt_path = data_run / "ensemble-receipt.json"
    if not training_receipt_path.is_file():
        raise ValueError("the complete frozen training receipt is required before product-case evaluation")
    training_source_commit = json.loads(training_receipt_path.read_text(encoding="utf-8")).get("source_commit")
    if not isinstance(training_source_commit, str) or len(training_source_commit) != 40:
        raise ValueError("the training receipt must identify its full source commit")
    _validate_frozen_method_source(training_source_commit, source_commit)
    synthetic_receipt = json.loads(synthetic_receipt_path.read_text(encoding="utf-8"))
    if (synthetic_receipt.get("source_commit") != source_commit
            or synthetic_receipt.get("training_source_commit") != training_source_commit
            or synthetic_receipt.get("evaluation") != "recovery-synthetic-test-01"
            or synthetic_receipt.get("split_sha256") != test_split_hash
            or synthetic_receipt.get("training_split_sha256") != training_split_hash
            or synthetic_receipt.get("summary", {}).get("cases") != 500
            or synthetic_receipt.get("summary", {}).get("failed") != 0
            or synthetic_receipt.get("summary", {}).get("unavailable") != 0):
        raise ValueError("synthetic test receipt is incomplete, failed or belongs to another frozen source")
    models, training_receipt, contract = _load_frozen_ensemble(
        model_run, data_run, source_commit=training_source_commit,
        training_split_hash=training_split_hash,
    )
    os.environ["CAOS_DATA_ROOT"] = str(case_data_root)
    build_instance = importlib.import_module("pipeline.model.instances").build_instance

    rows: list[dict] = []
    for case_id in case_ids:
        case = registry.get_case(case_id)
        started = time.monotonic()
        memory = PeakRSS()
        inference_seconds = 0.0
        inference_started: float | None = None
        try:
            with memory:
                source_instance = build_instance(case)
                _validate_baseline_pairing(baseline[case_id], case, source_instance)
                adapted = adapt_product_case(source_instance)
                inference_started = time.monotonic()
                result = replay_frontier_ensemble(
                    adapted.instance, adapted.node_features, models, tonnage=adapted.tonnage,
                )
                inference_seconds = time.monotonic() - inference_started
                checked = validate_product_result(adapted, result.assignments, result.npv)
            complete = (len(result.assignments) == adapted.instance.values.size
                        and result.stopped == "horizon-complete")
            row = {
                "case_id": case_id,
                "source": "synthetic-twin" if case.deposit.synthetic else "licensed-minelib",
                "status": "complete" if complete else "partial",
                "failure_reason": None,
                "npv": checked.npv,
                "assignments": len(checked.assignments),
                "periods": product_period_aggregates(source_instance, adapted, checked.assignments),
                "tonnage_coverage": checked.tonnage_coverage,
                "positive_value_coverage": checked.positive_value_coverage,
                "stop_reason": result.stopped,
                "case_seconds": time.monotonic() - started, "inference_seconds": inference_seconds,
                "peak_memory_bytes": memory.peak_bytes,
                "source_contract": adapted.source_contract,
                "certified_bound": baseline[case_id]["certified_bound"],
                "certified_bound_method": baseline[case_id]["bound_method"],
                "certified_bound_gap_pct": (
                    100.0 * (baseline[case_id]["certified_bound"] - checked.npv)
                    / baseline[case_id]["certified_bound"]
                    if baseline[case_id]["certified_bound"] is not None
                    and baseline[case_id]["certified_bound"] > 0 else None
                ),
                "exact_expected_time_ordering": _expected_time_comparison(baseline[case_id], checked.npv),
                "published_reference": _published_reference(baseline[case_id]["published"], checked.npv),
            }
            # MineLib schedule vectors cannot be redistributed; retain them only for synthetic twins.
            if case.deposit.synthetic:
                vector = [-1] * adapted.instance.values.size
                for assignment in checked.assignments:
                    vector[assignment.block] = assignment.period
                row["period_of_block"] = vector
            row["paired_baseline_methods"] = [
                {
                    "method": method["method"], "rung": method["rung"],
                    "baseline_npv": float(method["npv"]),
                    "frontier_minus_baseline_npv": checked.npv - float(method["npv"]),
                    "frontier_to_baseline_npv_ratio": (
                        checked.npv / float(method["npv"]) if float(method["npv"]) != 0 else None
                    ),
                    "baseline_gap_pct": method.get("gapPct"),
                    "baseline_runtime_ms": method.get("runtimeMs"),
                }
                for method in baseline[case_id]["methods"]
            ]
            row["baseline_trace_sha256"] = baseline[case_id]["trace_sha256"]
            rows.append(row)
        except (TimeoutError, ValueError, RuntimeError, FloatingPointError, OSError) as exc:
            if inference_started is not None:
                inference_seconds = time.monotonic() - inference_started
            rows.append({
                "case_id": case_id,
                "source": "synthetic-twin" if case.deposit.synthetic else "licensed-minelib",
                "status": "unavailable" if isinstance(exc, TimeoutError) else "failed",
                "failure_reason": f"{type(exc).__name__}: {exc}",
                "case_seconds": time.monotonic() - started, "inference_seconds": inference_seconds,
                "peak_memory_bytes": memory.peak_bytes,
            })

    counts = {status: sum(row["status"] == status for row in rows)
              for status in ("complete", "partial", "failed", "unavailable")}
    payload = {
        "schema_version": "1.0.0", "method": "frontier-policy",
        "evaluation": "held-out-phaseflow-product-cases",
        "evaluated_at_utc": datetime.now(timezone.utc).isoformat(),
        "product_version": target_version, "source_commit": source_commit,
        "training_source_commit": training_source_commit,
        "engine_version": "oreblocks==0.6.6", "generator_version": GENERATOR_VERSION,
        "case_index_sha256": index_hash, "split_sha256": test_split_hash,
        "training_split_sha256": training_split_hash,
        "baseline": {
            "product_version": baseline_version, "engine_version": "oreblocks==0.6.6",
            "index_sha256": baseline_index_hash,
        },
        "training_data_sha256": contract["training_data_sha256"],
        "feature_contract_sha256": contract["feature_contract_sha256"],
        "training_receipt_sha256": hashlib.sha256(
            (data_run / "ensemble-receipt.json").read_bytes(),
        ).hexdigest(),
        "checkpoint_sha256": [row["checkpoint_sha256"] for row in training_receipt["members"]],
        "inference_cap_seconds_per_case": INFERENCE_CAP_SECONDS,
        "cases": rows, "summary": {**counts, "cases": len(rows)},
        "interpretation": "One frozen product-case evaluation; partial and failed schedules remain explicit.",
        "redistribution": "Per-block assignments are included only for synthetic twins; MineLib cases contain aggregates only.",
    }
    _atomic_json(output, payload)
    print(f"product-case evaluation written to {output}; cases={len(rows)}; counts={counts}")
    return 2 if len(rows) != 13 or counts["failed"] or counts["unavailable"] else 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--run-name", required=True)
    parser.add_argument("--model-root", required=True)
    parser.add_argument("--approved-model-root", required=True)
    parser.add_argument("--data-root", required=True)
    parser.add_argument("--approved-data-root", required=True)
    parser.add_argument("--case-data-root", required=True)
    parser.add_argument("--approved-case-data-root", required=True)
    parser.add_argument("--baseline-root", required=True)
    parser.add_argument("--approved-baseline-root", required=True)
    try:
        return evaluate(parser.parse_args())
    except (ValueError, OSError, subprocess.SubprocessError, KeyError, TypeError) as exc:
        print(f"frontier product-case evaluation: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
