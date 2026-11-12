"""Adversarial checks for a fixed-policy re-planning value, not a per-scenario plan selector."""
from __future__ import annotations

import sys
from pathlib import Path
from types import SimpleNamespace

import numpy as np
import oreblocks as ob
import pytest

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "data-pipeline"))

from pipeline.io.schema import Case, DepositSpec, Scenario  # noqa: E402
from pipeline.model.instances import build_instance  # noqa: E402
from pipeline.stages import evaluate  # noqa: E402


class _Evaluation:
    """Two fixed policies cross by realisation; the fixed-policy baseline is still one policy."""

    def __init__(self, method_ids, optimum=None):
        self.method_ids = list(method_ids)
        self.matrix = np.array([[10.0, 11.0], [12.0, 8.0]])
        self.expected = np.array([10.5, 10.0])
        self.p10 = np.array([10.0, 8.0])
        self.p90 = np.array([11.0, 12.0])
        self.mean_model_npv = np.array([10.0, 9.0])
        self.deterministic_optimism = np.zeros(2)
        self.per_realisation_optimum = optimum

    @property
    def best_by_expected(self):
        return self.method_ids[0]

    @property
    def best_by_p10(self):
        return self.method_ids[0]

    @property
    def value_of_plan_selection(self):
        return float(self.matrix.max(axis=0).mean() - self.expected.max())

    @property
    def value_of_replanning(self):
        if self.per_realisation_optimum is None:
            return None
        return float(np.mean(self.per_realisation_optimum) - self.expected.max())


def _setup(monkeypatch, *, lose_incumbent=False):
    case = Case(
        id="tiny-replanning", category="deposit", title_en="Tiny", title_es="Pequeño",
        deposit=DepositSpec(kind="twin", archetype="porphyry", dims=(8, 8, 5), seed=3),
        scenario=Scenario(periods=4, discount_rate=0.1, capacity_fraction=(0.8, 0.5),
                          resource_names=("mining", "processing")),
    )
    instance = build_instance(case)
    plans = [
        SimpleNamespace(method="policy-a", rung="sota", period_of_block=np.zeros(instance.n_blocks, dtype=int)),
        SimpleNamespace(method="policy-b", rung="sota", period_of_block=np.ones(instance.n_blocks, dtype=int)),
    ]
    calls = []

    def fake_perturb_values(values, x, y, level, *, n, sigma, correlation_blocks=3.0, seed=11):
        return SimpleNamespace(n_realisations=2, values=np.stack([values, values]), note="synthetic test")

    def fake_evaluate_across(cpit, realisations, schedules, per_realisation_optimum=None):
        return _Evaluation(list(schedules), per_realisation_optimum)

    def fake_exact_local_search(cpit, prec, start, **kwargs):
        calls.append((start.method, start.period_of_block.copy(), start.npv, kwargs))
        return SimpleNamespace(npv=start.npv - 1 if lose_incumbent else start.npv)

    monkeypatch.setattr(ob, "perturb_values", fake_perturb_values)
    monkeypatch.setattr(ob, "evaluate_across", fake_evaluate_across)
    monkeypatch.setattr(ob, "exact_local_search", fake_exact_local_search)
    return instance, plans, calls


def test_adversarial_replan_starts_from_one_best_fixed_policy(monkeypatch):
    instance, plans, calls = _setup(monkeypatch)
    out = evaluate.run_ensemble(instance, plans, replan_rounds=0)

    assert out["fixedPolicy"] == "policy-a"
    assert out["resolveMethod"] == "cpitD-local-search"
    assert len(calls) == 2
    assert all(method == "cpitD-local-search-start:policy-a" for method, *_ in calls)
    assert all(np.array_equal(period, plans[0].period_of_block) for _, period, *_ in calls)
    assert [value for _, _, value, _ in calls] == [10.0, 11.0]


def test_adversarial_replan_cannot_lose_its_incumbent(monkeypatch):
    instance, plans, _ = _setup(monkeypatch, lose_incumbent=True)
    with pytest.raises(AssertionError, match="fell below its fixed-policy incumbent"):
        evaluate.run_ensemble(instance, plans, replan_rounds=0)


def test_adversarial_replanning_uses_the_fixed_policy_baseline(monkeypatch):
    instance, plans, _ = _setup(monkeypatch)
    out = evaluate.run_ensemble(instance, plans, replan_rounds=0)

    # The two fixed policies' winner changes by realisation, so picking the winner after observing
    # each value vector would be worth 1.0. A no-op re-plan from the single best fixed policy is 0.
    assert out["valueOfPlanSelection"] == 1.0
    assert out["valueOfReplanning"] == 0.0
    assert out["fixedPolicyExpectedNpv"] == 10.5
    assert out["replannedExpectedNpv"] == 10.5
    settings = out["replanningSettings"]
    assert settings == {
        "dMax": 180, "rounds": 0, "mipGap": 1e-5,
        "timeLimitSecondsPerNeighborhood": None, "nodeLimitPerNeighborhood": 2000, "seedBase": 62,
    }
    assert len(out["replanningReceipts"]) == 2
    assert all(not receipt["certifiedOptimal"] and receipt["neighborhoods"] == []
               for receipt in out["replanningReceipts"])


def test_adversarial_replanning_is_labelled_as_a_lower_bound(monkeypatch):
    instance, plans, _ = _setup(monkeypatch)
    out = evaluate.run_ensemble(instance, plans, replan_rounds=0)

    assert "lower bound on EVPI" in out["replanningNote"]
    assert "node-bounded C-PIT[D] neighborhood" in out["replanningNote"]
    assert "global two-stage optimum" in out["replanningNote"]
    assert out["resolveMethod"] != "gershon"
