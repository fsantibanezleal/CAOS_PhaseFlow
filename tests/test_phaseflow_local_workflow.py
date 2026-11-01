from __future__ import annotations

import json
import importlib.util
import os
import shutil
import subprocess
import sys
from pathlib import Path

import pytest

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


def test_adversarial_external_model_root_is_used_for_bake_and_training(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    model_root = tmp_path / "external model bundle"
    model_root.mkdir()
    config = json.loads((ROOT / "scripts/local/workflow.json").read_text(encoding="utf-8"))
    for name in config["stage_inputs"]:
        target = model_root / Path(name).relative_to("models")
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes((ROOT / name).read_bytes())
    monkeypatch.setenv("CAOS_MODEL_SOURCE_ROOT", str(model_root))
    spec = importlib.util.spec_from_file_location("phaseflow_workflow_model_source", ROOT / "scripts/local/workflow.py")
    assert spec and spec.loader
    workflow = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(workflow)
    inputs = workflow.authored_inputs(ROOT, config)
    assert all(path.is_relative_to(model_root) for path in inputs.values())
    original_identity = workflow.source_identity(ROOT, config)
    report = model_root / "training-report.json"
    report.write_text(report.read_text(encoding="utf-8") + "\n", encoding="utf-8")
    assert workflow.source_identity(ROOT, config) != original_identity
    assert report.read_bytes() != (ROOT / "models/training-report.json").read_bytes()

    observed: dict[str, str] = {}

    def fake_commands(_root, rows, values, child_env):
        assert rows == config["generation"]
        observed.update(child_env)
        index = Path(values["derived"]) / "manifests/index.json"
        index.parent.mkdir(parents=True)
        index.write_text("{}", encoding="utf-8")

    monkeypatch.setattr(workflow, "generation_python", lambda *_: sys.executable)
    monkeypatch.setattr(workflow, "commands", fake_commands)
    monkeypatch.setattr(workflow, "validate_stage", lambda *_args, **_kwargs: None)
    config["generation_modules"] = []
    temp_root = tmp_path / "external temporary"
    data_root = tmp_path / "external data"
    temp_root.mkdir()
    data_root.mkdir()
    stage = workflow.generate(
        ROOT,
        config,
        {
            **os.environ,
            "CAOS_TEMP_ROOT": str(temp_root),
            "CAOS_DATA_ROOT": str(data_root),
        },
    )
    assert Path(observed["CAOS_MODELS_ROOT"]) == stage / "models"
    assert (stage / "models/training-report.json").read_bytes() == report.read_bytes()

    env = {**os.environ, "CAOS_MODELS_ROOT": str(model_root)}
    probe = subprocess.run(
        [
            sys.executable,
            "-c",
            "import sys; from pipeline.pipeline import MODELS, PipelinePaths; print(MODELS); print(PipelinePaths.from_output(sys.argv[1]).models)",
            str(tmp_path / "external candidate"),
        ],
        cwd=ROOT / "data-pipeline",
        env=env,
        capture_output=True,
        text=True,
        check=False,
    )
    assert probe.returncode == 0, probe.stderr
    assert probe.stdout.splitlines() == [str(model_root.resolve())] * 2

    for expression, expected in (
        ("PipelinePaths.from_output()", "Pass --output with an external candidate directory"),
        (f"PipelinePaths.from_output({str(ROOT / 'data/derived')!r})", "outside the product repository"),
    ):
        refused = subprocess.run(
            [sys.executable, "-c", f"from pipeline.pipeline import PipelinePaths; {expression}"],
            cwd=ROOT / "data-pipeline",
            capture_output=True,
            text=True,
            check=False,
        )
        assert refused.returncode != 0 and expected in refused.stderr

    no_training_root = os.environ.copy()
    no_training_root.pop("CAOS_MODELS_ROOT", None)
    training = subprocess.run(
        [sys.executable, str(ROOT / "scripts/train_learned.py")],
        cwd=ROOT,
        env=no_training_root,
        capture_output=True,
        text=True,
        check=False,
    )
    assert training.returncode != 0
    assert "Set CAOS_MODELS_ROOT to an external model-output directory" in training.stderr
    assert "models" not in training.stdout

    paths = subprocess.run(
        [sys.executable, "-c", "import sys; sys.path.insert(0, 'scripts'); from model_paths import external_model_root; print(external_model_root())"],
        cwd=ROOT,
        env={**os.environ, "CAOS_MODELS_ROOT": str(model_root)},
        capture_output=True,
        text=True,
        check=False,
    )
    assert paths.returncode == 0 and paths.stdout.strip() == str(model_root.resolve())
    in_repo = subprocess.run(
        [sys.executable, "-c", "import sys; sys.path.insert(0, 'scripts'); from model_paths import external_model_root; external_model_root()"],
        cwd=ROOT,
        env={**os.environ, "CAOS_MODELS_ROOT": str(ROOT / "models")},
        capture_output=True,
        text=True,
        check=False,
    )
    assert in_repo.returncode != 0
    assert "outside the product repository" in in_repo.stderr
