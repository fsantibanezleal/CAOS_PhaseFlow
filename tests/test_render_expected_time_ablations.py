from __future__ import annotations

import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from scripts.render_expected_time_ablations import EXPECTED_CANDIDATES, render, validate_record  # noqa: E402


def make_record() -> dict:
    names = EXPECTED_CANDIDATES
    rows = {
        f"case-{seed}-{case}": {
            "seed": seed,
            "ratios": {name: -0.151 if name == "drop_depth_grade_radial" else 0.94 for name in names},
        }
        for seed in (211, 223, 227, 229, 233, 239)
        for case in range(72)
    }
    summaries = {}
    for name in names:
        value = -0.151 if name == "drop_depth_grade_radial" else 0.94
        summaries[name] = {
            "mean": value,
            "median": value,
            "p10": value,
            "minimum": value,
            "failure_count_below_0_90": 432 if value < 0.90 else 0,
            "failure_fraction_below_0_90": 1.0 if value < 0.90 else 0.0,
            "deposit_seed_mean_ratios": {str(seed): value for seed in (211, 223, 227, 229, 233, 239)},
            "deposit_seed_mean_cluster_bootstrap_95_percentile_interval": [value, value],
        }
    return {
        "schema": "phaseflow.expected-time-ablations/v1",
        "paired_case_ratios": rows,
        "results": summaries,
        "candidate_model_sha256": {name: "a" * 64 for name in names},
        "cache_sha256": {"train": "b" * 64, "holdout": "c" * 64},
        "source_sha256": {"ablation_runner": "d" * 64, "training_program": "e" * 64},
    }


def test_render_table_preserves_cluster_interval_and_negative_case_values():
    output = render(make_record(), "f" * 64)

    assert "0.940 [0.940, 0.940]" in output
    assert "-0.151" in output
    assert r"432/432 (100.0\%)" in output
    assert "record_sha256=" + "f" * 64 in output
    assert r"\begin{table}[!htbp]" in output
    assert r"\footnotesize" in output
    assert r"\setlength{\tabcolsep}{3pt}" in output


def test_validate_record_rejects_missing_holdout_case():
    record = make_record()
    record["paired_case_ratios"].pop("case-211-0")

    with pytest.raises(ValueError, match="432 frozen holdout cases"):
        validate_record(record)


def test_validate_record_rejects_a_failed_case_instead_of_omitting_it():
    record = make_record()
    record["paired_case_ratios"]["case-211-0"]["failure"] = "infeasible"

    with pytest.raises(ValueError, match="failed held-out case"):
        validate_record(record)
