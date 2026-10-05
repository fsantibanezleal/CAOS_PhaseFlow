# 05 · The bake

`data-pipeline/`, plain scripts invoked by path; not a package, never installed.

```bash
python data-pipeline/run.py all --learned --jobs 8               # the release bake (writes data/derived)
python data-pipeline/run.py twin-porphyry-s --learned            # one case into data/derived
python data-pipeline/run.py all --learned --output build/local   # a sandbox that cannot touch the evidence
```

(The local scripts wrap these and refuse a single-case release: [guides/01](../guides/01_bake-the-artifacts.md).)

## The stages, in order

| stage | where | what it does |
|---|---|---|
| ingest | `model/instances.py::build_instance` | reads MineLib files or generates a seeded twin, builds values per destination and the scenario's limits, and runs CONTRACT 1 |
| bound and ladder | `stages/solve.py::run_ladder` | Algorithm 4, the joint LP under its budget, the PCPSP LP; every rung, each scored against the bound of its own problem |
| learned | `stages/solve.py` with `model/learned.py` | the learned rung from the committed model, measured against the exact ExTS plan of the case |
| evaluate | `stages/evaluate.py` | the three controls; the ensemble |
| export | `core/trace.py`, `core/manifest.py`, `core/gate.py` | the trace, the manifest with the measured lane verdict |
| validate | `pipeline.py::_validate` | re-read what was written: schema, ids, every plan feasible and under its own bound, the licence clause |

## What `run_ladder` guarantees

- **Every CPIT plan of a case is scored against the same CPIT bound** (the joint LP where it ran, otherwise
  Algorithm 4), and every destination plan against the case's PCPSP LP. A table whose rows quietly use
  different denominators looks exactly like one whose rows do not.
- **A rung that cannot run says so.** The solver-dependent rungs need `oreblocks[milp]`, the joint bound a
  time-expanded graph inside its budget, the destination rungs source economics, the learned rung a grade
  field. Where any is missing, `skipped_methods` carries the REASON; nothing is substituted under a stronger
  name and no field is left blank.
- **A plan above its own bound, or over a capacity, raises.** Not a warning.

## Cost, measured

Hours for the whole set, not minutes. The expensive steps per case are the PCPSP LP (up to about two hours on
the 14,400-block twins), the two sliding windows (the CPIT one and the re-cut one, half an hour to two hours
each on the twins), and the critical multiplier bound on the real instances (about ten minutes on
`zuck-small-declared`). So `--jobs N` runs cases as separate processes, the largest first, and writes the
index only when all of them succeeded.

Two lessons kept in place: every case prints a line as it lands (a silent bake and a stuck bake look
identical, and one cost four hours before anyone could tell), and the ensemble re-solves with `bound=False`
(oreblocks 0.3.1), because computing a bound per realisation was a factor of a hundred spent on a number
nobody read.
