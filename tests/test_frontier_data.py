"""Contract tests for deterministic, bounded synthetic frontier graph families."""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "data-pipeline"))

from pipeline.model.frontier_data import (  # noqa: E402
    FEATURE_NAMES,
    FAMILIES,
    GENERATOR_VERSION,
    generate_graph,
)
from pipeline.model.frontier_policy import validate_schedule  # noqa: E402
from pipeline.model.frontier_features import fit_training_normalizer, normalizer_contract  # noqa: E402
from pipeline.model.frontier_splits import build_split_manifest, manifest_sha256  # noqa: E402


@pytest.mark.parametrize("family", FAMILIES)
def test_frontier_generator_is_seeded_finite_and_contract_named(family: str):
    left = generate_graph(2031, family, 64)
    right = generate_graph(2031, family, 64)
    assert left.family_parameters.startswith(f"{GENERATOR_VERSION}:{family}:")
    assert left.node_features.shape == (64, len(FEATURE_NAMES))
    assert np.isfinite(left.node_features).all()
    assert np.array_equal(left.node_features, right.node_features)
    assert np.array_equal(left.instance.values, right.instance.values)
    assert len(left.instance.predecessors) == 64
    assert np.isfinite(validate_schedule(left.instance, ()))


def test_frontier_generator_supports_declared_scale_and_rejects_bad_inputs():
    graph = generate_graph(17, "benched", 4096, periods=12)
    assert graph.node_features.shape == (4096, len(FEATURE_NAMES))
    assert graph.instance.capacities.shape == (12, 2)
    with pytest.raises(ValueError, match="family"):
        generate_graph(17, "unknown", 64)
    with pytest.raises(ValueError, match="size"):
        generate_graph(17, "benched", 3)


def test_family_parameters_are_recorded_and_distinguish_generator_families():
    parameters = {generate_graph(1, family, 32).family_parameters for family in FAMILIES}
    assert len(parameters) == len(FAMILIES)


def test_frontier_training_normalizer_uses_only_named_train_rows_and_hashes_source_bytes():
    rows = [
        {"seed": 7101, "family": "benched", "size": 32, "generator_version": GENERATOR_VERSION},
        {"seed": 7102, "family": "branching", "size": 40, "generator_version": GENERATOR_VERSION},
    ]
    normalizer, source_hash = fit_training_normalizer(rows)
    receipt = normalizer_contract(normalizer)
    assert receipt["feature_names"] == list(FEATURE_NAMES)
    assert receipt["train_rows"] == 72
    assert len(source_hash) == 64
    assert len(receipt["sha256"]) == 64
    with pytest.raises(ValueError, match="schema"):
        fit_training_normalizer([{"seed": 7101, "family": "benched", "size": 32, "case_id": "heldout"}])
    with pytest.raises(ValueError, match="unique"):
        fit_training_normalizer([rows[0], rows[0]])


def test_frozen_split_ledger_has_disjoint_seeds_families_and_sealed_product_cases():
    manifest = build_split_manifest(["case-a", "case-b"])
    assert (len(manifest["train"]), len(manifest["validation"]), len(manifest["test"])) == (1000, 200, 500)
    assert manifest["size_contract"] == {
        "train": [32, 4096], "validation": [32, 4096], "test": [32, 8192],
    }
    assert manifest["family_contract"]["test"] == ["funnel"]
    assert len(manifest_sha256(manifest)) == 64
    assert manifest["product_case_ids"] == ["case-a", "case-b"]
