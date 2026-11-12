from __future__ import annotations

import copy
import json
from pathlib import Path

import pytest

from pipeline.model.frontier_evidence import summarize_case_rows, validate_frontier_diagnostic
from pipeline.model.frontier_splits import manifest_sha256


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
