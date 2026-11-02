"""Train-only feature normalization for the frozen frontier graph generator."""
from __future__ import annotations

import hashlib
import json
from typing import Sequence

import numpy as np

from .frontier_data import FEATURE_NAMES, generate_graph
from .frontier_policy import FeatureNormalizer


def fit_training_normalizer(rows: Sequence[dict]) -> tuple[FeatureNormalizer, str]:
    """Generate only the declared training rows, fit named statistics and hash the exact feature bytes."""
    if not rows:
        raise ValueError("normalization requires at least one frozen training row")
    matrices: list[np.ndarray] = []
    digest = hashlib.sha256()
    seen_seeds: set[int] = set()
    for row in rows:
        if not isinstance(row, dict) or set(row) != {"seed", "family", "size", "generator_version"}:
            raise ValueError("training generator rows must match the frozen manifest schema")
        seed = row["seed"]
        if not isinstance(seed, int) or isinstance(seed, bool) or seed in seen_seeds:
            raise ValueError("training generator seeds must be unique integers")
        seen_seeds.add(seed)
        graph = generate_graph(seed, row["family"], row["size"])
        raw = np.ascontiguousarray(graph.node_features, dtype="<f4")
        digest.update(seed.to_bytes(8, "little", signed=False))
        digest.update(raw.tobytes())
        matrices.append(raw.astype(np.float64))
    train_values = np.concatenate(matrices, axis=0)
    normalizer = FeatureNormalizer.fit(
        train_values, FEATURE_NAMES, declared_features=FEATURE_NAMES, split="train",
    )
    return normalizer, digest.hexdigest()


def normalizer_contract(normalizer: FeatureNormalizer) -> dict:
    """Stable JSON-compatible fields persisted with the training receipt and in the checkpoint."""
    return {
        "schema_version": "1.0.0",
        "feature_names": list(normalizer.feature_names),
        "mean": [float(x) for x in normalizer.mean],
        "scale": [float(x) for x in normalizer.scale],
        "train_rows": normalizer.train_rows,
        "sha256": normalizer.sha256,
    }


def feature_contract_sha256(normalizer: FeatureNormalizer, training_data_sha256: str) -> str:
    if len(training_data_sha256) != 64:
        raise ValueError("training data digest must be a SHA-256 hex string")
    payload = {
        "normalizer": normalizer_contract(normalizer),
        "training_data_sha256": training_data_sha256,
    }
    canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()
