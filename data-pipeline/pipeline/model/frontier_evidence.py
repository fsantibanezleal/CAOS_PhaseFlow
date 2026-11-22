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


def validate_frontier_evaluation_summary(summary: Mapping[str, Any]) -> dict[str, Any]:
    """Fail closed on the sanitized held-out/product summary consumed by notebooks.

    Source-receipt hashes are recorded declarations because raw evaluation receipts are
    deliberately not redistributed. This validator checks their format and the internal
    identities, rows, paired arithmetic and count summaries that remain available.
    """
    digest_pattern = re.compile(r"^[0-9a-f]{64}$")
    digest_fields = (
        "case_index_sha256", "feature_contract_sha256", "synthetic_test_split_sha256",
        "training_receipt_sha256", "training_split_sha256",
    )
    if summary.get("schema_version") != "1.0.0" or summary.get("dataset") != "phaseflow-frontier-evaluation-notebook":
        raise ValueError("unsupported held-out evaluation summary schema or dataset name")
    for field in digest_fields:
        if not isinstance(summary.get(field), str) or not digest_pattern.fullmatch(summary[field]):
            raise ValueError(f"held-out evaluation summary has an invalid {field}")
    receipts = summary.get("source_receipts")
    if not isinstance(receipts, Mapping) or any(
        not isinstance(receipts.get(key), str) or not digest_pattern.fullmatch(receipts[key])
        for key in ("synthetic_test_sha256", "product_case_sha256")
    ):
        raise ValueError("held-out evaluation summary has invalid declared source-receipt hashes")
    commit_pattern = re.compile(r"^(?:[0-9a-f]{40}|[0-9a-f]{64})$")
    commits = (summary.get("training_source_commit"), summary.get("evaluation_source_commit"))
    if any(not isinstance(value, str) or not commit_pattern.fullmatch(value) for value in commits):
        raise ValueError("held-out evaluation summary has invalid source commit identities")
    checkpoints = summary.get("checkpoint_sha256")
    if not isinstance(checkpoints, list) or len(checkpoints) != 5 or any(
        not isinstance(value, str) or not digest_pattern.fullmatch(value) for value in checkpoints
    ):
        raise ValueError("held-out evaluation summary must bind five ordered checkpoint hashes")

    synthetic = summary.get("synthetic_cases")
    synthetic_summary = summary.get("synthetic_summary")
    if not isinstance(synthetic, list) or len(synthetic) != 500 or not isinstance(synthetic_summary, Mapping):
        raise ValueError("held-out synthetic summary must contain all 500 declared rows")
    seen_seeds: set[int] = set()
    seen_ids: set[str] = set()
    families: set[str] = set()
    empty = 0
    for row in synthetic:
        if not isinstance(row, Mapping):
            raise ValueError("held-out synthetic rows must be objects")
        seed, case_id = row.get("seed"), row.get("case_id")
        if not isinstance(seed, int) or isinstance(seed, bool) or not isinstance(case_id, str) or not case_id:
            raise ValueError("held-out synthetic rows require unique seed and case identities")
        if seed in seen_seeds or case_id in seen_ids:
            raise ValueError("held-out synthetic rows contain duplicate seeds or case identities")
        seen_seeds.add(seed)
        seen_ids.add(case_id)
        family, size = row.get("family"), row.get("size")
        if not isinstance(family, str) or not isinstance(size, int) or not 32 <= size <= 8192:
            raise ValueError(f"{case_id}: invalid held-out family or size")
        families.add(family)
        if row.get("status") not in {"complete", "partial"} or row.get("feasible") is not True:
            raise ValueError(f"{case_id}: held-out outcome is not a feasible complete or partial schedule")
        assignments = row.get("assignments")
        if not isinstance(assignments, int) or isinstance(assignments, bool) or assignments < 0:
            raise ValueError(f"{case_id}: invalid assignment count")
        empty += assignments == 0
        for field in ("normalized_npv", "classical_normalized_npv", "frontier_minus_classical_normalized_npv",
                      "positive_value_coverage", "tonnage_coverage"):
            value = row.get(field)
            if not isinstance(value, (int, float)) or isinstance(value, bool) or not isfinite(value):
                raise ValueError(f"{case_id}: invalid {field}")
        difference = row["normalized_npv"] - row["classical_normalized_npv"]
        if abs(difference - row["frontier_minus_classical_normalized_npv"]) > 1e-12:
            raise ValueError(f"{case_id}: paired objective difference does not reconcile")
        if any(not 0 <= row[field] <= 1 for field in ("positive_value_coverage", "tonnage_coverage")):
            raise ValueError(f"{case_id}: coverage is outside [0, 1]")
    expected_counts = {"cases": 500, "complete": 0, "partial": 500, "failed": 0, "unavailable": 0}
    if any(synthetic_summary.get(key) != value for key, value in expected_counts.items()):
        raise ValueError("held-out synthetic status summary differs from its complete rows")
    values = [row["normalized_npv"] for row in synthetic]
    mean_value = synthetic_summary.get("mean_normalized_npv_feasible")
    median_value = synthetic_summary.get("median_normalized_npv_feasible")
    if not isinstance(mean_value, (int, float)) or not isinstance(median_value, (int, float)):
        raise ValueError("held-out synthetic summary is missing its NPV mean or median")
    if abs(sum(values) / len(values) - mean_value) > 1e-12:
        raise ValueError("held-out synthetic NPV mean differs from its complete rows")
    ordered = sorted(values)
    median = (ordered[249] + ordered[250]) / 2
    if abs(median - median_value) > 1e-12:
        raise ValueError("held-out synthetic NPV median differs from its complete rows")

    product = summary.get("product_cases")
    product_summary = summary.get("product_summary")
    if not isinstance(product, list) or len(product) != 13 or not isinstance(product_summary, Mapping):
        raise ValueError("product summary must contain all thirteen declared rows")
    product_ids = [row.get("case_id") for row in product if isinstance(row, Mapping)]
    if len(product_ids) != 13 or len(set(product_ids)) != 13 or any(not item for item in product_ids):
        raise ValueError("product rows contain missing or duplicate case IDs")
    for row in product:
        if row.get("status") not in {"complete", "partial", "failed", "unavailable"}:
            raise ValueError(f"{row['case_id']}: invalid product outcome status")
        if row["status"] in {"complete", "partial"}:
            for field in ("npv", "certified_bound", "tonnage_coverage", "positive_value_coverage"):
                value = row.get(field)
                if not isinstance(value, (int, float)) or isinstance(value, bool) or not isfinite(value):
                    raise ValueError(f"{row['case_id']}: invalid scored product field {field}")
            if row["certified_bound"] <= 0 or any(
                not 0 <= row[field] <= 1 for field in ("tonnage_coverage", "positive_value_coverage")
            ):
                raise ValueError(f"{row['case_id']}: scored product metrics are outside their contract")
        elif not isinstance(row.get("failure_reason"), str) or not row["failure_reason"]:
            raise ValueError(f"{row['case_id']}: failed or unavailable input needs an explicit reason")
    status_counts = {status: sum(row.get("status") == status for row in product) for status in
                     ("complete", "partial", "failed", "unavailable")}
    if product_summary.get("cases") != 13 or any(product_summary.get(key) != value for key, value in status_counts.items()):
        raise ValueError("product status summary differs from its retained rows")
    return {"synthetic_cases": 500, "product_cases": 13, "family": sorted(families),
            "empty_synthetic_schedules": empty, "unique_product_case_ids": len(set(product_ids)),
            "declared_receipt_hashes": dict(receipts)}
