"""Fail if the committed readiness snapshot is not exactly what the catalog and evidence produce."""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "data-pipeline"))

from pipeline.core.readiness import compute  # noqa: E402


def main() -> int:
    path = ROOT / "data/derived/readiness.json"
    try:
        committed = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError) as exc:
        print(f"readiness check failed: {exc}")
        return 1
    current = compute(ROOT)
    if committed != current:
        print("readiness check failed: snapshot differs from catalog or committed evidence; run scripts/update_readiness.py")
        return 1
    print(f"readiness OK: {len(current['contracts'])} contracts, {current['product_version']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
