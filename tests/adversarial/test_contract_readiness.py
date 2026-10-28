"""Adversarial checks for stale and malformed release evidence."""

import json
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "data-pipeline"))

from pipeline.core.readiness import compute  # noqa: E402

VERSION = (ROOT / "VERSION").read_text(encoding="utf-8").strip()
NEXT = "0." + str(int(VERSION.split(".")[1]) + 1).zfill(2) + ".000"


def test_readiness_marks_old_case_index_stale(tmp_path: Path) -> None:
    """An old bake cannot look ready after the product version changes."""
    shutil.copytree(ROOT / "docs/contracts", tmp_path / "docs/contracts")
    (tmp_path / "VERSION").write_text(NEXT + "\n", encoding="utf-8")
    index_path = tmp_path / "data/derived/manifests/index.json"
    index_path.parent.mkdir(parents=True)
    index_path.write_text(json.dumps({
        "schema": "phaseflow.index/v1",
        "engine_version": VERSION,
        "n_cases": 0,
        "cases": [],
    }), encoding="utf-8")
    snapshot = compute(tmp_path)
    case_index = next(item for item in snapshot["contracts"] if item["id"] == "case-index")
    assert case_index["state"] == "stale"
    assert VERSION in case_index["reason"]["en"]


def test_missing_index_fails_closed_for_trace_evidence(tmp_path: Path) -> None:
    """Without an index the expected trace inventory is unknown, not ready."""
    shutil.copytree(ROOT / "docs/contracts", tmp_path / "docs/contracts")
    (tmp_path / "VERSION").write_text(VERSION + "\n", encoding="utf-8")
    snapshot = compute(tmp_path)
    traces = next(item for item in snapshot["contracts"] if item["id"] == "schedule-trace")
    assert traces["state"] == "missing"
    assert traces["missing"] == ["data/derived/manifests/index.json"]
