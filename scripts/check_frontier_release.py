"""Validate a frozen frontier-policy release receipt against the committed case index."""
from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "data-pipeline"))

from pipeline.model.frontier_release import validate_release_receipt  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("receipt", type=Path, help="external or committed frozen bake receipt JSON")
    args = parser.parse_args()
    index_path = ROOT / "data/derived/manifests/index.json"
    if not index_path.is_file():
        raise SystemExit("committed case index is required before release receipt validation")
    index = json.loads(index_path.read_text(encoding="utf-8"))
    receipt = json.loads(args.receipt.read_text(encoding="utf-8"))
    expected = [row["case_id"] for row in index["cases"]]
    print(json.dumps(validate_release_receipt(receipt, expected), sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
