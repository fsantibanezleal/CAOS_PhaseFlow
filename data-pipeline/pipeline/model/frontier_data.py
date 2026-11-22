"""Versioned synthetic graph families for frontier-policy method development.

These generated instances are method-development data, not mine plans or operational data.
Every field is seeded and the generator is independent of the product benchmark cases.
"""
from __future__ import annotations

from dataclasses import dataclass

import numpy as np

from .frontier_policy import FrontierInstance

GENERATOR_VERSION = "frontier-graphs/1.0.0"
FAMILIES = ("benched", "branching", "crosscut", "funnel")
FEATURE_NAMES = (
    "value_norm", "tonnage_norm", "plant_use_fraction", "grade_norm",
    "depth_fraction", "predecessor_count", "successor_count",
)


@dataclass(frozen=True)
class GeneratedGraph:
    seed: int
    family: str
    size: int
    family_parameters: str
    instance: FrontierInstance
    node_features: np.ndarray
    tonnage: np.ndarray


def _precedence(size: int, family: str, rng: np.random.Generator) -> tuple[tuple[int, ...], ...]:
    """Construct four acyclic, mining-like dependency shapes in canonical node order."""
    preds: list[tuple[int, ...]] = []
    width = max(2, int(np.sqrt(size)))
    for block in range(size):
        if block == 0:
            preds.append(())
            continue
        if family == "benched":
            # Rows act as benches; each block depends on one or two blocks in the bench below.
            parents = [block - width] if block >= width else []
            if block % width and block - width - 1 >= 0:
                parents.append(block - width - 1)
        elif family == "branching":
            parents = [(block - 1) // 2]
            if block % 11 == 0 and block > 2:
                parents.append((block - 3) // 2)
        elif family == "crosscut":
            parents = [block - 1]
            if block >= width:
                parents.append(block - width)
            if block % 7 == 0 and block > width + 1:
                parents.append(block - width - 1)
        elif family == "funnel":
            parents = [block - 1]
            if block >= 3 and block % 4 in (0, 1):
                parents.append(block - 3)
            if block >= width and block % width == 0:
                parents.append(block - width)
        else:
            raise ValueError(f"unknown graph family: {family}")
        # Seeded edge thinning preserves a connected precedence backbone for each family.
        if len(parents) > 1:
            parents = [p for p in parents if rng.random() >= 0.08] or [min(parents)]
        preds.append(tuple(sorted(set(parents))))
    return tuple(preds)


def generate_graph(seed: int, family: str, size: int, *, periods: int = 8) -> GeneratedGraph:
    """Generate one reproducible constrained scheduling instance and named node features."""
    if isinstance(seed, bool) or not isinstance(seed, int) or seed < 0:
        raise ValueError("seed must be a non-negative integer")
    if family not in FAMILIES:
        raise ValueError(f"family must be one of {FAMILIES}")
    if not isinstance(size, int) or isinstance(size, bool) or not 4 <= size <= 8192:
        raise ValueError("graph size must be an integer in [4, 8192]")
    if not isinstance(periods, int) or isinstance(periods, bool) or periods < 1:
        raise ValueError("periods must be a positive integer")
    rng = np.random.default_rng(np.random.SeedSequence([seed, FAMILIES.index(family), size]))
    predecessors = _precedence(size, family, rng)
    successors: list[list[int]] = [[] for _ in range(size)]
    for child, parents in enumerate(predecessors):
        for parent in parents:
            successors[parent].append(child)
    indegree = np.array([len(x) for x in predecessors], dtype=np.float64)
    outdegree = np.array([len(x) for x in successors], dtype=np.float64)
    depth = np.zeros(size, dtype=np.float64)
    for child, parents in enumerate(predecessors):
        if parents:
            depth[child] = max(depth[p] for p in parents) + 1

    tonnage = rng.lognormal(mean=1.5, sigma=0.35, size=size)
    grade = np.clip(rng.beta(2.2, 4.0, size=size), 0.01, 0.95)
    mining_cost = rng.uniform(0.2, 0.5, size=size)
    processing_cost = rng.uniform(0.1, 0.4, size=size)
    value = tonnage * (grade * rng.uniform(1.0, 2.0) - mining_cost - processing_cost)
    plant = tonnage * (grade > float(np.median(grade)))
    resources = np.column_stack((tonnage, plant))
    total = resources.sum(axis=0)
    capacities = np.tile(total / periods * rng.uniform(0.75, 1.25, size=(periods, 2)), (1, 1))
    instance = FrontierInstance(value, resources, predecessors, capacities, discount_rate=0.08)
    features = np.column_stack((
        value / max(float(np.abs(value).max()), 1e-12),
        tonnage / max(float(tonnage.max()), 1e-12),
        plant / np.maximum(tonnage, 1e-12),
        grade / max(float(grade.max()), 1e-12),
        depth / max(1.0, float(depth.max())),
        indegree / max(1.0, float(indegree.max())),
        outdegree / max(1.0, float(outdegree.max())),
    )).astype(np.float32)
    parameters = f"{GENERATOR_VERSION}:{family}:size={size}:periods={periods}:v1"
    return GeneratedGraph(seed, family, size, parameters, instance, features, tonnage)
