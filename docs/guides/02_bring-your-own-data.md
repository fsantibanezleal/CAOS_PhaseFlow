# 02 · Bring your own block model

PhaseFlow applies to a NEW deposit, not only to its thirteen cases. The door is CONTRACT 1
([data-contract/02](../data-contract/02_ingestion-gate.md)).

## The steps

1. **Put the instance in the machine's data folder** (`$PHASEFLOW_DATA_DIR/minelib/<id>/<id>.blocks`,
   `.prec`, and `.upit` or `.cpit`; `.pcpsp` if you have destination economics), never in the repository.
2. **Register a case** in `data-pipeline/pipeline/cases/phaseflow_cases.py`: an id, a family, bilingual
   title and ROLE (a case with no role is a case nobody needs), a `DepositSpec(kind="minelib",
   minelib_id=..., tonnage_col=..., process_col=...)` and a `Scenario` (periods, rate, capacity fractions
   or absolute limits, resource names). A scenario you choose is a DECLARATION and the app labels it so.
3. **Bake it into a sandbox**: `./scripts/local/02_generate-data.sh <your-case>`. CONTRACT 1 runs first and
   accepts, flags or rejects with reasons.
4. **Look at it**: `./scripts/local/03_dev.sh` with the sandbox as the data root; your case appears in the
   selector like any other.

## What to get right in the files

- **The column map.** The tonnage column is per instance; the reader refuses a column that is not strictly
  positive and never guesses another.
- **The vertical convention.** Levels increase upward; predecessors sit above. A downward file is rejected.
- **Grade.** Without a grade column the learned rung and the grade charts are skipped; that is correct, not a
  failure. Value per tonne is not grade.
- **Destinations.** Without a `.pcpsp` (or per-destination economics) the destination rungs are skipped;
  nothing is reconstructed from the CPIT value.

## What the contract will tell you

Rejections name the clause: arcs pointing down, a cycle, a block with zero tonnage, a NaN in the objective,
a scenario with no capacity. Each would produce a plausible-looking pit if let through. A scenario whose
total capacity can never exhaust the ultimate pit is a FLAG: legal, common, and the plan is shown truncated
with that said.

## Live or replay

The [lane gate](../architecture/03_the-gate.md) measures your case: under 30,000 blocks, 300,000 arcs and a
6 MiB trace, and redistributable, it also re-solves in the browser when a control moves. Otherwise it replays
from the artifact, which is still the whole product: the live lane accelerates, it never sources a number.

## Outside PhaseFlow

To use only the engine on your files, see [frameworks/01/03](../frameworks/01_oreblocks/03_applying.md).
