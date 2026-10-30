"""Bounded, synthetic-only pilot for the learned PCPSP destination-policy teacher."""

from __future__ import annotations

import argparse
import json
import sys
import time
from dataclasses import replace
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "data-pipeline"))

import oreblocks as ob  # noqa: E402
from pipeline.cases.phaseflow_cases import CASES  # noqa: E402
from pipeline.model.instances import _twin_instance  # noqa: E402

MAX_VARIABLES = 40_000
TIME_LIMIT_SECONDS = 60.0
PILOT_DIMS = (12, 12, 7)


def pilot_case(archetype: str, seed: int) -> dict:
    """Solve one bounded synthetic case and retain status separately from its incumbent."""
    template = next(case for case in CASES if case.deposit.synthetic and case.deposit.archetype == archetype)
    case = replace(
        template,
        id=f"teacher-{archetype}-{seed}",
        deposit=replace(template.deposit, dims=PILOT_DIMS, seed=seed),
    )
    instance = _twin_instance(case)
    if instance.pcpsp is None:
        raise RuntimeError(f"{case.id}: synthetic case did not produce a PCPSP instance")
    variables = instance.pcpsp.n_blocks * instance.pcpsp.n_destinations * instance.pcpsp.n_periods
    if variables > MAX_VARIABLES:
        raise RuntimeError(f"{case.id}: {variables} variables exceed the frozen {MAX_VARIABLES} budget")

    started = time.perf_counter()
    receipt = ob.solve_opbsp_with_status(
        instance.pcpsp,
        instance.precedence,
        max_variables=MAX_VARIABLES,
        time_limit=TIME_LIMIT_SECONDS,
        mip_gap=1e-4,
        grade=instance.grade,
    )
    elapsed = time.perf_counter() - started
    baseline = ob.destination_toposort(instance.pcpsp, instance.precedence, grade=instance.grade)
    schedule = receipt.schedule
    return {
        "case": case.id,
        "archetype": archetype,
        "seed": seed,
        "dimensions": list(PILOT_DIMS),
        "blocks": instance.n_blocks,
        "periods": instance.pcpsp.n_periods,
        "destinations": instance.pcpsp.n_destinations,
        "variables": receipt.n_variables,
        "constraints": receipt.n_constraints,
        "backend": receipt.backend,
        "status": receipt.status,
        "certified_optimal": receipt.certified_optimal,
        "incumbent_npv": receipt.objective,
        "npv_upper_bound": receipt.best_bound,
        "mip_gap": receipt.mip_gap,
        "nodes": receipt.nodes,
        "solver_seconds": receipt.seconds,
        "wall_seconds": elapsed,
        "baseline_destination_toposort_npv": baseline.npv,
        "incumbent_vs_baseline_fraction": (
            (receipt.objective / baseline.npv - 1.0)
            if receipt.objective is not None and baseline.npv
            else None
        ),
        "feasible_schedule": schedule is not None,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--seeds", nargs="+", type=int, default=[17], help="frozen synthetic deposit seeds")
    parser.add_argument(
        "--output",
        type=Path,
        default=ROOT / "build" / "learned-destination" / "teacher-pilot.json",
        help="write receipt JSON under ignored build/ by default",
    )
    args = parser.parse_args()

    rows = []
    for seed in args.seeds:
        for archetype in ("porphyry", "vein", "layered", "core_halo"):
            row = pilot_case(archetype, seed)
            rows.append(row)
            print(
                f"{row['case']}: {row['status']}; certified={row['certified_optimal']}; "
                f"variables={row['variables']}; wall={row['wall_seconds']:.2f}s",
                flush=True,
            )
    result = {
        "schema": "phaseflow.learned-destination-teacher-pilot.v1",
        "oreblocks_version": ob.__version__,
        "variable_budget": MAX_VARIABLES,
        "time_limit_seconds": TIME_LIMIT_SECONDS,
        "mip_gap": 1e-4,
        "dimensions": list(PILOT_DIMS),
        "rows": rows,
        "all_optimal": all(row["certified_optimal"] for row in rows),
        "all_within_time_budget": all(row["wall_seconds"] <= TIME_LIMIT_SECONDS for row in rows),
        "all_within_variable_budget": all(row["variables"] <= MAX_VARIABLES for row in rows),
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(
        json.dumps(
            {
                key: result[key]
                for key in (
                    "oreblocks_version",
                    "variable_budget",
                    "time_limit_seconds",
                    "all_optimal",
                    "all_within_time_budget",
                    "all_within_variable_budget",
                )
            },
            indent=2,
        )
    )
    print(f"receipt: {args.output}")
    return (
        0
        if result["all_optimal"] and result["all_within_time_budget"] and result["all_within_variable_budget"]
        else 2
    )


if __name__ == "__main__":
    raise SystemExit(main())
