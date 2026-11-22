#!/usr/bin/env python3
"""Correct only the certified-bound metadata in a completed product evaluation receipt."""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import hashlib
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def amend(source: Path, baseline_root: Path, destination: Path, approved_temp_root: Path) -> dict:
    original = source.read_bytes()
    payload = json.loads(original)
    baseline_root = baseline_root.resolve()
    index_path = baseline_root / "manifests" / "index.json"
    index_bytes = index_path.read_bytes()
    if hashlib.sha256(index_bytes).hexdigest() != payload["baseline"]["index_sha256"]:
        raise ValueError("baseline index does not match the completed evaluation receipt")
    index = json.loads(index_bytes)
    by_id = {row["case_id"]: row for row in index["cases"]}
    result_ids = [row["case_id"] for row in payload["cases"]]
    if result_ids != [row["case_id"] for row in index["cases"]]:
        raise ValueError("case identities or ordering differ from the frozen baseline")

    corrections = 0
    for row in payload["cases"]:
        if row["status"] not in {"complete", "partial"}:
            continue
        manifest = json.loads((baseline_root / by_id[row["case_id"]]["manifest_path"]).read_text(encoding="utf-8"))
        trace_path = baseline_root / manifest["artifact"]["path"]
        trace_bytes = trace_path.read_bytes()
        if hashlib.sha256(trace_bytes).hexdigest() != row["baseline_trace_sha256"]:
            raise ValueError(f"{row['case_id']}: baseline trace differs from the paired evaluation")
        bound = json.loads(trace_bytes).get("bound", {})
        used = bound.get("used")
        key = "joint" if used == "bienstock-zuckerberg" else "algorithm4"
        value = bound.get(key)
        method = used if key == "joint" and value is not None else "algorithm4"
        if value is None:
            value = bound.get("algorithm4")
            method = "algorithm4"
        if (isinstance(value, bool) or not isinstance(value, (int, float))
                or not math.isfinite(value) or value <= 0):
            raise ValueError(f"{row['case_id']}: no positive certified CPIT bound is available")
        row["certified_bound"] = float(value)
        row["certified_bound_method"] = method
        row["certified_bound_gap_pct"] = 100.0 * (float(value) - float(row["npv"])) / float(value)
        corrections += 1

    payload["amendment"] = {
        "kind": "certified-bound-metadata-only",
        "created_at_utc": datetime.now(timezone.utc).isoformat(),
        "original_receipt_sha256": hashlib.sha256(original).hexdigest(),
        "baseline_index_sha256": hashlib.sha256(index_bytes).hexdigest(),
        "corrected_cases": corrections,
        "reason": "The evaluator read algorithm4 values while retaining the trace's joint-bound label. "
                  "This amendment selects the finite certified value named by the baseline trace; policy "
                  "assignments, objectives, coverage, comparisons, statuses and timings are unchanged.",
    }
    destination = destination.resolve()
    approved_temp_root = approved_temp_root.resolve()
    if (not destination.is_relative_to(approved_temp_root) or destination == ROOT
            or destination.is_relative_to(ROOT) or destination == source.resolve() or destination.exists()):
        raise ValueError("amended receipt must be written to a new external path")
    destination.write_text(json.dumps(payload, ensure_ascii=False, sort_keys=True, indent=2) + "\n", encoding="utf-8")
    return {"cases_corrected": corrections, "output": str(destination), "sha256": hashlib.sha256(destination.read_bytes()).hexdigest()}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--baseline-root", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--approved-temp-root", type=Path, required=True)
    args = parser.parse_args()
    print(json.dumps(amend(args.source, args.baseline_root, args.output, args.approved_temp_root), sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
