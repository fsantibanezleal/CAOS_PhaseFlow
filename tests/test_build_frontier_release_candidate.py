from __future__ import annotations

import json
import hashlib
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
PRODUCT_VERSION = (ROOT / "VERSION").read_text(encoding="utf-8").strip()
BASELINE_VERSION = json.loads((ROOT / "data/derived/manifests/index.json").read_text(encoding="utf-8"))["engine_version"]
sys.path.insert(0, str(ROOT / "scripts"))

from build_frontier_release_candidate import build_candidate  # noqa: E402
from frontier_release_contract import validate_v2_split_hashes  # noqa: E402


def _evaluation(case_ids: list[str]) -> dict:
    return {
        "product_version": PRODUCT_VERSION, "engine_version": "oreblocks==0.6.6",
        "source_commit": "a" * 40, "training_source_commit": "b" * 40,
        "feature_contract_sha256": "c" * 64, "case_index_sha256": "d" * 64,
        "split_sha256": "e" * 64, "training_split_sha256": "9" * 64,
        "training_receipt_sha256": "f" * 64,
        "checkpoint_sha256": ["1" * 64, "2" * 64, "3" * 64, "4" * 64, "5" * 64],
        "baseline": {"product_version": BASELINE_VERSION, "engine_version": "oreblocks==0.6.6", "index_sha256": ""},
        "summary": {"cases": 13, "complete": 13, "partial": 0, "failed": 0, "unavailable": 0},
        "cases": [
            {
                "case_id": case_id, "status": "complete", "failure_reason": None,
                "npv": 9.5, "assignments": 2, "inference_seconds": 0.01,
                "certified_bound": 20.0, "certified_bound_method": "algorithm4",
                "tonnage_coverage": 0.5, "positive_value_coverage": 0.5,
                "stop_reason": "horizon-complete", "peak_memory_bytes": 1024,
                "periods": [
                    {"t": 1, "minedTonnes": 1.0, "oreTonnes": 1.0, "wasteTonnes": 0.0,
                     "headGrade": 0.1, "metal": 0.1, "value": 5.0, "discCashFlow": 5.0,
                     "cumNpv": 5.0, "stripRatio": 0.0, "resourceUse": [1.0, 1.0],
                     "resourceLimit": [10.0, 10.0], "components": 1,
                     "largestComponentShare": 1.0, "minWidthBlocks": 1, "blocks": 1},
                    {"t": 2, "minedTonnes": 1.0, "oreTonnes": 1.0, "wasteTonnes": 0.0,
                     "headGrade": 0.1, "metal": 0.1, "value": 4.5, "discCashFlow": 4.5,
                     "cumNpv": 9.5, "stripRatio": 0.0, "resourceUse": [1.0, 1.0],
                     "resourceLimit": [10.0, 10.0], "components": 1,
                     "largestComponentShare": 1.0, "minWidthBlocks": 1, "blocks": 1},
                ],
                "period_of_block": [0, 1, -1] if case_id != "licensed" else None,
            }
            for case_id in case_ids
        ],
    }


def _bind_baseline(evaluation: dict, baseline: Path) -> None:
    index_path = baseline / "manifests" / "index.json"
    evaluation["baseline"]["index_sha256"] = hashlib.sha256(index_path.read_bytes()).hexdigest()
    for result in evaluation["cases"]:
        trace_path = baseline / result["case_id"] / "trace.json"
        result["baseline_trace_sha256"] = hashlib.sha256(trace_path.read_bytes()).hexdigest()


def test_release_receipt_requires_both_test_and_training_split_digests():
    receipt = {
        "schema": "phaseflow.frontier-release/v3", "product_version": PRODUCT_VERSION,
        "engine_version": "oreblocks==0.6.6", "source_commit": "a" * 40,
        "checkpoint_sha256": "b" * 64, "feature_contract_sha256": "c" * 64,
        "split_sha256": "d" * 64,
    }
    with pytest.raises(ValueError, match="training split sha256"):
        validate_v2_split_hashes(receipt)


def test_release_receipt_rejects_same_training_and_test_split():
    receipt = {
        "schema": "phaseflow.frontier-release/v3",
        "split_sha256": "d" * 64,
        "training_split_sha256": "d" * 64,
    }
    with pytest.raises(ValueError, match="distinct evaluation and training splits"):
        validate_v2_split_hashes(receipt)


def test_candidate_assembles_receipts_and_keeps_licensed_schedules_aggregate_only(tmp_path):
    baseline = tmp_path / "baseline"
    manifests = baseline / "manifests"
    manifests.mkdir(parents=True)
    ids = [f"case-{index:02d}" for index in range(12)] + ["licensed"]
    entries = []
    for case_id in ids:
        case_dir = baseline / case_id
        case_dir.mkdir()
        trace_path = case_dir / "trace.json"
        trace = {
            "schema": "phaseflow.schedule-trace/v1", "caseId": case_id,
            "scenario": {"periods": 2, "resources": [
                {"limitPerPeriod": [10.0, 10.0]}, {"limitPerPeriod": [10.0, 10.0]},
            ]},
            "instance": {"nBlocks": 3, "synthetic": case_id != "licensed"},
            "bound": {"used": "algorithm4", "algorithm4": 20.0},
            "methods": [], "learned": {},
        }
        trace_path.write_text(json.dumps(trace), encoding="utf-8")
        manifest_path = manifests / f"{case_id}.json"
        manifest = {
            "case_id": case_id,
            "engine": {"version": BASELINE_VERSION, "oreblocks": "0.6.6"},
            "artifact": {"path": f"{case_id}/trace.json", "bytes": trace_path.stat().st_size},
            "scoreboard": [],
        }
        manifest_path.write_text(json.dumps(manifest), encoding="utf-8")
        entries.append({"case_id": case_id, "manifest_path": f"manifests/{case_id}.json"})
    legacy_bound_trace = baseline / "case-00" / "trace.json"
    legacy_bound = json.loads(legacy_bound_trace.read_text(encoding="utf-8"))
    legacy_bound["bound"]["used"] = "bienstock-zuckerberg"
    legacy_bound["bound"]["joint"] = 19.0
    legacy_bound_trace.write_text(json.dumps(legacy_bound), encoding="utf-8")
    (manifests / "index.json").write_text(json.dumps({
        "schema": "phaseflow.index/v1", "engine_version": BASELINE_VERSION, "n_cases": 13, "cases": entries,
    }), encoding="utf-8")
    evaluation = _evaluation(ids)
    evaluation["cases"][0]["certified_bound"] = 19.0
    evaluation["cases"][0]["certified_bound_method"] = "bienstock-zuckerberg"
    _bind_baseline(evaluation, baseline)
    evaluation_path = tmp_path / "evaluation.json"
    evaluation_path.write_text(json.dumps(evaluation), encoding="utf-8")

    candidate = tmp_path / "candidate"
    receipt = build_candidate(baseline, candidate, evaluation_path)

    assert receipt["summary"] == {"cases": 13, "complete": 13, "partial": 0, "failed": 0, "unavailable": 0}
    assert receipt["split_sha256"] == "e" * 64
    assert receipt["training_split_sha256"] == "9" * 64
    synthetic_trace = json.loads((candidate / "case-00/trace.json").read_text(encoding="utf-8"))
    assert synthetic_trace["methods"][-1]["method"] == "frontier-policy"
    assert synthetic_trace["methods"][-1]["periodOfBlock"] == [0, 1, -1]
    licensed_trace = json.loads((candidate / "licensed/trace.json").read_text(encoding="utf-8"))
    assert "periodOfBlock" not in licensed_trace["methods"][-1]
    assert json.loads((candidate / "manifests/index.json").read_text(encoding="utf-8"))["engine_version"] == PRODUCT_VERSION
    assert (candidate / "readiness.json").is_file()
    assert (candidate / "frontier-release-receipt.json").is_file()
    from jsonschema import Draft202012Validator

    schema = json.loads((ROOT / "docs/contracts/schemas/frontier-release.schema.json").read_text(encoding="utf-8"))
    assert not list(Draft202012Validator(schema).iter_errors(receipt))

    # A fail-closed unsupported case has no paired result row, but its failure
    # must remain in the release receipt rather than blocking the other cases.
    failed_evaluation = json.loads(json.dumps(evaluation))
    failed_row = failed_evaluation["cases"][0]
    failed_row["status"] = "failed"
    failed_row["failure_reason"] = "ValueError: unsupported declared one-resource CPIT contract"
    failed_row.pop("baseline_trace_sha256")
    failed_evaluation["summary"].update({"complete": 12, "failed": 1})
    failed_path = tmp_path / "evaluation-with-failure.json"
    failed_path.write_text(json.dumps(failed_evaluation), encoding="utf-8")

    failed_candidate = tmp_path / "candidate-with-failure"
    failed_receipt = build_candidate(baseline, failed_candidate, failed_path)
    assert failed_receipt["summary"]["failed"] == 1
    assert failed_receipt["cases"][0]["failure_reason"] == failed_row["failure_reason"]
    failed_trace = json.loads((failed_candidate / "case-00/trace.json").read_text(encoding="utf-8"))
    assert failed_trace["frontierPolicy"]["status"] == "failed"


def test_candidate_rejects_unreconciled_period_cashflow(tmp_path):
    baseline = tmp_path / "baseline"
    manifests = baseline / "manifests"
    manifests.mkdir(parents=True)
    ids = [f"case-{index:02d}" for index in range(12)] + ["licensed"]
    entries = []
    for case_id in ids:
        (baseline / case_id).mkdir()
        (baseline / case_id / "trace.json").write_text(json.dumps({
            "caseId": case_id, "scenario": {"periods": 2, "resources": [
                {"limitPerPeriod": [10.0, 10.0]}, {"limitPerPeriod": [10.0, 10.0]},
            ]},
            "instance": {"nBlocks": 3, "synthetic": case_id != "licensed"},
            "bound": {"used": "algorithm4", "algorithm4": 20.0}, "methods": [],
        }), encoding="utf-8")
        (manifests / f"{case_id}.json").write_text(json.dumps({
            "case_id": case_id, "engine": {"version": BASELINE_VERSION},
            "artifact": {"path": f"{case_id}/trace.json", "bytes": 1}, "scoreboard": [],
        }), encoding="utf-8")
        entries.append({"case_id": case_id, "manifest_path": f"manifests/{case_id}.json"})
    (manifests / "index.json").write_text(json.dumps({
        "schema": "phaseflow.index/v1", "engine_version": BASELINE_VERSION, "n_cases": 13, "cases": entries,
    }), encoding="utf-8")
    evaluation = _evaluation(ids)
    _bind_baseline(evaluation, baseline)
    evaluation["cases"][0]["periods"][0]["discCashFlow"] = 3.0
    evaluation_path = tmp_path / "evaluation.json"
    evaluation_path.write_text(json.dumps(evaluation), encoding="utf-8")

    with pytest.raises(ValueError, match="cumulative NPV"):
        build_candidate(baseline, tmp_path / "candidate", evaluation_path)
