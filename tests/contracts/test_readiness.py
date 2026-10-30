from __future__ import annotations

import json
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "data-pipeline"))
from pipeline.core.readiness import compute  # noqa: E402

VERSION = (ROOT / "VERSION").read_text(encoding="utf-8").strip()
PREVIOUS = "0." + str(max(0, int(VERSION.split(".")[1]) - 1)).zfill(2) + ".999"


def isolated_repo(tmp_path: Path) -> Path:
    root = tmp_path / "phaseflow"
    shutil.copytree(ROOT / "docs/contracts", root / "docs/contracts")
    shutil.copy(ROOT / "VERSION", root / "VERSION")
    shutil.copytree(ROOT / "data/derived", root / "data/derived")
    return root


def row(snapshot: dict, contract_id: str) -> dict:
    return next(item for item in snapshot["contracts"] if item["id"] == contract_id)


def test_committed_snapshot_is_reproducible():
    expected = json.loads((ROOT / "data/derived/readiness.json").read_text(encoding="utf-8"))
    assert compute(ROOT) == expected


def test_stale_phaseflow_bake_is_reported(tmp_path: Path):
    root = isolated_repo(tmp_path)
    index_path = root / "data/derived/manifests/index.json"
    index = json.loads(index_path.read_text(encoding="utf-8"))
    index["engine_version"] = PREVIOUS
    index_path.write_text(json.dumps(index), encoding="utf-8")
    result = row(compute(root), "case-index")
    assert result["state"] == "stale"
    assert result["provenance"] == "real"
    assert PREVIOUS in result["reason"]["en"]


def test_missing_trace_names_the_phaseflow_artifact(tmp_path: Path):
    root = isolated_repo(tmp_path)
    index = json.loads((root / "data/derived/manifests/index.json").read_text(encoding="utf-8"))
    manifest = json.loads((root / "data/derived" / index["cases"][0]["manifest_path"]).read_text(encoding="utf-8"))
    trace = root / "data/derived" / manifest["artifact"]["path"]
    trace.unlink()
    result = row(compute(root), "schedule-trace")
    assert result["state"] == "partial"
    assert trace.relative_to(root).as_posix() in result["missing"]


def test_catalog_change_updates_its_digest(tmp_path: Path):
    root = isolated_repo(tmp_path)
    before = compute(root)["catalog_sha256"]
    catalog = root / "docs/contracts/catalog.md"
    catalog.write_text(catalog.read_text(encoding="utf-8") + "\n<!-- reviewed -->\n", encoding="utf-8")
    after = compute(root)["catalog_sha256"]
    assert after != before


def test_current_template_api_accepts_explicit_data_model_and_catalog_roots(tmp_path: Path):
    root = isolated_repo(tmp_path)
    derived = tmp_path / "external-derived"
    models = tmp_path / "external-models"
    shutil.copytree(ROOT / "data/derived", derived)
    shutil.copytree(ROOT / "models", models)
    shutil.copytree(ROOT / "models", root / "models")
    explicit = compute(
        repo_root=root,
        derived_root=derived,
        models_dir=models,
        catalog_path=root / "docs/contracts/catalog.md",
        version=VERSION,
    )
    assert explicit == compute(root)
