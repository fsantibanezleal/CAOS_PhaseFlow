"""Torch-free contracts and statistical summaries for frontier evaluation."""
from __future__ import annotations

import math
import re
from pathlib import Path

import numpy as np

RUN_NAME = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$")
BOOTSTRAP_REPLICATES = 10_000
BOOTSTRAP_SEED = 5519


def target_version(root: Path) -> str:
    amendment = root / "docs/design/features/learned-frontier/SDD-amendment-0.12.000.md"
    match = re.match(r"^# PhaseFlow SDD amendment (\d+\.\d{2}\.\d{3}):", amendment.read_text(encoding="utf-8"))
    if not match:
        raise ValueError("the approved frontier SDD amendment does not declare a release version")
    return match.group(1)


def seed_clustered_interval(
    cases: list[dict], *, metric: str = "normalized_npv", replicates: int = BOOTSTRAP_REPLICATES,
    seed: int = BOOTSTRAP_SEED,
) -> dict:
    """Bootstrap seed clusters, averaging repeated family rows within each seed."""
    if replicates < 1:
        raise ValueError("bootstrap replicate count must be positive")
    groups: dict[int, list[float]] = {}
    for row in cases:
        value = row.get(metric)
        cluster = row.get("seed")
        if (row.get("status") not in {"complete", "partial"} or isinstance(cluster, bool)
                or not isinstance(cluster, int) or isinstance(value, bool)
                or not isinstance(value, (int, float)) or not math.isfinite(value)):
            continue
        groups.setdefault(cluster, []).append(float(value))
    cluster_values = np.asarray([np.mean(values) for values in groups.values()], dtype=np.float64)
    if not len(cluster_values):
        return {
            "metric": metric, "unit": "seed-cluster", "clusters": 0,
            "replicates": replicates, "rng_seed": seed, "confidence_level": 0.95,
            "lower": None, "upper": None,
        }
    rng = np.random.default_rng(seed)
    sample = rng.integers(0, len(cluster_values), size=(replicates, len(cluster_values)))
    means = cluster_values[sample].mean(axis=1)
    lower, upper = np.quantile(means, [0.025, 0.975])
    return {
        "metric": metric, "unit": "seed-cluster", "clusters": int(len(cluster_values)),
        "replicates": replicates, "rng_seed": seed, "confidence_level": 0.95,
        "lower": float(lower), "upper": float(upper),
    }
