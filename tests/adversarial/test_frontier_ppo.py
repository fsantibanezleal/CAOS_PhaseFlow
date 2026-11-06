"""Adversarial tests for the training-only graph policy and its transition semantics."""
from __future__ import annotations

import sys
import json
from pathlib import Path

import numpy as np
import pytest

torch = pytest.importorskip("torch")
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "data-pipeline"))
sys.path.insert(0, str(ROOT / "scripts"))

from pipeline.model.frontier_policy import FeatureNormalizer, FrontierInstance  # noqa: E402
from pipeline.model.frontier_data import FEATURE_NAMES, generate_graph  # noqa: E402
from pipeline.model.frontier_features import feature_contract_sha256, normalizer_contract  # noqa: E402
from pipeline.model.frontier_ppo import (  # noqa: E402
    FrontierPolicyEnv,
    MaskedGraphActorCritic,
    PPOConfig,
    compute_gae,
    load_checkpoint,
    ppo_loss,
    select_ensemble_action,
    replay_frontier_ensemble,
    train_member,
)
from pipeline.model import frontier_ppo  # noqa: E402
from train_frontier_policy import _validate_member  # noqa: E402


def _instance() -> FrontierInstance:
    return FrontierInstance(
        values=np.array([10.0, 8.0, 20.0]),
        resources=np.array([[1.0], [1.0], [2.0]]),
        predecessors=((), (), (0,)),
        capacities=np.array([[2.0], [2.0]]),
        discount_rate=0.1,
    )


def _training_contract() -> dict:
    names = ("grade", "value")
    normalizer = FeatureNormalizer.fit(
        np.array([[0.0, 2.0], [1.0, 4.0], [2.0, 8.0]]), names, declared_features=names,
    )
    data_hash = "c" * 64
    return {
        "generator_version": "fixture/1.0.0",
        "feature_names": list(names),
        "feature_contract_sha256": feature_contract_sha256(normalizer, data_hash),
        "training_split_sha256": "b" * 64,
        "training_data_sha256": data_hash,
        "normalization": normalizer_contract(normalizer),
    }


def test_adversarial_graph_logits_mask_ineligible_actions_and_keep_stops_available():
    env = FrontierPolicyEnv(_instance(), np.array([[0.0, 1.0], [1.0, 0.0], [0.5, 0.5]]))
    observation = env.observation()
    model = MaskedGraphActorCritic(node_feature_count=2, state_feature_count=4)
    logits, value = model(observation)
    assert logits.shape == (5,)
    assert torch.isneginf(logits[2])
    assert torch.isfinite(logits[[0, 1, 3, 4]]).all()
    assert torch.isfinite(value)


def test_adversarial_generated_two_resource_state_uses_every_dynamic_feature():
    graph = generate_graph(41, "crosscut", 32)
    env = FrontierPolicyEnv(graph.instance, graph.node_features)
    assert env.state_feature_count == 5
    observation = env.observation()
    model = MaskedGraphActorCritic(len(graph.node_features[0]), env.state_feature_count)
    logits, value = model(observation)
    assert logits.shape == (34,)
    assert torch.isfinite(logits[observation.admissible]).all()
    assert torch.isfinite(value)


def test_adversarial_static_graph_embeddings_are_reusable_across_dynamic_states():
    env = FrontierPolicyEnv(_instance(), np.ones((3, 2)))
    first = env.observation()
    model = MaskedGraphActorCritic(node_feature_count=2, state_feature_count=4)
    embedding = model.encode_graph(first)
    _, fresh_value = model(first)
    _, cached_value = model(first, graph_embedding=embedding)
    assert torch.equal(fresh_value, cached_value)
    _, _, _, _ = env.step(0)
    second = env.observation()
    logits, _ = model(second, graph_embedding=embedding)
    assert torch.isneginf(logits[0])


def test_adversarial_environment_rejects_a_block_outside_the_mask():
    env = FrontierPolicyEnv(_instance(), np.ones((3, 2)))
    with pytest.raises(ValueError, match="outside the current feasible action mask"):
        env.step(2)


def test_adversarial_environment_preserves_discounted_return_and_stop_reason():
    env = FrontierPolicyEnv(_instance(), np.ones((3, 2)))
    _, reward0, done, _ = env.step(0)
    assert reward0 == pytest.approx(10 / 38)
    assert not done
    _, reward1, done, _ = env.step(1)
    assert reward1 == pytest.approx(8 / 38)
    assert not done
    observation = env.observation()
    assert observation.admissible[-2]
    _, _, done, _ = env.step(3)  # stop-period
    assert not done
    _, reward2, done, _ = env.step(2)
    assert reward2 == pytest.approx(20 / 1.1 / 38)
    assert not done
    _, _, done, info = env.step(3)
    assert done and info["horizon_end"]
    result = env.result(tonnage=np.array([2.0, 3.0, 4.0]))
    assert result.npv == pytest.approx(10 + 8 + 20 / 1.1)
    assert result.tonnage_coverage == pytest.approx(1.0)
    assert result.stopped == "horizon-complete"

    partial = FrontierPolicyEnv(_instance(), np.ones((3, 2)))
    _, _, done, _ = partial.step(4)  # stop-schedule
    assert done
    partial_result = partial.result(tonnage=np.array([2.0, 3.0, 4.0]))
    assert partial_result.stopped == "stop-schedule"
    assert partial_result.positive_value_coverage == 0


def test_adversarial_partial_schedule_reports_tonnage_value_coverage_and_stop_reason():
    env = FrontierPolicyEnv(_instance(), np.ones((3, 2)))
    _, _, done, _ = env.step(0)
    assert not done
    _, _, done, _ = env.step(4)
    assert done
    result = env.result(tonnage=np.array([2.0, 3.0, 4.0]))
    assert result.stopped == "stop-schedule"
    assert result.scheduled_tonnage == pytest.approx(2.0)
    assert result.tonnage_coverage == pytest.approx(2 / 9)
    assert result.scheduled_positive_value == pytest.approx(10.0)
    assert result.positive_value_coverage == pytest.approx(10 / 38)


def test_adversarial_deterministic_argmax_uses_lowest_eligible_block_on_ties():
    env = FrontierPolicyEnv(_instance(), np.ones((3, 2)))
    observation = env.observation()
    model = MaskedGraphActorCritic(node_feature_count=2, state_feature_count=4)
    with torch.no_grad():
        for parameter in model.parameters():
            parameter.zero_()
    action, _, _ = model.select_action(observation, deterministic=True)
    assert action == 0


def test_actor_scores_only_the_current_feasible_frontier():
    env = FrontierPolicyEnv(_instance(), np.ones((3, 2)))
    observation = env.observation()
    model = MaskedGraphActorCritic(node_feature_count=2, state_feature_count=4)
    scored_rows = []
    handle = model.actor.register_forward_pre_hook(lambda _module, values: scored_rows.append(values[0].shape[0]))
    try:
        model(observation, apply_mask=False)
    finally:
        handle.remove()
    assert tuple(torch.nonzero(observation.admissible[:3], as_tuple=False).flatten().tolist()) == (0, 1)
    assert scored_rows == [2]


def test_ensemble_averages_unmasked_logits_then_applies_common_action_mask():
    env = FrontierPolicyEnv(_instance(), np.ones((3, 2)))
    observation = env.observation()
    first = MaskedGraphActorCritic(node_feature_count=2, state_feature_count=4)
    second = MaskedGraphActorCritic(node_feature_count=2, state_feature_count=4)
    with torch.no_grad():
        for model in (first, second):
            for parameter in model.parameters():
                parameter.zero_()
        # Give the ineligible block an overwhelming score in both raw member outputs.
        first.actor[-1].bias.fill_(0.0)
        second.actor[-1].bias.fill_(0.0)
    action, logits = select_ensemble_action((first, second), observation)
    assert action == 0
    assert torch.isneginf(logits[2])
    assert torch.isfinite(logits[observation.admissible]).all()
    with pytest.raises(ValueError, match="at least one"):
        select_ensemble_action((), observation)


def test_frozen_frontier_replay_is_deterministic_and_independently_validated():
    torch.manual_seed(5519)
    graph = generate_graph(2901, "crosscut", 48)
    normalizer = FeatureNormalizer.fit(
        np.vstack((graph.node_features, graph.node_features[::-1] + 0.01)),
        FEATURE_NAMES,
        declared_features=FEATURE_NAMES,
    )
    model = MaskedGraphActorCritic(len(FEATURE_NAMES), 5)
    model.set_feature_normalizer(normalizer.mean, normalizer.scale)
    first = replay_frontier_ensemble(graph.instance, graph.node_features, [model], tonnage=graph.tonnage)
    second = replay_frontier_ensemble(graph.instance, graph.node_features, [model], tonnage=graph.tonnage)
    assert first == second
    assert first.tonnage_coverage >= 0.0 and first.positive_value_coverage >= 0.0


def test_adversarial_gae_respects_terminal_masks_and_ppo_loss_is_differentiable():
    advantages, returns = compute_gae([1.0, 2.0], [0.5, 0.5], [False, True])
    assert advantages == pytest.approx([2.425, 1.5])
    assert returns == pytest.approx([2.925, 2.0])
    new = torch.tensor([-0.1, -0.2], requires_grad=True)
    old = torch.tensor([-0.2, -0.2])
    loss, details = ppo_loss(
        new, old, torch.tensor([1.0, -1.0]), torch.tensor([0.8, 0.4], requires_grad=True),
        torch.tensor([1.0, 0.0]), torch.tensor([0.5, 0.5]), PPOConfig(),
    )
    loss.backward()
    assert torch.isfinite(loss)
    assert new.grad is not None and torch.isfinite(new.grad).all()
    assert set(details) == {"policy", "value", "entropy", "total"}


def test_training_emits_capped_run_receipt_and_checkpoint_round_trips(tmp_path: Path, monkeypatch):
    monkeypatch.setattr(frontier_ppo.importlib.metadata, "version", lambda _name: "0.6.6")
    model_root = tmp_path / "device-models"
    model = MaskedGraphActorCritic(node_feature_count=2, state_feature_count=4)
    run = train_member(
        model,
        lambda: FrontierPolicyEnv(_instance(), np.ones((3, 2))),
        lambda _model, _budget_check: {"mean_normalized_npv": 0.25, "all_feasible": True},
        seed=1103,
        model_root=model_root,
        approved_model_root=tmp_path,
        repository_root=ROOT,
        max_transitions=1,
        max_cpu_seconds=60,
        max_wall_seconds=60,
        validation_interval=1,
        training_contract=_training_contract(),
    )
    receipt_path = model_root / "seed-1103" / "receipt.json"
    receipt = json.loads(receipt_path.read_text(encoding="utf-8"))
    assert run.transitions == 1
    assert run.stop_reason == "transition-cap"
    assert receipt["runtime"]["device"] == "cpu"
    assert receipt["training_contract"]["training_split_sha256"] == "b" * 64
    loaded = load_checkpoint(run.selected_checkpoint, expected_sha256=run.selected_checkpoint_sha256)
    obs = FrontierPolicyEnv(_instance(), np.ones((3, 2))).observation()
    with torch.no_grad():
        expected_logits, _ = model(obs)
        loaded_logits, _ = loaded(obs)
    assert torch.equal(loaded_logits, expected_logits)
    assert torch.equal(loaded.feature_mean, model.feature_mean)
    assert torch.equal(loaded.feature_scale, model.feature_scale)
    with pytest.raises(ValueError, match="SHA-256"):
        load_checkpoint(run.selected_checkpoint, expected_sha256="0" * 64)


def test_budget_expiry_during_validation_does_not_select_partial_checkpoint(tmp_path: Path, monkeypatch):
    monkeypatch.setattr(frontier_ppo.importlib.metadata, "version", lambda _name: "0.6.6")
    run = train_member(
        MaskedGraphActorCritic(node_feature_count=2, state_feature_count=4),
        lambda: FrontierPolicyEnv(_instance(), np.ones((3, 2))),
        lambda _model, _budget_check: None,
        seed=2207,
        model_root=tmp_path / "device-models",
        approved_model_root=tmp_path,
        repository_root=ROOT,
        max_transitions=1,
        max_cpu_seconds=60,
        max_wall_seconds=60,
        validation_interval=1,
        training_contract=_training_contract(),
    )
    assert run.stop_reason == "validation-interrupted"
    assert run.validation_history == ()


def test_member_stops_early_to_reserve_budget_for_checkpoint_finalization(tmp_path: Path, monkeypatch):
    monkeypatch.setattr(frontier_ppo.importlib.metadata, "version", lambda _name: "0.6.6")
    elapsed = {"cpu": 0.0, "wall": 0.0}
    monkeypatch.setattr(frontier_ppo.time, "process_time", lambda: elapsed["cpu"])
    monkeypatch.setattr(frontier_ppo.time, "monotonic", lambda: elapsed["wall"])

    def expire_rollout(*_args, budget_check, **_kwargs):
        elapsed["cpu"] = 58.0  # 60s cap minus the 3s small-budget reserve
        assert not budget_check()
        return []

    monkeypatch.setattr(frontier_ppo, "collect_rollout", expire_rollout)
    run = train_member(
        MaskedGraphActorCritic(node_feature_count=2, state_feature_count=4),
        lambda: FrontierPolicyEnv(_instance(), np.ones((3, 2))),
        lambda _model, _budget_check: None,
        seed=3301,
        model_root=tmp_path / "device-models",
        approved_model_root=tmp_path,
        repository_root=ROOT,
        max_transitions=100,
        max_cpu_seconds=60,
        max_wall_seconds=120,
        validation_interval=1,
        training_contract=_training_contract(),
    )
    receipt = json.loads((tmp_path / "device-models" / "seed-3301" / "receipt.json").read_text())
    assert run.stop_reason == "cpu-cap"
    assert run.cpu_seconds == 58.0
    assert receipt["budget"] == {
        "cpu_cap_seconds": 60,
        "wall_cap_seconds": 120,
        "cpu_finalization_reserve_seconds": 3,
        "wall_finalization_reserve_seconds": 6,
        "cpu_training_deadline_seconds": 57,
        "wall_training_deadline_seconds": 114,
    }


def test_validation_member_returns_no_partial_report_when_budget_is_expired():
    model = MaskedGraphActorCritic(node_feature_count=2, state_feature_count=4)
    assert model.training
    report = _validate_member(
        model, [{"seed": 1, "family": "crosscut", "size": 32}], lambda: False,
    )
    assert report is None
    assert model.training


def test_adversarial_training_rejects_repository_checkpoint_root(tmp_path: Path):
    with pytest.raises(ValueError, match="outside the repo"):
        train_member(
            MaskedGraphActorCritic(node_feature_count=2, state_feature_count=4),
            lambda: FrontierPolicyEnv(_instance(), np.ones((3, 2))),
            lambda _model, _budget_check: {"mean_normalized_npv": 0.0, "all_feasible": True},
            seed=7,
            model_root=ROOT / "models" / "must-not-be-created",
            approved_model_root=ROOT,
            repository_root=ROOT,
            training_contract=_training_contract(),
        )
