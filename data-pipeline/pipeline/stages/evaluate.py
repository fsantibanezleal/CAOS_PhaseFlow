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

import time

import oreblocks as ob
from ..core.manifest import COMPARABLE_RUNGS, best_comparable


def run_controls(instance, results) -> dict:
    best = best_comparable(results)
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
    # The envelope and the best plan must use the same CPIT comparison set.
    # A PCPSP destination plan or an uncapacitated operability view can have a
    # numerical gap, but it cannot define the worst CPIT scheduling result.
    worst_gap = max((r.gap_pct for r in results if r.rung in COMPARABLE_RUNGS),
                    default=float("nan"))
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
REPLAN_METHOD = "cpitD-local-search"
REPLAN_D_MAX = 180
REPLAN_ROUNDS = 16
REPLAN_MIP_GAP = 1e-5
REPLAN_NODE_BUDGET = 2_000
REPLAN_SEED_OFFSET = 31


def run_ensemble(
    instance, results, *, n: int = 12, sigma: float = 0.25, seed: int = 31,
    replan_d_max: int = REPLAN_D_MAX, replan_rounds: int = REPLAN_ROUNDS,
    replan_mip_gap: float = REPLAN_MIP_GAP,
) -> dict:
    """Score every candidate plan against a spatially correlated ensemble of realisations.

    This is the risk readout, and it is deliberately NOT a stochastic optimiser. It is what
    practitioners do: solve the deterministic problem many times with varied inputs and read the
    spread (Blom, Pearce and Cote, arXiv:2403.18213). The ensemble is SYNTHETIC geological
    uncertainty from a seeded generator, and every surface that shows it says so.

    The re-planning comparison selects one fixed schedule by expected value across the seeded
    realisations, then starts the same node-bounded C-PIT[D] neighbourhood search from that schedule
    on every realisation. The restricted MILPs target their MIP gap and stop at a deterministic node
    budget. Per-neighborhood receipts distinguish feasible incumbents from proven optima; the outer
    neighbourhood search is a heuristic, so its result is a lower bound on EVPI, never a global certificate.
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

    # The fixed-policy baseline is one schedule, chosen before looking at each individual
    # realisation. Taking the per-realisation maximum over all candidates would let the baseline
    # change its policy after observing the value vector and would measure plan selection, not
    # re-planning.
    fixed_evaluation = ob.evaluate_across(cpit, ens, plans)
    fixed_method = fixed_evaluation.best_by_expected
    fixed_plan = np.asarray(plans[fixed_method], dtype=np.int64)
    fixed_index = fixed_evaluation.method_ids.index(fixed_method)
    fixed_values = fixed_evaluation.matrix[fixed_index]

    optima = []
    replan_receipts = []
    replan_started = time.perf_counter()
    for j in range(ens.n_realisations):
        inst_j = ob.Cpit(
            name=f"{cpit.name}-r{j}", n_blocks=cpit.n_blocks, n_periods=cpit.n_periods,
            discount_rate=cpit.discount_rate, value=ens.values[j], limit=cpit.limit,
            sense=cpit.sense, coef=cpit.coef,
            period_one_undiscounted=cpit.period_one_undiscounted,
        )
        # Reuse one fixed policy, but value and refine it under this realisation's block values.
        # `exact_local_search` preserves its feasible incumbent. Each restricted neighborhood has
        # a deterministic node budget; nonoptimal outcomes remain useful feasible re-plans and are
        # recorded as such in the ensemble diagnostics.
        start = ob.ScheduleResult(
            method=f"{REPLAN_METHOD}-start:{fixed_method}",
            period_of_block=fixed_plan.copy(),
            npv=float(fixed_values[j]),
        )
        rj = ob.exact_local_search(
            inst_j,
            instance.precedence,
            start,
            d_max=replan_d_max,
            rounds=replan_rounds,
            seed=REPLAN_SEED_OFFSET + seed + j,
            time_limit=None,
            node_limit=REPLAN_NODE_BUDGET,
            mip_gap=replan_mip_gap,
        )
        tolerance = 1e-6 * max(1.0, abs(start.npv))
        if rj.npv < start.npv - tolerance:
            raise AssertionError(
                f"{REPLAN_METHOD} fell below its fixed-policy incumbent on realisation {j}: "
                f"{start.npv} -> {rj.npv}"
            )
        optima.append(max(float(start.npv), float(rj.npv)))
        receipt = getattr(rj, "local_search_receipt", None)
        replan_receipts.append({
            "realisation": j,
            "certifiedOptimal": bool(receipt and receipt.certified_optimal),
            "requestedRounds": 0 if receipt is None else receipt.requested_rounds,
            "attemptedRounds": 0 if receipt is None else len(receipt.neighborhoods),
            "skippedRounds": 0 if receipt is None else receipt.skipped_rounds,
            "neighborhoods": [] if receipt is None else [
                {
                    "round": item.round_index,
                    "backend": item.backend,
                    "status": item.status,
                    "seconds": item.seconds,
                    "nodes": item.nodes,
                    "mipGap": item.mip_gap,
                    "incumbentNpv": item.incumbent_npv,
                    "upperBoundNpv": item.upper_bound_npv,
                    "usedStart": item.used_start,
                    "improved": item.improved,
                    "certifiedOptimal": item.certified_optimal,
                }
                for item in receipt.neighborhoods
            ],
        })

    elapsed = time.perf_counter() - replan_started
    out = ob.evaluate_across(cpit, ens, plans, per_realisation_optimum=np.asarray(optima))
    fixed_expected = float(out.expected.max())
    replanned_expected = float(np.mean(optima))
    if replanned_expected < fixed_expected - 1e-6 * max(1.0, abs(fixed_expected)):
        raise AssertionError(
            f"re-planning value fell below the best fixed policy: {fixed_expected} -> {replanned_expected}"
        )
    return {
        "ran": True,
        "resolveMethod": REPLAN_METHOD,
        "nRealisations": ens.n_realisations,
        "sigma": sigma,
        "fixedPolicy": fixed_method,
        "fixedPolicyExpectedNpv": round(fixed_expected, 2),
        "replannedExpectedNpv": round(replanned_expected, 2),
        "replanningElapsedSeconds": round(elapsed, 3),
        "replanningSettings": {
            "dMax": replan_d_max,
            "rounds": replan_rounds,
            "mipGap": replan_mip_gap,
            "timeLimitSecondsPerNeighborhood": None,
            "nodeLimitPerNeighborhood": REPLAN_NODE_BUDGET,
            "seedBase": REPLAN_SEED_OFFSET + seed,
        },
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
            "A lower bound on EVPI from node-bounded C-PIT[D] neighborhood searches started from the "
            "same best fixed policy. Feasible incumbents and neighborhood proof status are recorded "
            "per realization; the outer local search is heuristic, not a global two-stage optimum."
        ),
        "replanningReceipts": replan_receipts,
        "note": ens.note,
    }
