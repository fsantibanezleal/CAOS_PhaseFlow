"""Features for the two learned methods, and the honest statement of what they are allowed to do.

Both learned models accelerate something the exact engine can already do; **neither certifies
anything**. The certified bound always comes from the critical multiplier algorithm, and every
learned prediction is scored against the exact quantity it approximates, on deposits the model never
saw. That is the same discipline PitForge uses for its learned pit preprocessing: learning orders
the work, the exact method still decides.

**Learned method 1, the expected-time surrogate.** The best published rounding heuristic (ExTS)
needs the LP relaxation first, because its block weight is the LP's expected extraction time ``E_b``.
That is a sequence of maximum-closure solves. The surrogate predicts ``E_b / (T + 1)`` directly from
block-local and scenario features, so a schedule can be produced with **no LP solve at all**. Useful
when a user is dragging a slider; honest because the exact ExTS is one click away and the app reports
both.

**Learned method 2, the bound surrogate.** Predicts ``bound / upit_value`` from deposit summary
statistics plus the scenario, so a sensitivity surface over discount rate and capacity can be drawn
instantly instead of after a few hundred closure solves. The exact bound is computed for the selected
point, so the surface is always anchored by at least one true value, and the held-out error is on
screen.

Leakage safety: splits are by **deposit seed**, never by row. A model that saw one scenario of a
deposit must never be evaluated on another scenario of the same deposit, because the block-level
features are nearly identical and the score would be meaningless.
"""

from __future__ import annotations

import numpy as np

import oreblocks as ob

from ..io.schema import Scenario

#: Names in order. The TypeScript live lane reads this exact order from the manifest.
BLOCK_FEATURES: tuple[str, ...] = (
    "value_norm",
    "tonnage_norm",
    "depth_frac",
    "cone_size_norm",
    "cone_value_norm",
    "grade_norm",
    "radial_frac",
    "in_pit",
    "rate",
    "capacity_frac_0",
    "capacity_frac_1",
    "periods_norm",
)

DEPOSIT_FEATURES: tuple[str, ...] = (
    "log_n_blocks",
    "pit_fraction",
    "pit_value_norm",
    "grade_mean",
    "grade_p90",
    "ore_fraction",
    "strip_ratio",
    "rate",
    "capacity_frac_0",
    "capacity_frac_1",
    "periods_norm",
)


def _cone_stats(prec: ob.Precedence, values: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """Size and total value of the transitive cone ABOVE each block (its predecessor closure).

    Computed by a level-ordered sweep over the precedence DAG. This is the quantity a planner reasons
    about without naming it: how much rock sits on top of this block, and is any of it worth money.
    """
    n = values.shape[0]
    size = np.zeros(n, dtype=np.float64)
    val = np.zeros(n, dtype=np.float64)
    # process in an order where every predecessor is done first: a topological order of the DAG
    order = ob.toposort_order(prec, np.zeros(n))
    seen: list[set[int]] = [set() for _ in range(0)]
    _ = seen
    # exact transitive closure is quadratic; the immediate-predecessor recursion below is the
    # standard linear approximation used as a FEATURE (not as a constraint), and it is monotone.
    for b in order:
        preds = prec.preds(int(b))
        if preds.size == 0:
            continue
        size[b] = float(preds.size + size[preds].max(initial=0.0))
        val[b] = float(values[preds].sum() + val[preds].max(initial=0.0))
    return size, val


def block_feature_matrix(
    *,
    values: np.ndarray,
    tonnage: np.ndarray,
    grade: np.ndarray,
    level: np.ndarray,
    x: np.ndarray,
    y: np.ndarray,
    in_pit: np.ndarray,
    prec: ob.Precedence,
    scenario: Scenario,
    dims: tuple[int, int, int],
) -> np.ndarray:
    """(n, len(BLOCK_FEATURES)) float32 matrix. Deterministic and scale-free."""
    n = values.shape[0]
    nx, ny, nz = dims
    vscale = max(1.0, float(np.abs(values).max()))
    tscale = max(1.0, float(tonnage.max()))
    gscale = max(1e-9, float(grade.max()))
    cone_size, cone_value = _cone_stats(prec, values)

    cx, cy = (nx - 1) / 2.0, (ny - 1) / 2.0
    radial = np.sqrt(((x - cx) / max(1.0, cx)) ** 2 + ((y - cy) / max(1.0, cy)) ** 2)

    caps = list(scenario.capacity_fraction) + [0.0]
    f = np.zeros((n, len(BLOCK_FEATURES)), dtype=np.float32)
    f[:, 0] = values / vscale
    f[:, 1] = tonnage / tscale
    f[:, 2] = 1.0 - (level / max(1, nz - 1))  # 0 at the surface, 1 at the deepest bench
    f[:, 3] = cone_size / max(1.0, cone_size.max())
    f[:, 4] = cone_value / vscale / max(1.0, cone_size.max())
    f[:, 5] = grade / gscale
    f[:, 6] = np.clip(radial, 0.0, 2.0) / 2.0
    f[:, 7] = in_pit.astype(np.float32)
    f[:, 8] = scenario.discount_rate
    f[:, 9] = min(3.0, caps[0]) / 3.0
    f[:, 10] = min(3.0, caps[1]) / 3.0
    f[:, 11] = scenario.periods / 20.0
    return f


def deposit_feature_vector(
    *,
    values: np.ndarray,
    tonnage: np.ndarray,
    grade: np.ndarray,
    in_pit: np.ndarray,
    upit_value: float,
    scenario: Scenario,
) -> np.ndarray:
    """(len(DEPOSIT_FEATURES),) float32 summary of a deposit under a scenario."""
    n = values.shape[0]
    ore = values > 0
    pit_t = float(tonnage[in_pit].sum())
    ore_t = float(tonnage[in_pit & ore].sum())
    waste_t = max(1e-9, pit_t - ore_t)
    caps = list(scenario.capacity_fraction) + [0.0]
    v = np.zeros(len(DEPOSIT_FEATURES), dtype=np.float32)
    v[0] = np.log10(max(10.0, n)) / 7.0
    v[1] = float(in_pit.mean())
    v[2] = float(upit_value) / max(1.0, float(np.abs(values).sum()))
    v[3] = float(grade.mean()) / max(1e-9, float(grade.max()))
    v[4] = float(np.quantile(grade, 0.9)) / max(1e-9, float(grade.max()))
    v[5] = ore_t / max(1e-9, pit_t)
    v[6] = min(20.0, waste_t / max(1e-9, ore_t)) / 20.0
    v[7] = scenario.discount_rate
    v[8] = min(3.0, caps[0]) / 3.0
    v[9] = min(3.0, caps[1]) / 3.0
    v[10] = scenario.periods / 20.0
    return v
