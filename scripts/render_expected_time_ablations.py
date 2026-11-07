#!/usr/bin/env python3
"""Render the compact LaTeX table from a validated external ablation record."""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import statistics
from pathlib import Path
from typing import Any

EXPECTED_SEEDS = {211, 223, 227, 229, 233, 239}
EXPECTED_CANDIDATES = (
    "full_ensemble",
    "single_member_1",
    "single_member_2",
    "single_member_3",
    "single_member_4",
    "single_member_5",
    "drop_predecessor_recurrence",
    "drop_depth_grade_radial",
    "half_deposit_seeds",
)
DISPLAY = {
    "full_ensemble": "Five-member ensemble",
    "single_member_1": "Member 1",
    "single_member_2": "Member 2",
    "single_member_3": "Member 3",
    "single_member_4": "Member 4",
    "single_member_5": "Member 5",
    "drop_predecessor_recurrence": "Remove recurrence features",
    "drop_depth_grade_radial": "Remove depth, grade, and radial features",
    "half_deposit_seeds": "Half of training deposits",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def validate_record(record: dict[str, Any]) -> None:
    if record.get("schema") != "phaseflow.expected-time-ablations/v1":
        raise ValueError("unexpected ablation record schema")
    rows = record.get("paired_case_ratios")
    if not isinstance(rows, dict) or len(rows) != 432:
        raise ValueError("ablation record must contain all 432 frozen holdout cases")
    if {int(row["seed"]) for row in rows.values()} != EXPECTED_SEEDS:
        raise ValueError("ablation record deposit seeds differ from the frozen holdout")
    if set(record.get("results", {})) < set(EXPECTED_CANDIDATES):
        raise ValueError("ablation record is missing one or more candidate summaries")
    if set(record.get("candidate_model_sha256", {})) != set(EXPECTED_CANDIDATES):
        raise ValueError("ablation record is missing candidate-model hashes")
    if len(record.get("cache_sha256", {})) != 2 or len(record.get("source_sha256", {})) != 2:
        raise ValueError("ablation record lacks cache or source hashes")
    for row in rows.values():
        if not set(EXPECTED_CANDIDATES) <= set(row.get("ratios", {})):
            raise ValueError("an ablation case is missing candidate ratios")
        if any(not math.isfinite(float(row["ratios"][name])) for name in EXPECTED_CANDIDATES):
            raise ValueError("ablation record contains a non-finite candidate ratio")
        if row.get("failure"):
            raise ValueError("ablation record contains a failed held-out case")
    for name in EXPECTED_CANDIDATES:
        case_values = [float(row["ratios"][name]) for row in rows.values()]
        ordered = sorted(case_values)
        seed_values = {
            str(seed): [float(row["ratios"][name]) for row in rows.values() if int(row["seed"]) == seed]
            for seed in sorted(EXPECTED_SEEDS)
        }
        summary = record["results"][name]
        expected = {
            "mean": statistics.fmean(case_values),
            "median": statistics.median(case_values),
            "p10": _quantile(ordered, 0.10),
            "minimum": min(case_values),
            "failure_count_below_0_90": sum(value < 0.90 for value in case_values),
            "failure_fraction_below_0_90": sum(value < 0.90 for value in case_values) / len(case_values),
        }
        for key, value in expected.items():
            if isinstance(value, int):
                if summary.get(key) != value:
                    raise ValueError(f"{name} summary field {key} does not reconcile with case values")
            elif not math.isclose(float(summary.get(key, math.nan)), value, rel_tol=1e-9, abs_tol=1e-9):
                raise ValueError(f"{name} summary field {key} does not reconcile with case values")
        recorded_seed_means = summary.get("deposit_seed_mean_ratios", {})
        if set(recorded_seed_means) != set(seed_values):
            raise ValueError(f"{name} seed means do not match the frozen holdout set")
        for seed, values in seed_values.items():
            if not math.isclose(float(recorded_seed_means[seed]), statistics.fmean(values),
                                rel_tol=1e-9, abs_tol=1e-9):
                raise ValueError(f"{name} seed {seed} mean does not reconcile with case values")
        interval = summary.get("deposit_seed_mean_cluster_bootstrap_95_percentile_interval", [])
        if len(interval) != 2 or not all(math.isfinite(float(value)) for value in interval) or interval[0] > interval[1]:
            raise ValueError(f"{name} has an invalid deposit-seed bootstrap interval")


def _quantile(sorted_values: list[float], probability: float) -> float:
    position = (len(sorted_values) - 1) * probability
    lower = math.floor(position)
    upper = math.ceil(position)
    fraction = position - lower
    return sorted_values[lower] * (1 - fraction) + sorted_values[upper] * fraction


def render(record: dict[str, Any], record_hash: str) -> str:
    validate_record(record)
    summaries = record["results"]
    lines = [
        "% Generated from the hash-bound external expected-time ablation record.",
        f"% record_sha256={record_hash}",
        f"% train_cache_sha256={record['cache_sha256']['train']}",
        f"% holdout_cache_sha256={record['cache_sha256']['holdout']}",
        r"\begin{table}[!htbp]",
        r"\centering",
        r"\footnotesize",
        r"\setlength{\tabcolsep}{3pt}",
        r"\caption{Paired schedule-value ablations on all 432 deposit-disjoint cases, with deposit-seed cluster bootstrap intervals and training-set variants.}",
        r"\label{tab:expected-time-ablations}",
        r"\begin{tabular}{lrrrrl}",
        r"\toprule",
        r"Candidate & Mean [95\% interval] & Median & 10th percentile & Minimum & Below 0.90 \\",
        r"\midrule",
    ]
    for name in EXPECTED_CANDIDATES:
        stats = summaries[name]
        low, high = stats["deposit_seed_mean_cluster_bootstrap_95_percentile_interval"]
        count = int(stats["failure_count_below_0_90"])
        fraction = f"{float(stats['failure_fraction_below_0_90']):.1%}".replace("%", r"\%")
        lines.append(
            f"{DISPLAY[name]} & {stats['mean']:.3f} [{low:.3f}, {high:.3f}] & "
            f"{stats['median']:.3f} & {stats['p10']:.3f} & {stats['minimum']:.3f} & "
            f"{count}/432 ({fraction}) \\\\")
    lines.extend([
        r"\bottomrule",
        r"\end{tabular}",
        r"\end{table}",
        "% Intervals resample the six deposit-seed means, not the 432 scenario-grid cases.",
        "",
    ])
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--record", required=True, type=Path, help="external JSON ablation record")
    parser.add_argument("--output", required=True, type=Path, help="generated LaTeX fragment")
    args = parser.parse_args()
    record = json.loads(args.record.read_text(encoding="utf-8"))
    content = render(record, sha256(args.record))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(content, encoding="utf-8")
    print(f"wrote {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
