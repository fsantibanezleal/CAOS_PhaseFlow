from __future__ import annotations

import json
import sys
from pathlib import Path
import time
from types import SimpleNamespace

import numpy as np
import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from evaluate_frontier_product_cases import (  # noqa: E402
    _baseline_cases,
    _baseline_version,
    _expected_time_comparison,
    _published_reference,
    _validate_baseline_pairing,
)
import evaluate_frontier_policy as frontier_evaluator  # noqa: E402
from pipeline.model.frontier_evaluation import seed_clustered_interval  # noqa: E402
from pipeline.model.frontier_data import generate_graph  # noqa: E402
from pipeline.model.frontier_runtime import PeakRSS  # noqa: E402


def _baseline(tmp_path: Path) -> tuple[Path, list[str]]:
    root = tmp_path / "baseline"
    version = _baseline_version()
    ids = [f"case-{index:02d}" for index in range(13)]
    rows = []
    for case_id in ids:
        trace_path = root / case_id / "trace.json"
        trace_path.parent.mkdir(parents=True)
        trace = {
            "schema": "phaseflow.schedule-trace/v1", "caseId": case_id,
            "bound": {"algorithm4": 20.0, "used": "algorithm4"},
            "methods": [
                {"method": "toposort", "rung": "classical", "npv": 12.5, "gapPct": 1.0, "runtimeMs": 2.0},
                {"method": "toposort-expected", "rung": "sota", "npv": 14.0, "gapPct": 0.5, "runtimeMs": 3.0},
                {"method": "different-objective", "rung": "beyond", "npv": 900.0},
            ],
            "published": {"problem": "PCPSP", "best_known": 99.0, "source": "literature-fixture"},
        }
        encoded = json.dumps(trace).encode()
        trace_path.write_bytes(encoded)
        manifest_path = root / "manifests" / f"{case_id}.json"
        manifest_path.parent.mkdir(parents=True, exist_ok=True)
        manifest_path.write_text(json.dumps({
            "case_id": case_id,
            "engine": {"version": version, "oreblocks": "0.6.6"},
            "artifact": {
                "path": f"{case_id}/trace.json", "bytes": len(encoded),
            },
        }), encoding="utf-8")
        rows.append({"case_id": case_id, "manifest_path": f"manifests/{case_id}.json"})
    (root / "manifests" / "index.json").write_text(json.dumps({
        "schema": "phaseflow.index/v1", "engine_version": version,
        "n_cases": 13, "cases": rows,
    }), encoding="utf-8")
    return root, ids


def test_baseline_reader_checks_all_thirteen_exact_version_traces_and_filters_other_objectives(tmp_path):
    root, ids = _baseline(tmp_path)
    rows, index_sha = _baseline_cases(root, tmp_path, ids, expected_version=_baseline_version())
    assert len(index_sha) == 64
    assert len(rows) == 13
    assert rows[ids[0]]["methods"] == [{
        "method": "toposort", "rung": "classical", "npv": 12.5, "gapPct": 1.0, "runtimeMs": 2.0,
    }, {
        "method": "toposort-expected", "rung": "sota", "npv": 14.0, "gapPct": 0.5, "runtimeMs": 3.0,
    }]
    assert rows[ids[0]]["certified_bound"] == 20.0
    assert rows[ids[0]]["published"]["problem"] == "PCPSP"
    assert len(rows[ids[0]]["trace_sha256"]) == 64


def test_baseline_reader_rejects_mixed_engine_before_any_comparison(tmp_path):
    root, ids = _baseline(tmp_path)
    manifest_path = root / "manifests" / f"{ids[3]}.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    manifest["engine"]["oreblocks"] = "0.6.5"
    manifest_path.write_text(json.dumps(manifest), encoding="utf-8")
    with pytest.raises(ValueError, match="mixed case or engine"):
        _baseline_cases(root, tmp_path, ids, expected_version=_baseline_version())


def test_peak_rss_sampler_observes_resident_memory_during_case_scope():
    with PeakRSS(interval_seconds=0.02) as sample:
        allocation = bytearray(b"x" * (16 * 1024 * 1024))
        time.sleep(0.06)
        assert allocation[0] == ord("x")
    assert sample.peak_bytes >= 16 * 1024 * 1024


def test_synthetic_interval_bootstraps_seed_clusters_and_excludes_failures():
    cases = [
        {"seed": 1, "family": "benched", "status": "complete", "normalized_npv": 0.2},
        {"seed": 1, "family": "branching", "status": "partial", "normalized_npv": 0.4},
        {"seed": 2, "family": "funnel", "status": "complete", "normalized_npv": 0.8},
        {"seed": 3, "family": "crosscut", "status": "failed", "normalized_npv": 100.0},
    ]
    interval = seed_clustered_interval(cases, replicates=100, seed=17)
    assert interval["clusters"] == 2
    assert interval["unit"] == "seed-cluster"
    assert interval["lower"] == pytest.approx(0.3)
    assert interval["upper"] == pytest.approx(0.8)


def test_synthetic_heldout_uses_the_real_classical_toposort_baseline():
    graph = generate_graph(901, "benched", 32)
    baseline = frontier_evaluator._classical_greedy_baseline(graph)
    assert baseline["method"] == "toposort-greedy"
    assert baseline["feasible"] is True
    assert 0 <= baseline["tonnage_coverage"] <= 1
    assert 0 <= baseline["positive_value_coverage"] <= 1
    assert np.isfinite(baseline["npv"])
    assert baseline["runtime_seconds"] >= 0


def test_adversarial_frozen_training_commit_may_have_result_only_evaluation_revision(monkeypatch):
    monkeypatch.setattr(
        frontier_evaluator.subprocess,
        "run",
        lambda *_args, **_kwargs: SimpleNamespace(stdout="", returncode=0),
    )
    frontier_evaluator._validate_frozen_method_source("a" * 40, "b" * 40)

    monkeypatch.setattr(
        frontier_evaluator.subprocess,
        "run",
        lambda *_args, **_kwargs: SimpleNamespace(
            stdout="data-pipeline/pipeline/model/frontier_ppo.py\n", returncode=0,
        ),
    )
    with pytest.raises(ValueError, match="frozen training method"):
        frontier_evaluator._validate_frozen_method_source("a" * 40, "b" * 40)


def test_adversarial_synthetic_test_ledger_recovers_completed_cases_without_repeating_started_cases(tmp_path):
    manifest = {"test": [{"case_id": "synthetic-benched-4", "family": "benched", "seed": 4, "size": 32}]}
    identity = {"split_sha256": "a" * 64, "evaluation_source_commit": "b" * 40}
    path = frontier_evaluator._test_ledger_path(tmp_path, identity["split_sha256"])
    ledger = frontier_evaluator._open_test_ledger(path, identity, manifest)
    ledger["cases"]["synthetic-benched-4"] = {"status": "started", "result": None}
    frontier_evaluator._atomic_json(path, ledger)

    resumed = frontier_evaluator._open_test_ledger(path, identity, manifest)
    state = resumed["cases"]["synthetic-benched-4"]
    assert state["status"] == "unavailable"
    assert "not rerun" in state["result"]["failure_reason"]


def test_adversarial_synthetic_test_ledger_refuses_consumed_split_and_nonfinite_json(tmp_path):
    identity = {"split_sha256": "c" * 64}
    path = frontier_evaluator._test_ledger_path(tmp_path, identity["split_sha256"])
    path.write_text(json.dumps({"identity": identity, "status": "consumed-results-lost"}), encoding="utf-8")
    with pytest.raises(ValueError, match="consumed-results-lost"):
        frontier_evaluator._open_test_ledger(path, identity, {"test": []})
    with pytest.raises(ValueError, match="Out of range"):
        frontier_evaluator._atomic_json(tmp_path / "nonfinite.json", {"value": float("nan")})


def test_expected_time_comparison_requires_its_completed_bound():
    baseline = {"methods": [{"method": "toposort-expected", "npv": 12.0}], "certified_bound": None}
    unavailable = _expected_time_comparison(baseline, 10.0)
    assert unavailable["certificate_complete"] is False
    assert unavailable["npv"] is None
    baseline["certified_bound"] = 20.0
    available = _expected_time_comparison(baseline, 10.0)
    assert available["certificate_complete"] is True
    assert available["frontier_minus_expected_time_npv"] == -2.0


def test_published_reference_is_never_compared_across_objectives():
    reference = _published_reference({"problem": "PCPSP", "best_known": 99.0}, 10.0)
    assert reference["available"] is True
    assert reference["comparable_to_frontier_objective"] is False
    assert reference["frontier_minus_published_value"] is None


def test_baseline_pairing_requires_exact_case_instance_and_scenario():
    case = SimpleNamespace(
        id="fixture", deposit=SimpleNamespace(synthetic=True), published={},
    )
    source_instance = SimpleNamespace(
        cpit=SimpleNamespace(
            n_blocks=3, n_resources=2, n_periods=2, discount_rate=0.1,
            period_one_undiscounted=True, resource_names=("mining", "processing"),
            limit=np.array([[4.0, 4.0], [1.0, 1.0]]),
        ),
        precedence=SimpleNamespace(n_arcs=2), upit_value=5.67,
        upit_in_pit=np.array([True, True, False]),
    )
    baseline = {"trace": {
        "instance": {
            "source": "twin", "synthetic": True, "nBlocks": 3,
            "nPrecedenceArcs": 2, "upitValue": 5.67, "upitBlocks": 2,
        },
        "scenario": {
            "periods": 2, "discountRate": 0.1, "periodOneUndiscounted": True,
            "declared": True,
            "resources": [
                {"id": 0, "name": "mining", "limitPerPeriod": [4.0, 4.0]},
                {"id": 1, "name": "processing", "limitPerPeriod": [1.0, 1.0]},
            ],
        },
    }}
    _validate_baseline_pairing(baseline, case, source_instance)
    source_instance.cpit.discount_rate = 0.11
    with pytest.raises(ValueError, match="baseline scenario"):
        _validate_baseline_pairing(baseline, case, source_instance)
