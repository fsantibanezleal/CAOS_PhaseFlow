"""The artifact guard validates an isolated candidate copy without touching committed data."""
from __future__ import annotations

import json
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = ROOT / "scripts"


def _run(*args: str) -> subprocess.CompletedProcess:
    return subprocess.run([sys.executable, str(SCRIPTS / "check_artifacts.py"), "--root", *args], capture_output=True, text=True)


def test_check_artifacts_reads_candidate_tree_and_rejects_version_drift(tmp_path):
    version = (ROOT / "VERSION").read_text(encoding="utf-8").strip()
    major, minor, patch = (int(part) for part in version.split("."))
    previous = f"{major}.{minor - 1:02d}.{patch:03d}"
    candidate = tmp_path / "derived"
    shutil.copytree(ROOT / "data" / "derived", candidate)
    ok = _run(str(candidate))
    assert ok.returncode == 0 and "13 cases" in ok.stdout, ok.stdout + ok.stderr

    manifest_path = candidate / "manifests" / "ctrl-abundant.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    manifest["engine"]["version"] = previous
    manifest_path.write_text(json.dumps(manifest), encoding="utf-8")
    bad = _run(str(candidate))
    assert bad.returncode == 1
    assert f"artifact version differs from VERSION {version}" in bad.stderr
