"""CONTRACT 1, ingestion (raw to pipeline). The bring-your-own-data gate.

PhaseFlow's input is a **block model with slope precedence and a scheduling scenario**, in the MineLib
family of formats. This module is where a file stops being bytes and becomes an instance, and where a
bad file is REJECTED with a reason rather than silently coerced into a plausible-looking pit.

What is checked, and why each check exists (each one is a real failure mode of the published files,
measured on ``newman1`` during the research pass):

1. **Block ids are dense and cover 0..n-1.** A gap turns an array index into the wrong block.
2. **Precedence arcs point at existing blocks and contain no cycle.** A cycle makes the closure
   problem meaningless and the topological sort loop forever.
3. **Precedence points UPWARD.** In MineLib's convention levels increase upward and a block's
   predecessors sit above it. A file whose arcs point down is a different problem being read as this
   one, and it produces a pit that grows from the bottom.
4. **Resource coefficients are non-negative** and the extraction resource is strictly positive for
   every block: a block with zero tonnage consumes no capacity and would be mined "free".
5. **The objective has no NaN**, and values at or below the sentinel are treated as a forbidden
   destination rather than a cost of 5e19.
6. **The scenario is answerable**: at least one period, a discount rate in a sane range, and enough
   total capacity to mine something.

Rows that are suspicious but legal are FLAGGED (accepted, recorded in the manifest) rather than
rejected: an instance whose capacity can never exhaust the pit is a legitimate scenario and a common
mistake, so the app says so instead of pretending the plan is complete.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

import numpy as np

#: Objective entries at or below this are "destination forbidden" sentinels, not costs.
FORBIDDEN_VALUE = -1e18

DISCOUNT_RATE_RANGE = (0.0, 0.5)
SLOPE_DEG_RANGE = (20.0, 80.0)


@dataclass
class ContractReport:
    """The verdict on one instance. ``ok`` is False when anything was rejected."""

    accepted: bool = False
    rejected: list[dict[str, Any]] = field(default_factory=list)
    flagged: list[dict[str, Any]] = field(default_factory=list)
    facts: dict[str, Any] = field(default_factory=dict)

    @property
    def ok(self) -> bool:
        return self.accepted and not self.rejected

    def summary(self) -> str:
        return (
            f"{'accepted' if self.ok else 'REJECTED'}: "
            f"{len(self.rejected)} rejections, {len(self.flagged)} flags"
        )


def _reject(rep: ContractReport, code: str, detail: str) -> None:
    rep.rejected.append({"code": code, "detail": detail})


def _flag(rep: ContractReport, code: str, detail: str) -> None:
    rep.flagged.append({"code": code, "detail": detail})


def validate_instance(
    *,
    values: np.ndarray,
    pstart: np.ndarray,
    plist: np.ndarray,
    level: np.ndarray,
    coef: np.ndarray,
    limit: np.ndarray,
    discount_rate: float,
    slope_deg: float | None = None,
) -> ContractReport:
    """Apply CONTRACT 1 to a fully assembled instance. Pure, deterministic, no I/O."""
    rep = ContractReport()
    n = int(values.shape[0])
    rep.facts = {
        "n_blocks": n,
        "n_precedence_arcs": int(plist.shape[0]),
        "n_resources": int(coef.shape[0]),
        "n_periods": int(limit.shape[1]),
    }

    if n == 0:
        _reject(rep, "empty", "the block model has no blocks")
        return rep
    if pstart.shape[0] != n + 1:
        _reject(rep, "prec-shape", f"precedence covers {pstart.shape[0] - 1} blocks, values cover {n}")
        return rep
    if plist.size and (plist.min() < 0 or plist.max() >= n):
        _reject(rep, "prec-range", "a precedence arc points at a block id outside 0..n-1")
    if not np.isfinite(values[values > FORBIDDEN_VALUE]).all():
        _reject(rep, "objective-nan", "the objective contains NaN or infinity outside the sentinel")

    # arcs must point upward: MineLib levels increase upward and predecessors sit ABOVE
    if plist.size:
        owner = np.repeat(np.arange(n), np.diff(pstart))
        rise = level[plist] - level[owner]
        upward = int((rise > 0).sum())
        if upward < 0.99 * rise.shape[0]:
            _reject(
                rep,
                "prec-direction",
                f"only {upward} of {rise.shape[0]} arcs point upward; levels must increase upward "
                "and predecessors must sit above their block",
            )

    if coef.min() < 0:
        _reject(rep, "coef-negative", "a resource coefficient is negative")
    if (coef[0] <= 0).any():
        bad = int((coef[0] <= 0).sum())
        _reject(rep, "zero-tonnage", f"{bad} blocks consume no extraction capacity (zero tonnage)")

    if not (DISCOUNT_RATE_RANGE[0] <= discount_rate <= DISCOUNT_RATE_RANGE[1]):
        _reject(
            rep,
            "discount-range",
            f"discount rate {discount_rate} outside {DISCOUNT_RATE_RANGE} per period",
        )
    if limit.shape[1] < 1:
        _reject(rep, "no-periods", "the scenario declares no periods")
    if limit.min() <= 0:
        _reject(rep, "capacity-nonpositive", "a per-period capacity is zero or negative")

    if slope_deg is not None and not (SLOPE_DEG_RANGE[0] <= slope_deg <= SLOPE_DEG_RANGE[1]):
        _flag(rep, "slope-unusual", f"slope angle {slope_deg} deg outside the usual {SLOPE_DEG_RANGE}")

    # legal but worth saying out loud on the screen
    total_need = float(coef[0].sum())
    total_cap = float(limit[0].sum())
    if total_cap < total_need:
        _flag(
            rep,
            "capacity-cannot-exhaust",
            f"total capacity {total_cap:,.0f} is below the model tonnage {total_need:,.0f}: the plan "
            "will not mine the whole ultimate pit within the horizon",
        )
    if total_cap > 3.0 * total_need:
        _flag(
            rep,
            "capacity-slack",
            f"total capacity {total_cap:,.0f} is more than three times the model tonnage: capacity "
            "will barely bind and the schedule will be driven by precedence alone",
        )
    if discount_rate == 0.0:
        _flag(rep, "no-discount", "discount rate is zero: the period order cannot change the objective")

    rep.accepted = not rep.rejected
    return rep
