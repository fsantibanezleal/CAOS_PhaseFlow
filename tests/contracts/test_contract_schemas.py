"""The published schemas describe the JSON documents consumed by PhaseFlow."""

import json
from pathlib import Path

from jsonschema import Draft202012Validator

ROOT = Path(__file__).resolve().parents[2]


def test_every_catalogued_document_matches_its_schema() -> None:
    """Keep the standalone release gate exercised through pytest as well."""
    import subprocess
    import sys

    subprocess.run([sys.executable, "scripts/check_contracts.py", "docs/contracts/catalog.md", "--repo-root", "."], cwd=ROOT, check=True)


def test_manifest_schema_rejects_missing_identity() -> None:
    """A document without its case identity must never pass as a manifest."""
    schema = json.loads((ROOT / "docs/contracts/schemas/manifest.schema.json").read_text())
    validator = Draft202012Validator(schema)
    assert list(validator.iter_errors({"schema": "phaseflow.manifest/v1"}))
