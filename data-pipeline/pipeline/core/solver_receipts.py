"""Normalize optional measurements returned by third-party solver receipts."""
from __future__ import annotations


def reported_node_count(value: object) -> int | None:
    """Return a node count when measured; negative backend sentinels mean unavailable."""
    try:
        count = int(value)
    except (TypeError, ValueError, OverflowError):
        return None
    return count if count >= 0 else None
