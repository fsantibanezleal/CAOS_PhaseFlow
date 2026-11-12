#!/usr/bin/env python3
"""Rebuild manuscript figures and numeric TeX tables from PhaseFlow artifacts.

Install ``manuscripts/requirements.txt`` once, then run from any directory with:
    python manuscripts/build_artifacts.py --root .

All reported values are loaded from the committed case traces, manifest index,
and learned-study reports. The script intentionally refuses incomplete or
schema-incompatible inputs instead of silently omitting cases.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import subprocess
import sys
from collections import Counter, defaultdict
from pathlib import Path
from statistics import median
from typing import Any

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
from matplotlib.ticker import PercentFormatter


STYLE = {
    "ink": "#20252b",
    "mid": "#65717d",
    "light": "#d9dee3",
    "dark": "#222222",
    "gray": "#777777",
    "pale": "#eeeeee",
}


def load(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def tex_escape(value: str) -> str:
    replacements = {
        "\\": r"\textbackslash{}",
        "&": r"\&",
        "%": r"\%",
        "$": r"\$",
        "#": r"\#",
        "_": r"\_",
        "{": r"\{",
        "}": r"\}",
    }
    return "".join(replacements.get(char, char) for char in value)


def file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def savefig(fig: plt.Figure, out: Path) -> None:
    fig.savefig(
        out,
        format="pdf",
        bbox_inches="tight",
        metadata={
            "Creator": "PhaseFlow manuscript artifact builder",
            "CreationDate": None,
            "ModDate": None,
        },
    )
    plt.close(fig)


def case_label(case_id: str) -> str:
    return case_id.replace("-", " ")


def build(root: Path) -> None:
    root = root.resolve()
    table_build = subprocess.run(
        [sys.executable, str(root / "scripts/build_frontier_manuscript_table.py"), "--root", str(root)],
        cwd=root,
        capture_output=True,
        text=True,
        check=False,
    )
    if table_build.returncode:
        raise SystemExit(f"Could not build the frontier result table:\n{table_build.stdout}\n{table_build.stderr}")
    contract_build = subprocess.run(
        [sys.executable, str(root / "manuscripts/build_contract_reference.py"), "--root", str(root)],
        cwd=root,
        capture_output=True,
        text=True,
        check=False,
    )
    if contract_build.returncode:
        raise SystemExit(f"Could not build the contract field tables:\n{contract_build.stdout}\n{contract_build.stderr}")
    index = load(root / "data/derived/manifests/index.json")
    case_rows = index.get("cases", [])
    expected_cases = int(index.get("n_cases", -1))
    if expected_cases != len(case_rows) or expected_cases != 13:
        raise SystemExit(f"Expected 13 indexed product cases; found declared={expected_cases}, actual={len(case_rows)}")

    traces: dict[str, dict[str, Any]] = {}
    for case in case_rows:
        case_id = case["case_id"]
        trace_path = root / "data/derived" / case_id / "trace.json"
        if not trace_path.is_file():
            raise SystemExit(f"Missing trace for registered case {case_id}: {trace_path}")
        trace = load(trace_path)
        if trace.get("caseId") != case_id or not isinstance(trace.get("methods"), list):
            raise SystemExit(f"Trace identity/schema mismatch: {trace_path}")
        traces[case_id] = trace

    method_names = sorted({m["method"] for t in traces.values() for m in t["methods"]})
    if len(method_names) < 10:
        raise SystemExit(f"Expected a broad schedule-method comparison; found only {len(method_names)} methods")

    report = load(root / "models/training-report.json")
    study = report["expected_time"]
    guard = load(root / "models/guard-validation.json")
    model = load(root / "models/expected-time.json")
    guard_design = (root / "docs/design/features/deposit-statistics-guard/proposal.md").read_text(encoding="utf-8")
    thresholds = {}
    for metric, token in (("precision", "precision"), ("recall", "recall"), ("worst_unflagged", "worst unflagged ratio")):
        marker = f"{token} `"
        start = guard_design.find(marker)
        if start < 0:
            raise SystemExit(f"Cannot find frozen guard threshold for {token}")
        start += len(marker)
        end = guard_design.find("`", start)
        thresholds[metric] = float(guard_design[start:end])
    if len(report["expected_time_per_case"]) != 432:
        raise SystemExit("Expected 432 deposit-disjoint learned-study holdout rows")
    if len(guard.get("rows", [])) != 432:
        raise SystemExit("Expected 432 independent third-split guard rows")
    # `layers` is the first member; four additional members are serialized in
    # `members`. This verifies the actual deployed ensemble, not the report text.
    if len(model.get("members", [])) + 1 != 5:
        raise SystemExit("Expected one base network plus four serialized members (five predictors total)")

    report_fig = root / "manuscripts/technical-report/figures"
    bs1_fig = root / "manuscripts/bs1-expected-time-policy/figures"
    generated = root / "manuscripts/_shared/generated"
    for folder in (report_fig, bs1_fig, generated):
        folder.mkdir(parents=True, exist_ok=True)

    # System view follows the executable package boundary: expensive solving
    # and training are offline; the shipped browser consumes replay artifacts.
    fig, ax = plt.subplots(figsize=(10.0, 4.4))
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 4.4)
    ax.axis("off")
    boxes = [
        (0.25, 2.55, 1.45, 0.85, "Source models\nand scenarios"),
        (2.15, 2.55, 1.45, 0.85, "Instance and\ncontract checks"),
        (4.05, 2.55, 1.5, 0.85, "Solve stage\n(method registry)"),
        (6.0, 2.55, 1.55, 0.85, "Evaluate and\nindependently check"),
        (8.0, 2.55, 1.7, 0.85, "Trace, manifest,\nreadiness"),
        (4.05, 0.65, 1.5, 0.85, "Training and\nmodel artifacts"),
        (8.0, 0.65, 1.7, 0.85, "Static web replay\nand browser solve"),
    ]
    for x0, y0, width, height, label in boxes:
        patch_box = matplotlib.patches.FancyBboxPatch(
            (x0, y0), width, height,
            boxstyle="round,pad=0.05,rounding_size=0.08",
            facecolor="white", edgecolor=STYLE["ink"], linewidth=1.0,
        )
        ax.add_patch(patch_box)
        ax.text(x0 + width / 2, y0 + height / 2, label, ha="center", va="center", fontsize=8, color=STYLE["ink"])
    arrow = {"arrowstyle": "-|>", "color": STYLE["gray"], "linewidth": 1.0, "shrinkA": 4, "shrinkB": 4}
    for start, end in [((1.7, 2.98), (2.15, 2.98)), ((3.6, 2.98), (4.05, 2.98)), ((5.55, 2.98), (6.0, 2.98)), ((7.55, 2.98), (8.0, 2.98)), ((5.55, 1.08), (8.0, 1.08))]:
        ax.annotate("", xy=end, xytext=start, arrowprops=arrow)
    ax.annotate("", xy=(4.8, 2.55), xytext=(4.8, 1.5), arrowprops=arrow)
    ax.annotate("", xy=(8.85, 1.5), xytext=(8.85, 2.55), arrowprops=arrow)
    ax.text(5.0, 3.85, "Offline deterministic pipeline", ha="center", fontsize=10, weight="bold", color=STYLE["ink"])
    ax.text(5.0, 0.25, "No training checkpoint is loaded by the deployed browser", ha="center", fontsize=8, color=STYLE["mid"])
    savefig(fig, report_fig / "system-architecture.pdf")

    # 1. The measured case inventory: design categories, not a fabricated sample.
    categories = Counter(c["category"] for c in case_rows)
    labels = sorted(categories)
    fig, ax = plt.subplots(figsize=(7.2, 3.6))
    bars = ax.bar(labels, [categories[x] for x in labels], color=[STYLE["dark"], STYLE["gray"], STYLE["mid"], STYLE["light"]][: len(labels)], edgecolor=STYLE["ink"], linewidth=0.7)
    ax.bar_label(bars, padding=3, fontsize=9)
    ax.set_ylabel("Registered cases")
    ax.set_xlabel("Declared case category")
    ax.set_ylim(0, max(categories.values()) + 1.5)
    ax.spines[["top", "right"]].set_visible(False)
    ax.grid(axis="y", color=STYLE["light"], linewidth=0.6)
    ax.set_axisbelow(True)
    fig.tight_layout()
    savefig(fig, report_fig / "case-inventory.pdf")

    # 2. Method availability across all registered traces.
    presence = np.array([[1 if any(m["method"] == name for m in traces[c["case_id"]]["methods"]) else 0 for c in case_rows] for name in method_names])
    fig, ax = plt.subplots(figsize=(10, max(4, 0.34 * len(method_names))))
    ax.imshow(presence, aspect="auto", interpolation="nearest", cmap=matplotlib.colors.ListedColormap(["white", STYLE["ink"]]), vmin=0, vmax=1)
    ax.set_xticks(range(len(case_rows)), [c["case_id"] for c in case_rows], rotation=60, ha="right", fontsize=7)
    ax.set_yticks(range(len(method_names)), method_names, fontsize=7)
    ax.set_xlabel("Registered case")
    ax.set_title("Availability of method results in the committed traces")
    ax.set_xticks(np.arange(-0.5, len(case_rows), 1), minor=True)
    ax.set_yticks(np.arange(-0.5, len(method_names), 1), minor=True)
    ax.grid(which="minor", color=STYLE["light"], linewidth=0.5)
    ax.tick_params(which="minor", bottom=False, left=False)
    fig.tight_layout()
    savefig(fig, report_fig / "method-case-coverage.pdf")

    # 3. Trace-reported relative gaps by method. Values remain attached to each
    # method's own certified bound and are not recomputed across formulations.
    gap_by_method: dict[str, list[float]] = defaultdict(list)
    for trace in traces.values():
        for method in trace["methods"]:
            gap = method.get("gapPct")
            if isinstance(gap, (int, float)) and math.isfinite(gap):
                gap_by_method[method["method"]].append(float(gap))
    ordered = [n for n in method_names if gap_by_method[n]]
    fig, ax = plt.subplots(figsize=(11, 5.6))
    ax.boxplot([gap_by_method[n] for n in ordered], tick_labels=ordered, showfliers=True, patch_artist=True,
               boxprops={"facecolor": "#e5e5e5", "edgecolor": STYLE["ink"]},
               medianprops={"color": STYLE["ink"], "linewidth": 1.2},
               whiskerprops={"color": STYLE["gray"]}, capprops={"color": STYLE["gray"]},
               flierprops={"marker": ".", "markersize": 3, "markerfacecolor": STYLE["gray"], "markeredgecolor": STYLE["gray"]})
    ax.set_ylabel("Trace-reported gap to method-specific bound (%)")
    ax.set_xlabel("Schedule method")
    ax.tick_params(axis="x", labelrotation=65, labelsize=7)
    ax.spines[["top", "right"]].set_visible(False)
    ax.grid(axis="y", color=STYLE["light"], linewidth=0.6)
    ax.set_axisbelow(True)
    fig.tight_layout()
    savefig(fig, report_fig / "method-gap-distribution.pdf")

    # 4. Runtime distributions from exactly the recorded cases. Log scale makes
    # the orders-of-magnitude spread visible without suppressing slow methods.
    runtime = {n: [float(m["runtimeMs"]) for t in traces.values() for m in t["methods"] if m["method"] == n and isinstance(m.get("runtimeMs"), (int, float)) and m["runtimeMs"] > 0] for n in method_names}
    ro = [n for n in method_names if runtime[n]]
    fig, ax = plt.subplots(figsize=(11, 5.5))
    ax.boxplot([runtime[n] for n in ro], tick_labels=ro, showfliers=True, patch_artist=True,
               boxprops={"facecolor": "#e5e5e5", "edgecolor": STYLE["ink"]},
               medianprops={"color": STYLE["ink"], "linewidth": 1.2},
               whiskerprops={"color": STYLE["gray"]}, capprops={"color": STYLE["gray"]})
    ax.set_yscale("log")
    ax.set_ylabel("Recorded runtime (ms, logarithmic scale)")
    ax.set_xlabel("Schedule method")
    ax.tick_params(axis="x", labelrotation=65, labelsize=7)
    ax.spines[["top", "right"]].set_visible(False)
    ax.grid(axis="y", which="both", color=STYLE["light"], linewidth=0.6)
    ax.set_axisbelow(True)
    fig.tight_layout()
    savefig(fig, report_fig / "method-runtime.pdf")

    # 5. Two independently computed upper-bound routes; include only traces that
    # record both valid values, and retain the sign of their difference.
    bound_rows = []
    for case in case_rows:
        b = traces[case["case_id"]].get("bound", {})
        a4, joint = b.get("algorithm4"), b.get("joint")
        if isinstance(a4, (int, float)) and isinstance(joint, (int, float)) and a4 > 0:
            bound_rows.append((case["case_id"], (joint - a4) / a4 * 1e6))
    fig, ax = plt.subplots(figsize=(8.5, 3.8))
    ax.bar([r[0] for r in bound_rows], [r[1] for r in bound_rows], color=STYLE["gray"], edgecolor=STYLE["ink"], linewidth=0.5)
    ax.axhline(0, color=STYLE["ink"], linewidth=0.8)
    ax.set_ylabel("(joint $-$ Algorithm 4) / Algorithm 4 (ppm)")
    ax.set_xlabel("Case with both bound receipts")
    ax.tick_params(axis="x", labelrotation=55, labelsize=7)
    ax.spines[["top", "right"]].set_visible(False)
    ax.grid(axis="y", color=STYLE["light"], linewidth=0.6)
    ax.set_axisbelow(True)
    fig.tight_layout()
    savefig(fig, report_fig / "bound-route-difference.pdf")

    # 6. Capacity use in the declared loose-capacity diagnostic.
    selected = traces["ctrl-abundant"]
    periods = selected["methods"][0]["periods"]
    limits = selected["scenario"]["resources"]
    x = [p["t"] for p in periods]
    fig, ax = plt.subplots(figsize=(7.4, 4.2))
    for idx, name in enumerate(("Mining", "Processing")):
        used = [p["resourceUse"][idx] for p in periods]
        cap = [p["resourceLimit"][idx] for p in periods]
        ratio = [u / c if c else 0 for u, c in zip(used, cap)]
        ax.plot(x, ratio, marker="o", linewidth=1.5, markersize=3.5, label=f"{name} utilization")
    ax.axhline(1, color=STYLE["dark"], linestyle="--", linewidth=0.8, label="Capacity limit")
    ax.set_xlabel("Period")
    ax.set_ylabel("Resource use / period capacity")
    ax.set_xticks(x)
    ax.set_ylim(0, 1.1)
    ax.legend(frameon=False, fontsize=8)
    ax.spines[["top", "right"]].set_visible(False)
    ax.grid(axis="y", color=STYLE["light"], linewidth=0.6)
    ax.set_axisbelow(True)
    fig.tight_layout()
    savefig(fig, report_fig / "capacity-profile.pdf")

    # 7. Deposit-disjoint learned holdout distribution by generator family.
    holdout_rows = report["expected_time_per_case"]
    archetypes = sorted({r["archetype"] for r in holdout_rows})
    grouped = [[r["vs_true"] for r in holdout_rows if r["archetype"] == a] for a in archetypes]
    fig, ax = plt.subplots(figsize=(7.6, 4.3))
    ax.boxplot(grouped, tick_labels=archetypes, showmeans=True, patch_artist=True,
               boxprops={"facecolor": "#e5e5e5", "edgecolor": STYLE["ink"]},
               medianprops={"color": STYLE["ink"], "linewidth": 1.2},
               meanprops={"marker": "D", "markerfacecolor": STYLE["gray"], "markeredgecolor": STYLE["dark"], "markersize": 4},
               whiskerprops={"color": STYLE["gray"]}, capprops={"color": STYLE["gray"]})
    ax.axhline(0.9, color=STYLE["dark"], linestyle="--", linewidth=0.8, label="Study diagnostic threshold (0.90)")
    ax.set_ylabel("Learned NPV / exact expected-time NPV")
    ax.set_xlabel("Deposit archetype; six held-out seeds per family")
    ax.legend(frameon=False, fontsize=8)
    ax.spines[["top", "right"]].set_visible(False)
    ax.grid(axis="y", color=STYLE["light"], linewidth=0.6)
    ax.set_axisbelow(True)
    fig.tight_layout()
    savefig(fig, report_fig / "learned-holdout-by-archetype.pdf")

    # 8. Real benchmark comparisons stay visible as two distinct observations.
    real = study["real_holdout"]
    rnames = list(real)
    ratios = [real[n]["learned_over_exact_exts"] for n in rnames]
    fig, ax = plt.subplots(figsize=(6.2, 3.8))
    bars = ax.bar(rnames, ratios, color=[STYLE["gray"], STYLE["light"]], edgecolor=STYLE["ink"], linewidth=0.7)
    ax.axhline(1, color=STYLE["dark"], linestyle="--", linewidth=0.8, label="Exact expected-time schedule")
    ax.set_ylabel("Learned schedule NPV / exact schedule NPV")
    ax.set_ylim(0, 1.15)
    ax.bar_label(bars, fmt="%.4f", padding=3, fontsize=8)
    ax.legend(frameon=False, fontsize=8)
    ax.spines[["top", "right"]].set_visible(False)
    ax.grid(axis="y", color=STYLE["light"], linewidth=0.6)
    ax.set_axisbelow(True)
    fig.tight_layout()
    savefig(fig, report_fig / "learned-real-holdout.pdf")

    # 9. The independent failure-warning validation is not presented as an
    # available safety control; the confusion matrix makes misses explicit.
    matrix = np.array([[guard["true_negative"], guard["false_positive"]], [guard["false_negative"], guard["true_positive"]]])
    fig, ax = plt.subplots(figsize=(5.2, 4.3))
    ax.imshow(matrix, cmap="Greys", vmin=0, vmax=max(matrix.flat))
    for (i, j), value in np.ndenumerate(matrix):
        ax.text(j, i, f"{value}", ha="center", va="center", fontsize=12, color="white" if value > matrix.max() * 0.56 else STYLE["ink"])
    ax.set_xticks([0, 1], ["Not flagged", "Flagged"])
    ax.set_yticks([0, 1], ["Not a failure", "NPV ratio < 0.90"])
    ax.set_xlabel("Rule output")
    ax.set_ylabel("Observed outcome")
    ax.set_title("Independent third-seed validation (432 cases)")
    fig.tight_layout()
    savefig(fig, report_fig / "guard-confusion-matrix.pdf")

    # 10. Show the warning-rule metrics against their stated acceptance bars.
    metrics = [("Precision", guard["precision"], thresholds["precision"]), ("Recall", guard["recall"], thresholds["recall"])]
    fig, ax = plt.subplots(figsize=(6.2, 3.7))
    pos = np.arange(len(metrics))
    ax.bar(pos - 0.18, [m[1] for m in metrics], width=0.36, color=STYLE["gray"], edgecolor=STYLE["ink"], label="Measured")
    ax.bar(pos + 0.18, [m[2] for m in metrics], width=0.36, color=STYLE["light"], edgecolor=STYLE["ink"], label="Required threshold")
    ax.set_xticks(pos, [m[0] for m in metrics])
    ax.set_ylabel("Fraction")
    ax.set_ylim(0, 1)
    ax.legend(frameon=False, fontsize=8)
    ax.spines[["top", "right"]].set_visible(False)
    ax.grid(axis="y", color=STYLE["light"], linewidth=0.6)
    ax.set_axisbelow(True)
    fig.tight_layout()
    savefig(fig, report_fig / "guard-thresholds.pdf")

    # 11. Threshold outcome by archetype; all values are recomputed from rows.
    grouped_failures = []
    for archetype in archetypes:
        rows = [r for r in holdout_rows if r["archetype"] == archetype]
        grouped_failures.append(sum(r["vs_true"] < 0.9 for r in rows) / len(rows))
    fig, ax = plt.subplots(figsize=(7.1, 3.8))
    bars = ax.bar(archetypes, grouped_failures, color=STYLE["gray"], edgecolor=STYLE["ink"], linewidth=0.7)
    ax.set_ylabel("Share of holdout cases below 0.90")
    ax.set_xlabel("Deposit archetype")
    ax.set_ylim(0, 1)
    ax.yaxis.set_major_formatter(PercentFormatter(xmax=1))
    ax.bar_label(bars, fmt="{:.1%}", padding=3, fontsize=8)
    ax.spines[["top", "right"]].set_visible(False)
    ax.grid(axis="y", color=STYLE["light"], linewidth=0.6)
    ax.set_axisbelow(True)
    fig.tight_layout()
    savefig(fig, report_fig / "learned-failure-rate.pdf")

    # 12. Per-case method count helps distinguish a missing result from a zero.
    counts = [len(traces[c["case_id"]]["methods"]) for c in case_rows]
    fig, ax = plt.subplots(figsize=(8.5, 3.5))
    bars = ax.bar([c["case_id"] for c in case_rows], counts, color=STYLE["mid"], edgecolor=STYLE["ink"], linewidth=0.5)
    ax.set_ylabel("Methods with a trace row")
    ax.set_xlabel("Registered case")
    ax.set_ylim(0, max(counts) + 1.5)
    ax.bar_label(bars, padding=2, fontsize=7)
    ax.tick_params(axis="x", labelrotation=55, labelsize=7)
    ax.spines[["top", "right"]].set_visible(False)
    ax.grid(axis="y", color=STYLE["light"], linewidth=0.6)
    ax.set_axisbelow(True)
    fig.tight_layout()
    savefig(fig, report_fig / "method-row-counts.pdf")

    # Reuse only directly relevant learned-study figures in the dedicated paper.
    for name in ("learned-holdout-by-archetype.pdf", "learned-real-holdout.pdf", "guard-confusion-matrix.pdf", "guard-thresholds.pdf", "learned-failure-rate.pdf", "method-runtime.pdf"):
        (bs1_fig / name).write_bytes((report_fig / name).read_bytes())

    # Artifact-generated result tables. Captions, labels and prose references
    # are maintained in the manuscript; numeric cells are always rebuilt here.
    rows = [
        r"\begin{longtable}{lrrrrrr}",
        r"\caption{Deposit-disjoint synthetic evaluation results for the learned ordering and its exact comparator, grouped by archetype and measured on the same generated cases.}\label{tab:learned-by-archetype}\\",
        r"\toprule Archetype & $n$ & Median ratio & Mean ratio & 10th percentile & Minimum & Below 0.90 \\ \midrule",
        r"\endfirsthead\toprule Archetype & $n$ & Median ratio & Mean ratio & 10th percentile & Minimum & Below 0.90 \\ \midrule\endhead",
    ]
    for a in archetypes:
        vals = [float(r["vs_true"]) for r in holdout_rows if r["archetype"] == a]
        rows.append(f"{tex_escape(a)} & {len(vals)} & {median(vals):.4f} & {np.mean(vals):.4f} & {np.quantile(vals, .1):.4f} & {min(vals):.4f} & {sum(v < .9 for v in vals)}/{len(vals)} " + r"\\")
    rows.extend([r"\bottomrule\end{longtable}"])
    (generated / "learned-by-archetype.tex").write_text("\n".join(rows) + "\n", encoding="utf-8")

    rows = [
        r"\begin{table}[htbp]\centering",
        r"\caption{The independently held-out warning rule is measured on 432 generated cases; the table preserves its false negatives and the thresholds it fails.}\label{tab:guard-validation}",
        r"\begin{tabular}{lrr}\toprule Measure & Measured & Required \\ \midrule",
        f"Precision & {guard['precision']:.4f} & $\\geq {thresholds['precision']:.3f}$ " + r"\\",
        f"Recall & {guard['recall']:.4f} & $\\geq {thresholds['recall']:.3f}$ " + r"\\",
        f"Worst unflagged ratio & {guard['worst_unflagged']:.4f} & $\\geq {thresholds['worst_unflagged']:.4f}$ " + r"\\",
        f"False negatives & {guard['false_negative']} & 0 for complete detection " + r"\\",
        f"False positives & {guard['false_positive']} & reported, not silently discounted " + r"\\",
        r"\bottomrule\end{tabular}\end{table}",
    ]
    (generated / "guard-validation.tex").write_text("\n".join(rows) + "\n", encoding="utf-8")

    rows = [
        r"\begin{table}[htbp]\centering",
        r"\caption{The two licensed benchmark cases remain separate observations because they do not support an estimate of cross-deposit generalization.}\label{tab:real-holdout}",
        r"\begin{tabular}{lrrr}\toprule Case & Learned / exact ExTS & Spearman in pit & Scored \\ \midrule",
    ]
    for name in rnames:
        item = real[name]
        rows.append(f"{tex_escape(name)} & {item['learned_over_exact_exts']:.4f} & {item['spearman_in_pit']:.4f} & {'yes' if item['scored'] else 'no'} " + r"\\")
    rows.extend([r"\bottomrule\end{tabular}\end{table}"])
    (generated / "real-holdout.tex").write_text("\n".join(rows) + "\n", encoding="utf-8")

    rows = [
        r"\begingroup\small\setlength{\tabcolsep}{3pt}",
        r"\begin{longtable}{>{\raggedright\arraybackslash}p{0.34\textwidth}rrrr}",
        r"\caption{Registered case traces report method-specific gaps and runtimes; absent rows are not imputed as zero.}\label{tab:method-result-summary}\\",
        r"\toprule Method & Cases & Median gap (\%) & Median ms & Maximum ms \\ \midrule\endfirsthead",
        r"\toprule Method & Cases & Median gap (\%) & Median ms & Maximum ms \\ \midrule\endhead",
    ]
    for name in method_names:
        gaps = gap_by_method.get(name, [])
        times = runtime.get(name, [])
        n_cases = sum(any(m["method"] == name for m in traces[c["case_id"]]["methods"]) for c in case_rows)
        rows.append(f"\\path{{{name}}} & {n_cases} & {median(gaps):.4f} & {median(times):.1f} & {max(times):.1f} " + r"\\")
    rows.extend([r"\bottomrule\end{longtable}\endgroup"])
    (generated / "method-summary.tex").write_text("\n".join(rows) + "\n", encoding="utf-8")

    input_paths = [root / "manuscripts/build_artifacts.py", root / "manuscripts/build_contract_reference.py", root / "scripts/build_frontier_manuscript_table.py", root / "notebooks/data/frontier-evaluation-summary.json", root / "docs/contracts/catalog.md", root / "docs/contracts/versions.lock.json", *sorted((root / "docs/contracts/schemas").glob("*.json")), *(root / "models" / name for name in ("training-report.json", "guard-validation.json", "expected-time.json", "learned-failure-modes.json", "surrogate-parity.json", "learned-preview-timing.json")), root / "data/derived/manifests/index.json", *(root / "data/derived" / c["case_id"] / "trace.json" for c in case_rows), root / "docs/design/features/deposit-statistics-guard/proposal.md"]
    output_paths = [*report_fig.glob("*.pdf"), *bs1_fig.glob("*.pdf"), *generated.glob("*.tex"), root / "manuscripts/state-conditioned-frontier-policy/generated_frontier_summary.tex"]
    receipt = {
        "schema": "phaseflow.manuscript-build-receipt/v1",
        "builder": "manuscripts/build_artifacts.py",
        "numpy_version": np.__version__,
        "matplotlib_version": matplotlib.__version__,
        "inputs": {path.relative_to(root).as_posix(): file_sha256(path) for path in sorted(input_paths)},
        "outputs": {path.relative_to(root).as_posix(): file_sha256(path) for path in sorted(output_paths)},
        "registered_cases": len(traces),
        "method_names": method_names,
        "learned_holdout_rows": len(holdout_rows),
        "guard_validation_rows": len(guard["rows"]),
        "predictors": len(model.get("members", [])) + 1,
    }
    (generated / "build-receipt.json").write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")

    print(f"Built {len(list(report_fig.glob('*.pdf')))} report figures and {len(list(bs1_fig.glob('*.pdf')))} expected-time-policy figures from {len(traces)} registered traces.")
    print(f"Generated {len(list(generated.glob('*.tex')))} artifact-derived TeX tables.")
    print(f"Verified learned study rows={len(holdout_rows)}, independent guard rows={len(guard['rows'])}, predictors={len(model.get('members', []))+1}.")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    args = parser.parse_args()
    build(args.root)


if __name__ == "__main__":
    main()
