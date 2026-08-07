"""Typed objects passed between pipeline stages, the inter-stage contract. Plain dataclasses."""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class Scenario:
    """The scheduling question asked of a deposit: how long, how fast, how impatient.

    This is what ``.blocks``/``.prec``/``.upit`` cannot express and what ``.cpit`` carries. A deposit
    plus a scenario is an instance; a deposit alone is only an ultimate-pit question.
    """

    periods: int
    discount_rate: float
    #: per-period capacity per resource, as a FRACTION of (ultimate-pit resource total / periods).
    #: 1.0 means "just enough to finish exactly on time"; below 1.0 the pit outlives the horizon.
    capacity_fraction: tuple[float, ...] = (1.15,)
    resource_names: tuple[str, ...] = ("mining",)
    #: absolute per-period limits, used instead of the fractions when a published instance declares them
    absolute_limits: tuple[tuple[float, ...], ...] | None = None
    period_one_undiscounted: bool = True

    @property
    def n_resources(self) -> int:
        return len(self.capacity_fraction)


@dataclass(frozen=True)
class DepositSpec:
    """How to obtain the block model: a seeded synthetic twin, or a cached published instance."""

    kind: str  # "twin" | "minelib"
    archetype: str = "porphyry"
    dims: tuple[int, int, int] = (24, 24, 12)
    seed: int = 7
    slope_deg: float = 45.0
    price: float | None = None
    minelib_id: str = ""
    #: 0-based token index of the EXTRACTION tonnage in a .blocks row. Per instance, never guessed:
    #: newman1 col 6 (its own header row order), kd col 4 (the file carries a header naming `tonn`),
    #: zuck_small col 6 (the only strictly positive column, and it dominates col 7 on every row while
    #: col 7 is zero on exactly the blocks whose process value is zero, so 6 is tonnage and 7 is ore).
    tonnage_col: int = 6
    #: 0-based token index of the PROCESSING tonnage, or None when it must be inferred from the value
    process_col: int | None = None

    @property
    def synthetic(self) -> bool:
        return self.kind == "twin"


@dataclass(frozen=True)
class Case:
    """One row of the case matrix: a deposit, a scenario, a role in the argument."""

    id: str
    category: str
    title_en: str
    title_es: str
    deposit: DepositSpec
    scenario: Scenario
    #: what this case is FOR. A case with no role is a case nobody needs.
    role_en: str = ""
    role_es: str = ""
    #: published reference values, when the case reproduces a published instance
    published: dict = field(default_factory=dict)
    #: the case shown on first load. Exactly one case may set it.
    default: bool = False

    @property
    def real_or_synthetic(self) -> str:
        return "synthetic" if self.deposit.synthetic else "real"


@dataclass(frozen=True)
class PeriodRow:
    """One period of a solved schedule: what was mined, what it earned, whether it was coherent."""

    t: int
    mined_tonnes: float
    ore_tonnes: float
    waste_tonnes: float
    head_grade: float
    metal: float
    value: float
    disc_cash_flow: float
    cum_npv: float
    strip_ratio: float
    resource_use: list[float]
    resource_limit: list[float]
    components: int
    largest_component_share: float
    min_width_blocks: int
    blocks: int


@dataclass(frozen=True)
class MethodResult:
    """One method's answer on one case: the plan, its value, and its distance from the bound."""

    method: str
    rung: str  # "classical" | "sota" | "beyond"
    heuristic: bool
    npv: float
    bound: float
    gap_pct: float
    runtime_ms: float
    mined_blocks: int
    period_of_block: list[int]
    periods: list[PeriodRow]
    notes: str = ""
