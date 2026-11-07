"""Adversarial checks for frontier-policy feasibility boundaries."""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import pytest

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "data-pipeline"))

from pipeline.model.frontier_policy import (  # noqa: E402
    Assignment,
    FeatureNormalizer,
    FrontierInstance,
    feasible_frontier,
    replay_frontier_policy,
    validate_split_manifest,
    validate_schedule,
)


def test_adversarial_mask_rejects_hidden_predecessor_and_resource_overrun():
    instance = FrontierInstance(
        values=np.array([1.0, 100.0]),
        resources=np.array([[1.0], [2.0]]),
        predecessors=((), (0,)),
        capacities=np.array([[1.0]]),
        discount_rate=0.0,
    )
    assert feasible_frontier(instance, (), 0) == (0,)
    assert feasible_frontier(instance, (Assignment(0, 0),), 0) == ()
    with pytest.raises(ValueError, match="capacity"):
        validate_schedule(instance, (Assignment(0, 0), Assignment(1, 0)))


def test_adversarial_validator_rejects_precedence_reversed_in_time():
    instance = FrontierInstance(
        np.array([1.0, 100.0]), np.ones((2, 1)), ((), (0,)), np.ones((2, 1)), 0.1
    )
    with pytest.raises(ValueError, match="precedence"):
        validate_schedule(instance, (Assignment(0, 1), Assignment(1, 0)))


def test_adversarial_independent_validator_rejects_duplicate_and_overcapacity_assignments():
    instance = FrontierInstance(
        np.array([4.0, 3.0]), np.array([[1.0], [1.0]]), ((), ()), np.array([[1.0]]), 0.0
    )
    with pytest.raises(ValueError, match="only once"):
        validate_schedule(instance, (Assignment(0, 0), Assignment(0, 0)))
    with pytest.raises(ValueError, match="capacity"):
        validate_schedule(instance, (Assignment(0, 0), Assignment(1, 0)))


def test_adversarial_deterministic_frontier_replay_preserves_schedule_and_objective():
    instance = FrontierInstance(
        np.array([7.0, 4.0, 8.0]), np.array([[1.0], [1.0], [1.0]]),
        ((), (0,), ()), np.array([[2.0], [2.0]]), 0.05,
    )
    def scorer(block, _period, _history):
        return -1e6 if block < 0 else instance.values[block]

    first = replay_frontier_policy(instance, scorer, tonnage=np.array([2.0, 1.0, 3.0]))
    second = replay_frontier_policy(instance, scorer, tonnage=np.array([2.0, 1.0, 3.0]))
    assert first == second
    assert validate_schedule(instance, first.assignments) == first.npv


def test_adversarial_instance_rejects_cyclic_precedence():
    with pytest.raises(ValueError, match="acyclic"):
        FrontierInstance(
            np.ones(2), np.ones((2, 1)), ((1,), (0,)), np.ones((1, 1)), 0.0
        )


def test_adversarial_policy_rejects_nonfinite_action_logits():
    instance = FrontierInstance(np.ones(1), np.ones((1, 1)), ((),), np.ones((1, 1)), 0.0)
    with pytest.raises(ValueError, match="finite"):
        replay_frontier_policy(instance, lambda *_: float("inf"))


def test_adversarial_feature_normalizer_rejects_test_fit_and_leakage_fields():
    values = np.array([[0.0, 2.0], [1.0, 4.0]])
    with pytest.raises(ValueError, match="train split"):
        FeatureNormalizer.fit(values, ("value", "depth"), declared_features=("value", "depth"), split="test")
    with pytest.raises(ValueError, match="identifier or outcome"):
        FeatureNormalizer.fit(values, ("value", "test_label"), declared_features=("value", "test_label"))


def test_adversarial_feature_normalizer_rejects_nonfinite_and_undeclared_constants():
    with pytest.raises(ValueError, match="finite"):
        FeatureNormalizer.fit(np.array([[1.0], [np.nan]]), ("value",), declared_features=("value",))
    with pytest.raises(ValueError, match="constant"):
        FeatureNormalizer.fit(np.ones((3, 1)), ("value",), declared_features=("value",))


def test_adversarial_split_manifest_rejects_seed_family_and_product_case_leakage():
    base = {
        "train": [{"seed": 1, "family": "layered"}],
        "validation": [{"seed": 2, "family": "vein"}],
        "test": [{"seed": 3, "family": "core_halo"}],
        "product_case_ids": ["newman1-published"],
    }
    assert validate_split_manifest(base) == {"train": 1, "validation": 1, "test": 1, "product_cases": 1}
    leaked_seed = {**base, "test": [{"seed": 1, "family": "core_halo"}]}
    with pytest.raises(ValueError, match="seeds overlap"):
        validate_split_manifest(leaked_seed)
    leaked_family = {**base, "test": [{"seed": 9, "family": "layered"}]}
    with pytest.raises(ValueError, match="families overlap"):
        validate_split_manifest(leaked_family)
    leaked_case = {**base, "test": [{"seed": 9, "family": "core_halo", "case_id": "newman1-published"}]}
    with pytest.raises(ValueError, match="product benchmark cases"):
        validate_split_manifest(leaked_case)
