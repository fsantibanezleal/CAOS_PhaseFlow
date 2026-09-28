"""The release comparison must reject changed science while accepting measured wall time."""
import json

from scripts.compare_rebake import compare


def _write(root, index, manifest, trace):
    (root / "manifests").mkdir(parents=True)
    (root / "case").mkdir()
    (root / "manifests/index.json").write_text(json.dumps(index))
    (root / "manifests/case.json").write_text(json.dumps(manifest))
    (root / "case/trace.json").write_text(json.dumps(trace))


def test_rebake_comparison_rejects_scientific_drift(tmp_path):
    baseline, candidate = tmp_path / "old", tmp_path / "new"
    index = {"engine_version": "0.07.002", "cases": [{"case_id": "case", "title": {"en": "Old", "es": "Anterior"}}]}
    manifest = {
        "engine": {"version": "0.07.002"},
        "gate": {"lane": "replay", "offline_ms": 61000, "reasons": [
            "offline solve took 61000 ms, above the 60000 ms note"]},
        "scoreboard": [{"npv": 42, "runtime_ms": 5}],
    }
    trace = {"title": {"en": "Old", "es": "Anterior"}, "role": {"en": "old", "es": "anterior"},
             "methods": [{"npv": 42, "runtimeMs": 5}]}
    _write(baseline, index, manifest, trace)
    index["engine_version"] = "0.07.003"
    index["cases"][0]["title"]["es"] = "Actual"
    manifest["engine"]["version"] = "0.07.003"
    manifest["gate"]["offline_ms"] = 75000
    manifest["gate"]["reasons"][0] = "offline solve took 75000 ms, above the 60000 ms note"
    manifest["scoreboard"][0]["runtime_ms"] = 8
    trace["role"]["es"] = "actual"
    trace["methods"][0]["runtimeMs"] = 8
    _write(candidate, index, manifest, trace)
    assert compare(baseline, candidate)["scientific_outputs_unchanged"]

    trace["methods"][0]["npv"] = 43
    (candidate / "case/trace.json").write_text(json.dumps(trace))
    report = compare(baseline, candidate)
    assert not report["scientific_outputs_unchanged"]
    assert "/methods/0/npv" in report["files"][-1]["unexpected_changes"]

    trace["methods"][0]["npv"] = 42
    (candidate / "case/trace.json").write_text(json.dumps(trace))
    manifest["gate"]["lane"] = "live"
    (candidate / "manifests/case.json").write_text(json.dumps(manifest))
    report = compare(baseline, candidate)
    assert "/gate/lane" in report["files"][1]["unexpected_changes"]


def test_rebake_comparison_only_allows_timing_gate_reasons(tmp_path):
    baseline, candidate = tmp_path / "old", tmp_path / "new"
    index = {"cases": [{"case_id": "case"}]}
    manifest = {"gate": {"reasons": []}}
    _write(baseline, index, manifest, {})
    manifest["gate"]["reasons"] = ["offline solve took 61708 ms, above the 60000 ms note"]
    _write(candidate, index, manifest, {})
    assert compare(baseline, candidate)["scientific_outputs_unchanged"]
    manifest["gate"]["reasons"] = ["capacity feasibility failed"]
    (candidate / "manifests/case.json").write_text(json.dumps(manifest))
    assert "/gate/reasons" in compare(baseline, candidate)["files"][1]["unexpected_changes"]
