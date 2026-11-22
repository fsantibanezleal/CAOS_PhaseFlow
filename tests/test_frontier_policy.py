"""Adversarial contract tests for the isolated frontier scheduler primitives."""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "data-pipeline"))

from pipeline.model.frontier_policy import (  # noqa: E402
    Assignment,
    FrontierInstance,
    feasible_frontier,
    precedence_frontier,
    replay_frontier_policy,
    validate_schedule,
)


def _instance() -> FrontierInstance:
    return FrontierInstance(
        values=np.array([10.0, 8.0, 20.0]),
        resources=np.array([[1.0], [1.0], [2.0]]),
        predecessors=((), (), (0,)),
        capacities=np.array([[2.0], [2.0]]),
        discount_rate=0.1,
    )


def test_frontier_masks_assigned_precedence_and_resource_infeasible_blocks():
    instance = _instance()
    assert feasible_frontier(instance, (), 0) == (0, 1)
    assert precedence_frontier(instance, (), 0) == (0, 1)
    assert feasible_frontier(instance, (Assignment(0, 0),), 0) == (1,)
    assert feasible_frontier(instance, (Assignment(0, 0), Assignment(1, 0)), 0) == ()
    assert feasible_frontier(instance, (Assignment(0, 0),), 1) == (1, 2)
    assert precedence_frontier(instance, (Assignment(0, 0),), 1) == (1, 2)


def test_independent_validator_rejects_duplicate_precedence_and_capacity_errors():
    instance = _instance()
    with pytest.raises(ValueError, match="only once"):
        validate_schedule(instance, (Assignment(0, 0), Assignment(0, 1)))
    with pytest.raises(ValueError, match="precedence"):
        validate_schedule(instance, (Assignment(2, 0),))
    with pytest.raises(ValueError, match="capacity"):
        validate_schedule(instance, (Assignment(0, 0), Assignment(1, 0), Assignment(2, 0)))


def test_replay_is_deterministic_and_returns_only_valid_assignments():
    instance = _instance()

    def score(block: int, _period: int, _history: tuple[Assignment, ...]) -> float:
        return 0.0 if block < 0 else instance.values[block]

    first = replay_frontier_policy(instance, score, tonnage=np.array([2.0, 3.0, 4.0]))
    second = replay_frontier_policy(instance, score, tonnage=np.array([2.0, 3.0, 4.0]))
    assert first == second
    assert first.assignments == (Assignment(0, 0), Assignment(1, 0), Assignment(2, 1))
    assert first.stopped == "horizon-complete"
    assert first.npv == pytest.approx(10 + 8 + 20 / 1.1)
    assert first.scheduled_tonnage == pytest.approx(9.0)
    assert first.tonnage_coverage == pytest.approx(1.0)
    assert first.positive_value_coverage == pytest.approx(1.0)
    assert validate_schedule(instance, first.assignments) == pytest.approx(first.npv)


def test_period_stop_and_nonfinite_scores_are_explicit():
    instance = _instance()
    stopped = replay_frontier_policy(
        instance,
        lambda block, _period, history: 100.0 if block == -2 and len(history) >= 2 else 1.0 if block >= 0 else 0.0,
    )
    assert stopped.stopped == "stop-schedule"
    assert len(stopped.assignments) == 2
    assert stopped.positive_value_coverage == pytest.approx(18 / 38)
    with pytest.raises(ValueError, match="finite"):
        replay_frontier_policy(instance, lambda *_: float("nan"))


def test_instance_rejects_bad_shapes_and_feature_contracts():
    with pytest.raises(ValueError, match="same blocks"):
        FrontierInstance(np.ones(2), np.ones((1, 1)), ((), ()), np.ones((1, 1)), 0.1)
    with pytest.raises(ValueError, match="finite"):
        FrontierInstance(np.array([np.nan]), np.ones((1, 1)), ((),), np.ones((1, 1)), 0.1)
