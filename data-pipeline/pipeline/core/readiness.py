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


def _frontier_release_state(row: dict[str, str], root: Path, derived_root: Path,
                            models_dir: Path) -> dict[str, Any]:
    """Count a frozen receipt only when it has the minimum closed v3 release shape.

    Receipts are deliberately ignored by Git until a release candidate is reviewed. A
    stale local receipt can therefore exist in a working tree while being absent from a
    clean clone. File presence alone must not turn that local scratch artifact into
    release readiness.
    """
    docs = [part.strip().strip("`") for part in row["documents"].split(",")]
    missing: list[str] = []
    for rel in docs:
        path = _document_path(root, derived_root, models_dir, rel)
        receipt = _read_json(path)
        if receipt is None or not _valid_frontier_release_v3(receipt):
            missing.append(rel)
    if not missing:
        return _entry(row, "available")
    why = {
        "en": "The frozen release receipt is absent or does not satisfy contract v3.",
        "es": "El recibo de publicación congelado no existe o no cumple el contrato v3.",
    }
    return _entry(row, "missing", missing, why)


def _valid_frontier_release_v3(receipt: dict[str, Any]) -> bool:
    """Fail closed on required v3 fields and totals; schema gates check all field detail."""
    required = {
        "schema", "created_at_utc", "product_version", "engine_version", "source_commit",
        "training_source_commit", "checkpoint_sha256", "checkpoint_members_sha256",
        "feature_contract_sha256", "split_sha256", "training_split_sha256",
        "case_index_sha256", "baseline", "cases", "summary", "redistribution",
    }
    if not required.issubset(receipt) or receipt.get("schema") != "phaseflow.frontier-release/v3":
        return False
    if receipt.get("split_sha256") == receipt.get("training_split_sha256"):
        return False
    hashes = ("checkpoint_sha256", "feature_contract_sha256", "split_sha256",
              "training_split_sha256", "case_index_sha256")
    if any(not _is_sha256(receipt.get(key)) for key in hashes):
        return False
    if not isinstance(receipt.get("checkpoint_members_sha256"), list) or len(receipt["checkpoint_members_sha256"]) != 5:
        return False
    if any(not _is_sha256(value) for value in receipt["checkpoint_members_sha256"]):
        return False
    cases = receipt.get("cases")
    summary = receipt.get("summary")
    if not isinstance(cases, list) or len(cases) != 13 or not isinstance(summary, dict):
        return False
    statuses = ("complete", "partial", "failed", "unavailable")
    if any(not isinstance(case, dict) or case.get("status") not in statuses for case in cases):
        return False
    return summary.get("cases") == 13 and sum(summary.get(key, -1) for key in statuses) == 13


def _is_sha256(value: Any) -> bool:
    return isinstance(value, str) and len(value) == 64 and all(char in "0123456789abcdef" for char in value)


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
        if contract_id == "frontier-release":
            result = _frontier_release_state(row, root, derived, models)
        elif contract_id == "case-index":
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
