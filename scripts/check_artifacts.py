#!/usr/bin/env python3
"""CONTRACT 2 drift guard: the committed manifests and traces must agree with each other.

Run in CI and by the deploy job. It never runs the pipeline and never rewrites evidence: it reads
what is committed and asserts the invariants a stale or hand-edited artifact would break.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DERIVED = ROOT / "data" / "derived"
MANIFESTS = DERIVED / "manifests"

TRACE_SCHEMA = "phaseflow.schedule-trace/v1"
MANIFEST_SCHEMA = "phaseflow.manifest/v1"
INDEX_SCHEMA = "phaseflow.index/v1"


def main() -> int:
    fail: list[str] = []
    index_path = MANIFESTS / "index.json"
    if not index_path.exists():
        print(f"missing {index_path}; run 'python data-pipeline/run.py' first", file=sys.stderr)
        return 1
    index = json.loads(index_path.read_text(encoding="utf-8"))
    if index["schema"] != INDEX_SCHEMA:
        fail.append(f"index schema {index['schema']}")

    on_disk = {p.name for p in DERIVED.iterdir() if p.is_dir() and p.name != "manifests"}
    declared = {c["case_id"] for c in index["cases"]}
    if on_disk != declared:
        fail.append(f"index declares {sorted(declared)} but disk holds {sorted(on_disk)}")

    defaults = [c for c in index["cases"] if c.get("default")]
    if len(defaults) != 1:
        fail.append(f"exactly one case must be the default, found {len(defaults)}")

    for entry in index["cases"]:
        cid = entry["case_id"]
        m = json.loads((MANIFESTS / f"{cid}.json").read_text(encoding="utf-8"))
        t = json.loads((DERIVED / cid / "trace.json").read_text(encoding="utf-8"))
        if m["schema"] != MANIFEST_SCHEMA:
            fail.append(f"{cid}: manifest schema {m['schema']}")
        if t["schema"] != TRACE_SCHEMA:
            fail.append(f"{cid}: trace schema {t['schema']}")
        if m["case_id"] != t["caseId"]:
            fail.append(f"{cid}: manifest and trace disagree on the case id")
        if m["lane"] != entry["lane"]:
            fail.append(f"{cid}: index lane {entry['lane']} but manifest lane {m['lane']}")
        size = (DERIVED / cid / "trace.json").stat().st_size
        if size != m["artifact"]["bytes"]:
            fail.append(f"{cid}: trace is {size} bytes, manifest says {m['artifact']['bytes']}")
        if not m["controls"]["allPass"]:
            fail.append(f"{cid}: a control FAILED; a case that fails its controls must not ship")
        if not t["methods"]:
            fail.append(f"{cid}: no method produced a result")
        for meth in t["methods"]:
            if meth["npv"] > meth["bound"] * (1 + 1e-9) + 1e-6:
                fail.append(f"{cid}/{meth['method']}: feasible objective exceeds the certified bound")
            if len(meth["periods"]) != t["scenario"]["periods"]:
                fail.append(f"{cid}/{meth['method']}: period rows do not match the horizon")
        # the licence assertion: a non-redistributable instance never carries per-block data
        if not t["instance"]["synthetic"]:
            if "blocks" in t:
                fail.append(f"{cid}: a MineLib case must not commit per-block data")
            if any("periodOfBlock" in meth for meth in t["methods"]):
                fail.append(f"{cid}: a MineLib case must not commit a per-block schedule")

    if fail:
        for f in fail:
            print(f"::error::{f}", file=sys.stderr)
        return 1
    print(f"artifacts OK: {len(index['cases'])} cases, schemas and controls consistent")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
