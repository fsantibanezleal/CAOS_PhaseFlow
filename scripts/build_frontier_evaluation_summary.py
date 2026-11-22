#!/usr/bin/env python3
"""Create a redistribution-safe notebook dataset from frozen frontier evaluation receipts."""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path


def load(path: Path) -> tuple[dict, str]:
    raw = path.read_bytes()
    data = json.loads(raw)
    if not isinstance(data, dict) or not isinstance(data.get("cases"), list):
        raise ValueError(f"{path}: expected an evaluation receipt with case rows")
    return data, hashlib.sha256(raw).hexdigest()


def build(synthetic_path: Path, product_path: Path, output: Path) -> dict:
    synthetic, synthetic_hash = load(synthetic_path)
    product, product_hash = load(product_path)
    if len(synthetic["cases"]) != 500 or len(product["cases"]) != 13:
        raise ValueError("the notebook dataset requires the complete frozen 500/13 case evaluations")
    shared_identity = (
        "source_commit", "training_source_commit", "training_split_sha256", "split_sha256",
        "training_data_sha256", "training_receipt_sha256", "checkpoint_sha256",
        "feature_contract_sha256", "engine_version", "product_version", "generator_version",
    )
    mismatches = [key for key in shared_identity if synthetic.get(key) != product.get(key)]
    if mismatches:
        raise ValueError("synthetic and product evaluations disagree on shared identity: " + ", ".join(mismatches))

    synthetic_seeds = [row.get("seed") for row in synthetic["cases"]]
    synthetic_ids = [row.get("case_id") for row in synthetic["cases"]]
    if (len(set(synthetic_seeds)) != 500 or len(set(synthetic_ids)) != 500
            or any(row.get("feasible") is not True for row in synthetic["cases"])):
        raise ValueError("synthetic rows must retain 500 unique, independently feasible cases")
    for row in synthetic["cases"]:
        expected = row.get("normalized_npv", float("nan")) - row.get("classical_normalized_npv", float("nan"))
        observed = row.get("frontier_minus_classical_normalized_npv")
        if not isinstance(expected, (int, float)) or not isinstance(observed, (int, float)) or abs(expected - observed) > 1e-12:
            raise ValueError(f"{row.get('case_id')}: paired difference does not reconcile to the paired objectives")
    product_ids = [row.get("case_id") for row in product["cases"]]
    if len(set(product_ids)) != 13 or any(not case_id for case_id in product_ids):
        raise ValueError("product rows must contain thirteen unique declared case IDs")

    synthetic_rows = []
    for row in synthetic["cases"]:
        synthetic_rows.append({
            key: row[key] for key in (
                "case_id", "seed", "family", "size", "status", "feasible", "assignments",
                "normalized_npv", "classical_normalized_npv", "frontier_minus_classical_normalized_npv",
                "positive_value_coverage", "tonnage_coverage",
            )
        })
    product_rows = []
    for row in product["cases"]:
        product_rows.append({
            "case_id": row["case_id"], "source": row["source"], "status": row["status"],
            "failure_reason": row.get("failure_reason"), "assignments": row.get("assignments"),
            "npv": row.get("npv"), "certified_bound": row.get("certified_bound"),
            "certified_bound_gap_pct": row.get("certified_bound_gap_pct"),
            "positive_value_coverage": row.get("positive_value_coverage"),
            "tonnage_coverage": row.get("tonnage_coverage"),
            "inference_seconds": row.get("inference_seconds"),
            "paired_baseline_methods": [
                {
                    key: method.get(key) for key in (
                        "method", "baseline_npv", "frontier_minus_baseline_npv",
                        "frontier_to_baseline_npv_ratio", "baseline_runtime_ms",
                    )
                }
                for method in row.get("paired_baseline_methods", [])
            ],
        })

    result = {
        "schema_version": "1.0.0",
        "dataset": "phaseflow-frontier-evaluation-notebook",
        "training_source_commit": synthetic["training_source_commit"],
        "evaluation_source_commit": synthetic["source_commit"],
        "training_split_sha256": synthetic["training_split_sha256"],
        "synthetic_test_split_sha256": synthetic["split_sha256"],
        "case_index_sha256": product["case_index_sha256"],
        "baseline": product["baseline"],
        "training_receipt_sha256": synthetic["training_receipt_sha256"],
        "checkpoint_sha256": synthetic["checkpoint_sha256"],
        "feature_contract_sha256": synthetic["feature_contract_sha256"],
        "source_receipts": {
            "synthetic_test_sha256": synthetic_hash,
            "product_case_sha256": product_hash,
        },
        "synthetic_summary": synthetic["summary"],
        "product_summary": product["summary"],
        "synthetic_cases": synthetic_rows,
        "product_cases": product_rows,
        "redistribution": (
            "Aggregate experiment rows only; no block features, precedence graphs, assignments, or MineLib schedule vectors."
        ),
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(result, ensure_ascii=False, sort_keys=True, indent=2) + "\n", encoding="utf-8")
    return {"synthetic_cases": len(synthetic_rows), "product_cases": len(product_rows),
            "output_sha256": hashlib.sha256(output.read_bytes()).hexdigest()}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--synthetic", type=Path, required=True)
    parser.add_argument("--product", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    print(json.dumps(build(args.synthetic, args.product, args.output), sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
