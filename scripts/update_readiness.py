"""Recompute the committed evidence readiness snapshot from its catalog."""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "data-pipeline"))

from pipeline.core.readiness import compute, write  # noqa: E402


def main() -> int:
    output = ROOT / "data/derived/readiness.json"
    doc = compute(ROOT)
    size = write(output.parent, doc)
    print(f"readiness updated: {output.relative_to(ROOT)} ({len(doc['contracts'])} contract rows, {size} bytes)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
