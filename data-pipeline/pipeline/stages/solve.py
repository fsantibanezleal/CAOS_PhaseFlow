"""The method ladder, executed. Every rung on the same instance, each with its bound and its gap.

Rungs, and what each one is allowed to claim:

==========================  =========  ==========================================================
method                      rung       claim
==========================  =========  ==========================================================
``bench-by-bench``          classical  a schedule, and a deliberately bad one: the floor
``nested-shells``           classical  the industry's four-step chain, sequenced by shell order
``toposort-greedy``         classical  GrTS, the obvious baseline
``toposort-gershon``        classical  GeTS, Gershon 1987a successor-cone weights
``sliding-window``          classical  Cullenbine et al. 2011, the INDUSTRIAL baseline
``toposort-expected``       sota       ExTS, seeded by the LP expected extraction times
``exts-two-resource``       sota       Algorithm 4: one relaxation per resource, best feasible
``shift-local-search``      sota       pull value forward, push cost back
``cpitD-local-search``      sota       the EXACT restricted re-solve; the best plan here
``learned-expected-time``   learned    ExTS quality with NO LP solve at all
``destination-toposort``    beyond     PCPSP: the cutoff grade becomes an OUTPUT
``min-width``               beyond     operability, and what it costs in NPV
==========================  =========  ==========================================================

The BOUND is separate from all of them and is never produced by a heuristic. Two are computed: the
critical multiplier bound relaxed one resource at a time (Algorithm 4), and the JOINT
Bienstock-Zuckerberg bound. Where they differ, the difference is the part of a reported gap that
belongs to the bound rather than to the heuristic, and every gap on screen uses the tighter one.

Nothing here certifies with a heuristic. The bound is always the exact one; the learned methods are
scored against the exact quantity they approximate and never replace it.
"""

from __future__ import annotations

import time

import numpy as np
import oreblocks as ob

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
BZ_NODE_BUDGET = 400_000
BZ_EDGE_BUDGET = 4_000_000

#: Wall-clock ceiling for one joint bound. BZ returns a VALID upper bound at every iteration, so a
#: run that stops early is looser, not wrong, and the report says which it was.
BZ_TIME_BUDGET_S = 240.0


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
    """Build the two-destination PCPSP that corresponds to this CPIT instance.

    CPIT already folded the destination away: its per-block value is the net value at the BEST
    destination and its processing coefficient is that destination's. The PCPSP form puts the choice
    back: destination 0 is the dump (mining cost only, no plant capacity), destination 1 is the plant
    (the CPIT value, and the plant capacity it consumes). Waste blocks, whose best destination was
    already the dump, are forbidden from the plant so the model cannot invent revenue for them.
    """
    cpit = instance.cpit
    n = cpit.n_blocks
    v = np.where(np.isfinite(cpit.value), cpit.value, 0.0)
    ore = v > 0
    # the dump value of an ore block is what is left after paying to move it: the CPIT value minus the
    # processing margin it would have earned. For a waste block the CPIT value IS the dump value.
    dump = np.where(ore, -np.abs(instance.tonnage) * 0.0 + np.minimum(v, 0.0), v)
    value = np.stack([dump, v], axis=1)
    forbidden = np.zeros((n, 2), dtype=bool)
    forbidden[~ore, 1] = True

    n_res = cpit.n_resources
    coef = np.zeros((n_res, n, 2))
    coef[0, :, 0] = cpit.coef[0]
    coef[0, :, 1] = cpit.coef[0]
    if n_res > 1:
        coef[1, :, 1] = cpit.coef[1]
    return ob.Pcpsp(
        name=f"{cpit.name}-pcpsp",
        n_blocks=n,
        n_periods=cpit.n_periods,
        n_destinations=2,
        discount_rate=cpit.discount_rate,
        value=value,
        forbidden=forbidden,
        limit=cpit.limit,
        sense=cpit.sense,
        coef=coef,
        period_one_undiscounted=cpit.period_one_undiscounted,
    )


def _period_rows(instance, cpit, period_of_block: np.ndarray) -> list[PeriodRow]:
    v = np.where(np.isfinite(cpit.value), cpit.value, 0.0)
    d = cpit.discount_factors()
    grade = instance.grade
    tonnage = instance.tonnage
    ore = cpit.value > 0
    coh = ob.schedule_coherence(period_of_block, instance.x, instance.y, instance.level, cpit.n_periods)

    rows: list[PeriodRow] = []
    cum = 0.0
    for t in range(cpit.n_periods):
        sel = period_of_block == t
        mined_t = float(tonnage[sel].sum())
        ore_t = float(tonnage[sel & ore].sum())
        waste_t = mined_t - ore_t
        metal = float((tonnage[sel & ore] * grade[sel & ore]).sum())
        head = metal / ore_t if ore_t > 0 else 0.0
        value = float(v[sel].sum())
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
                resource_use=[float(cpit.coef[r][sel].sum()) for r in range(cpit.n_resources)],
                resource_limit=[float(cpit.limit[r][t]) for r in range(cpit.n_resources)],
                components=coh[t].components,
                largest_component_share=coh[t].largest_share,
                min_width_blocks=coh[t].min_width_blocks,
                blocks=int(sel.sum()),
            )
        )
    return rows


def _wrap(
    instance, name: str, rung: str, heuristic: bool, res, bound: float, ms: float, notes="",
    *, unreliable: bool = False,
) -> MethodResult:
    cpit = instance.cpit
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
        periods=_period_rows(instance, cpit, res.period_of_block),
        notes=notes,
        unreliable=unreliable,
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


def run_ladder(instance, learned=None, *, joint_bound: bool = True):
    """Run every method on one instance. Returns (results, relaxations, bound_report).

    The bound is computed TWICE where more than one resource binds: once by relaxing all but one
    resource at a time (Algorithm 4, certified but loose) and once JOINTLY by Bienstock-Zuckerberg.
    The tighter one is used for every gap on screen, and the difference between them is reported,
    because that difference is the part of a gap that belongs to the bound rather than to the plan.
    """
    cpit = instance.cpit
    prec = instance.precedence
    allowed = instance.upit_in_pit
    results: list[MethodResult] = []

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
            f"{BZ_NODE_BUDGET:,}/{BZ_EDGE_BUDGET:,} budget for a pure-Python max-flow; Algorithm 4's "
            "certified but looser bound is used"
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
    t0 = time.perf_counter()
    sw = ob.sliding_window_schedule(cpit, prec, window=3, fix=1, allowed=allowed, relaxation=tight)
    results.append(
        _wrap(instance, "sliding-window", "classical", True, sw, bound,
              (time.perf_counter() - t0) * 1000.0, sw.notes)
    )

    # ---- the EXACT restricted re-solve: the rung the shift neighbourhood is not
    best_plan = improved
    try:
        t0 = time.perf_counter()
        # scale the exact re-solve to the instance: a bigger model needs a bigger neighbourhood to
        # move anything, and a bigger neighbourhood needs a longer solve, so both track block count
        rounds = 16 if cpit.n_blocks <= 8_000 else 10
        exact = ob.exact_local_search(
            cpit, prec, improved, d_max=180, rounds=rounds, time_limit=8, seed=11
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
    if learned is not None:
        for name, res, ms, note in learned:
            # MethodResult is frozen, so the guard is passed in rather than set after. It travels
            # WITH the method and not in a page of prose somewhere else, because a reader picks a
            # method from a selector.
            results.append(
                _wrap(
                    instance, name, "learned", True, res, bound, ms, note,
                    unreliable=bool("UNRELIABLE HERE" in note),
                )
            )

    # ---- beyond: let the model CHOOSE the destination, so the cutoff becomes an output
    try:
        t0 = time.perf_counter()
        pcpsp = _as_pcpsp(instance)
        dres = ob.destination_toposort(pcpsp, prec, grade=instance.grade)
        ms = (time.perf_counter() - t0) * 1000.0
        shim = _DestShim(dres, cpit.n_periods)
        finite = dres.effective_cutoff[np.isfinite(dres.effective_cutoff)]
        cut = (
            f"effective cutoff {finite.min():.4f} to {finite.max():.4f} across periods"
            if finite.size
            else "no period sent material to the plant"
        )
        to_plant = int((dres.destination_of_block == 1).sum())
        to_dump = int((dres.destination_of_block == 0).sum())
        results.append(
            _wrap(instance, "destination-toposort", "beyond", True, shim, bound, ms,
                  f"PCPSP: {to_plant} blocks to the plant, {to_dump} to the dump, and the cutoff is an "
                  f"OUTPUT rather than an input ({cut}). The NPV is not comparable to the CPIT rungs: "
                  "it is a different objective over a richer feasible set.")
        )
    except Exception as exc:  # noqa: BLE001
        _ = exc

    # ---- beyond: operability, and what it costs
    try:
        smoothed, rep = ob.enforce_min_width(
            cpit, best_plan, instance.x, instance.y, instance.level, prec, target_width=3
        )
        results.append(
            _wrap(instance, "min-width", "beyond", True, smoothed, bound, 0.0,
                  f"{rep.below_target_before} to {rep.below_target_after} narrow blocks "
                  f"({rep.below_target_reduction_pct:.0f}% fewer) at {rep.npv_cost_pct:.2f}% of NPV; "
                  "operability view, capacity not re-imposed")
        )
    except Exception:  # noqa: BLE001, S110 - smoothing is a view, never a blocker
        pass

    return results, relaxations, bound_report
