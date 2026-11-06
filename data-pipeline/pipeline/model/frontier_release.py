"""Fail-closed structural checks for one frozen all-case frontier-policy bake receipt."""
from __future__ import annotations

import re

import numpy as np

RECEIPT_SCHEMA = "phaseflow.frontier-release/v1"
SHA256 = re.compile(r"^[0-9a-f]{64}$")
COMMIT = re.compile(r"^[0-9a-f]{40}$")
STATUSES = {"complete", "partial", "failed", "unavailable"}


def validate_training_members(members: list[dict], expected_seeds: list[int]) -> None:
    """Require every frozen member checkpoint to be named by an actual validation event."""
    if not isinstance(members, list) or [row.get("seed") for row in members if isinstance(row, dict)] != expected_seeds:
        raise ValueError("the frozen ensemble does not contain the expected reviewed member seeds in order")
    if any(not isinstance(row, dict) for row in members):
        raise ValueError("every frozen ensemble member must be an object")
    for row in members:
        if row.get("status") != "trained-to-stop-rule":
            raise ValueError(f"seed {row['seed']}: member did not reach a valid training stop rule")
        history = row.get("validation_history")
        if not isinstance(history, list) or not history:
            raise ValueError(f"seed {row['seed']}: no validation event selected this checkpoint")
        previous_transitions = 0
        for event in history:
            if not isinstance(event, dict):
                raise ValueError(f"seed {row['seed']}: validation history contains a malformed event")
            transitions = event.get("transitions")
            metric = event.get("mean_normalized_npv")
            selected_hash = event.get("selected_checkpoint_sha256")
            if (not isinstance(transitions, int) or isinstance(transitions, bool) or transitions <= previous_transitions
                    or not isinstance(metric, (int, float)) or isinstance(metric, bool) or not np.isfinite(metric)
                    or not isinstance(event.get("all_feasible"), bool)
                    or not isinstance(selected_hash, str) or not SHA256.fullmatch(selected_hash)):
                raise ValueError(f"seed {row['seed']}: validation history is incomplete or invalid")
            previous_transitions = transitions
        if row.get("checkpoint_sha256") != history[-1]["selected_checkpoint_sha256"]:
            raise ValueError(f"seed {row['seed']}: checkpoint was not selected by the recorded validation history")
        if not isinstance(row.get("checkpoint_sha256"), str) or not SHA256.fullmatch(row["checkpoint_sha256"]):
            raise ValueError(f"seed {row['seed']}: selected checkpoint SHA-256 is missing or malformed")


def validate_release_receipt(receipt: dict, expected_case_ids: list[str]) -> dict:
    """Reject mixed snapshots, omitted cases, malformed failures and untracked trace outputs."""
    if not isinstance(receipt, dict) or receipt.get("schema") != RECEIPT_SCHEMA:
        raise ValueError("release receipt schema is missing or unsupported")
    if not expected_case_ids or len(set(expected_case_ids)) != len(expected_case_ids):
        raise ValueError("expected case IDs must be non-empty and unique")
    version = receipt.get("product_version")
    engine = receipt.get("engine_version")
    commit = receipt.get("source_commit")
    checkpoint = receipt.get("checkpoint_sha256")
    features = receipt.get("feature_contract_sha256")
    if not isinstance(version, str) or not version or not isinstance(engine, str) or not engine:
        raise ValueError("product and engine versions must be explicit")
    if not isinstance(commit, str) or not COMMIT.fullmatch(commit):
        raise ValueError("source commit must be a full lowercase 40-character Git SHA")
    if not isinstance(checkpoint, str) or not SHA256.fullmatch(checkpoint):
        raise ValueError("frozen checkpoint SHA-256 is missing or malformed")
    if not isinstance(features, str) or not SHA256.fullmatch(features):
        raise ValueError("feature-contract SHA-256 is missing or malformed")
    rows = receipt.get("cases")
    if not isinstance(rows, list):
        raise ValueError("receipt cases must be a list")
    ids = [row.get("case_id") for row in rows if isinstance(row, dict)]
    if len(ids) != len(rows) or len(set(ids)) != len(ids):
        raise ValueError("case rows must be objects with unique case IDs")
    if set(ids) != set(expected_case_ids):
        missing = sorted(set(expected_case_ids) - set(ids))
        extra = sorted(set(ids) - set(expected_case_ids))
        raise ValueError(f"all-case ledger mismatch; missing={missing}, extra={extra}")
    counts = {status: 0 for status in STATUSES}
    for row in rows:
        if row.get("product_version") != version or row.get("engine_version") != engine:
            raise ValueError(f"{row['case_id']}: case output came from a mixed product or engine version")
        if row.get("source_commit") != commit or row.get("checkpoint_sha256") != checkpoint:
            raise ValueError(f"{row['case_id']}: case output came from a mixed source or checkpoint")
        if row.get("feature_contract_sha256") != features:
            raise ValueError(f"{row['case_id']}: case output came from a mixed feature contract")
        status = row.get("status")
        if status not in STATUSES:
            raise ValueError(f"{row['case_id']}: status must preserve complete, partial, failed or unavailable")
        counts[status] += 1
        if status in {"complete", "partial"}:
            if not isinstance(row.get("trace_sha256"), str) or not SHA256.fullmatch(row["trace_sha256"]):
                raise ValueError(f"{row['case_id']}: schedule output requires a trace SHA-256")
        else:
            reason = row.get("failure_reason")
            if not isinstance(reason, str) or len(reason.strip()) < 12:
                raise ValueError(f"{row['case_id']}: failed and unavailable outputs require a retained reason")
        if status == "partial":
            for key in ("tonnage_coverage", "positive_value_coverage"):
                value = row.get(key)
                if not isinstance(value, (int, float)) or isinstance(value, bool) or not np.isfinite(value) or not 0 <= value <= 1:
                    raise ValueError(f"{row['case_id']}: partial output requires finite {key} in [0, 1]")
    return {"cases": len(rows), **counts}
