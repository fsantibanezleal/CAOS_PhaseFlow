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



#: Rungs whose plans must satisfy the scenario's capacities. `beyond` is excluded BY NAME and its
#: overshoot is measured and printed rather than left undiscovered: `min-width` deliberately does not
#: re-impose capacity (it is an operability view of another plan) and `destination-toposort` solves
#: PCPSP over a richer feasible set. Both say so in their own notes. What went wrong before was not
#: that they exist, it was that nothing measured them and the ranking put them first.
CAPACITY_BOUND_RUNGS = ("classical", "sota", "learned")

#: The relative overshoot tolerated on a capacity-bound rung. Period rows are rounded floats, so an
#: exact comparison would fail on representation alone.
CAPACITY_TOL = 1e-6


def _capacity_check(cid: str, trace: dict, meth: dict) -> list[str]:
    """Every committed plan, against the capacity it was solved under.

    Nothing did this before. 23 method rows across 13 cases exceeded a period capacity, by up to
    447 percent, and every gate was green, because the gates read schemas, ids, byte sizes and the
    controls block and never once read `resourceUse` against `resourceLimit`.
    """
    out: list[str] = []
    worst = 0.0
    worst_where = ""
    for row in meth["periods"]:
        use = row.get("resourceUse") or []
        lim = row.get("resourceLimit") or []
        for r, (u, limit) in enumerate(zip(use, lim, strict=False)):
            if limit <= 0:
                continue
            over = (u - limit) / limit
            if over > worst:
                worst, worst_where = over, f"period {row['t']}, resource {r}"
    if meth["rung"] in CAPACITY_BOUND_RUNGS:
        if worst > CAPACITY_TOL:
            out.append(
                f"{cid}/{meth['method']}: INFEASIBLE, {100 * worst:.2f} percent over capacity at "
                f"{worst_where}. A {meth['rung']} rung is solved under that capacity"
            )
    elif worst > CAPACITY_TOL:
        # not a failure: a measured fact about a rung that says it does not re-impose capacity
        print(
            f"note: {cid}/{meth['method']} ({meth['rung']}) runs {100 * worst:.2f} percent over "
            f"capacity at {worst_where}, as its notes declare"
        )
    return out


def _shape_check(cid: str, trace: dict, meth: dict) -> list[str]:
    """Array lengths. A truncated per-block schedule index-shifts the entire 3D render silently."""
    out: list[str] = []
    n = trace["instance"]["nBlocks"]
    pob = meth.get("periodOfBlock")
    if pob is not None and len(pob) != n:
        out.append(f"{cid}/{meth['method']}: periodOfBlock has {len(pob)} entries for {n} blocks")
    blocks = trace.get("blocks")
    if blocks:
        for key, arr in blocks.items():
            if isinstance(arr, list) and len(arr) != n:
                out.append(f"{cid}: blocks.{key} has {len(arr)} entries for {n} blocks")
    return out


def _pin_check(manifest: dict) -> list[str]:
    """The pinned dependency versions must be the ones that produced the artifacts.

    They were not: `requirements.txt` pinned numpy 2.5.0 while all thirteen manifests recorded 2.5.1.
    A pin that differs from what baked is the difference between a reproducible artifact and one that
    merely looks reproducible, and nothing compared them.
    """
    import re

    out: list[str] = []
    engine = manifest.get("engine") or {}
    req = (ROOT / "requirements.txt").read_text(encoding="utf-8")
    for name in ("numpy", "oreblocks"):
        baked = engine.get(name)
        if not baked:
            continue
        m = re.search(rf"{name}(?:\[[^\]]*\])?==([\d.]+)", req)
        if not m:
            out.append(f"{name} is recorded in the manifest at {baked} and is not pinned")
        elif m.group(1) != baked:
            out.append(
                f"{name} is pinned at {m.group(1)} and the artifacts were baked with {baked}"
            )
    return out


def _lane_check(cid: str, trace: dict, manifest: dict) -> list[str]:
    """A live case must carry the data the live lane needs, or the lane label means nothing."""
    if manifest.get("lane") != "live":
        return []
    if not trace.get("blocks"):
        return [f"{cid}: lane is 'live' but the trace carries no per-block data to re-solve from"]
    return []


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
            fail.extend(_capacity_check(cid, t, meth))
            fail.extend(_shape_check(cid, t, meth))
        fail.extend(_lane_check(cid, t, m))
        fail.extend(_pin_check(m))
        # the BEST method a reader is pointed at must be one they could actually run
        best = m.get("best")
        if best and best.get("rung") == "beyond":
            fail.append(
                f"{cid}: the manifest's best method is {best['method']}, a BEYOND rung. Those are a "
                "different problem or an operability view and are not capacity-comparable"
            )
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
