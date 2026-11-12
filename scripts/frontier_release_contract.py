"""Validation helpers for the versioned frontier release receipt contract."""
from __future__ import annotations

import re

SHA256 = re.compile(r"^[0-9a-f]{64}$")
RELEASE_SCHEMA = "phaseflow.frontier-release/v2"


def validate_v2_split_hashes(receipt: dict) -> None:
    """Require separate, well-formed training and independent evaluation split identities."""
    if not isinstance(receipt, dict) or receipt.get("schema") != RELEASE_SCHEMA:
        raise ValueError(f"release receipt schema must be {RELEASE_SCHEMA}")
    for field in ("split_sha256", "training_split_sha256"):
        value = receipt.get(field)
        if not isinstance(value, str) or not SHA256.fullmatch(value):
            raise ValueError(f"release receipt {field.replace('_', ' ')} is missing or malformed")
    if receipt["split_sha256"] == receipt["training_split_sha256"]:
        raise ValueError("release receipt must identify distinct evaluation and training splits")
