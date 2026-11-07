"""Masked graph actor-critic and PPO mechanics for offline frontier-policy research.

PyTorch is a training-only dependency. The static web lane consumes validated schedule
traces and never imports this module. CPU-only deterministic replay is the supported path.
"""
from __future__ import annotations

from dataclasses import dataclass
import hashlib
import importlib.metadata
import json
import os
from pathlib import Path
import time
from typing import Callable
from typing import Sequence

import numpy as np
import torch
from torch import nn
from torch.distributions import Categorical

from .frontier_policy import Assignment, FrontierInstance, ScheduleResult, feasible_frontier, validate_schedule

INFERENCE_CAP_SECONDS = 900.0
CPU_FINALIZATION_RESERVE_SECONDS = 30.0
WALL_FINALIZATION_RESERVE_SECONDS = 60.0


def _finalization_reserve(cap_seconds: float, maximum_reserve: float) -> float:
    """Reserve 5% of small test budgets, capped at the production finalization allowance."""
    return min(maximum_reserve, cap_seconds * 0.05)


def configure_determinism(seed: int) -> None:
    """Freeze the CPU random streams and deterministic kernels for one training member."""
    if not isinstance(seed, int) or isinstance(seed, bool) or seed < 0:
        raise ValueError("training seed must be a non-negative integer")
    torch.manual_seed(seed)
    np.random.seed(seed)
    torch.set_num_threads(1)
    torch.use_deterministic_algorithms(True)
    if torch.cuda.is_available():
        raise RuntimeError("frontier PPO is pinned to CPU; CUDA changes the declared compute protocol")


@dataclass(frozen=True)
class FrontierObservation:
    """One policy state; graph tensors are shared across an episode, dynamic state is not."""

    node_features: torch.Tensor
    edge_index: torch.Tensor
    state_features: torch.Tensor
    admissible: torch.Tensor

    @property
    def num_blocks(self) -> int:
        return int(self.node_features.shape[0])


class FrontierPolicyEnv:
    """One finite-horizon discounted block-scheduling episode with three action types."""

    def __init__(self, instance: FrontierInstance, node_features: np.ndarray):
        self.instance = instance
        features = np.asarray(node_features, dtype=np.float32)
        if features.ndim != 2 or features.shape[0] != len(instance.values) or features.shape[1] == 0:
            raise ValueError("node features must be a non-empty feature matrix with one row per block")
        if not np.isfinite(features).all():
            raise ValueError("node features must be finite")
        edges = [(pred, block) for block, preds in enumerate(instance.predecessors) for pred in preds]
        edge_array = np.asarray(edges, dtype=np.int64).reshape(-1, 2)
        self.node_features = torch.from_numpy(features.copy())
        self.edge_index = torch.from_numpy(edge_array.T.copy()) if len(edges) else torch.empty((2, 0), dtype=torch.long)
        self.assignments: list[Assignment] = []
        self.period = 0
        self.terminated = False
        self.stop_reason = "horizon-complete"
        self._value_scale = max(float(np.abs(instance.values).sum()), 1e-12)

    @property
    def action_count(self) -> int:
        return len(self.instance.values) + 2

    @property
    def state_feature_count(self) -> int:
        return 1 + self.instance.resources.shape[1] + 2

    def observation(self) -> FrontierObservation:
        if self.terminated:
            raise RuntimeError("a terminated schedule has no next policy observation")
        frontier = feasible_frontier(self.instance, self.assignments, self.period)
        mask = torch.zeros(len(self.instance.values) + 2, dtype=torch.bool)
        if frontier:
            mask[list(frontier)] = True
        mask[-2:] = True  # stop-period and stop-schedule are always explicit choices
        used = np.zeros(self.instance.resources.shape[1], dtype=np.float64)
        for assignment in self.assignments:
            if assignment.period == self.period:
                used += self.instance.resources[assignment.block]
        limits = self.instance.capacities[self.period]
        residual = np.divide(limits - used, limits, out=np.zeros_like(limits), where=limits > 0)
        scheduled_value = validate_schedule(self.instance, self.assignments) / self._value_scale
        dynamic = np.concatenate((
            np.array([self.period / max(1, self.instance.capacities.shape[0] - 1)], dtype=np.float64),
            np.clip(residual, 0.0, 1.0),
            np.array([scheduled_value, len(frontier) / max(1, len(self.instance.values))], dtype=np.float64),
        )).astype(np.float32)
        return FrontierObservation(
            self.node_features, self.edge_index, torch.from_numpy(dynamic), mask
        )

    def step(self, action: int) -> tuple[FrontierObservation | None, float, bool, dict]:
        """Apply one masked action; invalid actions fail instead of being repaired."""
        if self.terminated:
            raise RuntimeError("cannot step a terminated schedule")
        if not isinstance(action, int) or isinstance(action, bool) or not 0 <= action < self.action_count:
            raise ValueError("action index is outside the declared block/stop action space")
        before = self.observation()
        if not bool(before.admissible[action]):
            raise ValueError("policy selected an action outside the current feasible action mask")
        n = len(self.instance.values)
        if action < n:
            self.assignments.append(Assignment(action, self.period))
            exponent = self.period if self.instance.period_one_undiscounted else self.period + 1
            reward = float(self.instance.values[action] / (1 + self.instance.discount_rate) ** exponent / self._value_scale)
            info = {"kind": "assign", "block": action, "period": self.period}
        elif action == n:
            info = {"kind": "stop-period", "period": self.period}
            if self.period + 1 >= self.instance.capacities.shape[0]:
                self.terminated = True
                reward = 0.0
                info["horizon_end"] = True
            else:
                self.period += 1
                reward = 0.0
        else:
            self.terminated = True
            self.stop_reason = "stop-schedule"
            reward = 0.0
            info = {"kind": "stop-schedule", "period": self.period}
        next_observation = None if self.terminated else self.observation()
        return next_observation, reward, self.terminated, info

    def result(self, tonnage: np.ndarray | None = None) -> ScheduleResult:
        """Validate the final policy schedule before returning product metrics."""
        if not self.terminated:
            raise RuntimeError("cannot finalize an incomplete policy episode")
        return validate_policy_result(self.instance, self.assignments, tonnage=tonnage, stopped=self.stop_reason)


def validate_policy_result(
    instance: FrontierInstance, assignments: Sequence[Assignment], *, tonnage: np.ndarray | None = None,
    stopped: str = "horizon-complete",
) -> ScheduleResult:
    """Use the independent validator and calculate coverage without changing the schedule."""
    npv = validate_schedule(instance, assignments)
    tonnes = np.asarray(tonnage if tonnage is not None else np.zeros(len(instance.values)), dtype=np.float64)
    if tonnes.shape != instance.values.shape or not np.isfinite(tonnes).all() or np.any(tonnes < 0):
        raise ValueError("tonnage must be a finite non-negative value per block")
    selected = [row.block for row in assignments]
    positive_values = np.maximum(instance.values, 0.0)
    scheduled_tonnes = float(tonnes[selected].sum()) if selected else 0.0
    scheduled_positive = float(positive_values[selected].sum()) if selected else 0.0
    total_tonnes = float(tonnes.sum())
    total_positive = float(positive_values.sum())
    if stopped not in {"stop-schedule", "horizon-complete"}:
        raise ValueError("stop reason must identify an explicit schedule stop or horizon completion")
    return ScheduleResult(
        tuple(assignments), stopped, npv, scheduled_tonnes, scheduled_positive,
        scheduled_tonnes / total_tonnes if total_tonnes > 0 else 0.0,
        scheduled_positive / total_positive if total_positive > 0 else 0.0,
    )


class MaskedGraphActorCritic(nn.Module):
    """Two message-passing layers, a shared block actor, two stop logits and a pooled critic."""

    def __init__(self, node_feature_count: int, state_feature_count: int, hidden: int = 64):
        super().__init__()
        if node_feature_count < 1 or state_feature_count < 1 or hidden != 64:
            raise ValueError("feature widths must be positive and the reviewed hidden width is fixed at 64")
        self.node_feature_count = node_feature_count
        self.state_feature_count = state_feature_count
        self.hidden = hidden
        self.node_input = nn.Linear(node_feature_count, hidden)
        self.register_buffer("feature_mean", torch.zeros(node_feature_count, dtype=torch.float32))
        self.register_buffer("feature_scale", torch.ones(node_feature_count, dtype=torch.float32))
        self.message_layers = nn.ModuleList(nn.Linear(hidden * 3, hidden) for _ in range(2))
        self.actor = nn.Sequential(nn.Linear(hidden + state_feature_count, hidden), nn.Tanh(), nn.Linear(hidden, 1))
        self.stop_actor = nn.Sequential(nn.Linear(state_feature_count, hidden), nn.Tanh(), nn.Linear(hidden, 2))
        self.critic = nn.Sequential(nn.Linear(hidden + state_feature_count, hidden), nn.Tanh(), nn.Linear(hidden, 1))

    def set_feature_normalizer(self, mean: Sequence[float], scale: Sequence[float]) -> None:
        """Install train-only statistics as checkpointed buffers used by every inference path."""
        mu = torch.as_tensor(mean, dtype=self.feature_mean.dtype, device="cpu")
        sigma = torch.as_tensor(scale, dtype=self.feature_scale.dtype, device="cpu")
        if mu.shape != self.feature_mean.shape or sigma.shape != self.feature_scale.shape:
            raise ValueError("feature normalization width differs from the declared node-feature contract")
        if not torch.isfinite(mu).all() or not torch.isfinite(sigma).all() or torch.any(sigma <= 0):
            raise ValueError("feature normalization must be finite with strictly positive scales")
        self.feature_mean.copy_(mu)
        self.feature_scale.copy_(sigma)

    @staticmethod
    def _mean_messages(h: torch.Tensor, edge_index: torch.Tensor) -> tuple[torch.Tensor, torch.Tensor]:
        n = h.shape[0]
        incoming = torch.zeros_like(h)
        outgoing = torch.zeros_like(h)
        in_count = torch.zeros((n, 1), dtype=h.dtype, device=h.device)
        out_count = torch.zeros((n, 1), dtype=h.dtype, device=h.device)
        if edge_index.numel():
            src, dst = edge_index[0], edge_index[1]
            incoming.index_add_(0, dst, h[src])
            outgoing.index_add_(0, src, h[dst])
            ones = torch.ones((len(src), 1), dtype=h.dtype, device=h.device)
            in_count.index_add_(0, dst, ones)
            out_count.index_add_(0, src, ones)
        return incoming / in_count.clamp_min(1.0), outgoing / out_count.clamp_min(1.0)

    def encode_graph(self, observation: FrontierObservation) -> torch.Tensor:
        """Compute static node embeddings once for an episode while model weights are fixed."""
        x = observation.node_features
        edge_index = observation.edge_index
        if x.ndim != 2 or x.shape[1] != self.node_feature_count or not torch.isfinite(x).all():
            raise ValueError("node input does not match the finite feature contract")
        if edge_index.ndim != 2 or edge_index.shape[0] != 2 or edge_index.dtype != torch.long:
            raise ValueError("edge index must be a long tensor with shape (2, edges)")
        if observation.admissible.shape != (x.shape[0] + 2,) or not bool(observation.admissible.any()):
            raise ValueError("action mask must include at least one valid block or stop action")
        standardized = (x - self.feature_mean) / self.feature_scale
        h = torch.tanh(self.node_input(standardized))
        for layer in self.message_layers:
            incoming, outgoing = self._mean_messages(h, edge_index)
            h = torch.tanh(layer(torch.cat((h, incoming, outgoing), dim=1)))
        return h

    def forward(
        self, observation: FrontierObservation, *, apply_mask: bool = True,
        graph_embedding: torch.Tensor | None = None,
    ) -> tuple[torch.Tensor, torch.Tensor]:
        state = observation.state_features
        if state.ndim != 1 or state.shape[0] != self.state_feature_count or not torch.isfinite(state).all():
            raise ValueError("dynamic state does not match the finite feature contract")
        h = self.encode_graph(observation) if graph_embedding is None else graph_embedding
        if h.shape != (observation.num_blocks, self.hidden) or not torch.isfinite(h).all():
            raise ValueError("cached graph embedding does not match the current graph and model")
        eligible = torch.nonzero(observation.admissible[:h.shape[0]], as_tuple=False).flatten()
        block_logits = torch.full((h.shape[0],), -torch.inf, dtype=h.dtype, device=h.device)
        if eligible.numel():
            state_nodes = state.expand(eligible.numel(), -1)
            frontier_logits = self.actor(torch.cat((h[eligible], state_nodes), dim=1)).squeeze(-1)
            block_logits = block_logits.index_copy(0, eligible, frontier_logits)
        stop_logits = self.stop_actor(state)
        logits = torch.cat((block_logits, stop_logits))
        if apply_mask:
            logits = logits.masked_fill(~observation.admissible, -torch.inf)
        pooled = h.mean(dim=0)
        value = self.critic(torch.cat((pooled, state))).squeeze(-1)
        return logits, value

    @torch.no_grad()
    def select_action(
        self, observation: FrontierObservation, *, deterministic: bool = True,
        graph_embedding: torch.Tensor | None = None,
    ) -> tuple[int, float, float]:
        """Select a masked action; deterministic ties resolve by lowest stable action index."""
        logits, value = self(observation, graph_embedding=graph_embedding)
        distribution = Categorical(logits=logits)
        action = torch.argmax(logits) if deterministic else distribution.sample()
        return int(action.item()), float(distribution.log_prob(action).item()), float(value.item())


@torch.no_grad()
def select_ensemble_action(
    models: Sequence[MaskedGraphActorCritic], observation: FrontierObservation,
) -> tuple[int, torch.Tensor]:
    """Average member logits, then apply the one shared feasibility mask and stable argmax."""
    if not models:
        raise ValueError("at least one frozen ensemble member is required")
    if any((m.node_feature_count, m.state_feature_count, m.hidden) !=
           (models[0].node_feature_count, models[0].state_feature_count, models[0].hidden) for m in models):
        raise ValueError("ensemble members must share one frozen feature and architecture contract")
    if any(not torch.equal(m.feature_mean, models[0].feature_mean)
           or not torch.equal(m.feature_scale, models[0].feature_scale) for m in models[1:]):
        raise ValueError("ensemble members must share the same frozen train-only normalization")
    member_logits = [model(observation, apply_mask=False)[0] for model in models]
    if any(x.shape != member_logits[0].shape for x in member_logits):
        raise ValueError("ensemble members emitted different action dimensions")
    logits = torch.stack(member_logits).mean(dim=0)
    logits = logits.masked_fill(~observation.admissible, -torch.inf)
    if not torch.isfinite(logits[observation.admissible]).all():
        raise ValueError("ensemble emitted a non-finite admissible action score")
    return int(torch.argmax(logits).item()), logits


@torch.no_grad()
def replay_frontier_ensemble(
    instance: FrontierInstance,
    node_features: np.ndarray,
    models: Sequence[MaskedGraphActorCritic],
    *,
    tonnage: np.ndarray | None = None,
) -> ScheduleResult:
    """Run frozen CPU members deterministically and independently validate the full result."""
    if not models:
        raise ValueError("at least one frozen frontier-policy member is required")
    env = FrontierPolicyEnv(instance, node_features)
    started = time.monotonic()
    observation = env.observation()
    for model in models:
        model.eval()
    if any(model.node_feature_count != observation.node_features.shape[1]
           or model.state_feature_count != env.state_feature_count for model in models):
        raise ValueError("checkpoint dimensions do not match the input feature and state contracts")
    embeddings = [model.encode_graph(observation) for model in models]
    while not env.terminated:
        if time.monotonic() - started >= INFERENCE_CAP_SECONDS:
            raise TimeoutError(f"frozen frontier inference exceeded {INFERENCE_CAP_SECONDS:g} seconds")
        member_logits = [
            model(observation, apply_mask=False, graph_embedding=embedding)[0]
            for model, embedding in zip(models, embeddings, strict=True)
        ]
        logits = torch.stack(member_logits).mean(dim=0)
        logits = logits.masked_fill(~observation.admissible, -torch.inf)
        if not torch.isfinite(logits[observation.admissible]).all():
            raise ValueError("frontier ensemble emitted non-finite admissible action scores")
        action = int(torch.argmax(logits).item())
        observation, _, _, _ = env.step(action)
        if not env.terminated and observation is None:
            raise RuntimeError("frontier environment returned no observation before termination")
    return env.result(tonnage)


@dataclass(frozen=True)
class PPOConfig:
    learning_rate: float = 3e-4
    clip_ratio: float = 0.2
    gae_lambda: float = 0.95
    entropy_coefficient: float = 0.01
    value_coefficient: float = 0.5
    max_gradient_norm: float = 0.5
    rollout_decisions: int = 4096
    minibatch_decisions: int = 256
    epochs: int = 10
    gamma: float = 1.0

    def __post_init__(self) -> None:
        if (self.learning_rate, self.clip_ratio, self.gae_lambda, self.entropy_coefficient,
                self.value_coefficient, self.max_gradient_norm, self.gamma) != (3e-4, 0.2, 0.95, 0.01, 0.5, 0.5, 1.0):
            raise ValueError("PPO hyperparameters are frozen by the reviewed SDD amendment")
        if self.rollout_decisions != 4096 or self.minibatch_decisions != 256 or self.epochs != 10:
            raise ValueError("rollout, minibatch and epoch sizes are frozen by the reviewed SDD amendment")
        if min(self.entropy_coefficient, self.value_coefficient, self.max_gradient_norm) < 0:
            raise ValueError("PPO coefficients and gradient norm must be non-negative")


@dataclass(frozen=True)
class RolloutStep:
    observation: FrontierObservation
    action: int
    old_log_probability: float
    value: float
    next_value: float
    reward: float
    done: bool


def collect_rollout(
    model: MaskedGraphActorCritic,
    episode_factory: Callable[[], FrontierPolicyEnv],
    *,
    decisions: int,
    budget_check: Callable[[], bool] | None = None,
) -> list[RolloutStep]:
    """Collect at most `decisions` masked on-policy transitions, preserving episode boundaries."""
    if decisions < 1:
        raise ValueError("rollout decision count must be positive")
    rows: list[RolloutStep] = []
    env = episode_factory()
    obs = env.observation()
    with torch.no_grad():
        graph_embedding = model.encode_graph(obs)
    for _ in range(decisions):
        if budget_check is not None and not budget_check():
            break
        action, logp, value = model.select_action(obs, deterministic=False, graph_embedding=graph_embedding)
        next_obs, reward, done, _ = env.step(action)
        if done:
            next_value = 0.0
        else:
            assert next_obs is not None
            with torch.no_grad():
                _, value_tensor = model(next_obs, graph_embedding=graph_embedding)
            next_value = float(value_tensor)
        rows.append(RolloutStep(obs, action, logp, value, next_value, reward, done))
        if done:
            env = episode_factory()
            obs = env.observation()
            with torch.no_grad():
                graph_embedding = model.encode_graph(obs)
        else:
            assert next_obs is not None
            obs = next_obs
    return rows


def update_policy(
    model: MaskedGraphActorCritic,
    optimizer: torch.optim.Optimizer,
    rollout: Sequence[RolloutStep],
    config: PPOConfig,
    *,
    seed: int,
    budget_check: Callable[[], bool] | None = None,
) -> dict[str, float]:
    """Apply the declared clipped PPO update to a collected rollout."""
    if not rollout:
        raise ValueError("cannot update PPO from an empty rollout")
    advantages, returns = compute_gae(
        [x.reward for x in rollout], [x.value for x in rollout], [x.done for x in rollout],
        last_value=rollout[-1].next_value, gamma=config.gamma, gae_lambda=config.gae_lambda,
    )
    if len(advantages) > 1:
        advantages = (advantages - advantages.mean()) / max(float(advantages.std()), 1e-8)
    rng = np.random.default_rng(seed)
    metrics: list[dict[str, float]] = []
    for _ in range(config.epochs):
        order = rng.permutation(len(rollout))
        for start in range(0, len(order), config.minibatch_decisions):
            if budget_check is not None and not budget_check():
                break
            indices = order[start:start + config.minibatch_decisions]
            logps: list[torch.Tensor] = []
            values: list[torch.Tensor] = []
            entropies: list[torch.Tensor] = []
            for i in indices:
                sample = rollout[int(i)]
                logits, value = model(sample.observation)
                distribution = Categorical(logits=logits)
                action = torch.tensor(sample.action, dtype=torch.long)
                logps.append(distribution.log_prob(action))
                values.append(value)
                entropies.append(distribution.entropy())
            new_logp = torch.stack(logps)
            pred_values = torch.stack(values)
            entropy = torch.stack(entropies)
            index_tensor = torch.as_tensor(indices, dtype=torch.long)
            old_logp = torch.as_tensor([rollout[int(i)].old_log_probability for i in indices], dtype=torch.float32)
            batch_advantage = torch.as_tensor(advantages[index_tensor.numpy()], dtype=torch.float32)
            batch_returns = torch.as_tensor(returns[index_tensor.numpy()], dtype=torch.float32)
            loss, stats = ppo_loss(new_logp, old_logp, batch_advantage, pred_values, batch_returns, entropy, config)
            optimizer.zero_grad(set_to_none=True)
            loss.backward()
            nn.utils.clip_grad_norm_(model.parameters(), config.max_gradient_norm)
            optimizer.step()
            metrics.append(stats)
        if budget_check is not None and not budget_check():
            break
    if not metrics:
        return {"policy": 0.0, "value": 0.0, "entropy": 0.0, "total": 0.0, "interrupted": 1.0}
    result = {key: float(np.mean([row[key] for row in metrics])) for key in metrics[0]}
    result["interrupted"] = float(budget_check is not None and not budget_check())
    return result


def _under_root(path: Path, root: Path) -> bool:
    try:
        path.resolve().relative_to(root.resolve())
        return True
    except ValueError:
        return False


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _atomic_checkpoint(model: MaskedGraphActorCritic, path: Path) -> str:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".pending")
    torch.save({"state_dict": model.state_dict(), "node_features": model.node_feature_count,
                "state_features": model.state_feature_count, "hidden": model.hidden}, temporary)
    os.replace(temporary, path)
    return _sha256(path)


def load_checkpoint(path: str | Path, *, expected_sha256: str) -> MaskedGraphActorCritic:
    """Load only a hash-matched CPU checkpoint and restore its declared architecture."""
    checkpoint = Path(path).expanduser().resolve()
    if not checkpoint.is_file() or _sha256(checkpoint) != expected_sha256:
        raise ValueError("checkpoint is missing or its SHA-256 differs from the frozen receipt")
    payload = torch.load(checkpoint, map_location="cpu", weights_only=True)
    required = {"state_dict", "node_features", "state_features", "hidden"}
    if not isinstance(payload, dict) or set(payload) != required:
        raise ValueError("checkpoint payload does not match the frozen frontier-policy schema")
    if payload["hidden"] != 64 or payload["node_features"] < 1 or payload["state_features"] < 1:
        raise ValueError("checkpoint architecture is outside the reviewed model contract")
    model = MaskedGraphActorCritic(
        int(payload["node_features"]), int(payload["state_features"]), int(payload["hidden"]),
    )
    model.load_state_dict(payload["state_dict"], strict=True)
    model.eval()
    return model


@dataclass(frozen=True)
class MemberRun:
    seed: int
    transitions: int
    cpu_seconds: float
    wall_seconds: float
    stop_reason: str
    selected_checkpoint: str
    selected_checkpoint_sha256: str
    final_checkpoint_sha256: str
    validation_history: tuple[dict, ...]
    final_update: dict[str, float]


def train_member(
    model: MaskedGraphActorCritic,
    episode_factory: Callable[[], FrontierPolicyEnv],
    validate: Callable[[MaskedGraphActorCritic, Callable[[], bool]], dict | None],
    *,
    seed: int,
    model_root: str | Path,
    approved_model_root: str | Path,
    repository_root: str | Path,
    max_transitions: int = 1_000_000,
    max_cpu_seconds: float = 7_200.0,
    max_wall_seconds: float = 86_400.0,
    validation_interval: int = 32_768,
    first_validation_after: int | None = None,
    patience: int = 5,
    config: PPOConfig = PPOConfig(),
    training_contract: dict,
) -> MemberRun:
    """Train one member to fixed transition/CPU/wall caps and retain its full run receipt.

    The caller supplies only a validation-split factory. Product test cases are loaded by a
    separate post-freeze evaluator and are not accepted by this training interface.
    """
    first_validation = validation_interval if first_validation_after is None else first_validation_after
    if (max_transitions < 1 or max_cpu_seconds <= 0 or max_wall_seconds <= 0
            or not isinstance(validation_interval, int) or isinstance(validation_interval, bool)
            or validation_interval < 1 or not isinstance(first_validation, int)
            or isinstance(first_validation, bool) or first_validation < 1 or patience < 1):
        raise ValueError("training caps, validation schedule and patience must be positive")
    contract_fields = {
        "generator_version", "feature_names", "feature_contract_sha256", "training_split_sha256", "normalization",
    }
    if not isinstance(training_contract, dict) or not contract_fields.issubset(training_contract):
        raise ValueError("training contract must pin generator, feature names and both SHA-256 receipts")
    if (len(training_contract["feature_names"]) != model.node_feature_count
            or not isinstance(training_contract["generator_version"], str)
            or not training_contract["generator_version"]):
        raise ValueError("training feature width or generator version differs from the model contract")
    for key in ("feature_contract_sha256", "training_split_sha256"):
        value = training_contract[key]
        if not isinstance(value, str) or len(value) != 64 or any(c not in "0123456789abcdef" for c in value):
            raise ValueError(f"{key} must be a lowercase SHA-256 hex digest")
    normalization = training_contract["normalization"]
    if not isinstance(normalization, dict) or set(normalization) != {
        "schema_version", "feature_names", "mean", "scale", "train_rows", "sha256",
    }:
        raise ValueError("training contract must carry the frozen train-only normalization receipt")
    if normalization["schema_version"] != "1.0.0" or normalization["feature_names"] != training_contract["feature_names"]:
        raise ValueError("normalization version or feature order differs from the training contract")
    mean = np.asarray(normalization["mean"], dtype=np.float64)
    scale = np.asarray(normalization["scale"], dtype=np.float64)
    if (mean.shape != (model.node_feature_count,) or scale.shape != mean.shape
            or not np.isfinite(mean).all() or not np.isfinite(scale).all() or np.any(scale <= 0)
            or not isinstance(normalization["train_rows"], int) or normalization["train_rows"] < 2):
        raise ValueError("normalization statistics must be finite, positive-scale, train-only vectors")
    normalizer_payload = json.dumps(
        {"features": tuple(normalization["feature_names"]), "mean": mean.tolist(), "scale": scale.tolist(),
         "train_rows": int(normalization["train_rows"])},
        sort_keys=True, separators=(",", ":"),
    )
    normalizer_digest = hashlib.sha256(normalizer_payload.encode("utf-8")).hexdigest()
    if normalization["sha256"] != normalizer_digest:
        raise ValueError("normalization receipt hash does not match its feature statistics")
    model.set_feature_normalizer(mean, scale)
    root = Path(model_root).expanduser().resolve()
    approved = Path(approved_model_root).expanduser().resolve()
    repo = Path(repository_root).expanduser().resolve()
    if not _under_root(root, approved) or _under_root(root, repo):
        raise ValueError("training checkpoints must be under the approved device model root and outside the repo")
    configure_determinism(seed)
    run_dir = root / f"seed-{seed}"
    run_dir.mkdir(parents=True, exist_ok=True)
    optimizer = torch.optim.Adam(model.parameters(), lr=config.learning_rate)
    started_wall, started_cpu = time.monotonic(), time.process_time()
    cpu_reserve = _finalization_reserve(max_cpu_seconds, CPU_FINALIZATION_RESERVE_SECONDS)
    wall_reserve = _finalization_reserve(max_wall_seconds, WALL_FINALIZATION_RESERVE_SECONDS)
    cpu_training_deadline = max_cpu_seconds - cpu_reserve
    wall_training_deadline = max_wall_seconds - wall_reserve
    transitions = 0
    next_validation = first_validation
    best_metric: float | None = None
    best_path = run_dir / "best.pt"
    best_hash = ""
    stale_checkpoints = 0
    validation_history: list[dict] = []
    last_update: dict[str, float] = {}
    stop_reason = "transition-cap"

    while transitions < max_transitions:
        cpu_elapsed = time.process_time() - started_cpu
        wall_elapsed = time.monotonic() - started_wall
        if cpu_elapsed >= cpu_training_deadline:
            stop_reason = "cpu-cap"
            break
        if wall_elapsed >= wall_training_deadline:
            stop_reason = "wall-cap"
            break
        count = min(config.rollout_decisions, max_transitions - transitions)
        def budget_ok() -> bool:
            return (time.process_time() - started_cpu < cpu_training_deadline
                    and time.monotonic() - started_wall < wall_training_deadline)
        rollout = collect_rollout(model, episode_factory, decisions=count, budget_check=budget_ok)
        if not rollout:
            stop_reason = "cpu-cap" if time.process_time() - started_cpu >= cpu_training_deadline else "wall-cap"
            break
        transitions += len(rollout)
        if not budget_ok():
            stop_reason = "cpu-cap" if time.process_time() - started_cpu >= cpu_training_deadline else "wall-cap"
            break
        last_update = update_policy(model, optimizer, rollout, config, seed=seed + transitions,
                                    budget_check=budget_ok)
        if last_update.get("interrupted", 0.0):
            stop_reason = "cpu-cap" if time.process_time() - started_cpu >= cpu_training_deadline else "wall-cap"
            break
        if transitions >= next_validation:
            report = validate(model, budget_ok)
            if report is None or not budget_ok():
                stop_reason = (
                    "cpu-cap" if time.process_time() - started_cpu >= cpu_training_deadline
                    else "wall-cap" if time.monotonic() - started_wall >= wall_training_deadline
                    else "validation-interrupted"
                )
                break
            metric = float(report.get("mean_normalized_npv", float("nan")))
            all_feasible = report.get("all_feasible") is True
            if not np.isfinite(metric):
                raise ValueError("validation must report a finite mean_normalized_npv")
            step_path = run_dir / f"step-{transitions:09d}.pt"
            _atomic_checkpoint(model, step_path)
            if best_metric is None or metric > best_metric:
                best_metric = metric
                best_hash = _atomic_checkpoint(model, best_path)
                stale_checkpoints = 0
            elif all_feasible:
                stale_checkpoints += 1
            else:
                stale_checkpoints = 0
            validation_history.append({
                "transitions": transitions, **report,
                "selected_checkpoint_sha256": best_hash,
            })
            next_validation += validation_interval
            if all_feasible and stale_checkpoints >= patience:
                stop_reason = "validation-plateau"
                break
        if time.process_time() - started_cpu >= cpu_training_deadline:
            stop_reason = "cpu-cap"
            break
        if time.monotonic() - started_wall >= wall_training_deadline:
            stop_reason = "wall-cap"
            break

    final_path = run_dir / "final.pt"
    final_hash = _atomic_checkpoint(model, final_path)
    if not best_path.exists():
        best_hash = _atomic_checkpoint(model, best_path)
    if best_metric is None:
        stop_reason = stop_reason if stop_reason != "validation-plateau" else "no-validation-checkpoint"
        best_hash = _sha256(best_path)
    receipt = MemberRun(
        seed, transitions, time.process_time() - started_cpu, time.monotonic() - started_wall,
        stop_reason, str(best_path), best_hash, final_hash, tuple(validation_history), last_update,
    )
    receipt_path = run_dir / "receipt.json"
    payload = {
        "schema_version": "1.0.0", "method": "frontier-policy", "seed": receipt.seed,
        "transitions": receipt.transitions, "cpu_seconds": receipt.cpu_seconds,
        "wall_seconds": receipt.wall_seconds, "stop_reason": receipt.stop_reason,
        "selected_checkpoint": receipt.selected_checkpoint,
        "selected_checkpoint_sha256": receipt.selected_checkpoint_sha256,
        "final_checkpoint_sha256": receipt.final_checkpoint_sha256,
        "validation_history": list(receipt.validation_history), "last_update": receipt.final_update,
        "first_validation_after": first_validation, "validation_interval": validation_interval,
        "ppo_config": config.__dict__,
        "budget": {
            "cpu_cap_seconds": max_cpu_seconds,
            "wall_cap_seconds": max_wall_seconds,
            "cpu_finalization_reserve_seconds": cpu_reserve,
            "wall_finalization_reserve_seconds": wall_reserve,
            "cpu_training_deadline_seconds": cpu_training_deadline,
            "wall_training_deadline_seconds": wall_training_deadline,
        },
        "training_contract": training_contract,
        "runtime": {
            "device": "cpu", "torch": torch.__version__, "numpy": np.__version__,
            "oreblocks": importlib.metadata.version("oreblocks"),
        },
    }
    pending_receipt = receipt_path.with_suffix(".json.pending")
    pending_receipt.write_text(json.dumps(payload, sort_keys=True, indent=2) + "\n", encoding="utf-8")
    os.replace(pending_receipt, receipt_path)
    return receipt


def compute_gae(
    rewards: Sequence[float], values: Sequence[float], dones: Sequence[bool], *,
    last_value: float = 0.0, gamma: float = 1.0, gae_lambda: float = 0.95,
) -> tuple[np.ndarray, np.ndarray]:
    """Compute generalized advantages and returns with explicit terminal masks."""
    reward = np.asarray(rewards, dtype=np.float64)
    value = np.asarray(values, dtype=np.float64)
    done = np.asarray(dones, dtype=bool)
    if reward.ndim != 1 or reward.shape != value.shape or reward.shape != done.shape or reward.size == 0:
        raise ValueError("rewards, values and dones must be non-empty, equal-length vectors")
    if not (np.isfinite(reward).all() and np.isfinite(value).all() and np.isfinite(last_value)):
        raise ValueError("PPO rollout values must be finite")
    if not (0 <= gamma <= 1 and 0 <= gae_lambda <= 1):
        raise ValueError("gamma and GAE lambda must be in [0, 1]")
    advantages = np.zeros_like(reward)
    carry = 0.0
    next_value = float(last_value)
    for t in range(len(reward) - 1, -1, -1):
        alive = 0.0 if done[t] else 1.0
        delta = reward[t] + gamma * next_value * alive - value[t]
        carry = delta + gamma * gae_lambda * alive * carry
        advantages[t] = carry
        next_value = value[t]
    return advantages, advantages + value


def ppo_loss(
    new_log_probability: torch.Tensor,
    old_log_probability: torch.Tensor,
    advantages: torch.Tensor,
    predicted_values: torch.Tensor,
    returns: torch.Tensor,
    entropy: torch.Tensor,
    config: PPOConfig,
) -> tuple[torch.Tensor, dict[str, float]]:
    """Compute the clipped PPO surrogate and critic/entropy terms from the frozen protocol."""
    tensors = (new_log_probability, old_log_probability, advantages, predicted_values, returns, entropy)
    if any(x.ndim != 1 or x.shape != new_log_probability.shape for x in tensors):
        raise ValueError("PPO minibatch tensors must be equal-length vectors")
    if any(not torch.isfinite(x).all() for x in tensors):
        raise ValueError("PPO minibatch tensors must be finite")
    ratio = torch.exp(new_log_probability - old_log_probability)
    clipped = torch.clamp(ratio, 1.0 - config.clip_ratio, 1.0 + config.clip_ratio)
    policy = -torch.minimum(ratio * advantages, clipped * advantages).mean()
    value = 0.5 * torch.square(predicted_values - returns).mean()
    mean_entropy = entropy.mean()
    total = policy + config.value_coefficient * value - config.entropy_coefficient * mean_entropy
    return total, {"policy": float(policy.detach()), "value": float(value.detach()),
                   "entropy": float(mean_entropy.detach()), "total": float(total.detach())}
