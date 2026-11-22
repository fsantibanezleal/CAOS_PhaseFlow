"""Deterministic feasible-frontier scheduling primitives for the learned policy.

This module is deliberately not wired into the release runner. The 0.11 baseline bake
must finish before a later version can select this method.
"""
from __future__ import annotations

from dataclasses import dataclass
import hashlib
import json
from typing import Callable, Sequence

import numpy as np


@dataclass(frozen=True)
class FrontierInstance:
    """Finite scheduling instance in canonical block-index order."""

    values: np.ndarray
    resources: np.ndarray  # block x resource, non-negative consumption
    predecessors: tuple[tuple[int, ...], ...]
    capacities: np.ndarray  # period x resource
    discount_rate: float
    period_one_undiscounted: bool = True

    def __post_init__(self) -> None:
        values = np.asarray(self.values, dtype=np.float64)
        resources = np.asarray(self.resources, dtype=np.float64)
        capacities = np.asarray(self.capacities, dtype=np.float64)
        n = values.size
        if values.ndim != 1 or resources.ndim != 2 or resources.shape[0] != n:
            raise ValueError("values and resource rows must describe the same blocks")
        if capacities.ndim != 2 or capacities.shape[1] != resources.shape[1] or capacities.shape[0] == 0:
            raise ValueError("capacities must have one row per period and one column per resource")
        if len(self.predecessors) != n:
            raise ValueError("one predecessor list is required per block")
        if not (np.isfinite(values).all() and np.isfinite(resources).all() and np.isfinite(capacities).all()):
            raise ValueError("instance arrays must be finite")
        if np.any(resources < 0) or np.any(capacities < 0):
            raise ValueError("resource use and capacities must be non-negative")
        if not np.isfinite(self.discount_rate) or self.discount_rate <= -1:
            raise ValueError("discount rate must be finite and greater than -1")
        for block, preds in enumerate(self.predecessors):
            if len(set(preds)) != len(preds) or any(p < 0 or p >= n or p == block for p in preds):
                raise ValueError("predecessors must be unique valid indices excluding the block itself")
        indegree = np.fromiter((len(p) for p in self.predecessors), dtype=np.int64, count=n)
        successors: list[list[int]] = [[] for _ in range(n)]
        for block, preds in enumerate(self.predecessors):
            for pred in preds:
                successors[pred].append(block)
        ready = [int(b) for b in np.flatnonzero(indegree == 0)]
        visited = 0
        while ready:
            block = ready.pop()
            visited += 1
            for child in successors[block]:
                indegree[child] -= 1
                if indegree[child] == 0:
                    ready.append(child)
        if visited != n:
            raise ValueError("precedence graph must be acyclic")


@dataclass(frozen=True)
class Assignment:
    block: int
    period: int


@dataclass(frozen=True)
class ScheduleResult:
    assignments: tuple[Assignment, ...]
    stopped: str
    npv: float
    scheduled_tonnage: float
    scheduled_positive_value: float
    tonnage_coverage: float
    positive_value_coverage: float


@dataclass(frozen=True)
class FeatureNormalizer:
    """Training-split-only, named and hashable feature standardization contract."""

    feature_names: tuple[str, ...]
    mean: np.ndarray
    scale: np.ndarray
    train_rows: int
    sha256: str

    @classmethod
    def fit(
        cls,
        train_values: np.ndarray,
        feature_names: Sequence[str],
        *,
        declared_features: Sequence[str],
        semantic_constants: Sequence[str] = (),
        split: str = "train",
    ) -> "FeatureNormalizer":
        """Fit only an explicitly named train matrix; reject leakage-prone fields and constants."""
        names = tuple(str(name).strip() for name in feature_names)
        declared = tuple(str(name).strip() for name in declared_features)
        if split != "train":
            raise ValueError("feature normalization may only be fit on the train split")
        if not names or len(set(names)) != len(names) or names != declared:
            raise ValueError("feature names must be unique and match the declared contract exactly")
        forbidden = ("seed", "split", "case_id", "case-id", "target", "outcome", "label", "result")
        if any(any(token in name.casefold() for token in forbidden) for name in names):
            raise ValueError("feature contract contains a split identifier or outcome field")
        matrix = np.asarray(train_values, dtype=np.float64)
        if matrix.ndim != 2 or matrix.shape[0] < 2 or matrix.shape[1] != len(names):
            raise ValueError("train feature matrix shape does not match its contract or has fewer than two rows")
        if not np.isfinite(matrix).all():
            raise ValueError("training features must be finite; missing values require an explicit source contract")
        mean = matrix.mean(axis=0)
        scale = matrix.std(axis=0)
        allowed = set(semantic_constants)
        if not allowed.issubset(names):
            raise ValueError("semantic constant allowlist contains undeclared features")
        constant = [names[i] for i, value in enumerate(scale) if value <= 1e-12]
        if any(name not in allowed for name in constant):
            raise ValueError(f"constant training features require an explicit semantic declaration: {constant}")
        # A declared semantic constant stays at unit scale and is preserved as a zero column.
        scale = np.where(scale > 1e-12, scale, 1.0)
        receipt = json.dumps({"features": names, "mean": mean.tolist(), "scale": scale.tolist(),
                              "train_rows": int(matrix.shape[0])}, sort_keys=True, separators=(",", ":"))
        digest = hashlib.sha256(receipt.encode("utf-8")).hexdigest()
        return cls(names, mean, scale, int(matrix.shape[0]), digest)

    def transform(self, values: np.ndarray, feature_names: Sequence[str]) -> np.ndarray:
        matrix = np.asarray(values, dtype=np.float64)
        if tuple(feature_names) != self.feature_names:
            raise ValueError("inference feature order differs from the frozen feature contract")
        if matrix.ndim != 2 or matrix.shape[1] != len(self.feature_names) or not np.isfinite(matrix).all():
            raise ValueError("inference features must be a finite matrix matching the frozen contract")
        return (matrix - self.mean) / self.scale


def validate_split_manifest(manifest: dict) -> dict:
    """Fail closed unless train/validation/test seeds and generator families are disjoint.

    Product benchmark case IDs are an evaluation-only set and may not occur in any
    fitting or model-selection partition.
    """
    parts = ("train", "validation", "test")
    if not isinstance(manifest, dict) or any(not isinstance(manifest.get(part), list) for part in parts):
        raise ValueError("split manifest must declare train, validation and test record lists")
    seed_sets: dict[str, set[int]] = {}
    family_sets: dict[str, set[str]] = {}
    all_case_ids: set[str] = set()
    for part in parts:
        seeds: set[int] = set()
        families: set[str] = set()
        for row in manifest[part]:
            if not isinstance(row, dict) or not isinstance(row.get("seed"), int) or isinstance(row.get("seed"), bool):
                raise ValueError(f"{part} rows require an integer generator seed")
            family = row.get("family")
            if not isinstance(family, str) or not family.strip():
                raise ValueError(f"{part} rows require a non-empty graph family")
            if row["seed"] in seeds:
                raise ValueError(f"duplicate generator seed in {part}")
            seeds.add(row["seed"])
            families.add(family)
            case_id = row.get("case_id")
            if case_id is not None:
                if not isinstance(case_id, str) or not case_id:
                    raise ValueError(f"{part} case IDs must be non-empty strings")
                all_case_ids.add(case_id)
        if not seeds:
            raise ValueError(f"{part} split must contain at least one record")
        seed_sets[part], family_sets[part] = seeds, families
    for i, left in enumerate(parts):
        for right in parts[i + 1:]:
            if seed_sets[left] & seed_sets[right]:
                raise ValueError(f"generator seeds overlap between {left} and {right}")
            if family_sets[left] & family_sets[right]:
                raise ValueError(f"graph families overlap between {left} and {right}")
    product_ids = manifest.get("product_case_ids")
    if not isinstance(product_ids, list) or not product_ids or any(not isinstance(x, str) or not x for x in product_ids):
        raise ValueError("product_case_ids must explicitly declare the sealed product evaluation cases")
    if len(set(product_ids)) != len(product_ids) or set(product_ids) & all_case_ids:
        raise ValueError("product benchmark cases must be unique and absent from all development splits")
    return {"train": len(seed_sets["train"]), "validation": len(seed_sets["validation"]),
            "test": len(seed_sets["test"]), "product_cases": len(product_ids)}


def feasible_frontier(instance: FrontierInstance, assignments: Sequence[Assignment], period: int) -> tuple[int, ...]:
    """Return precedence-eligible blocks whose full resource vector fits this period."""
    eligible = precedence_frontier(instance, assignments, period)
    used = np.zeros(instance.resources.shape[1], dtype=np.float64)
    for a in assignments:
        if a.period == period:
            used += instance.resources[a.block]
    available = instance.capacities[period] - used
    return tuple(b for b in eligible if np.all(instance.resources[b] <= available + 1e-10))


def precedence_frontier(
    instance: FrontierInstance, assignments: Sequence[Assignment], period: int,
) -> tuple[int, ...]:
    """Return unassigned blocks whose predecessors have already been scheduled by this period."""
    n = len(instance.values)
    done = {a.block for a in assignments}
    scheduled_period = {a.block: a.period for a in assignments}
    if not isinstance(period, int) or isinstance(period, bool) or not 0 <= period < instance.capacities.shape[0]:
        raise ValueError("period is outside the instance horizon")
    return tuple(
        b for b in range(n) if b not in done
        and all(p in scheduled_period and scheduled_period[p] <= period for p in instance.predecessors[b])
    )


def validate_schedule(instance: FrontierInstance, assignments: Sequence[Assignment]) -> float:
    """Independently verify the exported schedule and return its discounted value."""
    n, periods = len(instance.values), instance.capacities.shape[0]
    seen: dict[int, int] = {}
    usage = np.zeros_like(instance.capacities, dtype=np.float64)
    for a in assignments:
        if not (0 <= a.block < n and 0 <= a.period < periods):
            raise ValueError("assignment index or period is outside the instance")
        if a.block in seen:
            raise ValueError("a block may be assigned only once")
        seen[a.block] = a.period
        usage[a.period] += instance.resources[a.block]
    if np.any(usage > instance.capacities + 1e-9):
        raise ValueError("schedule exceeds a period resource capacity")
    for b, period in seen.items():
        if any(p not in seen or seen[p] > period for p in instance.predecessors[b]):
            raise ValueError("schedule violates precedence")
    factor = sum(
        instance.values[b] / (1 + instance.discount_rate) ** (period if instance.period_one_undiscounted else period + 1)
        for b, period in seen.items()
    )
    return float(factor)


def replay_frontier_policy(
    instance: FrontierInstance,
    score: Callable[[int, int, tuple[Assignment, ...]], float],
    *,
    tonnage: np.ndarray | None = None,
) -> ScheduleResult:
    """Replay block, stop-period (-1) and stop-schedule (-2) action scores.

    Ties are broken by canonical block index. NaN/inf scores fail closed. The independent
    validator runs before any result is returned; no invalid action is repaired.
    """
    assignments: list[Assignment] = []
    stopped = "horizon-complete"
    for period in range(instance.capacities.shape[0]):
        while True:
            frontier = feasible_frontier(instance, assignments, period)
            ranked = [(float(score(b, period, tuple(assignments))), b) for b in frontier]
            ranked.extend((
                (float(score(-1, period, tuple(assignments))), -1),
                (float(score(-2, period, tuple(assignments))), -2),
            ))
            if any(not np.isfinite(s) for s, _ in ranked):
                raise ValueError("policy and stop-action scores must be finite")
            _, block = max(
                ranked,
                key=lambda pair: (pair[0], 1 if pair[1] >= 0 else 0 if pair[1] == -1 else -1, -pair[1]),
            )
            if block == -2:
                stopped = "stop-schedule"
                break
            if block == -1 or not frontier:
                break
            assignments.append(Assignment(block, period))
        if stopped == "stop-schedule":
            break
    value = validate_schedule(instance, assignments)
    tonnes = np.asarray(tonnage if tonnage is not None else np.zeros(len(instance.values)), dtype=np.float64)
    if tonnes.shape != instance.values.shape or not np.isfinite(tonnes).all() or np.any(tonnes < 0):
        raise ValueError("tonnage must be a finite non-negative value per block")
    selected = [a.block for a in assignments]
    positive_value = np.maximum(instance.values, 0)
    total_tonnage = float(tonnes.sum())
    total_positive_value = float(positive_value.sum())
    scheduled_tonnage = float(tonnes[selected].sum()) if selected else 0.0
    scheduled_positive_value = float(positive_value[selected].sum()) if selected else 0.0
    return ScheduleResult(
        tuple(assignments), stopped, value,
        scheduled_tonnage, scheduled_positive_value,
        scheduled_tonnage / total_tonnage if total_tonnage > 0 else 0.0,
        scheduled_positive_value / total_positive_value if total_positive_value > 0 else 0.0,
    )
