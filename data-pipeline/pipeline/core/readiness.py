"""Compute a release snapshot from PhaseFlow's contract catalog and committed evidence."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any

CATALOG = Path("docs/contracts/catalog.md")
INDEX = Path("data/derived/manifests/index.json")
READINESS_SCHEMA = "phaseflow.readiness/v1"


def _catalog_rows(text: str) -> list[dict[str, str]]:
    """Read the deliberately small pipe table that owns contract versions and document globs."""
    rows: list[dict[str, str]] = []
    headers: list[str] = []
    in_contracts = False
    for line in text.splitlines():
        if line.startswith("## "):
            in_contracts = line == "## Contracts"
            continue
        if not in_contracts:
            continue
        if not line.startswith("|") or line.startswith("|---"):
            continue
        cells = [cell.strip().strip("`") for cell in line.strip("|").split("|")]
        if cells and cells[0] == "id":
            headers = cells
            continue
        if headers and len(cells) == len(headers) and cells[0] != "":
            rows.append(dict(zip(headers, cells)))
    return rows


def _read_json(path: Path) -> dict[str, Any] | None:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None
    return value if isinstance(value, dict) else None


def _entry(row: dict[str, str], state: str, missing: list[str] | None = None,
           reason: dict[str, str] | None = None) -> dict[str, Any]:
    return {
        "id": row["id"],
        "version": row["version"],
        "state": state,
        "provenance": "real" if state in {"available", "partial", "stale"} else None,
        "reason": reason,
        "missing": sorted(missing or []),
    }


def _document_path(root: Path, derived_root: Path, models_dir: Path, rel: str) -> Path:
    """Resolve catalog paths against explicit roots while keeping their public repo-relative names."""
    if rel == "data/derived" or rel.startswith("data/derived/"):
        return derived_root / rel.removeprefix("data/derived/")
    if rel == "models" or rel.startswith("models/"):
        return models_dir / rel.removeprefix("models/")
    return root / rel


def _document_state(row: dict[str, str], root: Path, derived_root: Path, models_dir: Path,
                    expected: list[str] | None = None) -> dict[str, Any]:
    docs = [part.strip().strip("`") for part in row["documents"].split(",")]
    if expected is not None:
        docs = expected
    present = [rel for rel in docs if _document_path(root, derived_root, models_dir, rel).is_file()]
    absent = sorted(set(docs) - set(present))
    if not absent:
        return _entry(row, "available")
    if not present:
        why = {"en": "None of the catalogued documents is present.",
               "es": "No está presente ninguno de los documentos del catálogo."}
        return _entry(row, "missing", absent, why)
    why = {"en": f"{len(absent)} of {len(docs)} catalogued documents are absent.",
           "es": f"Faltan {len(absent)} de {len(docs)} documentos del catálogo."}
    return _entry(row, "partial", absent, why)


def compute(repo_root: str | Path, *, derived_root: str | Path | None = None,
            models_dir: str | Path | None = None, catalog_path: str | Path | None = None,
            version: str | None = None) -> dict[str, Any]:
    """Compute readiness without mutation; accept the current template's explicit-root API and the legacy positional root."""
    root = Path(repo_root)
    derived = Path(derived_root) if derived_root is not None else root / "data/derived"
    models = Path(models_dir) if models_dir is not None else root / "models"
    catalog = Path(catalog_path) if catalog_path is not None else root / CATALOG
    raw = catalog.read_bytes().replace(b"\r\n", b"\n")
    rows = _catalog_rows(raw.decode("utf-8"))
    version = version if version is not None else (root / "VERSION").read_text(encoding="utf-8").strip()
    index_path = derived / "manifests/index.json"
    index = _read_json(index_path)
    outputs: list[dict[str, Any]] = []

    for row in rows:
        contract_id = row["id"]
        if contract_id == "readiness":
            continue
        if contract_id == "case-index":
            result = _document_state(row, root, derived, models)
            if index and index.get("engine_version") != version and result["state"] == "available":
                result = _entry(row, "stale", reason={
                    "en": f"Baked by {index.get('engine_version')}; repository version is {version}.",
                    "es": f"Generado por {index.get('engine_version')}; la versión del repositorio es {version}.",
                })
        elif contract_id == "case-manifest":
            expected = None
            if index is not None:
                expected = ["data/derived/" + str(case["manifest_path"])
                            for case in index.get("cases", [])]
            result = _document_state(row, root, derived, models, expected)
        elif contract_id == "schedule-trace":
            expected = []
            if index is not None:
                for case in index.get("cases", []):
                    manifest = _read_json(derived / str(case["manifest_path"]))
                    if manifest is not None:
                        expected.append("data/derived/" + str(manifest["artifact"]["path"]))
            result = (_entry(row, "missing", [INDEX.as_posix()], reason={
                "en": "The case index is absent, so the expected trace set is unknown.",
                "es": "Falta el índice de casos, por lo que se desconoce el conjunto esperado de trazas.",
            }) if index is None else _document_state(row, root, derived, models, expected))
        else:
            result = _document_state(row, root, derived, models)
        outputs.append(result)

    return {
        "schema": READINESS_SCHEMA,
        "product_version": version,
        "catalog_sha256": hashlib.sha256(raw).hexdigest(),
        "contracts": outputs,
    }


def write(derived_root: str | Path, document: dict[str, Any]) -> int:
    """Write the compact, byte-stable readiness contract and return its size."""
    path = Path(derived_root) / "readiness.json"
    encoded = json.dumps(document, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
    path.write_bytes(encoded)
    return len(encoded)
