#!/usr/bin/env python3
"""Evaluate one frozen frontier ensemble once on all 13 held-out PhaseFlow cases."""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import hashlib
import importlib
import json
import os
from pathlib import Path
import subprocess
import sys
import time

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "data-pipeline"))

from pipeline import registry  # noqa: E402
from pipeline.model.frontier_cases import adapt_product_case, validate_product_result  # noqa: E402
from pipeline.model.frontier_data import GENERATOR_VERSION  # noqa: E402
from pipeline.model.frontier_ppo import (  # noqa: E402
    INFERENCE_CAP_SECONDS,
    replay_frontier_ensemble,
)
from evaluate_frontier_policy import _frozen_manifest, _load_frozen_ensemble  # noqa: E402
from train_frontier_policy import RUN_NAME, _check_environment, _target_version  # noqa: E402

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


def evaluate(args: argparse.Namespace) -> int:
    _check_environment()
    target_version = _target_version()
    if (ROOT / "VERSION").read_text(encoding="utf-8").strip() != target_version:
        raise ValueError(f"product-case evaluation opens only from the approved {target_version} source")
    dirty = subprocess.run(["git", "status", "--porcelain"], cwd=ROOT, capture_output=True, text=True, check=True)
    if dirty.stdout.strip():
        raise ValueError("product-case evaluation requires the clean frozen product source")
    source_commit = subprocess.run(
        ["git", "rev-parse", "HEAD"], cwd=ROOT, capture_output=True, text=True, check=True,
    ).stdout.strip()
    case_ids, index_hash = _case_index()
    manifest, split_hash = _frozen_manifest()
    del manifest

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
    synthetic_receipt = json.loads(synthetic_receipt_path.read_text(encoding="utf-8"))
    if (synthetic_receipt.get("source_commit") != source_commit
            or synthetic_receipt.get("split_sha256") != split_hash
            or synthetic_receipt.get("summary", {}).get("cases") != 500
            or synthetic_receipt.get("summary", {}).get("failed") != 0
            or synthetic_receipt.get("summary", {}).get("unavailable") != 0):
        raise ValueError("synthetic test receipt is incomplete, failed or belongs to another frozen source")
    models, training_receipt, contract = _load_frozen_ensemble(
        model_run, data_run, source_commit=source_commit, split_hash=split_hash,
    )
    os.environ["CAOS_DATA_ROOT"] = str(case_data_root)
    build_instance = importlib.import_module("pipeline.model.instances").build_instance

    rows: list[dict] = []
    for case_id in case_ids:
        case = registry.get_case(case_id)
        started = time.monotonic()
        try:
            adapted = adapt_product_case(build_instance(case))
            result = replay_frontier_ensemble(
                adapted.instance, adapted.node_features, models, tonnage=adapted.tonnage,
            )
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
                "tonnage_coverage": checked.tonnage_coverage,
                "positive_value_coverage": checked.positive_value_coverage,
                "stop_reason": result.stopped,
                "inference_seconds": time.monotonic() - started,
                "source_contract": adapted.source_contract,
            }
            # MineLib schedule vectors cannot be redistributed; retain them only for synthetic twins.
            if case.deposit.synthetic:
                vector = [-1] * adapted.instance.values.size
                for assignment in checked.assignments:
                    vector[assignment.block] = assignment.period
                row["period_of_block"] = vector
            rows.append(row)
        except (TimeoutError, ValueError, RuntimeError, FloatingPointError, OSError) as exc:
            rows.append({
                "case_id": case_id,
                "source": "synthetic-twin" if case.deposit.synthetic else "licensed-minelib",
                "status": "unavailable" if isinstance(exc, TimeoutError) else "failed",
                "failure_reason": f"{type(exc).__name__}: {exc}",
                "inference_seconds": time.monotonic() - started,
            })

    counts = {status: sum(row["status"] == status for row in rows)
              for status in ("complete", "partial", "failed", "unavailable")}
    payload = {
        "schema_version": "1.0.0", "method": "frontier-policy",
        "evaluation": "held-out-phaseflow-product-cases",
        "evaluated_at_utc": datetime.now(timezone.utc).isoformat(),
        "product_version": target_version, "source_commit": source_commit,
        "engine_version": "oreblocks==0.6.6", "generator_version": GENERATOR_VERSION,
        "case_index_sha256": index_hash, "split_sha256": split_hash,
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
    try:
        return evaluate(parser.parse_args())
    except (ValueError, OSError, subprocess.SubprocessError, KeyError, TypeError) as exc:
        print(f"frontier product-case evaluation: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
