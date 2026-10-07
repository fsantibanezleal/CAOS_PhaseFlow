# 01 · Bake the artifacts

```bash
./scripts/local/02_generate-data.sh                        # all cases -> build/local (a sandbox)
./scripts/local/02_generate-data.sh twin-porphyry-s        # one case  -> build/local
PHASEFLOW_BAKE_JOBS=8 ./scripts/local/02_generate-data.sh --release   # all cases -> data/derived
```

PowerShell: `.\scripts\local\02_generate-data.ps1 [-Case <id>] [-Release] [-Jobs 8]`. Underneath, both call
`python data-pipeline/run.py <case|all> --learned [--output DIR] [--jobs N]`.

Outputs: `<root>/<case>/trace.json`, `<root>/manifests/<case>.json` and `<root>/manifests/index.json`
([data-contract/03](../data-contract/03_trace-and-manifest.md)). Scientific outputs are deterministic for
fixed inputs and seeds (every random choice is seeded, no solver stops on wall-clock time); measured run
times and byte counts change between bakes.

## Sandbox by default, and why

`data/derived/` is the committed evidence the deployed site replays. Writing it is a RELEASE action and
takes an explicit flag, and a release bake of a single case is refused: a tree that mixes two engine
versions is internally consistent and passes every per-case check there is. Tests always bake into a
sandbox and assert the committed files are byte-identical afterwards.

## What it costs, and how to run it

The whole set takes about a day; the longest case of the 0.08 release took 22.4 hours. Per case, two BLAS threads each, cases side by side (the
0.08 release; every number per case is in `docs/validation/release-0.08.000.md`):

| step | where it bites |
|---|---|
| the PCPSP bound | HiGHS: 2 to 160 minutes up to 1.1 million rows (159 on `twin-porphyry-l`); above that its Lagrangian dual, about 15 minutes on a 14,400-block twin |
| the CPIT sliding window | 7 minutes to 13.4 hours on the twins (802 minutes on `twin-layered`), 132 minutes on `zuck-small-declared`, 632 on `kd-declared` |
| the re-cut sliding window | 9 minutes to 9 hours on the twins (538 minutes on `twin-layered`, 378 on `twin-core-halo`) |
| the critical multiplier bound | 10 minutes on `zuck-small-declared`, 20 on `kd-declared` |
| everything else | seconds to minutes |

Most window MILPs close at the root node in seconds to minutes. A few do not: their LP solution is far from
integral and the first feasible solution is poor, and one such window can run for hours (KD's last full
window; the fifth window of `twin-layered`, a 172 percent gap at the root). The bake keeps a relative gap
and no time limit, because a time limit would make the plan depend on the machine, so a release bake is
long and this table says so.

So the cases run side by side: `--jobs N` bakes N cases at once as separate processes, the largest first,
and writes the index only if every case succeeded. Each process sets two BLAS threads unless told
otherwise. Mind the memory: the HiGHS LP of the 10,976-block twin holds about 1.1 million rows, and eight
cases at once used most of 48 GB. The bake prints a line per case as each lands, so a slow bake and a stuck one are
distinguishable; to see where a case is, `py-spy dump --pid <pid>` (that is how a four-hour runaway was
once diagnosed as the ensemble computing a bound per realisation and never reading it).

## The MineLib instances

An academic download, never redistributed:

```bash
python scripts/fetch_minelib.py --all
```

They land in `$PHASEFLOW_DATA_DIR/minelib` (the machine's data folder; set it) or the git-ignored
`data/raw/minelib`. The bake reads them; CONTRACT 2 refuses to commit their per-block data.

## After a release bake

```bash
python scripts/check_artifacts.py                                # CONTRACT 2 on the committed tree
python scripts/compare_rebake.py <candidate> --output <report>   # every changed number, before promoting
python scripts/docs_tables.py                                    # rewrite the wiki's measured tables
python scripts/check_readme_numbers.py                           # the README trust anchor
cd frontend && node scripts/measure-learned-preview.mjs          # the learned-preview timing table
cd frontend && npm test                                          # browser engine parity against the trace
```

`compare_rebake.py` lets only titles, roles, version stamps, byte counts and measured times change without
review; a changed bound, NPV, schedule, control or lane is listed for a decision. The parity test is the one
that matters after an engine change: it rebuilds the same instance in TypeScript and compares the
precedence, the pit block for block, the objective and the bound.
