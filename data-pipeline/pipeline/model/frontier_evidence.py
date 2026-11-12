"""Validated summaries for persisted frontier-policy case diagnostics."""
from __future__ import annotations

import re
from collections.abc import Mapping, Sequence
from math import isfinite
from statistics import mean, median
from typing import Any


def summarize_case_rows(case_rows: Sequence[Mapping[str, Any]]) -> dict[str, int | float]:
    """Summarize every diagnostic row, retaining empty schedules and rejecting bad input.

    The function is descriptive only. It does not make post-selection validation rows
    independent evidence or apply any case exclusions.
    """
    required = {"seed", "normalized_npv", "positive_value_coverage", "assigned_blocks"}
    if not case_rows:
        raise ValueError("case_rows must contain at least one validation row")

    seeds: list[int] = []
    objectives: list[float] = []
    coverages: list[float] = []
    assigned: list[int] = []
    for index, row in enumerate(case_rows):
        missing = required.difference(row)
        if missing:
            raise ValueError(f"case row {index} is missing fields: {', '.join(sorted(missing))}")
        seed, objective, coverage, block_count = (
            row["seed"], row["normalized_npv"], row["positive_value_coverage"], row["assigned_blocks"]
        )
        if not isinstance(seed, int) or isinstance(seed, bool):
            raise ValueError(f"case row {index} has a non-integer seed")
        if not isinstance(objective, (int, float)) or isinstance(objective, bool) or not isfinite(objective):
            raise ValueError(f"case row {index} has a non-finite normalized NPV")
        if not isinstance(coverage, (int, float)) or isinstance(coverage, bool) or not isfinite(coverage):
            raise ValueError(f"case row {index} has a non-finite positive-value coverage")
        if not 0 <= coverage <= 1:
            raise ValueError(f"case row {index} has positive-value coverage outside [0, 1]")
        if not isinstance(block_count, int) or isinstance(block_count, bool) or block_count < 0:
            raise ValueError(f"case row {index} has an invalid assigned-block count")
        seeds.append(seed)
        objectives.append(float(objective))
        coverages.append(float(coverage))
        assigned.append(block_count)
    if len(seeds) != len(set(seeds)):
        raise ValueError("case_rows contains duplicate seeds")

    return {
        "cases": len(case_rows),
        "nonempty_fraction": mean(count > 0 for count in assigned),
        "mean_assigned_blocks": mean(assigned),
        "mean_npv": mean(objectives),
        "median_npv": median(objectives),
        "median_value_coverage": median(coverages),
        "minimum_npv": min(objectives),
        "maximum_npv": max(objectives),
    }


def validate_frontier_diagnostic(
    manifest: Mapping[str, Any],
    training_summary: Mapping[str, Any],
    diagnostic: Mapping[str, Any],
) -> dict[str, Any]:
    """Validate provenance and exact validation membership for the public diagnostic records."""
    from .frontier_policy import validate_split_manifest
    from .frontier_splits import build_split_manifest, manifest_sha256

    validate_split_manifest(dict(manifest))
    split_digest = manifest_sha256(manifest)
    rebuilt = build_split_manifest(manifest.get("product_case_ids", []))
    if manifest_sha256(rebuilt) != split_digest:
        raise ValueError("loaded split manifest differs from the deterministic product split")
    if split_digest != training_summary.get("split_sha256") or split_digest != diagnostic.get("split_sha256"):
        raise ValueError("manifest and diagnostic split digests differ")
    source = training_summary.get("training_source_commit")
    if not source or source != diagnostic.get("training_source_commit"):
        raise ValueError("training source commit is missing or inconsistent")

    validation = manifest.get("validation")
    if not isinstance(validation, list) or not validation:
        raise ValueError("manifest has no validation partition")
    expected = {row["seed"]: row for row in validation}
    rows = diagnostic.get("case_results")
    if not isinstance(rows, list):
        raise ValueError("diagnostic case_results must be a list")
    observed = [row.get("seed") for row in rows]
    if len(observed) != len(expected) or len(set(observed)) != len(observed) or set(observed) != set(expected):
        raise ValueError("diagnostic rows do not match exact validation seed membership")
    for row in rows:
        frozen = expected[row["seed"]]
        if (row.get("family"), row.get("size")) != (frozen.get("family"), frozen.get("size")):
            raise ValueError(f"seed {row['seed']}: family or size differs from the manifest")
        if row.get("independent_schedule_validation") != "passed":
            raise ValueError(f"seed {row['seed']}: independent schedule validation did not pass")
    if diagnostic.get("all_schedules_independently_validated") is not True:
        raise ValueError("diagnostic does not record successful validation for every schedule")

    members = training_summary.get("members")
    if not isinstance(members, list) or len(members) != 5:
        raise ValueError("training summary must contain five members")
    audited_members = []
    digest_pattern = re.compile(r"^[0-9a-f]{64}$")
    for member in members:
        history = member.get("validation_history")
        if not isinstance(history, list) or not history:
            raise ValueError(f"seed {member.get('seed')}: validation history is empty")
        if any(event.get("all_feasible") is not True or event.get("cases") != len(expected) for event in history):
            raise ValueError(f"seed {member.get('seed')}: validation event is incomplete")
        selected = history[-1].get("selected_checkpoint_sha256")
        final = member.get("final_checkpoint_sha256")
        if selected != member.get("checkpoint_sha256"):
            raise ValueError(f"seed {member.get('seed')}: selected and recorded checkpoint digests differ")
        if not isinstance(selected, str) or not digest_pattern.fullmatch(selected):
            raise ValueError(f"seed {member.get('seed')}: selected checkpoint digest is invalid")
        if not isinstance(final, str) or not digest_pattern.fullmatch(final):
            raise ValueError(f"seed {member.get('seed')}: final checkpoint digest is invalid")
        audited_members.append({"seed": member["seed"], "transitions": member["transitions"],
                                "stop": member["stop_reason"], "selected_sha256": selected,
                                "final_sha256": final, "events": len(history)})
    diagnostic_digests = diagnostic.get("checkpoint_sha256")
    member_digests = [row["selected_sha256"] for row in audited_members]
    if diagnostic_digests != member_digests:
        raise ValueError("diagnostic checkpoint hashes differ from the ordered selected member hashes")

    summary = summarize_case_rows(rows)
    for computed_key, source_key in (
        ("nonempty_fraction", "nonempty_schedule_fraction"),
        ("median_value_coverage", "median_positive_value_coverage"),
    ):
        source_value = diagnostic.get(source_key)
        if not isinstance(source_value, (int, float)) or not isfinite(source_value):
            raise ValueError(f"diagnostic summary {source_key} is invalid")
        if abs(summary[computed_key] - source_value) > 1e-12:
            raise ValueError(f"diagnostic summary {source_key} disagrees with case rows")
    return {"split_sha256": split_digest, "source_commit": source, "validation_cases": len(rows),
            "members": audited_members, "summary": summary}
