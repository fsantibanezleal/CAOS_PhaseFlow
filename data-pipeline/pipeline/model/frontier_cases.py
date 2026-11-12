"""Fail-closed adapters from PhaseFlow CPIT cases to the frozen frontier contract.

This module is intentionally separate from the active bake runner. It provides the
conversion and output checks needed by a later, versioned integration without changing
the in-progress baseline pipeline.
"""
from __future__ import annotations

from dataclasses import dataclass
import hashlib
import json
from typing import Any

import numpy as np

from ..io.contract import FORBIDDEN_VALUE
from .frontier_data import FEATURE_NAMES
from .frontier_policy import Assignment, FrontierInstance, ScheduleResult, validate_schedule


@dataclass(frozen=True)
class ProductFrontierCase:
    """Canonical scheduler inputs and source-backed fields for one product case."""

    case_id: str
    instance: FrontierInstance
    node_features: np.ndarray
    tonnage: np.ndarray
    source_contract: dict[str, Any]


def _csr_predecessors(precedence: Any, n_blocks: int) -> tuple[tuple[int, ...], ...]:
    starts = np.asarray(precedence.pstart, dtype=np.int64)
    flat = np.asarray(precedence.plist, dtype=np.int64)
    if starts.shape != (n_blocks + 1,) or starts[0] != 0 or starts[-1] != len(flat):
        raise ValueError("product precedence CSR offsets do not match the block count")
    if np.any(np.diff(starts) < 0):
        raise ValueError("product precedence CSR offsets must be monotone")
    return tuple(tuple(int(p) for p in flat[starts[b]:starts[b + 1]]) for b in range(n_blocks))


def adapt_product_case(product_case: Any) -> ProductFrontierCase:
    """Adapt an already validated pipeline instance; reject unsupported economics/features."""
    cpit = product_case.cpit
    n = int(cpit.n_blocks)
    if n <= 0 or int(product_case.precedence.n_arcs) < 0:
        raise ValueError("product case must contain a non-empty block graph")
    values = np.asarray(cpit.value, dtype=np.float64).reshape(-1)
    resources = np.asarray(cpit.coef, dtype=np.float64).reshape(int(cpit.n_resources), n).T
    capacities = np.asarray(cpit.limit, dtype=np.float64).reshape(int(cpit.n_resources), int(cpit.n_periods)).T
    if values.shape != (n,) or resources.shape != (n, 2) or capacities.shape != (int(cpit.n_periods), 2):
        raise ValueError("frontier policy currently requires the declared two-resource CPIT contract")
    if np.any(values <= FORBIDDEN_VALUE):
        raise ValueError("frontier feature contract does not support forbidden-value sentinel blocks")
    predecessors = _csr_predecessors(product_case.precedence, n)
    tonnage = np.asarray(product_case.tonnage, dtype=np.float64).reshape(-1)
    grade_source = getattr(product_case, "grade_source", None)
    grade = np.asarray(product_case.grade, dtype=np.float64).reshape(-1)
    if tonnage.shape != (n,) or grade.shape != (n,) or not grade_source:
        raise ValueError("frontier static grade feature requires a source-backed grade vector")
    if np.any(tonnage <= 0) or not np.isfinite(tonnage).all() or not np.isfinite(grade).all():
        raise ValueError("product tonnage and grade must be finite, with positive tonnage")

    depth = np.zeros(n, dtype=np.float64)
    indegree = np.zeros(n, dtype=np.int64)
    successors: list[list[int]] = [[] for _ in range(n)]
    for block, parents in enumerate(predecessors):
        for parent in parents:
            if not 0 <= parent < n or parent == block:
                raise ValueError("product precedence contains an invalid block index")
            successors[parent].append(block)
            indegree[block] += 1
    ready = [int(block) for block in np.flatnonzero(indegree == 0)]
    visited = 0
    while ready:
        parent = ready.pop()
        visited += 1
        for child in successors[parent]:
            depth[child] = max(depth[child], depth[parent] + 1.0)
            indegree[child] -= 1
            if indegree[child] == 0:
                ready.append(child)
    if visited != n:
        raise ValueError("product precedence graph must be acyclic")
    # FrontierInstance independently proves acyclicity before the adapter is returned.
    features = np.column_stack((
        values / max(float(np.abs(values).max()), 1e-12),
        tonnage / max(float(tonnage.max()), 1e-12),
        resources[:, 1] / np.maximum(resources[:, 0], 1e-12),
        grade / max(float(np.abs(grade).max()), 1e-12),
        depth / max(1.0, float(depth.max())),
        np.fromiter((len(p) for p in predecessors), dtype=np.float64) /
        max(1, max(map(len, predecessors))),
        np.fromiter((len(s) for s in successors), dtype=np.float64) /
        max(1, max(map(len, successors))),
    )).astype(np.float32)
    if features.shape != (n, len(FEATURE_NAMES)) or not np.isfinite(features).all():
        raise ValueError("product feature matrix differs from the frozen feature contract")
    instance = FrontierInstance(
        values=values,
        resources=resources,
        predecessors=predecessors,
        capacities=capacities,
        discount_rate=float(cpit.discount_rate),
        period_one_undiscounted=bool(cpit.period_one_undiscounted),
    )
    instance_digest = hashlib.sha256()
    for name, array in (
        ("values", instance.values), ("resources", instance.resources),
        ("capacities", instance.capacities), ("tonnage", tonnage), ("grade", grade),
    ):
        contiguous = np.ascontiguousarray(array, dtype="<f8")
        instance_digest.update(name.encode("utf-8") + b"\0")
        instance_digest.update(json.dumps(contiguous.shape).encode("ascii") + b"\0")
        instance_digest.update(contiguous.tobytes())
    instance_digest.update(json.dumps(predecessors, separators=(",", ":")).encode("ascii"))
    instance_digest.update(str(instance.discount_rate).encode("ascii"))
    instance_digest.update(str(instance.period_one_undiscounted).encode("ascii"))
    return ProductFrontierCase(
        case_id=str(product_case.case_id), instance=instance, node_features=features,
        tonnage=tonnage,
        source_contract={
            "case_id": str(product_case.case_id),
            "instance_sha256": instance_digest.hexdigest(),
            "grade_source": str(grade_source),
            "resources": int(cpit.n_resources),
            "periods": int(cpit.n_periods),
            "feature_names": list(FEATURE_NAMES),
        },
    )


def validate_product_result(
    product_case: ProductFrontierCase, assignments: tuple[Assignment, ...], expected_npv: float,
) -> ScheduleResult:
    """Revalidate exported assignments and objective against the adapted source economics."""
    actual_npv = validate_schedule(product_case.instance, assignments)
    if not np.isfinite(expected_npv) or not np.isclose(actual_npv, expected_npv, rtol=1e-10, atol=1e-8):
        raise ValueError("frontier objective differs from independent product CPIT recomputation")
    by_period = np.zeros(product_case.instance.capacities.shape[0], dtype=np.float64)
    for assignment in assignments:
        by_period[assignment.period] += product_case.tonnage[assignment.block]
    total_tonnage = float(product_case.tonnage.sum())
    positive = np.maximum(product_case.instance.values, 0.0)
    scheduled_positive = sum(positive[a.block] for a in assignments)
    total_positive = float(positive.sum())
    return ScheduleResult(
        assignments=assignments,
        stopped="validated-product-result",
        npv=actual_npv,
        scheduled_tonnage=float(by_period.sum()),
        scheduled_positive_value=float(scheduled_positive),
        tonnage_coverage=float(by_period.sum() / total_tonnage) if total_tonnage else 0.0,
        positive_value_coverage=float(scheduled_positive / total_positive) if total_positive else 0.0,
    )


def product_period_aggregates(source: Any, adapted: ProductFrontierCase, assignments: tuple[Assignment, ...]) -> list[dict]:
    """Build trace-safe period aggregates while the validated schedule is still in memory.

    The returned rows have the same public shape as ``pipeline.core.trace``. No block-level
    assignment is returned here; callers may persist that vector only for redistributable twins.
    """
    import oreblocks as ob

    cpit = source.cpit
    n_blocks = int(cpit.n_blocks)
    n_periods = int(cpit.n_periods)
    period_of_block = np.full(n_blocks, -1, dtype=np.int64)
    for assignment in assignments:
        if not (0 <= assignment.block < n_blocks and 0 <= assignment.period < n_periods):
            raise ValueError("period aggregates require in-range assignments")
        if period_of_block[assignment.block] >= 0:
            raise ValueError("period aggregates reject duplicate block assignments")
        period_of_block[assignment.block] = assignment.period

    values = np.asarray(cpit.value, dtype=np.float64).reshape(-1)
    grade = np.asarray(source.grade, dtype=np.float64).reshape(-1)
    tonnage = np.asarray(source.tonnage, dtype=np.float64).reshape(-1)
    ore = np.asarray(cpit.coef, dtype=np.float64).reshape(int(cpit.n_resources), n_blocks)[1] > 0
    discounts = np.asarray(cpit.discount_factors(), dtype=np.float64).reshape(-1)
    coherence = ob.schedule_coherence(period_of_block, source.x, source.y, source.level, n_periods)
    capacities = adapted.instance.capacities
    resources = adapted.instance.resources
    rows: list[dict] = []
    cumulative = 0.0
    for period in range(n_periods):
        selected = period_of_block == period
        mined = float(tonnage[selected].sum())
        ore_tonnes = float(tonnage[selected & ore].sum())
        period_value = float(values[selected].sum())
        discounted = float(discounts[period] * period_value)
        cumulative += discounted
        resource_use = resources[selected].sum(axis=0) if selected.any() else np.zeros(resources.shape[1])
        metal = float((tonnage[selected & ore] * grade[selected & ore]).sum())
        rows.append({
            "t": period + 1,
            "minedTonnes": mined,
            "oreTonnes": ore_tonnes,
            "wasteTonnes": mined - ore_tonnes,
            "headGrade": metal / ore_tonnes if ore_tonnes > 0 else 0.0,
            "metal": metal,
            "value": period_value,
            "discCashFlow": discounted,
            "cumNpv": cumulative,
            "stripRatio": (mined - ore_tonnes) / ore_tonnes if ore_tonnes > 0 else 0.0,
            "resourceUse": [float(v) for v in resource_use],
            "resourceLimit": [float(v) for v in capacities[period]],
            "components": int(coherence[period].components),
            "largestComponentShare": float(coherence[period].largest_share),
            "minWidthBlocks": int(coherence[period].min_width_blocks),
            "blocks": int(selected.sum()),
        })
    if abs(cumulative - validate_schedule(adapted.instance, assignments)) > 0.02:
        raise ValueError("period aggregates do not reconcile to the independently validated objective")
    return rows
