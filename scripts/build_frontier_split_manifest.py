"""Build or verify the approved frontier-policy seed/family partition ledger."""
from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "data-pipeline"))

from pipeline.model.frontier_splits import build_split_manifest, manifest_sha256  # noqa: E402

OUTPUT = ROOT / "docs/design/features/learned-frontier/split-manifest.json"
INDEX = ROOT / "data/derived/manifests/index.json"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="verify the committed manifest is current")
    args = parser.parse_args()
    if not INDEX.is_file():
        raise SystemExit("the committed product case index is required to seal the product-case list")
    index = json.loads(INDEX.read_text(encoding="utf-8"))
    case_ids = [row["case_id"] for row in index["cases"]]
    manifest = build_split_manifest(case_ids)
    payload = {"sha256": manifest_sha256(manifest), "manifest": manifest}
    rendered = json.dumps(payload, ensure_ascii=False, sort_keys=True, indent=2) + "\n"
    if args.check:
        if not OUTPUT.is_file() or OUTPUT.read_text(encoding="utf-8") != rendered:
            raise SystemExit("frontier split manifest differs from the approved case index and frozen split")
        print(f"frontier split manifest verified: {payload['sha256']}")
    else:
        OUTPUT.parent.mkdir(parents=True, exist_ok=True)
        OUTPUT.write_text(rendered, encoding="utf-8")
        print(f"wrote {OUTPUT.relative_to(ROOT)} sha256={payload['sha256']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
