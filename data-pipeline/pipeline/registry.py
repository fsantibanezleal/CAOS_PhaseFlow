"""The case registry, cases grouped by CATEGORY.

The App shows ONE selected case; Experiments and Benchmark show cross-case summaries by category.
``restrict`` exists for the pipeline's ``--skip-minelib`` flag: a machine without a MineLib cache can
still bake every synthetic case, and the index it writes says honestly which cases it contains.
"""
from __future__ import annotations

from .cases.phaseflow_cases import CASES
from .io.schema import Case

_ALL: list[Case] = list(CASES)
_ACTIVE: list[Case] = list(CASES)
_BY_ID: dict[str, Case] = {c.id: c for c in _ALL}


def list_cases() -> list[Case]:
    return list(_ACTIVE)


def get_case(case_id: str) -> Case:
    if case_id not in _BY_ID:
        raise KeyError(f"unknown case: {case_id!r}. known: {sorted(_BY_ID)}")
    return _BY_ID[case_id]


def list_categories() -> dict[str, list[str]]:
    out: dict[str, list[str]] = {}
    for c in _ACTIVE:
        out.setdefault(c.category, []).append(c.id)
    return out


def default_case() -> Case:
    for c in _ACTIVE:
        if c.default:
            return c
    return _ACTIVE[0]


def restrict(case_ids: list[str]) -> None:
    """Limit the active set (used by --skip-minelib). Never changes the known set."""
    global _ACTIVE
    keep = set(case_ids)
    _ACTIVE = [c for c in _ALL if c.id in keep]
