"""Adversarial tests for complete, single-snapshot policy bake receipts."""
from __future__ import annotations

import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "data-pipeline"))

from pipeline.model.frontier_release import RECEIPT_SCHEMA, validate_release_receipt, validate_training_members  # noqa: E402

PRODUCT_VERSION = (ROOT / "VERSION").read_text(encoding="utf-8").strip()


def _receipt() -> dict:
    common = {
        "product_version": PRODUCT_VERSION, "engine_version": "oreblocks==0.6.6",
        "source_commit": "a" * 40, "checkpoint_sha256": "b" * 64,
        "feature_contract_sha256": "c" * 64,
    }
    return {
        "schema": RECEIPT_SCHEMA, **common,
        "cases": [
            {"case_id": "case-a", **common, "status": "complete", "trace_sha256": "d" * 64},
            {"case_id": "case-b", **common, "status": "failed", "failure_reason": "Frozen checkpoint failed independent validation."},
        ],
    }


def test_adversarial_release_receipt_rejects_mixed_versions_and_missing_cases():
    receipt = _receipt()
    receipt["cases"][0]["product_version"] = "stale-product-snapshot"
    with pytest.raises(ValueError, match="mixed product"):
        validate_release_receipt(receipt, ["case-a", "case-b"])

    receipt = _receipt()
    receipt["cases"].pop()
    with pytest.raises(ValueError, match="all-case ledger mismatch"):
        validate_release_receipt(receipt, ["case-a", "case-b"])


def test_adversarial_release_receipt_keeps_failed_cases_and_checks_partial_coverage():
    receipt = _receipt()
    report = validate_release_receipt(receipt, ["case-a", "case-b"])
    assert report == {"cases": 2, "complete": 1, "partial": 0, "failed": 1, "unavailable": 0}

    partial = _receipt()
    partial["cases"][1].update({
        "status": "partial", "trace_sha256": "e" * 64,
        "tonnage_coverage": 0.4, "positive_value_coverage": 0.7,
    })
    partial["cases"][1].pop("failure_reason")
    assert validate_release_receipt(partial, ["case-a", "case-b"])["partial"] == 1
    partial["cases"][1]["tonnage_coverage"] = 1.1
    with pytest.raises(ValueError, match="tonnage_coverage"):
        validate_release_receipt(partial, ["case-a", "case-b"])


def test_training_ensemble_requires_validation_selected_checkpoint_for_every_seed():
    valid_hash = "b" * 64
    members = [
        {
            "seed": seed, "status": "trained-to-stop-rule", "checkpoint_sha256": valid_hash,
            "validation_history": [{
                "transitions": 50_000, "mean_normalized_npv": 0.4, "all_feasible": True,
                "selected_checkpoint_sha256": valid_hash,
            }],
        }
        for seed in (1103, 2207, 3301, 4409, 5519)
    ]
    validate_training_members(members, [1103, 2207, 3301, 4409, 5519])

    members[0]["validation_history"] = []
    with pytest.raises(ValueError, match="no validation event"):
        validate_training_members(members, [1103, 2207, 3301, 4409, 5519])

    members[0]["validation_history"] = [{
        "transitions": 50_000, "mean_normalized_npv": 0.4, "all_feasible": True,
        "selected_checkpoint_sha256": "c" * 64,
    }]
    with pytest.raises(ValueError, match="not selected"):
        validate_training_members(members, [1103, 2207, 3301, 4409, 5519])
