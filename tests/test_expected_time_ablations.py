from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from pipeline.model.features import BLOCK_FEATURES  # noqa: E402
from scripts.run_expected_time_ablations import cluster_summary, read_cache, segment_rows  # noqa: E402


def test_segment_rows_selects_whole_seed_groups_in_cache_order():
    meta = [
        {"seed": 101, "n_blocks": 2},
        {"seed": 103, "n_blocks": 3},
        {"seed": 101, "n_blocks": 1},
    ]

    assert segment_rows(meta, {101}).tolist() == [0, 1, 5]
    assert segment_rows(meta, {103}).tolist() == [2, 3, 4]


def test_read_cache_checks_feature_rows_and_frozen_seed_set(tmp_path):
    path = tmp_path / "cache.npz"
    metadata = [{"case": "a", "seed": 101, "n_blocks": 2}]
    np.savez(path, xb=np.zeros((2, len(BLOCK_FEATURES))), yb=np.zeros(2),
             meta=np.asarray(metadata, dtype=object))

    loaded = read_cache(path, {101})

    assert loaded["x"].shape == (2, len(BLOCK_FEATURES))
    assert loaded["meta"] == metadata
    assert len(loaded["sha256"]) == 64
    with pytest.raises(ValueError, match="seed set"):
        read_cache(path, {103})


def test_read_cache_rejects_a_row_count_that_does_not_match_case_metadata(tmp_path):
    path = tmp_path / "bad-cache.npz"
    metadata = [{"case": "a", "seed": 101, "n_blocks": 3}]
    np.savez(path, xb=np.zeros((2, len(BLOCK_FEATURES))), yb=np.zeros(2),
             meta=np.asarray(metadata, dtype=object))

    with pytest.raises(ValueError, match="do not reconcile"):
        read_cache(path, {101})


def test_cluster_summary_bootstraps_deposit_seeds_not_case_rows():
    ratios = np.asarray([0.8, 1.0, 0.6, 0.8])
    seeds = np.asarray([101, 101, 103, 103])

    result = cluster_summary(ratios, seeds)

    assert result["cases"] == 4
    assert result["deposit_seeds"] == 2
    assert result["deposit_seed_mean_ratios"] == pytest.approx({"101": 0.9, "103": 0.7})
    assert result["failure_count_below_0_90"] == 3
    lo, hi = result["deposit_seed_mean_cluster_bootstrap_95_percentile_interval"]
    assert (lo, hi) == pytest.approx((0.7, 0.9))
