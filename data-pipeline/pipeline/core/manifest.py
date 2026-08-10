"""CONTRACT 2, the manifest. The authoritative, versioned record of one baked case.

Carries the scenario, the engine and its version, the artifact pointer and byte size, the lane/gate
verdict with its measured numbers, the CONTRACT 1 flags, the control results, and the per-method
scoreboard. The web loads ONLY manifests and artifacts, and
``frontend/src/lib/contract.types.ts`` mirrors this schema so a drift fails the build.
"""

from __future__ import annotations

from typing import Any

from .. import __version__
from .trace import TRACE_SCHEMA

MANIFEST_SCHEMA = "phaseflow.manifest/v1"
INDEX_SCHEMA = "phaseflow.index/v1"


#: The rungs a "best method" may be chosen from.
#:
#: `beyond` is EXCLUDED and this is not a nicety. `min-width` does not re-impose capacity, and
#: `destination-toposort` solves PCPSP, a richer problem over a different objective. Ranking them
#: alongside the CPIT rungs made an INFEASIBLE plan the headline result on three cases (`min-width`
#: overshot a period capacity by up to 18.65 percent on `twin-vein` while being reported as the best
#: gap on it) and, worse, made it the DEFAULT SELECTED METHOD, so the 3D pit opened on a schedule
#: nobody could run. `run_ensemble` already filtered on exactly this predicate one file away.
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
) -> dict:
    cpit = instance.cpit
    best = best_comparable(results)
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
            }
            for r in results
        ],
        "best": None if best is None else {"method": best.method, "gap_pct": round(best.gap_pct, 4)},
    }


def build_index(entries: list[dict]) -> dict:
    return {
        "schema": INDEX_SCHEMA,
        "engine_version": __version__,
        "n_cases": len(entries),
        "cases": sorted(entries, key=lambda e: e["case_id"]),
    }
