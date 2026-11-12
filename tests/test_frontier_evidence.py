from __future__ import annotations

import copy
import json
from pathlib import Path

import pytest

from pipeline.model.frontier_evidence import (
    summarize_case_rows,
    validate_frontier_diagnostic,
    validate_frontier_evaluation_summary,
)
from pipeline.model.frontier_splits import manifest_sha256


def _evaluation_summary() -> dict:
    digest = "a" * 64
    synthetic = [
        {
            "case_id": f"test-{seed}", "seed": seed, "family": "funnel", "size": 32 + seed,
            "status": "partial", "feasible": True, "assignments": 0 if seed < 277 else 2,
            "normalized_npv": 0.1, "classical_normalized_npv": -0.1,
            "frontier_minus_classical_normalized_npv": 0.2,
            "positive_value_coverage": 0.0 if seed < 277 else 0.2, "tonnage_coverage": 0.0,
        }
        for seed in range(500)
    ]
    product = [
        {
            "case_id": f"case-{index}",
            "status": "partial" if index < 11 else "failed",
            "npv": 1.0 if index < 11 else None,
            "certified_bound": 2.0 if index < 11 else None,
            "tonnage_coverage": 0.5 if index < 11 else None,
            "positive_value_coverage": 0.5 if index < 11 else None,
            "failure_reason": None if index < 11 else "unsupported fixture input",
        }
        for index in range(13)
    ]
    return {
        "schema_version": "1.0.0", "dataset": "phaseflow-frontier-evaluation-notebook",
        "case_index_sha256": digest, "feature_contract_sha256": digest,
        "synthetic_test_split_sha256": digest, "training_receipt_sha256": digest,
        "training_split_sha256": digest, "training_source_commit": digest,
        "evaluation_source_commit": digest, "checkpoint_sha256": [digest] * 5,
        "source_receipts": {"synthetic_test_sha256": digest, "product_case_sha256": digest},
        "synthetic_cases": synthetic,
        "synthetic_summary": {
            "cases": 500, "complete": 0, "partial": 500, "failed": 0, "unavailable": 0,
            "mean_normalized_npv_feasible": 0.1, "median_normalized_npv_feasible": 0.1,
        },
        "product_cases": product,
        "product_summary": {"cases": 13, "complete": 0, "partial": 11, "failed": 2, "unavailable": 0},
    }


def test_sanitized_heldout_summary_validates_rows_and_empty_schedule_count() -> None:
    result = validate_frontier_evaluation_summary(_evaluation_summary())
    assert result["synthetic_cases"] == 500
    assert result["product_cases"] == 13
    assert result["family"] == ["funnel"]
    assert result["empty_synthetic_schedules"] == 277


@pytest.mark.parametrize("mutation, message", [
    (lambda data: data["synthetic_cases"][0].update(feasible=False), "not a feasible"),
    (lambda data: data["synthetic_cases"][0].update(frontier_minus_classical_normalized_npv=9.0), "does not reconcile"),
    (lambda data: data["product_summary"].update(partial=10), "differs from its retained rows"),
])
def test_sanitized_heldout_summary_fails_closed(mutation, message: str) -> None:
    summary = _evaluation_summary()
    mutation(summary)
    with pytest.raises(ValueError, match=message):
        validate_frontier_evaluation_summary(summary)


def test_summary_keeps_empty_schedules_and_reproduces_descriptive_statistics() -> None:
    rows = [
        {"seed": 10, "normalized_npv": 0.0, "positive_value_coverage": 0.0, "assigned_blocks": 0},
        {"seed": 11, "normalized_npv": 0.2, "positive_value_coverage": 0.5, "assigned_blocks": 2},
        {"seed": 12, "normalized_npv": -0.1, "positive_value_coverage": 0.25, "assigned_blocks": 1},
    ]

    result = summarize_case_rows(rows)

    assert result == {
        "cases": 3,
        "nonempty_fraction": pytest.approx(2 / 3),
        "mean_assigned_blocks": 1.0,
        "mean_npv": pytest.approx(1 / 30),
        "median_npv": 0.0,
        "median_value_coverage": 0.25,
        "minimum_npv": -0.1,
        "maximum_npv": 0.2,
    }


@pytest.mark.parametrize(
    "rows",
    [
        [],
        [{"seed": 1, "normalized_npv": 0.0, "positive_value_coverage": 0.0}],
        [
            {"seed": 1, "normalized_npv": 0.0, "positive_value_coverage": 0.0, "assigned_blocks": 0},
            {"seed": 1, "normalized_npv": 0.1, "positive_value_coverage": 0.1, "assigned_blocks": 1},
        ],
        [{"seed": 1, "normalized_npv": float("nan"), "positive_value_coverage": 0.0, "assigned_blocks": 0}],
        [{"seed": 1, "normalized_npv": 0.0, "positive_value_coverage": 1.1, "assigned_blocks": 0}],
        [{"seed": 1, "normalized_npv": 0.0, "positive_value_coverage": 0.0, "assigned_blocks": -1}],
    ],
)
def test_summary_rejects_invalid_or_incomplete_rows(rows: list[dict[str, object]]) -> None:
    with pytest.raises(ValueError):
        summarize_case_rows(rows)


def test_committed_frontier_records_have_exact_provenance_and_membership() -> None:
    root = Path(__file__).resolve().parents[1]
    records = root / "docs/design/features/learned-frontier"
    manifest = json.loads((records / "split-manifest.json").read_text(encoding="utf-8"))["manifest"]
    summary = json.loads((records / "records/training-summary.json").read_text(encoding="utf-8"))
    diagnostic = json.loads((records / "records/validation-diagnostic.json").read_text(encoding="utf-8"))

    audited = validate_frontier_diagnostic(manifest, summary, diagnostic)

    assert audited["validation_cases"] == 200
    assert len(audited["members"]) == 5
    assert audited["summary"]["cases"] == 200


def test_frontier_diagnostic_rejects_missing_validation_seed() -> None:
    root = Path(__file__).resolve().parents[1]
    records = root / "docs/design/features/learned-frontier"
    manifest = json.loads((records / "split-manifest.json").read_text(encoding="utf-8"))["manifest"]
    summary = json.loads((records / "records/training-summary.json").read_text(encoding="utf-8"))
    diagnostic = json.loads((records / "records/validation-diagnostic.json").read_text(encoding="utf-8"))
    diagnostic = copy.deepcopy(diagnostic)
    diagnostic["case_results"].pop()

    with pytest.raises(ValueError, match="exact validation seed membership"):
        validate_frontier_diagnostic(manifest, summary, diagnostic)


def test_frontier_diagnostic_rejects_consistently_rehashed_overlapping_splits() -> None:
    root = Path(__file__).resolve().parents[1]
    records = root / "docs/design/features/learned-frontier"
    manifest = json.loads((records / "split-manifest.json").read_text(encoding="utf-8"))["manifest"]
    summary = json.loads((records / "records/training-summary.json").read_text(encoding="utf-8"))
    diagnostic = json.loads((records / "records/validation-diagnostic.json").read_text(encoding="utf-8"))
    manifest = copy.deepcopy(manifest)
    summary = copy.deepcopy(summary)
    diagnostic = copy.deepcopy(diagnostic)
    manifest["train"].append(copy.deepcopy(manifest["validation"][0]))
    digest = manifest_sha256(manifest)
    summary["split_sha256"] = digest
    diagnostic["split_sha256"] = digest

    with pytest.raises(ValueError, match="generator seeds overlap"):
        validate_frontier_diagnostic(manifest, summary, diagnostic)


def test_frontier_diagnostic_rejects_rehashed_noncanonical_split() -> None:
    root = Path(__file__).resolve().parents[1]
    records = root / "docs/design/features/learned-frontier"
    manifest = json.loads((records / "split-manifest.json").read_text(encoding="utf-8"))["manifest"]
    summary = json.loads((records / "records/training-summary.json").read_text(encoding="utf-8"))
    diagnostic = json.loads((records / "records/validation-diagnostic.json").read_text(encoding="utf-8"))
    manifest = copy.deepcopy(manifest)
    summary = copy.deepcopy(summary)
    diagnostic = copy.deepcopy(diagnostic)
    manifest["validation"][0]["size"] += 1
    digest = manifest_sha256(manifest)
    summary["split_sha256"] = digest
    diagnostic["split_sha256"] = digest

    with pytest.raises(ValueError, match="deterministic product split"):
        validate_frontier_diagnostic(manifest, summary, diagnostic)


def test_sanitized_frontier_evaluation_summary_reconciles_committed_rows() -> None:
    root = Path(__file__).resolve().parents[1]
    summary = json.loads((root / "notebooks/data/frontier-evaluation-summary.json").read_text(encoding="utf-8"))

    audited = validate_frontier_evaluation_summary(summary)

    assert audited["synthetic_cases"] == 500
    assert audited["product_cases"] == 13
    assert audited["empty_synthetic_schedules"] == 277
    assert audited["family"] == ["funnel"]


@pytest.mark.parametrize(
    ("mutate", "message"),
    [
        (lambda data: data["synthetic_cases"][1].update(seed=data["synthetic_cases"][0]["seed"]), "duplicate seeds"),
        (lambda data: data["synthetic_cases"][0].update(feasible=False), "not a feasible"),
        (lambda data: data["synthetic_cases"][0].update(frontier_minus_classical_normalized_npv=0.0), "does not reconcile"),
        (lambda data: data["product_cases"][0].update(status="unknown"), "invalid product outcome"),
        (lambda data: data["product_cases"][0].update(case_id=data["product_cases"][1]["case_id"]), "duplicate case IDs"),
    ],
)
def test_sanitized_frontier_evaluation_summary_rejects_inconsistent_rows(mutate, message: str) -> None:
    root = Path(__file__).resolve().parents[1]
    summary = json.loads((root / "notebooks/data/frontier-evaluation-summary.json").read_text(encoding="utf-8"))
    mutate(summary)

    with pytest.raises(ValueError, match=message):
        validate_frontier_evaluation_summary(summary)
