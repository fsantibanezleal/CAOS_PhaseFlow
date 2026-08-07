"""The evaluate stage: the three mandatory controls, run on every case, recorded in the artifact.

These are not decoration. At discount rate zero with unlimited capacity, CPIT degenerates to the
ultimate pit, which this product does NOT solve itself (oreblocks does, exactly, by max-closure).
So the controls tie the scheduling lane to a proven optimum computed by a different code path:

- **duality**: the LP relaxation's mined set equals the exact ultimate pit block for block, and the
  bound equals its value.
- **bound**: no feasible objective produced by any method exceeds the certified bound.
- **order invariance**: at rate zero with unlimited capacity, every weighting returns the same value.

A case that fails any of them is a bug, and the app shows the verdict rather than hiding it.
"""
from __future__ import annotations

import oreblocks as ob


def run_controls(instance, results) -> dict:
    best = max(results, key=lambda r: r.npv) if results else None
    c = ob.run_controls(
        instance.cpit,
        instance.precedence,
        ob.ScheduleResult(
            method=best.method,
            period_of_block=__import__("numpy").array(best.period_of_block),
            npv=best.npv,
            bound=best.bound,
        )
        if best
        else None,
    )
    worst_gap = max((r.gap_pct for r in results), default=float("nan"))
    return {
        "dualitySetMatches": bool(c.duality_set_matches),
        "dualityBoundError": float(c.duality_bound_error),
        "boundGeqFeasible": bool(c.bound_geq_feasible),
        "orderInvariant": bool(c.order_invariant),
        "orderInvarianceError": float(c.order_invariance_error),
        "allPass": bool(c.all_pass),
        "bestGapPct": float(best.gap_pct) if best else float("nan"),
        "worstGapPct": float(worst_gap),
    }
