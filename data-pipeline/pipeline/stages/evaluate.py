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


# Gershon's successor-cone weight: a combinatorial score that needs no LP relaxation, so the
# per-realisation solve is one maximum closure plus a topological pass instead of a parametric family
# of them. Named here rather than inline because the trace reports it and the docs quote it.
RESOLVE_METHOD = "gershon"


def run_ensemble(instance, results, *, n: int = 12, sigma: float = 0.25, seed: int = 31) -> dict:
    """Score every candidate plan against a spatially correlated ensemble of realisations.

    This is the risk readout, and it is deliberately NOT a stochastic optimiser. It is what
    practitioners do: solve the deterministic problem many times with varied inputs and read the
    spread (Blom, Pearce and Cote, arXiv:2403.18213). The ensemble is SYNTHETIC geological
    uncertainty from a seeded generator, and every surface that shows it says so.

    EVPI is computed properly, by RE-SOLVING the problem on each realisation, because the cheap
    substitute (the best of the plans you happened to bring) is a much smaller quantity and calling it
    EVPI would overstate the case for stochastic methods.

    The per-realisation re-solve runs WITHOUT the certified bound and on a combinatorial weight. The
    ensemble compares NPVs across realisations and never reads a bound, and computing one costs a
    parametric family of maximum closures per resource against the single closure a schedule needs.
    Leaving it on made the ensemble a hundred times more expensive than the thing it was measuring:
    the first full bake spent four hours and finished one case of thirteen, inside this loop. The
    weaker per-realisation solve makes the reported quantity a LOOSER lower bound on EVPI, which is
    what it already was, and the trace records which method produced it.
    """
    import numpy as np
    import oreblocks as ob

    cpit = instance.cpit
    if cpit.n_periods < 2:
        return {"ran": False, "reason": "a single-period scenario has no schedule to stress"}
    # Every realisation is a full re-solve, so the ensemble size is scaled to the instance rather than
    # fixed. A budget that is honest about being a budget beats a run that never finishes.
    if instance.n_blocks > 60_000:
        return {
            "ran": False,
            "reason": (
                f"{instance.n_blocks:,} blocks: each realisation is a full re-solve in pure Python, "
                "so the ensemble is above budget here. The risk readout is shown on the other cases."
            ),
        }
    if instance.n_blocks > 25_000:
        n = max(6, n // 2)

    ens = ob.perturb_values(
        np.where(np.isfinite(cpit.value), cpit.value, 0.0),
        instance.x, instance.y, instance.level, n=n, sigma=sigma, seed=seed,
    )
    plans = {r.method: np.array(r.period_of_block) for r in results if r.rung != "beyond"}
    if not plans:
        return {"ran": False, "reason": "no comparable plan"}

    optima = []
    for j in range(ens.n_realisations):
        inst_j = ob.Cpit(
            name=f"{cpit.name}-r{j}", n_blocks=cpit.n_blocks, n_periods=cpit.n_periods,
            discount_rate=cpit.discount_rate, value=ens.values[j], limit=cpit.limit,
            sense=cpit.sense, coef=cpit.coef,
            period_one_undiscounted=cpit.period_one_undiscounted,
        )
        rj, _ = ob.solve_cpit(
            inst_j, instance.precedence, method=RESOLVE_METHOD, bound=False,
        )
        optima.append(rj.npv)

    # The per-realisation solve is a HEURISTIC, so a fixed plan can beat it on a lucky realisation
    # and a naive difference goes negative. Take the maximum with the best candidate already
    # evaluated: the quantity is then a lower bound on EVPI and cannot be negative.
    naive = ob.evaluate_across(cpit, ens, plans)
    best_achievable = np.maximum(np.array(optima), naive.per_realisation_best)
    out = ob.evaluate_across(cpit, ens, plans, per_realisation_optimum=best_achievable)
    return {
        "ran": True,
        "resolveMethod": RESOLVE_METHOD,
        "nRealisations": ens.n_realisations,
        "sigma": sigma,
        "methods": out.method_ids,
        "expected": [round(float(v), 2) for v in out.expected],
        "p10": [round(float(v), 2) for v in out.p10],
        "p90": [round(float(v), 2) for v in out.p90],
        "meanModel": [round(float(v), 2) for v in out.mean_model_npv],
        "optimism": [round(float(v), 2) for v in out.deterministic_optimism],
        "bestByExpected": out.best_by_expected,
        "bestByP10": out.best_by_p10,
        "valueOfPlanSelection": round(float(out.value_of_plan_selection), 2),
        "valueOfReplanning": round(float(out.value_of_replanning), 2),
        "valueOfReplanningPct": round(
            100.0 * float(out.value_of_replanning) / max(1e-9, float(out.expected.max())), 3
        ),
        "replanningNote": (
            "A LOWER bound on the expected value of perfect information, not EVPI: the per-realisation "
            "re-solve is itself a heuristic, so this understates by whatever that heuristic loses."
        ),
        "note": ens.note,
    }
