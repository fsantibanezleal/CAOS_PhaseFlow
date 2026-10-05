#!/usr/bin/env python3
"""Write the measured tables of the docs/ wiki from the committed artifacts, or check they are current.

A method page that quotes its own results by hand goes stale on the next bake: the previous wiki
carried a local-search table, a controls paragraph and a failure study that all disagreed with the
artifacts they described. Every number of that kind now lives between two markers,

    <!-- generated:KIND -->            or    <!-- generated:KIND:ARG -->
    ...                                       ...
    <!-- /generated -->                       <!-- /generated -->

and this script rewrites the block from `data/derived/manifests/` and `models/`. With `--check` it
writes nothing and fails if any block differs from what the artifacts say, which is how CI keeps the
prose and the evidence in one state. It never runs the pipeline and never trains (ADR-0074).

Kinds: cases, ladder, methods:<m1,m2,...>, case:<id>, case-bounds:<id>, bounds, controls,
destinations, operability, ensemble, learned-ladder, learned-study:<archetype|size|rules|guard>.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import statistics
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DOCS = ROOT / "docs"
MANIFESTS = ROOT / "data" / "derived" / "manifests"
MODELS = ROOT / "models"

#: The order the argument is made in, and the order every case table follows.
FAMILY_ORDER = ("published", "declared", "deposit", "regime", "control")
DESTINATION = ("destination-toposort", "destination-sliding-window", "destination-local-search")
BLOCK = re.compile(r"(<!-- generated:([a-z-]+)(?::([^ ]+))? -->\n)(.*?)(<!-- /generated -->)", re.S)


# ------------------------------------------------------------------------------------------ loading
def load_manifests() -> list[dict]:
    ms = []
    for p in MANIFESTS.glob("*.json"):
        if p.name == "index.json":
            continue
        ms.append(json.loads(p.read_text(encoding="utf-8")))
    ms.sort(key=lambda m: (FAMILY_ORDER.index(m["category"]), m["instance"]["n_blocks"], m["case_id"]))
    return ms


def by_id(ms: list[dict]) -> dict[str, dict]:
    return {m["case_id"]: m for m in ms}


def rows_of(m: dict) -> dict[str, dict]:
    return {r["method"]: r for r in m["scoreboard"]}


# --------------------------------------------------------------------------------------- formatting
def money(v: float | None) -> str:
    return "-" if v is None else f"{round(v):,}"


def pct(v: float | None, nd: int = 2) -> str:
    return "-" if v is None else f"{v:.{nd}f}%"


def ratio(v: float | None, nd: int = 3) -> str:
    return "-" if v is None else f"{v:.{nd}f}"


def dur(ms: float | None) -> str:
    if ms is None:
        return "-"
    if ms < 1000:
        return f"{ms:.0f} ms"
    s = ms / 1000
    if s < 120:
        return f"{s:.1f} s"
    if s < 7200:
        return f"{s / 60:.1f} min"
    return f"{s / 3600:.2f} h"


def table(head: list[str], rows: list[list[str]], align: str | None = None) -> str:
    align = align or ("l" + "r" * (len(head) - 1))
    sep = ["---:" if a == "r" else "---" for a in align]
    out = ["| " + " | ".join(head) + " |", "| " + " | ".join(sep) + " |"]
    out += ["| " + " | ".join(r) + " |" for r in rows]
    return "\n".join(out) + "\n"


def used_bound(m: dict) -> str:
    b = m["bound_summary"]
    return "joint LP" if b.get("used") == "bienstock-zuckerberg" else "Algorithm 4"


def case_link(cid: str, from_dir: Path) -> str:
    target = DOCS / "use-cases" / use_case_file(cid)
    return f"[`{cid}`]({Path(os.path.relpath(target, from_dir)).as_posix()})"


_USE_CASE_FILES: dict[str, str] = {}


def use_case_file(cid: str) -> str:
    return _USE_CASE_FILES.get(cid, f"{cid}.md")


# ------------------------------------------------------------------------------------------ kinds
def k_cases(ms, _arg, here):
    rows = []
    for m in ms:
        s, i = m["scenario"], m["instance"]
        cf = s.get("capacity_fraction") or []
        rows.append([
            case_link(m["case_id"], here), m["category"], m["real_or_synthetic"], f"{i['n_blocks']:,}",
            f"{i['n_precedence_arcs']:,}", str(s["periods"]), f"{s['discount_rate']:.2f}",
            " / ".join(f"{f:.2f}" for f in cf) or "-", m["lane"],
        ])
    return table(["case", "family", "data", "blocks", "arcs", "periods", "rate",
                  "capacity fraction (mining / plant)", "lane"], rows, "lllrrrrrl")


def k_ladder(ms, _arg, _here):
    order: list[str] = []
    for m in ms:
        for r in m["scoreboard"]:
            if r["method"] not in order:
                order.append(r["method"])
    rows = []
    for meth in order:
        found = [(m, rows_of(m)[meth]) for m in ms if meth in rows_of(m)]
        gaps = [r["gap_pct"] for _, r in found if r.get("gap_pct") is not None]
        best = sum(1 for m, _ in found if m["best"]["method"] == meth)
        rt = [r["runtime_ms"] for _, r in found if r.get("runtime_ms") is not None]
        rung = found[0][1]["rung"]
        yard = "PCPSP LP" if meth in DESTINATION else "CPIT bound"
        rows.append([
            f"`{meth}`", rung, yard, f"{len(found)} / {len(ms)}",
            pct(statistics.median(gaps)) if gaps else "-", pct(min(gaps)) if gaps else "-",
            pct(max(gaps)) if gaps else "-", str(best) if meth not in DESTINATION else "n/a",
            dur(statistics.median(rt)) if rt else "-",
        ])
    return table(["method", "rung", "measured against", "cases run", "median gap", "best gap",
                  "worst gap", "best plan on", "median time"], rows, "lllrrrrrr")


def k_methods(ms, arg, here):
    meths = arg.split(",")
    head = ["case", "bound"] + [f"`{x}`" for x in meths] + ["best plan of the case"]
    rows = []
    cols: dict[str, list[float]] = {x: [] for x in meths}
    for m in ms:
        rs = rows_of(m)
        if not any(x in rs for x in meths):
            continue
        cells = []
        for x in meths:
            r = rs.get(x)
            if r is None:
                cells.append("not run")
                continue
            cells.append(pct(r["gap_pct"]))
            cols[x].append(r["gap_pct"])
        bound = "PCPSP LP" if all(x in DESTINATION for x in meths) else used_bound(m)
        best = m["best"]
        rows.append([case_link(m["case_id"], here), bound] + cells + [f"`{best['method']}` {pct(best['gap_pct'])}"])
    rows.append(["**median**", ""] + [f"**{pct(statistics.median(v))}**" if v else "-" for v in cols.values()] + [""])
    return table(head, rows, "ll" + "r" * len(meths) + "l")


def k_case(ms, arg, _here):
    m = by_id(ms)[arg]
    rows = []
    for r in m["scoreboard"]:
        yard = "PCPSP LP" if r["method"] in DESTINATION else used_bound(m)
        coh = "-" if r.get("components_mean") is None else f"{r['components_mean']:.1f} / {100 * r['largest_share_mean']:.0f}%"
        mark = " **(best)**" if m["best"]["method"] == r["method"] else ""
        rows.append([f"`{r['method']}`{mark}", r["rung"], money(r["npv"]), yard, pct(r["gap_pct"]),
                     dur(r.get("runtime_ms")), coh])
    for meth, why in (m["bound_summary"].get("skipped_methods") or {}).items():
        rows.append([f"`{meth}`", "-", "not run", "-", "-", "-", why])
    return table(["method", "rung", "NPV", "measured against", "gap", "time",
                  "components / largest share (mean per period)"], rows, "llrlrrl")


def k_case_bounds(ms, arg, _here):
    m = by_id(ms)[arg]
    b = m["bound_summary"]
    rows = [
        ["Algorithm 4 (min over single-resource LPs)", money(b.get("algorithm4")), dur(b.get("algorithm4_ms")),
         f"{b.get('closure_solves', '-')} maximum closures"],
    ]
    if b.get("joint") is not None:
        rows.append(["joint LP (Bienstock-Zuckerberg)", money(b["joint"]), dur(b.get("joint_ms")),
                     f"{b.get('joint_iterations')} iterations on {b.get('joint_nodes', 0):,} nodes, "
                     f"{b.get('joint_edges', 0):,} edges; slack of Algorithm 4: "
                     f"{pct(100 * (b['algorithm4'] - b['joint']) / b['algorithm4'], 4)}"])
    else:
        rows.append(["joint LP (Bienstock-Zuckerberg)", "not computed", "-", b.get("joint_skipped") or "-"])
    if b.get("pcpsp_lp") is not None:
        rows.append(["PCPSP LP (HiGHS, destinations free)", money(b["pcpsp_lp"]), dur(b.get("pcpsp_lp_ms")),
                     f"{b.get('pcpsp_lp_rows', 0):,} rows, status {b.get('pcpsp_lp_status')}"])
    rows.append(["used for every CPIT gap on this case", used_bound(m), "", ""])
    return table(["bound", "value", "time", "detail"], rows, "lrrl")


def k_bounds(ms, _arg, here):
    rows = []
    for m in ms:
        b = m["bound_summary"]
        j = b.get("joint")
        slack = "-" if j is None else pct(100 * (b["algorithm4"] - j) / b["algorithm4"], 4)
        rows.append([case_link(m["case_id"], here), money(b["algorithm4"]), dur(b.get("algorithm4_ms")),
                     money(j) if j is not None else "above budget", dur(b.get("joint_ms")), slack,
                     money(b.get("pcpsp_lp")), dur(b.get("pcpsp_lp_ms"))])
    return table(["case", "Algorithm 4", "time", "joint LP (BZ)", "time", "slack of Algorithm 4",
                  "PCPSP LP", "time"], rows)


def k_controls(ms, _arg, here):
    rows = []
    yes = lambda v: "pass" if v else "**FAIL**"  # noqa: E731
    for m in ms:
        c = m["controls"]
        rows.append([case_link(m["case_id"], here), yes(c["dualitySetMatches"]), f"{c['dualityBoundError']:.2e}",
                     yes(c["boundGeqFeasible"]), yes(c["orderInvariant"]), f"{c['orderInvarianceError']:.2e}",
                     pct(c.get("bestGapPct")), pct(c.get("worstGapPct"))])
    return table(["case", "duality (pit set)", "duality error", "bound >= plans", "order invariance",
                  "order error", "best comparable gap", "worst comparable gap"], rows)


def k_destinations(ms, _arg, here):
    rows = []
    for m in ms:
        rs = rows_of(m)
        if not any(x in rs for x in DESTINATION):
            continue
        best_cpit = max(r["npv"] for r in m["scoreboard"] if r["method"] not in DESTINATION)
        for x in DESTINATION:
            r = rs.get(x)
            if r is None:
                continue
            e = r.get("extra") or {}
            over = 100 * (r["npv"] - best_cpit) / abs(best_cpit)
            rows.append([case_link(m["case_id"], here), f"`{x}`", money(r["npv"]), pct(r["gap_pct"]),
                         f"{over:+.2f}%", f"{e.get('to_plant', '-'):,} / {e.get('to_dump', '-'):,}",
                         f"{e.get('cutoff_min', 0):.4g} to {e.get('cutoff_max', 0):.4g}"])
    return table(["case", "method", "NPV", "gap to PCPSP LP", "against best CPIT plan",
                  "blocks to plant / dump", "effective cutoff range (grade)"], rows, "llrrrrr")


def k_operability(ms, _arg, here):
    rows = []
    for m in ms:
        r = rows_of(m).get("min-width")
        if r is None:
            continue
        e = r.get("extra") or {}
        base = rows_of(m).get(e.get("base", ""), {})
        rows.append([case_link(m["case_id"], here), f"`{e.get('base', '-')}`",
                     f"{e.get('below_before', 0):,} to {e.get('below_after', 0):,}", f"{e.get('moved', 0):,}",
                     f"{e.get('refused_for_capacity', 0):,}", pct(e.get("npv_cost_pct"), 4),
                     "-" if base.get("components_mean") is None else f"{base['components_mean']:.1f}",
                     "-" if r.get("components_mean") is None else f"{r['components_mean']:.1f}"])
    return table(["case", "smoothed plan", "blocks below width 3", "moved", "refused by capacity",
                  "NPV cost", "components before", "after"], rows, "llrrrrrr")


def k_ensemble(ms, _arg, here):
    rows = []
    for m in ms:
        e = m.get("ensemble_summary") or {}
        if not e.get("ran"):
            rows.append([case_link(m["case_id"], here), "not run", "-", "-", "-", "-", e.get("reason") or "-"])
            continue
        i = e["methods"].index(e["bestByExpected"])
        rows.append([case_link(m["case_id"], here), str(e["nRealisations"]), f"`{e['bestByExpected']}`",
                     f"`{e['bestByP10']}`", money(e["optimism"][i]), pct(e.get("valueOfReplanningPct"), 3), ""])
    return table(["case", "realisations", "best by expected NPV", "best by P10",
                  "optimism of the single model (best plan)", "value of re-planning", "note"], rows, "lrllrrl")


def k_learned_ladder(ms, _arg, here):
    rows = []
    for m in ms:
        rs = rows_of(m)
        r = rs.get("learned-expected-time")
        ex = rs.get("toposort-expected")
        if r is None:
            why = (m["bound_summary"].get("skipped_methods") or {}).get("learned-expected-time", "-")
            rows.append([case_link(m["case_id"], here), "not run", "-", "-", why])
            continue
        rows.append([case_link(m["case_id"], here), pct(r["gap_pct"]), pct(ex["gap_pct"]) if ex else "-",
                     ratio(r.get("measured_vs_exact")), ""])
    return table(["case", "learned plan gap", "exact ExTS gap", "learned / exact ExTS", "note"], rows, "lrrrl")


def k_learned_study(_ms, arg, _here):
    study = json.loads((MODELS / "learned-failure-modes.json").read_text(encoding="utf-8"))
    line = study["failure_below"]
    if arg in ("archetype", "size"):
        key = "by_archetype" if arg == "archetype" else "by_size"
        rows = []
        for name in study["train"][key]:
            t, h = study["train"][key][name], study["holdout"][key].get(name, {})
            label = name if arg == "archetype" else f"{int(name):,} blocks"
            rows.append([label, f"{t['failures']} / {t['n']}", f"{h.get('failures', 0)} / {h.get('n', 0)}",
                         ratio(h.get("median")), ratio(h.get("p10")), ratio(h.get("min"))])
        rows.append(["**all**", f"**{study['train']['failures']} / {study['train']['n']}**",
                     f"**{study['holdout']['failures']} / {study['holdout']['n']}**", "", "", ""])
        return table([arg, f"training cases below {line:.2f}", f"held-out cases below {line:.2f}",
                      "held-out median", "held-out P10", "held-out minimum"], rows)
    if arg == "rules":
        rows = []
        for name, r in study["rules"].items():
            h = r["holdout"]
            mark = " **(shipped)**" if name == study["shipped_rule"] else ""
            rows.append([f"`{r['statement']}`{mark}", f"{h['flagged']} / {study['holdout']['n']}",
                         ratio(h["precision"], 2), ratio(h["recall"], 2), ratio(h["worst_unflagged"])])
        return table(["rule (read off the training deposits)", "held-out cases flagged", "precision", "recall",
                      "worst unflagged share"], rows, "lrrrr")
    if arg == "guard":
        g = json.loads((MODELS / "guard-validation.json").read_text(encoding="utf-8"))
        h = g["holdout_for_comparison"]
        rows = [
            ["cases", str(study["holdout"]["n"]), str(g["n"])],
            [f"failures (below {line:.2f})", str(study["holdout"]["failures"]), str(g["failures"])],
            ["flagged by the rule", str(study["rules"][study["shipped_rule"]]["holdout"]["flagged"]), str(g["flagged"])],
            ["precision", ratio(h["precision"], 3), ratio(g["precision"], 3)],
            ["recall", ratio(h["recall"], 3), ratio(g["recall"], 3)],
            ["worst unflagged share", ratio(h["worst_unflagged"]), ratio(g["worst_unflagged"])],
            ["median share", "-", ratio(g["median"])],
            ["P10 share", "-", ratio(g["p10"])],
        ]
        return table(["", "held out (chose the rule)", "third split (clean)"], rows, "lrr")
    raise SystemExit(f"learned-study: unknown argument {arg!r}")


KINDS = {
    "cases": k_cases, "ladder": k_ladder, "methods": k_methods, "case": k_case,
    "case-bounds": k_case_bounds, "bounds": k_bounds, "controls": k_controls,
    "destinations": k_destinations, "operability": k_operability, "ensemble": k_ensemble,
    "learned-ladder": k_learned_ladder, "learned-study": k_learned_study,
}


# --------------------------------------------------------------------------------------------- main
def render(text: str, ms: list[dict], here: Path) -> str:
    def sub(mo: re.Match) -> str:
        kind, arg = mo.group(2), mo.group(3)
        if kind not in KINDS:
            raise SystemExit(f"unknown generated block kind {kind!r}")
        return mo.group(1) + KINDS[kind](ms, arg, here) + mo.group(5)
    return BLOCK.sub(sub, text)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n", 1)[0])
    ap.add_argument("--check", action="store_true", help="fail if any generated block is stale; write nothing")
    ap.add_argument("--manifests", type=Path, default=None,
                    help="read another manifest folder (a sandbox bake) instead of the committed one")
    args = ap.parse_args()

    global MANIFESTS
    if args.manifests is not None:
        if args.check:
            raise SystemExit("--check always reads the committed manifests")
        MANIFESTS = args.manifests
    ms = load_manifests()
    for p in (DOCS / "use-cases").glob("*.md"):
        cid = p.stem.split("_", 1)[-1]
        _USE_CASE_FILES[cid] = p.name

    stale, written = [], 0
    for p in sorted(DOCS.rglob("*.md")):
        text = p.read_text(encoding="utf-8")
        if "<!-- generated:" not in text:
            continue
        new = render(text, ms, p.parent)
        if new != text:
            if args.check:
                stale.append(str(p.relative_to(ROOT)))
            else:
                p.write_text(new, encoding="utf-8", newline="\n")
                written += 1
    if args.check:
        if stale:
            for s in stale:
                print(f"::error::{s}: a generated table differs from the committed artifacts; run "
                      "python scripts/docs_tables.py")
            return 1
        print("docs tables OK: every generated table matches the committed artifacts")
        return 0
    print(f"docs tables: {written} file(s) rewritten from {len(ms)} manifests")
    return 0


if __name__ == "__main__":
    sys.exit(main())
