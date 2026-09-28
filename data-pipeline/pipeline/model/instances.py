"""Turn a case into a solvable CPIT instance, from a seeded twin or a cached MineLib file.

Everything upstream of the solver lives here: the block model, the slope precedence, the per-block
net values and the per-period capacities. The solver itself is not re-implemented; it is the
published ``oreblocks`` package, consumed as a pinned dependency (ADR-0057 packaging rule: a product
declares no package of its own, and if an engine is required it is a separate PyPI project).

MineLib licensing: instances are downloaded by the caller under the academic-download grant and
cached under a git-ignored path. Nothing here redistributes them, and only aggregate results are
ever committed for a MineLib case.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import numpy as np
import oreblocks as ob

from ..io.contract import ContractReport, validate_instance
from ..io.schema import Case, DepositSpec, Scenario

REPO_ROOT = Path(__file__).resolve().parents[3]
MINELIB_CACHE = REPO_ROOT / "data" / "raw" / "minelib"


@dataclass
class Instance:
    """A CPIT instance plus everything the viewer needs to draw it."""

    case_id: str
    cpit: ob.Cpit
    precedence: ob.Precedence
    x: np.ndarray
    y: np.ndarray
    level: np.ndarray
    grade: np.ndarray
    tonnage: np.ndarray
    dims: tuple[int, int, int]
    upit_in_pit: np.ndarray
    upit_value: float
    synthetic: bool
    report: ContractReport
    pcpsp: ob.Pcpsp | None = None
    destination_source: str | None = None
    grade_source: str | None = None
    #: the orebody shape, for a synthetic twin. The learned guard's rule is about the OREBODY, so it
    #: needs this; a real deposit has no such label and the guard says so rather than guessing.
    archetype: str | None = None

    @property
    def n_blocks(self) -> int:
        return int(self.cpit.n_blocks)


def _limits(scenario: Scenario, coef: np.ndarray, in_pit: np.ndarray) -> np.ndarray:
    """Per-period limits: absolute when the instance publishes them, otherwise a fraction of the pit."""
    t = scenario.periods
    if scenario.absolute_limits is not None:
        return np.array([list(row) for row in scenario.absolute_limits], dtype=np.float64)
    rows = []
    for r, frac in enumerate(scenario.capacity_fraction):
        total = float(coef[r][in_pit].sum())
        rows.append([frac * total / t] * t)
    return np.array(rows, dtype=np.float64)


def _twin_instance(case: Case) -> Instance:
    spec: DepositSpec = case.deposit
    twin = ob.make_twin(spec.archetype, dims=spec.dims, seed=spec.seed, slope_deg=spec.slope_deg)
    dep = twin.deposit
    grid = dep.grid
    ix, iy, level = grid.coord_arrays()
    values = twin.values.astype(np.float64)
    waste = -twin.econ.mining_cost * dep.tonnage
    plant = (dep.grade * twin.econ.recovery * twin.econ.price
             - twin.econ.processing_cost) * dep.tonnage + waste

    n_res = case.scenario.n_resources
    coef = np.zeros((n_res, values.shape[0]), dtype=np.float64)
    coef[0] = dep.tonnage
    if n_res > 1:
        # Plant choice is relative to waste value, even when both net values are negative.
        coef[1] = np.where(plant > waste, dep.tonnage, 0.0)

    limit = _limits(case.scenario, coef, twin.upit.in_pit)
    cpit = ob.Cpit(
        name=case.id,
        n_blocks=int(values.shape[0]),
        n_periods=case.scenario.periods,
        discount_rate=case.scenario.discount_rate,
        value=values,
        limit=limit,
        sense=np.full(limit.shape, "L", dtype="<U1"),
        coef=coef,
        resource_names=case.scenario.resource_names,
        period_one_undiscounted=case.scenario.period_one_undiscounted,
    )
    destination_coef = np.zeros((n_res, values.size, 2), dtype=np.float64)
    destination_coef[0, :, :] = dep.tonnage[:, None]
    if n_res > 1:
        destination_coef[1, :, 1] = dep.tonnage
    pcpsp = ob.Pcpsp(
        name=f"{case.id}-synthetic-destinations",
        n_blocks=values.size,
        n_periods=cpit.n_periods,
        n_destinations=2,
        discount_rate=cpit.discount_rate,
        value=np.stack([waste, plant], axis=1),
        forbidden=np.zeros((values.size, 2), dtype=bool),
        limit=cpit.limit.copy(),
        sense=cpit.sense.copy(),
        coef=destination_coef,
        period_one_undiscounted=cpit.period_one_undiscounted,
    )
    reduced = pcpsp.to_cpit()
    if not (np.allclose(reduced.value, cpit.value, atol=1e-6)
            and np.allclose(reduced.coef, cpit.coef, atol=1e-6)):
        raise ValueError(f"{case.id}: synthetic destination economics disagree with CPIT")
    report = validate_instance(
        values=values,
        pstart=twin.precedence.pstart,
        plist=twin.precedence.plist,
        level=level,
        coef=coef,
        limit=limit,
        discount_rate=case.scenario.discount_rate,
        slope_deg=spec.slope_deg,
    )
    return Instance(
        case_id=case.id,
        cpit=cpit,
        precedence=twin.precedence,
        x=ix,
        y=iy,
        level=level,
        grade=dep.grade,
        tonnage=dep.tonnage,
        dims=(grid.nx, grid.ny, grid.nz),
        upit_in_pit=twin.upit.in_pit,
        upit_value=float(twin.upit.pit_value),
        synthetic=True,
        archetype=getattr(spec, "archetype", None),
        report=report,
        pcpsp=pcpsp,
        destination_source="seeded synthetic mining and processing economics",
        grade_source="seeded synthetic grade field",
    )


def _minelib_instance(case: Case) -> Instance:
    spec = case.deposit
    d = MINELIB_CACHE / spec.minelib_id
    stem = d / spec.minelib_id
    if not (stem.with_suffix(".blocks")).exists():
        raise FileNotFoundError(
            f"MineLib instance {spec.minelib_id!r} is not cached at {d}. Run "
            f"'python scripts/fetch_minelib.py {spec.minelib_id}' first. Instances are downloaded "
            "under the academic-download grant and are never committed."
        )

    blocks = ob.read_blocks(stem.with_suffix(".blocks"))
    n = int(blocks["x"].shape[0])
    prec = ob.read_prec(stem.with_suffix(".prec"), n)

    cpit_path = stem.with_suffix(".cpit")
    if cpit_path.exists() and case.scenario.absolute_limits is not None:
        cpit = ob.read_cpit(cpit_path)
        cpit = ob.Cpit(
            name=case.id,
            n_blocks=cpit.n_blocks,
            n_periods=cpit.n_periods,
            discount_rate=cpit.discount_rate,
            value=cpit.value,
            limit=cpit.limit,
            sense=cpit.sense,
            coef=cpit.coef,
            resource_names=case.scenario.resource_names,
            period_one_undiscounted=cpit.period_one_undiscounted,
        )
        values = cpit.value
    else:
        # no published .cpit reachable: declare the scenario, and say so downstream
        values = ob.read_upit(stem.with_suffix(".upit"), n)
        tonnage = blocks["free"][:, spec.tonnage_col - 4]
        if not np.isfinite(tonnage).all() or (tonnage <= 0).any():
            raise ValueError(
                f"{spec.minelib_id}: column {spec.tonnage_col} is not a strictly positive extraction "
                "tonnage; the per-instance column map is wrong and must not be guessed"
            )
        n_res = case.scenario.n_resources
        coef = np.zeros((n_res, n), dtype=np.float64)
        coef[0] = tonnage
        if n_res > 1:
            if spec.process_col is not None:
                coef[1] = blocks["free"][:, spec.process_col - 4]
            else:
                coef[1] = np.where(values > 0, tonnage, 0.0)
        exact = ob.solve_upit(values, prec)
        limit = _limits(case.scenario, coef, exact.in_pit)
        cpit = ob.Cpit(
            name=case.id,
            n_blocks=n,
            n_periods=case.scenario.periods,
            discount_rate=case.scenario.discount_rate,
            value=values,
            limit=limit,
            sense=np.full(limit.shape, "L", dtype="<U1"),
            coef=coef,
            resource_names=case.scenario.resource_names,
            period_one_undiscounted=case.scenario.period_one_undiscounted,
        )

    pcpsp = None
    destination_source = None
    pcpsp_path = stem.with_suffix(".pcpsp")
    if case.category == "published" and pcpsp_path.exists():
        candidate = ob.read_pcpsp(pcpsp_path)
        reduced = candidate.to_cpit()
        if not (candidate.n_destinations == 2
                and reduced.n_blocks == cpit.n_blocks
                and reduced.n_periods == cpit.n_periods
                and reduced.discount_rate == cpit.discount_rate
                and np.allclose(reduced.value, cpit.value, atol=1e-6)
                and np.allclose(reduced.coef, cpit.coef, atol=1e-6)
                and np.allclose(reduced.limit, cpit.limit, atol=1e-6)):
            raise ValueError(f"{case.id}: published PCPSP does not reduce to the CPIT case")
        pcpsp = candidate
        destination_source = "published MineLib PCPSP model"

    exact = ob.solve_upit(cpit.value, prec)
    tonnage = cpit.coef[0]
    # MineLib documents Newman1 column 5 as grade and KD column 7 as CU %.
    # Zuck Small publishes cost, value, rock tonnes and ore tonnes but no grade.
    if spec.minelib_id == "newman1":
        grade = blocks["free"][:, 1] / 100.0
        grade_source = "MineLib Newman1 .blocks grade column (percent)"
    elif spec.minelib_id == "kd":
        grade = blocks["free"][:, 3] / 100.0
        grade_source = "MineLib KD .blocks CU percent column"
    else:
        grade = np.zeros(n, dtype=np.float64)
        grade_source = None
    if not (np.isfinite(grade).all() and (grade >= 0).all() and (grade <= 1).all()):
        raise ValueError(f"{case.id}: grade field is not a finite mass fraction")
    report = validate_instance(
        values=cpit.value,
        pstart=prec.pstart,
        plist=prec.plist,
        level=blocks["level"],
        coef=cpit.coef,
        limit=cpit.limit,
        discount_rate=cpit.discount_rate,
    )
    return Instance(
        case_id=case.id,
        cpit=cpit,
        precedence=prec,
        x=blocks["x"],
        y=blocks["y"],
        level=blocks["level"],
        grade=grade,
        tonnage=tonnage,
        dims=(
            int(blocks["x"].max()) + 1,
            int(blocks["y"].max()) + 1,
            int(blocks["level"].max()) + 1,
        ),
        upit_in_pit=exact.in_pit,
        upit_value=float(exact.pit_value),
        synthetic=False,
        report=report,
        pcpsp=pcpsp,
        destination_source=destination_source,
        grade_source=grade_source,
    )


def build_instance(case: Case) -> Instance:
    """Build the CPIT instance for a case, running CONTRACT 1 on the way."""
    inst = _twin_instance(case) if case.deposit.synthetic else _minelib_instance(case)
    if not inst.report.ok:
        raise ValueError(
            f"case {case.id}: instance rejected by CONTRACT 1: "
            + "; ".join(f"{r['code']}: {r['detail']}" for r in inst.report.rejected)
        )
    return inst
