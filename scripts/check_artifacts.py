#!/usr/bin/env python3
"""CONTRACT 2 drift guard: the committed manifests and traces must agree with each other.

Run in CI and by the deploy job. It never runs the pipeline and never rewrites evidence: it reads
what is committed and asserts the invariants a stale or hand-edited artifact would break.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DERIVED = ROOT / "data" / "derived"
MANIFESTS = DERIVED / "manifests"

TRACE_SCHEMA = "phaseflow.schedule-trace/v1"
MANIFEST_SCHEMA = "phaseflow.manifest/v1"
INDEX_SCHEMA = "phaseflow.index/v1"

#: Rungs ranked against each other on the CPIT bound. Every rung, these and the `beyond` ones, must be
#: capacity-feasible and below its OWN bound: until 0.08.000 `min-width` was exempt from both, and a
#: twin's smoothed plan reported an NPV above a certified upper bound with every gate green.
CAPACITY_BOUND_RUNGS = ("classical", "sota", "learned")

#: Rungs that choose destinations. Their yardstick is the PCPSP LP bound, never the CPIT one.
DESTINATION_METHODS = ("destination-toposort", "destination-local-search")

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
    # Every rung. A destination rung's rows carry its own PCPSP use and limits.
    if worst > CAPACITY_TOL:
        out.append(
            f"{cid}/{meth['method']}: INFEASIBLE, {100 * worst:.2f} percent over capacity at "
            f"{worst_where}. Every rung is solved under that capacity"
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
        if "processTonnage" not in blocks:
            out.append(f"{cid}: redistributable trace lacks fixed-destination processing coefficients")
        else:
            for b, (process, tonnes) in enumerate(zip(blocks["processTonnage"], blocks["tonnage"], strict=False)):
                if process < 0 or process > tonnes + 0.2:
                    out.append(f"{cid}: block {b} processing coefficient is outside [0, tonnage]")
                    break
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


def main(root: Path = DERIVED) -> int:
    root = root.resolve()
    manifests = root / "manifests"
    product_version = (ROOT / "VERSION").read_text(encoding="utf-8").strip()
    sys.path.insert(0, str(ROOT / "data-pipeline"))
    from pipeline import registry

    fail: list[str] = []
    index_path = manifests / "index.json"
    if not index_path.exists():
        print(f"missing {index_path}; run 'python data-pipeline/run.py' first", file=sys.stderr)
        return 1
    index = json.loads(index_path.read_text(encoding="utf-8"))
    if index["schema"] != INDEX_SCHEMA:
        fail.append(f"index schema {index['schema']}")

    on_disk = {p.name for p in root.iterdir() if p.is_dir() and p.name != "manifests"}
    declared = {c["case_id"] for c in index["cases"]}
    cases = {case.id: case for case in registry.list_cases()}
    if declared != set(cases):
        fail.append(f"index declares {sorted(declared)} but source defines {sorted(cases)}")
    if on_disk != declared:
        fail.append(f"index declares {sorted(declared)} but disk holds {sorted(on_disk)}")

    defaults = [c for c in index["cases"] if c.get("default")]
    if len(defaults) != 1:
        fail.append(f"exactly one case must be the default, found {len(defaults)}")

    for entry in index["cases"]:
        cid = entry["case_id"]
        m = json.loads((manifests / f"{cid}.json").read_text(encoding="utf-8"))
        t = json.loads((root / cid / "trace.json").read_text(encoding="utf-8"))
        if m.get("engine", {}).get("version") != product_version:
            fail.append(f"{cid}: artifact version differs from VERSION {product_version}")
        source = cases.get(cid)
        if source is not None:
            expected_title = {"en": source.title_en, "es": source.title_es}
            expected_role = {"en": source.role_en, "es": source.role_es}
            if entry.get("title") != expected_title or t.get("title") != expected_title:
                fail.append(f"{cid}: published title differs from the current case source")
            if t.get("role") != expected_role:
                fail.append(f"{cid}: published role differs from the current case source")
            if (
                entry.get("category") != source.category
                or m.get("category") != source.category
                or t.get("category") != source.category
                or entry.get("default") != source.default
                or m.get("default") != source.default
            ):
                fail.append(f"{cid}: category or default differs from the current case source")
        if m["schema"] != MANIFEST_SCHEMA:
            fail.append(f"{cid}: manifest schema {m['schema']}")
        if t["schema"] != TRACE_SCHEMA:
            fail.append(f"{cid}: trace schema {t['schema']}")
        if m["case_id"] != t["caseId"]:
            fail.append(f"{cid}: manifest and trace disagree on the case id")
        if m["lane"] != entry["lane"]:
            fail.append(f"{cid}: index lane {entry['lane']} but manifest lane {m['lane']}")
        size = (root / cid / "trace.json").stat().st_size
        if size != m["artifact"]["bytes"]:
            fail.append(f"{cid}: trace is {size} bytes, manifest says {m['artifact']['bytes']}")
        if not m["controls"]["allPass"]:
            fail.append(f"{cid}: a control FAILED; a case that fails its controls must not ship")
        if t.get("controls") != m.get("controls"):
            fail.append(f"{cid}: trace and manifest disagree on the controls")
        if not t["methods"]:
            fail.append(f"{cid}: no method produced a result")
        if t["instance"].get("gradeSource") is None:
            if any(row["rung"] == "learned" for row in t["methods"]):
                fail.append(f"{cid}: learned method used an absent source grade field")
            if any(row["method"] in DESTINATION_METHODS for row in t["methods"]):
                fail.append(f"{cid}: destination cutoff used an absent source grade field")
        bound_report = t["bound"]
        bound_options = {"algorithm4": bound_report["algorithm4"]}
        if bound_report.get("joint") is not None:
            bound_options["bienstock-zuckerberg"] = bound_report["joint"]
            if bound_report["joint"] > bound_report["algorithm4"] * (1 + 5e-6):
                fail.append(f"{cid}: joint LP bound exceeds Algorithm 4 beyond solver tolerance")
        used = bound_report.get("used")
        if used not in bound_options:
            fail.append(f"{cid}: bound.used is {used}, not an available certified bound")
            selected_bound = min(bound_options.values())
        else:
            selected_bound = bound_options[used]
            if selected_bound > min(bound_options.values()) * (1 + 1e-6):
                fail.append(f"{cid}: selected bound is looser than an available certified bound")
        pcpsp_lp = bound_report.get("pcpsp_lp")
        if pcpsp_lp is not None and used == "bienstock-zuckerberg" and pcpsp_lp < selected_bound * (1 - 1e-6):
            fail.append(f"{cid}: PCPSP LP bound {pcpsp_lp:.2f} is below the joint CPIT LP {selected_bound:.2f}; "
                        "the richer problem cannot have the smaller relaxation")
        for meth in t["methods"]:
            own = pcpsp_lp if meth["method"] in DESTINATION_METHODS else selected_bound
            if own is None:
                fail.append(f"{cid}/{meth['method']}: destination plan shipped without a PCPSP LP bound")
                continue
            if meth["npv"] > meth["bound"] * (1 + 1e-9) + 1e-6:
                fail.append(f"{cid}/{meth['method']}: feasible objective exceeds its bound")
            if abs(meth["bound"] - own) > 1e-6 * max(1.0, abs(own)):
                fail.append(f"{cid}/{meth['method']}: method bound differs from the bound of its problem")
            if len(meth["periods"]) != t["scenario"]["periods"]:
                fail.append(f"{cid}/{meth['method']}: period rows do not match the horizon")
            cash_total = sum(row["discCashFlow"] for row in meth["periods"])
            cash_tolerance = 0.01 * (len(meth["periods"]) + 1)
            if abs(cash_total - meth["npv"]) > cash_tolerance:
                fail.append(
                    f"{cid}/{meth['method']}: period cash flow {cash_total:.2f} "
                    f"does not add to method NPV {meth['npv']:.2f}"
                )
            if meth["periods"] and abs(meth["periods"][-1]["cumNpv"] - meth["npv"]) > 0.02:
                fail.append(f"{cid}/{meth['method']}: final cumulative NPV differs from method NPV")
            for row in meth["periods"]:
                if t["instance"].get("gradeSource") is None:
                    if row["headGrade"] != 0 or row["metal"] != 0:
                        fail.append(f"{cid}/{meth['method']}: inferred metal or grade without a source grade")
                elif abs(row["headGrade"] * row["oreTonnes"] - row["metal"]) > 2e-6 * row["oreTonnes"] + 0.2:
                    fail.append(f"{cid}/{meth['method']}: head grade and metal do not reconcile")
            fail.extend(_capacity_check(cid, t, meth))
            fail.extend(_shape_check(cid, t, meth))
        fail.extend(_lane_check(cid, t, m))
        fail.extend(_pin_check(m))
        # Every number used to summarise CPIT methods must come from CPIT-comparable
        # rows. A previous gap envelope used a PCPSP destination row as the worst
        # CPIT schedule, even while the best-method selection excluded it.
        comparable = [row for row in m["scoreboard"] if row["rung"] in CAPACITY_BOUND_RUNGS]
        if not comparable:
            fail.append(f"{cid}: no comparable CPIT method in the scoreboard")
        else:
            expected_best = max(comparable, key=lambda row: (row["npv"], row["method"]))
            expected_worst_gap = max(row["gap_pct"] for row in comparable)
            if abs(m["controls"]["worstGapPct"] - expected_worst_gap) > 1e-3:
                fail.append(
                    f"{cid}: worstGapPct includes an incomparable method or disagrees with "
                    f"the scoreboard ({m['controls']['worstGapPct']:.4f} vs {expected_worst_gap:.4f})"
                )
            if abs(m["controls"]["bestGapPct"] - expected_best["gap_pct"]) > 1e-3:
                fail.append(f"{cid}: bestGapPct disagrees with the best comparable method")
            if (m.get("best") or {}).get("method") != expected_best["method"]:
                fail.append(f"{cid}: best method is not the best comparable CPIT schedule")
        best = m.get("best")
        if cid == "newman1-published" and best:
            if m.get("published", {}).get("problem") != "PCPSP":
                fail.append(f"{cid}: the 2018 published comparator must identify PCPSP")
            # External AMPL Colaboratory/Gurobi exact CPIT result, with equal MIP
            # best bound and 1e-9 gap tolerance. This is an external oracle, not
            # a certificate generated here. See docs/cases/newman1-external-optimum.md.
            exact_external = 24_176_864.82482
            selected = next((row for row in m["scoreboard"] if row["method"] == best["method"]), None)
            if selected and selected["npv"] > exact_external + 0.01:
                fail.append(f"{cid}: a feasible schedule exceeds the external integer optimum")
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
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=DERIVED, help="artifact tree to validate")
    raise SystemExit(main(parser.parse_args().root))
