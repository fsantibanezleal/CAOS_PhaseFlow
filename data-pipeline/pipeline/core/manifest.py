"""CONTRACT 2, the manifest. The authoritative, versioned record of one baked case.

Carries the scenario, the engine and its version, the artifact pointer and byte size, the lane/gate
verdict with its measured numbers, the CONTRACT 1 flags, the control results, and the per-method
scoreboard. The web loads ONLY manifests and artifacts, and
``frontend/src/lib/contract.types.ts`` mirrors this schema so a drift fails the build.
"""

from __future__ import annotations

from typing import Any

from .. import __version__
from ..model.learned import capacity_fractions
from .trace import TRACE_SCHEMA

MANIFEST_SCHEMA = "phaseflow.manifest/v1"
INDEX_SCHEMA = "phaseflow.index/v1"


#: The rungs a "best method" may be chosen from.
#:
#: `beyond` is EXCLUDED and this is not a nicety. The destination rungs solve PCPSP, a richer problem
#: over a different objective, and `min-width` is the best plan traded for workability, so it is never
#: the best by construction. Before oreblocks 0.6.0 `min-width` also broke capacity, and ranking it with
#: the CPIT rungs made an INFEASIBLE plan the headline result on three cases (it overshot a period
#: capacity by up to 18.65 percent on `twin-vein` while reported as the best gap on it) and the DEFAULT
#: SELECTED METHOD, so the 3D pit opened on a schedule nobody could run.
COMPARABLE_RUNGS = ("classical", "sota", "learned")


def best_comparable(results):
    """The best plan a reader may compare, ties broken by NAME so a bake is reproducible.

    On a degenerate case every method can tie to the last bit, and `max` then picks by list position
    and float noise: the manifest recorded `destination-toposort` at a gap of -0.0 that way.
    """
    pool = [r for r in results if r.rung in COMPARABLE_RUNGS]
    if not pool:
        # NOT a fallback to the beyond rungs. A bake with no comparable method has no best method,
        # and saying so is the answer; `or list(results)` would quietly re-admit exactly the rows
        # this function exists to exclude.
        return None
    return max(pool, key=lambda r: (r.npv, r.method))

def _mean(values) -> float:
    vals = [float(v) for v in values]
    return sum(vals) / len(vals) if vals else 0.0


def build_case_manifest(
    *,
    case: Any,
    instance: Any,
    results: list[Any],
    artifact_rel: str,
    trace_bytes: int,
    gate: dict,
    controls: dict,
    engine_versions: dict,
    bound_report: dict | None = None,
    ensemble: dict | None = None,
) -> dict:
    cpit = instance.cpit
    best = best_comparable(results)
    br = bound_report or {}
    en = ensemble or {}
    return {
        "schema": MANIFEST_SCHEMA,
        "case_id": case.id,
        "category": case.category,
        "real_or_synthetic": case.real_or_synthetic,
        "default": case.default,
        "engine": {
            "product": "phaseflow",
            "version": __version__,
            "solver": "oreblocks CPIT: critical multiplier bound + TopoSort rounding + shift local search",
            **engine_versions,
        },
        "scenario": {
            "periods": cpit.n_periods,
            "discount_rate": cpit.discount_rate,
            "period_one_undiscounted": cpit.period_one_undiscounted,
            "n_resources": cpit.n_resources,
            "declared": not bool(case.published),
            # per-period limit over (pit resource total / periods), read off the instance so a
            # published file with absolute limits is described on the same scale as a twin
            "capacity_fraction": [round(f, 4) for f in capacity_fractions(cpit, instance.upit_in_pit)],
            "limit_per_period": [round(float(v), 2) for v in cpit.limit[:, 0]],
            "resource_names": list(cpit.resource_names or ()),
        },
        "instance": {
            "n_blocks": instance.n_blocks,
            "n_precedence_arcs": int(instance.precedence.n_arcs),
            "upit_value": round(instance.upit_value, 2),
            "upit_blocks": int(instance.upit_in_pit.sum()),
        },
        "artifact": {
            "path": artifact_rel,
            "format": "json",
            "trace_schema": TRACE_SCHEMA,
            "bytes": trace_bytes,
        },
        "lane": gate["lane"],
        "gate": gate,
        "flags": instance.report.flagged,
        "controls": controls,
        "published": case.published,
        "scoreboard": [
            {
                "method": r.method,
                "rung": r.rung,
                "npv": round(r.npv, 2),
                "bound": round(r.bound, 2),
                "gap_pct": round(r.gap_pct, 4),
                "runtime_ms": round(r.runtime_ms, 1),
                # what a reading page needs without loading the trace: the method's own account of
                # what it did, the learned/exact ratio where it exists, and its spatial coherence
                "notes": r.notes[:600],
                "measured_vs_exact": None if r.measured_vs_exact is None else round(r.measured_vs_exact, 6),
                "components_mean": round(_mean(p.components for p in r.periods if p.blocks > 0), 3),
                "largest_share_mean": round(_mean(p.largest_component_share for p in r.periods if p.blocks > 0), 4),
                # use over limit per resource and period: which capacity binds, and when
                "utilization": [
                    [round(p.resource_use[k] / p.resource_limit[k], 4) if p.resource_limit[k] > 0 else None
                     for p in r.periods]
                    for k in range(len(r.periods[0].resource_use) if r.periods else 0)
                ],
                "extra": getattr(r, "extra", {}) or {},
            }
            for r in results
        ],
        "bound_summary": {
            key: br.get(key)
            for key in (
                "algorithm4", "algorithm4_ms", "closure_solves", "joint", "joint_ms", "joint_iterations",
                "joint_converged", "tightening_pct", "used", "joint_nodes", "joint_edges", "joint_skipped",
                "joint_note", "pcpsp_lp", "pcpsp_lp_ms", "pcpsp_lp_rows", "pcpsp_lp_status", "skipped_methods",
            )
        },
        "ensemble_summary": {
            key: en.get(key)
            for key in (
                "ran", "reason", "nRealisations", "sigma", "methods", "expected", "p10", "p90", "meanModel",
                "optimism", "bestByExpected", "bestByP10", "valueOfReplanningPct",
            )
        },
        "best": None if best is None else {"method": best.method, "gap_pct": round(best.gap_pct, 4)},
    }


def build_index(entries: list[dict]) -> dict:
    return {
        "schema": INDEX_SCHEMA,
        "engine_version": __version__,
        "n_cases": len(entries),
        "cases": sorted(entries, key=lambda e: e["case_id"]),
    }
