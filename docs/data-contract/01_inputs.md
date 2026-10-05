# 01 · Inputs: what a case is made of

A case is a **block model with slope precedence** plus a **scheduling scenario**. PhaseFlow reads two
kinds: real MineLib instances and seeded synthetic twins. Both become the same in-memory instance
(`data-pipeline/pipeline/model/instances.py::Instance`) and pass the same ingestion gate
([02](02_ingestion-gate.md)).

![From raw inputs to the committed artifact: the two contracts](../assets/data-contract.svg)

## 1. The MineLib family of formats

MineLib (Espinoza, Goycoolea, Moreno and Newman,
[doi:10.1007/s10479-012-1258-3](https://doi.org/10.1007/s10479-012-1258-3)). Formats as measured on the
real `newman1` files during the research pass:

| file | layout | `newman1` |
|---|---|---|
| `.blocks` | whitespace-separated, one row per block, no header; column meaning is **per instance** | 1,060 rows, 11 columns: id, x, y, z, rock type, grade, tonnage, a factor, value at destination 0 (waste), value at destination 1 (process), a flag |
| `.prec` | `<block id> <k> <pred_1> ... <pred_k>`, immediate predecessors only | 1,060 rows, 3,922 arcs; rows with `k = 0` are surface blocks |
| `.upit` | keyword header, then `<id> <value>`: the net value at the per-block best destination | `TYPE: UPIT`, `NBLOCKS: 1060` |
| `.cpit` | header (`NPERIODS`, `NRESOURCE_SIDE_CONSTRAINTS`, `DISCOUNT_RATE`), `RESOURCE_CONSTRAINT_LIMITS` (`<r> <t> <sense> <limit>`), `OBJECTIVE_FUNCTION`, `RESOURCE_CONSTRAINT_COEFFICIENTS` (`<block> <resource> <coef>`) | 6 periods, rate 0.08, limits 2,000,000 and 1,100,000; resource 0 on all 1,060 blocks, resource 1 on 572 ore blocks |
| `.pcpsp` | as `.cpit` plus `NDESTINATIONS` and `NGENERAL_SIDE_CONSTRAINTS`; one objective value per destination; coefficients `<block> <destination> <resource> <coef>` | 2 destinations, 0 general side constraints |

Three facts about these files that shape the reader:

- **The `.blocks` column layout is per instance, not global.** The tonnage column is 6 on `newman1`; the
  case definition carries a per-instance column map (`tonnage_col`, `process_col`) and the reader never
  guesses. A wrong column is caught by internal consistency, not by a schema: the extraction tonnage must
  be strictly positive everywhere.
- **Forbidden destinations are sentinels.** The last `newman1` row carries `-5.36024E+19` as its
  destination-1 value, a large negative that forbids that destination. Values at or below `-1e18`
  (`FORBIDDEN_VALUE`) are read as "destination forbidden", never as a cost; summing the sentinel is how a
  5e19 lands in an NPV.
- **Non-numeric columns are labels.** The rock-type column (`FROR`, `FRWS`, `OXOR`) once crashed the
  reader; non-numeric tokens are now kept as labels rather than coerced.

**Grade.** MineLib documents `newman1`'s grade column ([minelib.org/v1/newman1.xhtml](https://minelib.org/v1/newman1.xhtml))
and KD's copper percentage ([minelib.org/v1/kd.xhtml](https://minelib.org/v1/kd.xhtml)); both are read as
mass fractions (percent / 100) and must be finite and in [0, 1]. Zuck Small publishes cost, value, rock
tonnes and ore tonnes but **no grade**; value per tonne is not grade, so that case carries no grade field
and everything grade-dependent is skipped with the reason recorded.

**Reaching the files.** The canonical site is not fetchable from a script (expired certificate, WAF
challenge). `scripts/fetch_minelib.py` downloads `newman1` with its `.cpit` and `.pcpsp` from the AMPL
mirror and `zuck_small` and `kd` in UPIT form from the whattle mirror, into the machine's data folder
(`$PHASEFLOW_DATA_DIR/minelib`, falling back to the git-ignored `data/raw/minelib`).

## 2. Seeded synthetic twins

`oreblocks.make_twin(archetype, dims, seed, slope_deg)` generates a deposit on a regular grid: one of four
archetypes (`porphyry`, `vein`, `layered`, `core_halo`), a grade field, tonnage, and slope precedence for
the given angle. The pipeline then builds both destination values from the twin's economics (defaults:
price 9,000 per tonne of recovered metal, recovery 0.88, mining cost 2.5 per tonne mined, processing cost
9.0 per tonne milled):

$$
p^{\text{dump}}_b=-c^{\text{mine}}\,q_b,\qquad p^{\text{plant}}_b=\bigl(g_b\,r\,P-c^{\text{proc}}\bigr)\,q_b+p^{\text{dump}}_b,\qquad p_b=\max\bigl(p^{\text{dump}}_b,\,p^{\text{plant}}_b\bigr),
$$

and the plant resource coefficient is the tonnage where $p^{\text{plant}}_b>p^{\text{dump}}_b$ (even when both
are negative: processing use follows the destination, not the sign of the value). The PCPSP built from
these must reduce to the CPIT exactly (`Pcpsp.to_cpit()` reproduces values and coefficients) or the case
is refused.

## 3. The scenario

| field | meaning |
|---|---|
| `periods` | the horizon $T$ |
| `discount_rate` | per period; the first period is undiscounted, as in the MineLib files |
| `capacity_fraction` | per resource, the per-period limit as a fraction of the pit's resource total per period (below 1 binds) |
| `absolute_limits` | per resource and period, when the instance publishes them (`newman1`) |
| `resource_names` | `mining` (every block consumes it) and `processing` (only plant-bound blocks) |

A published scenario is used as published; a declared one says so in the trace (`declared: true`) and on
screen, and its gaps are never compared with a published gap.

## 4. Bringing your own block model

The pipeline accepts any instance in the MineLib family, with your own scenario: see
[guides/02](../guides/02_bring-your-own-data.md). The minimum is a `.blocks` with a strictly positive
tonnage column, a `.prec` whose arcs point upward, and either a `.cpit` or a declared scenario plus a value
per block. Add a `.pcpsp` (or per-destination economics) for the destination rungs and a grade column for
the learned rung.
