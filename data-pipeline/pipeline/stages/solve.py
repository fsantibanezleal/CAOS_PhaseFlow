"""The method ladder, executed. Every rung on the same instance, each with its bound and its gap.

Rungs, and what each one is allowed to claim:

===========================  =========  ==========================================================
method                       rung       claim
===========================  =========  ==========================================================
``bench-by-bench``           classical  a schedule, and a deliberately bad one: the floor
``nested-shells``            classical  the industry's four-step chain, sequenced by shell order
``toposort-greedy``          classical  GrTS, the obvious baseline
``toposort-gershon``         classical  GeTS, Gershon 1987a successor-cone weights
``cma-bound``                sota       a CERTIFIED upper bound, not a schedule
``toposort-expected``        sota       ExTS, seeded by the LP expected extraction times
``exts-two-resource``        sota       Algorithm 4: two relaxations, best feasible, min bound
``shift-local-search``       sota       the best feasible plan this product produces
``learned-expected``         learned    ExTS quality with NO LP solve, scored against true ExTS
``learned-bound``            learned    the bound surface, instantly, scored against the exact bound
===========================  =========  ==========================================================

Nothing here certifies with a heuristic. The bound is always the exact one; the learned methods are
scored against the exact quantity they approximate and never replace it.
"""

from __future__ import annotations

import time

import numpy as np
import oreblocks as ob

from ..io.schema import MethodResult, PeriodRow


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


def _wrap(instance, name: str, rung: str, heuristic: bool, res, bound: float, ms: float, notes="") -> MethodResult:
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


def run_ladder(instance, learned=None) -> tuple[list[MethodResult], list]:
    """Run every method on one instance. Returns the results and the LP relaxations."""
    cpit = instance.cpit
    prec = instance.precedence
    allowed = instance.upit_in_pit
    results: list[MethodResult] = []

    t0 = time.perf_counter()
    bound, relaxations = ob.cpit_bound_two_resources(cpit, prec)
    bound_ms = (time.perf_counter() - t0) * 1000.0

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

    # ---- learned
    if learned is not None:
        for name, res, ms, note in learned:
            results.append(_wrap(instance, name, "learned", True, res, bound, ms, note))

    return results, relaxations
