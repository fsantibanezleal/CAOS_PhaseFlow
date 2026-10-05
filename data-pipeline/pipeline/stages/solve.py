"""The method ladder, executed. Every rung on the same instance, each with its bound and its gap.

Rungs, and what each one is allowed to claim:

==========================  =========  ==========================================================
method                      rung       claim
==========================  =========  ==========================================================
``bench-by-bench``          classical  a schedule, and a deliberately bad one: the floor
``nested-shells``           classical  the industry's four-step chain, sequenced by shell order
``toposort-greedy``         classical  GrTS, the obvious baseline
``toposort-gershon``        classical  GeTS, Gershon 1987a: the value of the whole successor cone
``toposort-expected``       sota       ExTS, seeded by the LP expected extraction times
``exts-two-resource``       sota       Algorithm 4: one relaxation per resource, best feasible
``shift-local-search``      sota       pull value forward, push cost back
``sliding-window``          sota       Cullenbine et al. 2011: a MILP per window, LP-guided candidates
``cpitD-local-search``      sota       the EXACT restricted re-solve of C-PIT[D] neighbourhoods
``learned-expected-time``   learned    the ExTS ordering from a surrogate, with no LP solve
``destination-toposort``    beyond     PCPSP: the LP's destinations fixed (the re-cut), then ExTS
``destination-sliding-window`` beyond  PCPSP: the re-cut scheduled by the sliding window
``destination-local-search`` beyond    PCPSP: the exact OPBSP-[D] re-solve from the best of those
                                       and the best CPIT plan, so never below CPIT
``min-width``               beyond     operability: slivers absorbed, capacity and precedence kept
==========================  =========  ==========================================================

The BOUND is separate from all of them and is never produced by a heuristic. Two are computed: the
critical multiplier bound relaxed one resource at a time (Algorithm 4), and the JOINT
Bienstock-Zuckerberg bound. Where they differ, the difference is the part of a reported gap that
belongs to the bound rather than to the heuristic, and every gap on screen uses the tighter one.

Nothing here certifies with a heuristic. The bound comes from a certified relaxation: the joint
Bienstock-Zuckerberg solve approaches its LP optimum within tolerance when it converges; a case
outside its budget retains the valid, potentially looser Algorithm 4 bound. Learned methods are
scored against the exact method they approximate and never replace the bound.
"""

from __future__ import annotations

import time

import numpy as np
import oreblocks as ob

from ..core.manifest import best_comparable
from ..io.schema import MethodResult, PeriodRow

#: MEASURED budgets for the Bienstock-Zuckerberg joint bound on the time-expanded graph.
#:
#: These were 20,000 nodes and 200,000 edges, which excluded every deposit twin and left the joint
#: bound unmeasured on the exact cases the product exists to compare. They were set against a
#: pure-Python max-flow. `oreblocks` 0.4.0 prices the columns with the COMPILED max-flow and then
#: certifies the result with one exact solve, and the same twin (10,976 blocks over 10 periods,
#: 109,760 nodes and 972,904 edges) now converges in 15 iterations and 15 seconds. The budget is
#: raised to where that measurement stops holding rather than to infinity, and a case above it still
#: gets Algorithm 4's certified bound with the reason written out.
#: MEASURED against the CERTIFICATION solve, not against the pricing.
#:
#: Pricing is compiled and fast at any of these sizes. The certificate is not: the bound is re-derived
#: once, EXACTLY, at the best dual vector, and that solve is the pure-Python max-flow. A 10,976-block
#: twin over 10 periods is 109,760 nodes and certifies in about a second; a 14,153-block instance over
#: 12 periods is 169,836 and did not finish in fifteen minutes, which is how this budget was found.
#:
#: A case above the budget keeps Algorithm 4's certified bound and records why. That is the same
#: trade as before and it is the right one: an uncertified joint bound carries the rounding slack of
#: the compiled pricing, which is the same order as the tightening it exists to measure.
BZ_NODE_BUDGET = 130_000
BZ_EDGE_BUDGET = 1_400_000

#: Wall-clock ceiling for one joint bound. BZ returns a VALID upper bound at every iteration, so a
#: run that stops early is looser, not wrong, and the report says which it was.
BZ_TIME_BUDGET_S = 240.0

#: How large a candidate set the sliding window may build per slide.
#:
#: The rung is a MILP per slide since `oreblocks` 0.5.0, because the version before it was a greedy
#: wearing Cullenbine, Wood and Newman's name. Until `oreblocks` 0.6.0 the candidate set had to cover
#: the window AND the whole remaining horizon, so every twin asked for thousands of blocks above a cap
#: of 1500 and the rung refused on twelve cases of thirteen. The set is now the LP's own prefix sized
#: by the window: 1.6 window capacities, which on the 6,912-block porphyry twin is about 2,200 blocks
#: and 17 minutes on one core (1.34 percent below the bound, against 4.22 for the exact C-PIT[D]
#: search). The cap is set above what the largest case here asks for (about 4,800 blocks on
#: `zuck-small-declared`), so it only refuses on an instance this matrix does not contain.
SW_CAND_MAX = 6000
SW_COVER = 1.6

#: The PCPSP LP relaxation is solved by HiGHS over every block of the instance, up to this many rows
#: (``n (T - 1) + arcs T + n T + R T``). MEASURED: 1.08 million rows (the 10,976-block twin) solved in
#: 2.65 hours in the 0.08.000 bake, while two of the three 1.44-million-row twins did not finish in six
#: and a half hours (and HiGHS's interior-point method was slower than its simplex). Above the budget the bound is the LP's
#: Lagrangian dual by maximum closures (``oreblocks.pcpsp_lagrangian_bound``): minutes, valid at every
#: iteration, and within the rounding slack of the LP once converged.
PCPSP_LP_MAX_ROWS = 1_100_000


class _DestShim:
    """Adapt a DestinationSchedule to the shape ``_wrap`` expects, without pretending it is one."""

    def __init__(self, dres, n_periods: int) -> None:
        self.period_of_block = dres.period_of_block
        self.npv = dres.npv
        self.mined_blocks = dres.mined_blocks
        self.destination_of_block = dres.destination_of_block
        self.effective_cutoff = dres.effective_cutoff
        self.n_periods = n_periods


def _as_pcpsp(instance):
    """Return source-backed destination economics; CPIT cannot reconstruct lost alternatives."""
    if instance.pcpsp is None:
        raise ValueError("no matching source PCPSP model or synthetic destination economics")
    return instance.pcpsp


def _period_rows(instance, cpit, period_of_block: np.ndarray, *, pcpsp=None,
                 destination_of_block: np.ndarray | None = None) -> list[PeriodRow]:
    """Account for a schedule under the model that produced it.

    A destination schedule can send an ore block to waste. Charging that block
    CPIT's plant coefficient, or crediting its fixed-destination revenue, makes
    the period chart disagree with the PCPSP objective and invents capacity
    overruns. Keep CPIT accounting for every other method.
    """
    if (pcpsp is None) != (destination_of_block is None):
        raise ValueError("PCPSP accounting requires both model and destinations")
    v = np.where(np.isfinite(cpit.value), cpit.value, 0.0)
    d = cpit.discount_factors()
    grade = instance.grade
    tonnage = instance.tonnage
    # A fixed plant destination can be preferable to waste even when both net
    # values are negative. Its processing coefficient, not net-value sign,
    # identifies the ore route in a two-resource CPIT model.
    ore = cpit.coef[1] > 0 if cpit.n_resources > 1 else cpit.value > 0
    coh = ob.schedule_coherence(period_of_block, instance.x, instance.y, instance.level, cpit.n_periods)

    rows: list[PeriodRow] = []
    cum = 0.0
    for t in range(cpit.n_periods):
        sel = period_of_block == t
        if pcpsp is not None:
            # Destination 1 is the plant in _as_pcpsp; destination 0 is waste.
            plant = sel & (destination_of_block == 1)
            selected_blocks = np.flatnonzero(sel)
            selected_destinations = destination_of_block[sel]
            if np.any(selected_destinations < 0):
                raise ValueError("mined PCPSP block has no destination")
            value = float(pcpsp.value[selected_blocks, selected_destinations].sum())
            resource_use = [
                float(pcpsp.coef[r, selected_blocks, selected_destinations].sum())
                for r in range(pcpsp.n_resources)
            ]
            resource_limit = [float(pcpsp.limit[r][t]) for r in range(pcpsp.n_resources)]
        else:
            plant = sel & ore
            value = float(v[sel].sum())
            resource_use = [float(cpit.coef[r][sel].sum()) for r in range(cpit.n_resources)]
            resource_limit = [float(cpit.limit[r][t]) for r in range(cpit.n_resources)]
        mined_t = float(tonnage[sel].sum())
        ore_t = float(tonnage[plant].sum())
        waste_t = mined_t - ore_t
        metal = float((tonnage[plant] * grade[plant]).sum())
        head = metal / ore_t if ore_t > 0 else 0.0
        dcf = d[t] * value
        cum += dcf
        rows.append(
            PeriodRow(
                t=t + 1,
                mined_tonnes=mined_t,
                ore_tonnes=ore_t,
                waste_tonnes=waste_t,
                head_grade=head,
                metal=metal,
                value=value,
                disc_cash_flow=dcf,
                cum_npv=cum,
                strip_ratio=(waste_t / ore_t) if ore_t > 0 else 0.0,
                resource_use=resource_use,
                resource_limit=resource_limit,
                components=coh[t].components,
                largest_component_share=coh[t].largest_share,
                min_width_blocks=coh[t].min_width_blocks,
                blocks=int(sel.sum()),
            )
        )
    return rows


#: A learned plan below this fraction of the exact plan it approximates is a FAILURE. The same line
#: the training study uses, kept in one place so the artifact and the study cannot drift apart.
LEARNED_FAILURE_BELOW = 0.90


def _assert_feasible(instance, name: str, res, pcpsp) -> None:
    """Precedence and every capacity, checked on the plan itself before it can enter an artifact.

    A rung that cannot pass this is a defect, whatever its rung label says it is for.
    """
    prec = instance.precedence
    period = np.asarray(res.period_of_block, dtype=np.int64)
    mined = np.nonzero(period >= 0)[0]
    owner = np.repeat(np.arange(period.shape[0]), np.diff(prec.pstart))
    pred = np.asarray(prec.plist, dtype=np.int64)
    sel = period[owner] >= 0
    bad = sel & ((period[pred] < 0) | (period[pred] > period[owner]))
    if bad.any():
        k = int(np.nonzero(bad)[0][0])
        raise AssertionError(f"{name}: block {owner[k]} is mined before its predecessor {pred[k]}")
    if pcpsp is not None:
        dest = np.asarray(res.destination_of_block, dtype=np.int64)
        use = np.zeros((pcpsp.n_resources, pcpsp.n_periods))
        for b in mined:
            use[:, period[b]] += pcpsp.coef[:, b, dest[b]]
        limit = np.asarray(pcpsp.limit, dtype=np.float64)
    else:
        cpit = instance.cpit
        coef = np.asarray(cpit.coef, dtype=np.float64).reshape(cpit.n_resources, -1)
        use = np.zeros((cpit.n_resources, cpit.n_periods))
        for r in range(cpit.n_resources):
            np.add.at(use[r], period[mined], coef[r, mined])
        limit = np.asarray(cpit.limit, dtype=np.float64)
    if (use > limit * (1 + 1e-9) + 1e-6).any():
        r, t = np.argwhere(use > limit * (1 + 1e-9) + 1e-6)[0]
        raise AssertionError(f"{name}: resource {r} in period {t + 1} uses {use[r, t]:.2f} of {limit[r, t]:.2f}")


def _wrap(
    instance, name: str, rung: str, heuristic: bool, res, bound: float, ms: float, notes="",
    *, unreliable: bool = False, measured_vs_exact: float | None = None,
    flagged_by_rule: bool = False, pcpsp=None, extra: dict | None = None,
) -> MethodResult:
    cpit = instance.cpit
    _assert_feasible(instance, name, res, pcpsp)
    gap = 100.0 * (bound - res.npv) / bound if bound > 0 else float("nan")
    return MethodResult(
        method=name,
        rung=rung,
        heuristic=heuristic,
        npv=float(res.npv),
        bound=float(bound),
        gap_pct=float(gap),
        runtime_ms=float(ms),
        mined_blocks=int(res.mined_blocks),
        period_of_block=[int(v) for v in res.period_of_block],
        periods=_period_rows(
            instance, cpit, res.period_of_block, pcpsp=pcpsp,
            destination_of_block=res.destination_of_block if pcpsp is not None else None,
        ),
        notes=notes,
        unreliable=unreliable,
        measured_vs_exact=measured_vs_exact,
        flagged_by_rule=flagged_by_rule,
        extra=dict(extra or {}),
    )


def _bench_weights(instance) -> np.ndarray:
    """Mine the top bench out completely before touching the next one. The naive floor."""
    nz = instance.dims[2]
    return instance.level.astype(np.float64) * 1e6 - np.arange(instance.n_blocks) * 1e-6 + nz


def _shell_weights(instance) -> np.ndarray:
    """Nested Lerchs-Grossmann shells: revenue factors, then mine inner shells first.

    This is the classical four-step chain of Chicoisne et al. 2012 section 1 collapsed into a block
    weight: solve UPL for a decreasing sequence of revenue factors, which gives nested pits, and take
    a block's shell index as its priority. The planner's manual pushback selection is replaced by
    taking every shell, which is the most favourable reading of the classical method.
    """
    values = np.where(np.isfinite(instance.cpit.value), instance.cpit.value, 0.0)
    prec = instance.precedence
    n = values.shape[0]
    shell = np.full(n, 99, dtype=np.float64)
    # descending revenue factor, so each pit is contained in the previous one and every solve after
    # the first runs on the shrinking difference rather than on the whole model
    factors = [round(f, 3) for f in np.linspace(1.0, 0.35, 12)]
    pos = np.maximum(values, 0.0)
    neg = np.minimum(values, 0.0)
    candidates = instance.upit_in_pit.copy()
    pits = []
    for rf in factors:
        pit = ob.max_closure_within(rf * pos + neg, prec, candidates)
        pits.append(pit)
        candidates = pit
    for k, pit in enumerate(reversed(pits)):  # k = 0 is the innermost (smallest revenue factor)
        shell = np.where(pit & (shell > k), float(k), shell)
    return -shell  # inner shells (small k) get the highest weight


def _destination_extra(dres, lifted_from) -> dict:
    """The destination decision in numbers, for the reading pages."""
    finite = dres.effective_cutoff[np.isfinite(dres.effective_cutoff)]
    out = {
        "to_plant": int((dres.destination_of_block == 1).sum()),
        "to_dump": int((dres.destination_of_block == 0).sum()),
        "cutoff_min": None if not finite.size else float(finite.min()),
        "cutoff_max": None if not finite.size else float(finite.max()),
        "cutoff_by_period": [None if not np.isfinite(c) else float(c) for c in dres.effective_cutoff],
    }
    if lifted_from is not None:
        method, lifted = lifted_from
        mined = (dres.period_of_block >= 0) & (lifted.period_of_block >= 0)
        out.update({
            "start_method": method,
            "start_npv": float(lifted.npv),
            "moved_vs_fixed": int((mined & (dres.destination_of_block != lifted.destination_of_block)).sum()),
            "gain_vs_cpit": float(dres.npv - lifted.npv),
        })
    return out


def _destination_note(instance, dres, lifted_from) -> str:
    """What a destination plan did with the destination decision, in numbers."""
    finite = dres.effective_cutoff[np.isfinite(dres.effective_cutoff)]
    cut = (
        f"effective cutoff {finite.min():.4f} to {finite.max():.4f} across periods"
        if finite.size
        else "no period sent material to the plant"
    )
    to_plant = int((dres.destination_of_block == 1).sum())
    to_dump = int((dres.destination_of_block == 0).sum())
    note = f"PCPSP from {instance.destination_source}: {to_plant} blocks to the plant, {to_dump} to the dump, {cut}"
    if lifted_from is not None:
        method, lifted = lifted_from
        mined = (dres.period_of_block >= 0) & (lifted.period_of_block >= 0)
        moved = int((mined & (dres.destination_of_block != lifted.destination_of_block)).sum())
        gain = dres.npv - lifted.npv
        note += (
            f". Started from {method} read as a PCPSP plan ({lifted.npv:,.0f}); {dres.notes}; "
            f"{moved} blocks changed destination against the fixed cutoff, worth {gain:,.0f}"
        )
    return note + ". Scored against the PCPSP LP bound, not the CPIT one"


def run_ladder(instance, learned=None, *, joint_bound: bool = True):
    """Run every method on one instance. Returns (results, relaxations, bound_report).

    ``bound_report['skipped_methods']`` maps a rung that could not run to the reason, so a table
    with eleven rows instead of twelve is explained rather than merely shorter.

    The bound is computed TWICE where more than one resource binds: once by relaxing all but one
    resource at a time (Algorithm 4, certified but loose) and once JOINTLY by Bienstock-Zuckerberg.
    The tighter one is used for every gap on screen, and the difference between them is reported,
    because that difference is the part of a gap that belongs to the bound rather than to the plan.
    """
    cpit = instance.cpit
    prec = instance.precedence
    allowed = instance.upit_in_pit
    results: list[MethodResult] = []
    #: rungs that could not run, with the reason. A missing row is never a blank field.
    skipped: dict[str, str] = {}

    t0 = time.perf_counter()
    alg4, relaxations = ob.cpit_bound_two_resources(cpit, prec)
    bound_ms = (time.perf_counter() - t0) * 1000.0

    bound = alg4
    bound_report = {
        "algorithm4": float(alg4),
        "algorithm4_ms": round(bound_ms, 1),
        "closure_solves": int(sum(r.closure_solves for r in relaxations)),
        "joint": None,
        "joint_ms": None,
        "joint_iterations": None,
        "joint_converged": None,
        "tightening_pct": None,
        "used": "algorithm4",
    }
    # The joint bound is computed on the TIME-EXPANDED graph: n_blocks * n_periods nodes and
    # (arcs * periods + blocks * (periods - 1)) edges. Every BZ iteration is one maximum closure over
    # that, and this max-flow is pure Python. Measured: newman1 (6,360 nodes, 28,832 edges) converges
    # in 9 iterations and 1.6 s; a 6,912-block twin over 8 periods is 55,296 nodes and 479,000 edges
    # and does not finish inside a bake. So the budget is a MEASURED limit, not a guess, and where it
    # is exceeded the report says so instead of leaving the field blank.
    nodes = cpit.n_blocks * cpit.n_periods
    edges = int(prec.n_arcs) * cpit.n_periods + cpit.n_blocks * max(0, cpit.n_periods - 1)
    bound_report["joint_nodes"] = nodes
    bound_report["joint_edges"] = edges
    if joint_bound and cpit.n_resources > 1 and (nodes > BZ_NODE_BUDGET or edges > BZ_EDGE_BUDGET):
        bound_report["joint_skipped"] = (
            f"time-expanded graph is {nodes:,} nodes and {edges:,} edges, above the "
            f"{BZ_NODE_BUDGET:,}/{BZ_EDGE_BUDGET:,} budget. Pricing would be fast, but the bound is only "
            "worth reporting once it has been CERTIFIED by one exact solve, and that solve is the "
            "pure-Python max-flow. Algorithm 4's certified but looser bound is used"
        )
    elif joint_bound and cpit.n_resources > 1:
        try:
            tb = time.perf_counter()
            bz = ob.cpit_bz_bound(cpit, prec, max_iter=120, time_budget_s=BZ_TIME_BUDGET_S)
            ms = (time.perf_counter() - tb) * 1000.0
            bound_report["joint_ms"] = round(ms, 1)
            bound_report["joint_iterations"] = int(bz.iterations)
            bound_report["joint_converged"] = bool(bz.converged)
            bound_report["joint_solver"] = str(bz.pricing_solver)
            bound_report["joint_slack"] = float(bz.pricing_slack)
            # ALWAYS record what BZ computed. Discarding it when it fails to beat Algorithm 4 left
            # `joint: null` with no reason on four cases, which is the blank field this report exists
            # to avoid: a reader cannot tell a bound that was skipped from one that ran and did not
            # help, and those are completely different facts.
            #
            # `tightening_pct` can therefore be slightly NEGATIVE. That is not an error: column
            # generation stops on a relative tolerance of 1e-7, so on a case where the joint bound is
            # no tighter it settles a few parts in ten million ABOVE Algorithm 4. Measured:
            # +2.3e-7 relative on `twin-vein`, +4.9e-7 on `ctrl-abundant`. Both bounds are valid, the
            # smaller one is USED, and the note says which and why.
            certified = bz.converged and bz.pricing_slack == 0.0
            if certified:
                bound_report["joint"] = float(bz.bound)
                # `+ 0.0` normalises a negative zero: two bounds that agree to machine precision are
                # a RESULT, and "-0.0" on a page reads as broken arithmetic rather than as that.
                bound_report["tightening_pct"] = round(100.0 * (alg4 - bz.bound) / alg4, 6) + 0.0
                if bz.bound <= alg4 * (1 + 1e-9):
                    bound_report["used"] = "bienstock-zuckerberg"
                    bound = float(bz.bound)
                else:
                    bound_report["joint_note"] = (
                        "the joint bound is NOT tighter here: one resource alone determines the LP, "
                        f"and column generation settles {1e6 * (bz.bound - alg4) / alg4:.2f} parts "
                        "per million above Algorithm 4, which is its stopping tolerance rather than "
                        "a difference between the two bounds. Algorithm 4's smaller certified value "
                        "is used for every gap on this case"
                    )
            else:
                bound_report["joint_note"] = (
                    f"BZ ran but its result is not certified (converged={bz.converged}, "
                    f"rounding slack {bz.pricing_slack:.3g}); Algorithm 4's certified bound is used"
                )
        except Exception as exc:  # noqa: BLE001 - a looser bound is still certified
            bound_report["joint_error"] = str(exc)[:200]
    elif joint_bound:
        # ONE resource. There is nothing to join, and Algorithm 4 with a single resource IS the
        # critical multiplier algorithm on that resource, which solves the LP relaxation exactly.
        # Recorded in words because a blank field cannot be told apart from a bound that was skipped
        # for cost, and those are different facts.
        bound_report["joint_skipped"] = (
            "one resource: there is nothing to join, and Algorithm 4 on a single resource is the "
            "critical multiplier algorithm, which solves the LP relaxation exactly"
        )

    # ---- the PCPSP LP bound, for the destination rungs. The CPIT bound is NOT a bound for a plan that
    # chooses destinations: PCPSP is the richer problem and its optimum can sit above the CPIT LP.
    pcpsp_bound = None
    pb = None
    if instance.pcpsp is not None:
        try:
            # The LP directly (HiGHS) where it fits the measured budget, its Lagrangian dual by closures
            # above it. Either way the solution comes back too: its destinations are the cutoff the
            # destination rungs fix.
            pb = ob.pcpsp_lp_bound(instance.pcpsp, prec, max_rows=PCPSP_LP_MAX_ROWS, solution=True)
            if pb is None:
                pb = ob.pcpsp_lagrangian_bound(instance.pcpsp, prec)
                bound_report["pcpsp_lp_note"] = (
                    f"the LP is above the {PCPSP_LP_MAX_ROWS:,}-row budget for HiGHS, so the bound is its "
                    f"Lagrangian dual by maximum closures ({pb.iterations} iterations, {pb.status}); it is "
                    f"valid at any iteration and exceeds the LP by at most the rounding slack ({pb.slack:,.0f})"
                )
            ok = bool(np.isfinite(pb.bound)) and (pb.method == "lagrangian" or pb.status == "optimal")
            bound_report["pcpsp_lp"] = float(pb.bound) if ok else None
            bound_report["pcpsp_lp_ms"] = round(1000.0 * pb.seconds, 1)
            bound_report["pcpsp_lp_rows"] = int(pb.n_rows)
            bound_report["pcpsp_lp_status"] = pb.status
            # The method is recorded only where it is not the HiGHS LP: an absent key means HiGHS, so a
            # HiGHS case's record is the one it was before the dual existed and re-bakes byte for byte.
            if pb.method == "lagrangian":
                bound_report["pcpsp_lp_method"] = pb.method
                bound_report["pcpsp_lp_iterations"] = int(pb.iterations)
                bound_report["pcpsp_lp_gap_estimate"] = float(pb.gap_estimate)
                bound_report["pcpsp_lp_slack"] = float(pb.slack)
            if ok:
                pcpsp_bound = float(pb.bound)
        except Exception as exc:  # noqa: BLE001 - a missing bound is recorded, never invented
            bound_report["pcpsp_lp_error"] = str(exc)[:200]

    # ---- classical
    for name, weights, note in (
        ("bench-by-bench", _bench_weights(instance), "top bench out completely before the next"),
        ("nested-shells", _shell_weights(instance), "12 revenue-factor shells, inner shells first"),
    ):
        t0 = time.perf_counter()
        res = ob.toposort_schedule(cpit, prec, weight=weights, allowed=allowed)
        res.method = name
        results.append(_wrap(instance, name, "classical", True, res, bound,
                             (time.perf_counter() - t0) * 1000.0, note))

    for w, name in (("greedy", "toposort-greedy"), ("gershon", "toposort-gershon")):
        t0 = time.perf_counter()
        res = ob.toposort_schedule(cpit, prec, weight=w, allowed=allowed)
        results.append(_wrap(instance, name, "classical", True, res, bound,
                             (time.perf_counter() - t0) * 1000.0))

    # ---- sota
    tight = min(relaxations, key=lambda r: r.bound)
    t0 = time.perf_counter()
    exts = ob.toposort_schedule(cpit, prec, weight="expected", relaxation=tight, allowed=allowed)
    exts_ms = (time.perf_counter() - t0) * 1000.0
    results.append(
        _wrap(instance, "toposort-expected", "sota", True, exts, bound, bound_ms + exts_ms,
              f"seeded by the LP expected times; {tight.closure_solves} closure solves for the bound")
    )

    if cpit.n_resources > 1:
        t0 = time.perf_counter()
        best = None
        for rel in relaxations:
            cand = ob.toposort_schedule(cpit, prec, weight="expected", relaxation=rel, allowed=allowed)
            if best is None or cand.npv > best.npv:
                best = cand
        results.append(
            _wrap(instance, "exts-two-resource", "sota", True, best, bound,
                  bound_ms + (time.perf_counter() - t0) * 1000.0,
                  "Algorithm 4: one relaxation per resource, best feasible, min bound")
        )
        seed_for_ls = best
    else:
        seed_for_ls = exts

    t0 = time.perf_counter()
    improved = ob.improve_schedule(cpit, prec, seed_for_ls)
    results.append(
        _wrap(instance, "shift-local-search", "sota", True, improved, bound,
              (time.perf_counter() - t0) * 1000.0, improved.notes)
    )

    # ---- the industrial baseline: enforce everything inside a window, freeze a period, slide
    try:
        t0 = time.perf_counter()
        sw = ob.sliding_window_schedule(
            cpit, prec, window=3, fix=1, allowed=allowed, relaxation=tight,
            cand_max=SW_CAND_MAX, cover=SW_COVER, mip_gap=3e-2,
        )
        results.append(
            _wrap(instance, "sliding-window", "sota", True, sw, bound,
                  (time.perf_counter() - t0) * 1000.0, sw.notes)
        )
    except ValueError as exc:
        # The engine refuses a candidate set too small to fill a period's capacity, because a starved
        # sub-problem returns a schedule that mines almost nothing and still looks like a schedule.
        # A rung that did not run says so; it does not vanish.
        skipped["sliding-window"] = str(exc)[:240]

    # ---- the EXACT restricted re-solve: the rung the shift neighbourhood is not
    best_plan = improved
    try:
        t0 = time.perf_counter()
        # scale the exact re-solve to the instance: a bigger model needs a bigger neighbourhood to
        # move anything, and a bigger neighbourhood needs a longer solve, so both track block count
        rounds = 16 if cpit.n_blocks <= 8_000 else 10
        # NO WALL-CLOCK BUDGET. `time_limit` is seconds handed to the MILP solver, so how much of
        # each restricted re-solve completes depends on the machine and its load, and this rung is
        # the reported best on nine of thirteen cases: the product's headline gap was not
        # reproducible from (params, seed), which is the one thing core/rng.py says a bake must be.
        # A relative MIP gap is a property of the PROBLEM and stops in the same place everywhere.
        exact = ob.exact_local_search(
            cpit, prec, improved, d_max=180, rounds=rounds, time_limit=None, mip_gap=1e-4, seed=11
        )
        results.append(
            _wrap(instance, "cpitD-local-search", "sota", True, exact, bound,
                  (time.perf_counter() - t0) * 1000.0, exact.notes)
        )
        best_plan = exact
    except Exception as exc:  # noqa: BLE001 - scipy absent or a solver hiccup must not lose the run
        results.append(
            _wrap(instance, "cpitD-local-search", "sota", True, improved, bound, 0.0,
                  f"NOT RUN ({str(exc)[:110]}); the shift plan is shown in its place")
        )

    # ---- learned
    #
    # MEASURE, do not predict. A baked case already contains the plan the learned rung approximates,
    # `toposort-expected`, solved exactly on the same instance against the same bound. The ratio
    # between them is therefore a fact about THIS case, and a predicted flag standing in front of an
    # available measurement is a worse answer dressed as a better one.
    #
    # The scenario rule stays, and it is not redundant: it is what the LIVE lane has, where the whole
    # point of the surrogate is that the exact plan has NOT been solved. Its clean numbers come from a
    # third seed set that had no part in choosing it (models/guard-validation.json), and on that set
    # it catches about half of the failures. A rule that misses half is a warning, not a verdict,
    # which is exactly why the measurement is preferred wherever it exists.
    if learned is None and instance.grade_source is None:
        skipped["learned-expected-time"] = "no source grade field for the learned input features"
    if learned is not None:
        exact_ref = next((r for r in results if r.method == "toposort-expected"), None)
        for name, res, ms, note in learned:
            measured = None
            if exact_ref is not None and exact_ref.npv > 0:
                measured = float(res.npv) / float(exact_ref.npv)
                note = (
                    f"{note}. MEASURED on this case: {100 * measured:.1f} percent of the exact ExTS "
                    f"plan it approximates ({exact_ref.method})"
                )
            flagged_by_rule = bool("UNRELIABLE HERE" in note)
            unreliable = (measured < LEARNED_FAILURE_BELOW) if measured is not None else flagged_by_rule
            # MethodResult is frozen, so the guard is passed in rather than set after. It travels
            # WITH the method and not in a page of prose somewhere else, because a reader picks a
            # method from a selector.
            results.append(
                _wrap(
                    instance, name, "learned", True, res, bound, ms, note,
                    unreliable=unreliable,
                    measured_vs_exact=measured,
                    flagged_by_rule=flagged_by_rule,
                )
            )

    # ---- beyond: let the model CHOOSE the destination, so the cutoff becomes an output
    #
    # The RE-CUT. The PCPSP relaxation knows the opportunity cost of the plant; a comparison of a block's
    # two values does not (a marginal ore block's plant value is positive and its dump value negative,
    # so that comparison always sends it to the plant, and the plant tonnage it takes is gone for the
    # richer ore below). So each block is fixed where the LP sends it, the resulting CPIT is scheduled
    # by the CPIT machinery, and every plan of it is a plan of the original PCPSP at the same value.
    # Three rungs: ExTS on the re-cut, the sliding window on the re-cut, and the exact OPBSP-[D] search
    # on the original instance (every destination free again) from the best of those and the best CPIT
    # plan read as a PCPSP plan, so it can never end below CPIT. All three are scored against the PCPSP
    # LP bound; the CPIT bound does not bound them. Before oreblocks 0.6.1 the constructive rung compared
    # values alone and returned a negative NPV on the plant-bound twins.
    # The manifest's rule, ties broken by name: on the degenerate control nine plans tie, and a plain max
    # smoothed and lifted `bench-by-bench` while the manifest named `toposort-greedy` the best plan.
    best_cpit = best_comparable(results)
    destination_rungs = ("destination-toposort", "destination-sliding-window", "destination-local-search")
    try:
        pcpsp = _as_pcpsp(instance)
        if pcpsp_bound is None or pb is None:
            raise ValueError("no PCPSP LP bound for this case, so a destination plan would have no yardstick")
        lifted = None
        if best_cpit is not None:
            lifted = ob.lift_to_pcpsp(pcpsp, prec, np.asarray(best_cpit.period_of_block), grade=instance.grade)
        start_of = None if lifted is None else (best_cpit.method, lifted)

        t0 = time.perf_counter()
        cut = ob.restrict_destinations(pcpsp, pb.preferred_destination())
        rcpit = cut.to_cpit()
        rvalues = np.where(np.isfinite(rcpit.value), rcpit.value, 0.0)
        rallowed = ob.solve_upit(rvalues, prec).in_pit
        _, rrels = ob.cpit_bound_two_resources(rcpit, prec)
        rtight = min(rrels, key=lambda r: r.bound)
        recut_ms = (time.perf_counter() - t0) * 1000.0
        recut_note = (
            f"each block fixed at the destination the PCPSP LP sends it to ({int((cut.best_destination()[0] == 1).sum())} "
            "routed to the plant if mined), then scheduled as a CPIT"
        )

        t0 = time.perf_counter()
        rexts = ob.toposort_schedule(rcpit, prec, weight="expected", relaxation=rtight, allowed=rallowed)
        dres = ob.lift_to_pcpsp(cut, prec, np.asarray(rexts.period_of_block), grade=instance.grade)
        ms = recut_ms + (time.perf_counter() - t0) * 1000.0
        results.append(
            _wrap(instance, "destination-toposort", "beyond", True, _DestShim(dres, cpit.n_periods),
                  pcpsp_bound, ms, f"ExTS on the re-cut: {recut_note}. " + _destination_note(instance, dres, start_of),
                  pcpsp=pcpsp, extra=_destination_extra(dres, start_of))
        )
        candidates = [("destination-toposort", dres)]

        try:
            t0 = time.perf_counter()
            rsw = ob.sliding_window_schedule(
                rcpit, prec, window=3, fix=1, allowed=rallowed, relaxation=rtight,
                cand_max=SW_CAND_MAX, cover=SW_COVER, mip_gap=3e-2,
            )
            dsw = ob.lift_to_pcpsp(cut, prec, np.asarray(rsw.period_of_block), grade=instance.grade)
            ms = recut_ms + (time.perf_counter() - t0) * 1000.0
            results.append(
                _wrap(instance, "destination-sliding-window", "beyond", True, _DestShim(dsw, cpit.n_periods),
                      pcpsp_bound, ms,
                      f"the sliding window on the re-cut: {recut_note}. " + _destination_note(instance, dsw, start_of),
                      pcpsp=pcpsp, extra=_destination_extra(dsw, start_of))
            )
            candidates.append(("destination-sliding-window", dsw))
        except ValueError as exc:
            skipped["destination-sliding-window"] = str(exc)[:240]

        if lifted is not None:
            candidates.append((f"{best_cpit.method} read as a PCPSP plan", lifted))
        start_name, start = max(candidates, key=lambda c: c[1].npv)
        t0 = time.perf_counter()
        rounds = 16 if cpit.n_blocks <= 8_000 else 10
        dls = ob.exact_destination_local_search(
            pcpsp, prec, start, d_max=160, rounds=rounds, seed=11, time_limit=None, mip_gap=1e-4,
            grade=instance.grade,
        )
        ms = (time.perf_counter() - t0) * 1000.0
        results.append(
            _wrap(instance, "destination-local-search", "beyond", True, _DestShim(dls, cpit.n_periods),
                  pcpsp_bound, ms,
                  f"from {start_name} ({start.npv:,.0f}). " + _destination_note(instance, dls, start_of),
                  pcpsp=pcpsp, extra={**_destination_extra(dls, start_of), "start": start_name})
        )
    except Exception as exc:  # noqa: BLE001
        for name in destination_rungs:
            if not any(r.method == name for r in results):
                skipped[name] = str(exc)[:240]

    # ---- beyond: operability, with capacity and precedence kept, applied to the BEST comparable plan,
    # because the question is what operability costs the plan a reader would actually pick
    try:
        mw_t0 = time.perf_counter()
        base = best_plan
        if best_cpit is not None:
            base = ob.ScheduleResult(
                method=best_cpit.method,
                period_of_block=np.asarray(best_cpit.period_of_block, dtype=np.int64),
                npv=float(best_cpit.npv),
            )
        smoothed, rep = ob.enforce_min_width(
            cpit, base, instance.x, instance.y, instance.level, prec, target_width=3
        )
        mw_ms = (time.perf_counter() - mw_t0) * 1000.0
        results.append(
            _wrap(instance, "min-width", "beyond", True, smoothed, bound, mw_ms,
                  f"from {base.method}: {rep.below_target_before} to {rep.below_target_after} blocks in a "
                  f"run narrower than 3 ({rep.below_target_reduction_pct:.0f}% fewer), {rep.moved_blocks} moved, "
                  f"{rep.blocked_by_capacity} refused for capacity, at {rep.npv_cost_pct:.2f}% of NPV; "
                  "capacity and precedence kept, so the plan is feasible",
                  extra={"base": base.method, "below_before": rep.below_target_before,
                         "below_after": rep.below_target_after, "moved": rep.moved_blocks,
                         "refused_for_capacity": rep.blocked_by_capacity, "target_width": rep.target_width,
                         "npv_cost_pct": round(rep.npv_cost_pct, 6)})
        )
    except Exception as exc:  # noqa: BLE001 - recorded, never silent
        skipped["min-width"] = str(exc)[:240]

    bound_report["skipped_methods"] = skipped
    return results, relaxations, bound_report
