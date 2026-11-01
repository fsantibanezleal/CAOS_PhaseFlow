from __future__ import annotations

import json
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BRIDGE = ROOT / "scripts/local/producer_bridge.py"


def invoke(mode: str, stage: Path) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, str(BRIDGE), mode, str(stage)],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=False,
    )


def test_adversarial_phaseflow_bridge_stages_models_and_computes_readiness(tmp_path: Path) -> None:
    stage = tmp_path / "candidate with spaces"
    (stage / "data/derived").mkdir(parents=True)
    (stage / "models").mkdir()
    (stage / "docs/contracts").parent.mkdir(parents=True)
    shutil.copytree(ROOT / "docs/contracts", stage / "docs/contracts")
    shutil.copy2(ROOT / "VERSION", stage / "VERSION")
    config = json.loads((ROOT / "scripts/local/workflow.json").read_text(encoding="utf-8"))
    for name in config["stage_inputs"]:
        destination = stage / name
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(ROOT / name, destination)
        assert destination.read_bytes() == (ROOT / name).read_bytes()
    assert set(config["stage_inputs"]) == {
        f"models/{path.name}"
        for path in (ROOT / "models").iterdir()
        if path.is_file() and path.name != ".gitkeep"
    }

    finalized = invoke("phaseflow-finalize", stage)
    assert finalized.returncode == 0, finalized.stderr
    ready = json.loads((stage / "data/derived/readiness.json").read_text(encoding="utf-8"))
    assert ready["product_version"] == (ROOT / "VERSION").read_text(encoding="utf-8").strip()
    checked = subprocess.run(
        [sys.executable, str(ROOT / "scripts/check_readiness.py"), str(stage)],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    assert checked.returncode == 0, checked.stdout + checked.stderr


def test_adversarial_phaseflow_bridge_requires_complete_current_registry(tmp_path: Path) -> None:
    stage = tmp_path / "complete-stage"
    index = stage / "data/derived/manifests/index.json"
    index.parent.mkdir(parents=True)
    version = (ROOT / "VERSION").read_text(encoding="utf-8").strip()
    (stage / "VERSION").write_text(version, encoding="utf-8")
    registry_probe = subprocess.run(
        [
            sys.executable,
            "-c",
            "import json;from pipeline import registry;print(json.dumps([c.id for c in registry.list_cases()]))",
        ],
        cwd=ROOT / "data-pipeline",
        capture_output=True,
        text=True,
        check=False,
    )
    assert registry_probe.returncode == 0, registry_probe.stderr
    case_ids = json.loads(registry_probe.stdout)

    def write_index(ids: list[str]) -> None:
        index.write_text(
            json.dumps({"engine_version": version, "cases": [{"case_id": item} for item in ids]}),
            encoding="utf-8",
        )

    write_index(case_ids)
    assert invoke("phaseflow-validate", stage).returncode == 0
    for invalid in (case_ids[:-1], case_ids + [case_ids[0]]):
        write_index(invalid)
        result = invoke("phaseflow-validate", stage)
        assert result.returncode != 0
        assert "case inventory" in result.stderr

    write_index(case_ids)
    (stage / "VERSION").write_text("0.10." + "000", encoding="utf-8")
    wrong_version = invoke("phaseflow-validate", stage)
    assert wrong_version.returncode != 0
    assert "version differs" in wrong_version.stderr


def test_phaseflow_write_modes_refuse_repository_targets() -> None:
    result = invoke("phaseflow-finalize", ROOT)
    assert result.returncode != 0
    assert "external prepared stage" in result.stderr
