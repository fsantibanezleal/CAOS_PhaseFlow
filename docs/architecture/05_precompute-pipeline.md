# The bake

`data-pipeline/`, plain scripts invoked by path. Not a package, never installed, never imported from
outside this repo (`conventions/no-internal-packages.md`).

```bash
python data-pipeline/run.py all --learned             # the whole case set
python data-pipeline/run.py twin-porphyry-l           # one case
python data-pipeline/run.py all --output build/local  # a sandbox that cannot touch committed evidence
```

## The stages

| Stage | File | What it does |
|---|---|---|
| ingest | `stages/solve.py` (`load_case`) | reads a MineLib `.cpit`/`.pcpsp`, or generates a seeded twin, through CONTRACT 1 |
| solve | `stages/solve.py` (`run_ladder`) | every rung of the ladder, plus both bounds |
| evaluate | `stages/evaluate.py` | the three controls, the spatial coherence, the uncertainty ensemble |
| export | `core/trace.py`, `core/manifest.py` | CONTRACT 2: the trace, the manifest, the index |

## What `run_ladder` guarantees

- **One bound per case, shared by every method.** A table whose rows quietly use different
  denominators looks exactly like a table whose rows do not, so every rung's gap is computed against
  the same number and a test asserts it.
- **A rung that cannot run says so.** Three rungs need a MILP solver, and the Bienstock-Zuckerberg
  bound needs a time-expanded graph inside a measured budget. Where either is unavailable the report
  carries the REASON in words. It never substitutes a weaker method under a stronger name, and it
  never leaves the field blank.
- **A feasible objective above the bound raises.** Not a warning. The bound is the one thing this
  product is for.

## Cost, measured

The whole set is about ninety minutes on one core, dominated by the certified bound, which is a
parametric family of maximum closures per resource in pure Python.

Two things that cost real time and are now fixed in place. `run_all` prints a line per case as it
lands, because a bake that runs for hours with a silent stdout is indistinguishable from a bake that
is stuck: one of them cost four hours before anyone could tell which. And the uncertainty ensemble
re-solves with `bound=False` (oreblocks 0.3.1), because it compares NPVs across realisations and never
reads a bound: computing one per realisation was a factor of a hundred spent on a discarded number.
