#!/usr/bin/env python3
"""Migrate invalid negative solver node-count sentinels to the trace's explicit unknown value."""
from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "data-pipeline"))

from pipeline.core.gate import classify_lane  # noqa: E402
from pipeline.io.formats import write_json  # noqa: E402


def _replace_sentinels(value: object) -> int:
    if isinstance(value, dict):
        changed = 0
        for key, child in list(value.items()):
            if key == "nodes" and isinstance(child, int) and not isinstance(child, bool) and child < 0:
                value[key] = None
                changed += 1
            else:
                changed += _replace_sentinels(child)
        return changed
    if isinstance(value, list):
        return sum(_replace_sentinels(child) for child in value)
    return 0


def migrate(derived: Path) -> int:
    derived = derived.resolve()
    manifests = derived / "manifests"
    changed_total = 0
    for manifest_path in sorted(manifests.glob("*.json")):
        if manifest_path.name == "index.json":
            continue
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        trace_path = derived / manifest["artifact"]["path"]
        trace = json.loads(trace_path.read_text(encoding="utf-8"))
        changed = _replace_sentinels(trace)
        if not changed:
            continue
        trace_bytes = write_json(trace_path, trace)
        manifest["artifact"]["bytes"] = trace_bytes
        manifest["gate"] = classify_lane(
            n_blocks=manifest["instance"]["n_blocks"],
            n_arcs=manifest["instance"]["n_precedence_arcs"],
            trace_bytes=trace_bytes,
            offline_ms=manifest["gate"]["offline_ms"],
            redistributable=manifest["real_or_synthetic"] == "synthetic",
        )
        manifest["lane"] = manifest["gate"]["lane"]
        write_json(manifest_path, manifest)
        print(f"{manifest['case_id']}: replaced {changed} unavailable node-count sentinel(s); {trace_bytes} trace bytes")
        changed_total += changed
    print(f"migrated {changed_total} solver node-count sentinel(s)")
    return changed_total


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--derived-root", type=Path, default=ROOT / "data" / "derived")
    args = parser.parse_args()
    migrate(args.derived_root)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
