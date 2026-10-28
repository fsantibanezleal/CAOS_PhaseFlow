"""Recompute the committed evidence readiness snapshot from its catalog."""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "data-pipeline"))

from pipeline.core.readiness import compute  # noqa: E402


def main() -> int:
    output = ROOT / "data/derived/readiness.json"
    doc = compute(ROOT)
    output.write_text(json.dumps(doc, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"readiness updated: {output.relative_to(ROOT)} ({len(doc['contracts'])} contract rows)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
