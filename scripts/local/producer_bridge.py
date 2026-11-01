#!/usr/bin/env python3
"""PhaseFlow-specific operations for the template's receipt-based local workflow."""

from __future__ import annotations

import json
import sys
from pathlib import Path


def main() -> int:
    if len(sys.argv) != 3:
        raise SystemExit("usage: producer_bridge.py phaseflow-{finalize|validate} STAGE")
    mode, raw_stage = sys.argv[1:]
    root = Path(__file__).resolve().parents[2]
    stage = Path(raw_stage).resolve()
    validate_read = mode == "phaseflow-validate" and stage == root
    if (stage.is_relative_to(root) and not validate_read) or not (stage / "data/derived").is_dir():
        raise ValueError("Producer bridge requires an external prepared stage.")

    if mode == "phaseflow-finalize":
        sys.path.insert(0, str(root / "data-pipeline"))
        from pipeline.core.readiness import compute, write

        readiness = compute(
            repo_root=stage,
            derived_root=stage / "data/derived",
            models_dir=stage / "models",
        )
        write(stage / "data/derived", readiness)
        return 0

    if mode == "phaseflow-validate":
        sys.path.insert(0, str(root / "data-pipeline"))
        from pipeline import registry

        index_path = stage / "data/derived/manifests/index.json"
        index = json.loads(index_path.read_text(encoding="utf-8"))
        expected = {case.id for case in registry.list_cases()}
        rows = index.get("cases")
        if not isinstance(rows, list):
            raise ValueError("The case index has no case list.")
        actual = [row.get("case_id") for row in rows if isinstance(row, dict)]
        if len(actual) != len(rows) or set(actual) != expected or len(actual) != len(set(actual)):
            raise ValueError(
                f"Incomplete or duplicate case inventory: expected {len(expected)}, found {len(actual)}."
            )
        version = (stage / "VERSION").read_text(encoding="utf-8").strip()
        if index.get("engine_version") != version:
            raise ValueError("The case index engine version differs from the staged product version.")
        return 0

    raise ValueError(f"Unknown producer bridge operation: {mode}")


if __name__ == "__main__":
    raise SystemExit(main())
