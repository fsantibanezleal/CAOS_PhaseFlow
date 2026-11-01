# 01 · Bake the artifacts

```bash
export CAOS_TEMP_ROOT=/external/scratch CAOS_DATA_ROOT=/external/data
./scripts/local/02_generate-data.sh                        # all thirteen cases -> external stage
./scripts/local/02_generate-data.sh --release --from-stage '<validated external stage>'
```

PowerShell: set `$env:CAOS_TEMP_ROOT` and `$env:CAOS_DATA_ROOT`, then run
`./scripts/local/02_generate-data.ps1` to create the full external candidate. Promotion requires
`./scripts/local/02_generate-data.ps1 -Release -FromStage '<validated external stage>'`. The shared
workflow records source and payload fingerprints, runs the complete registry and validators, and refuses
partial, stale or modified stages. Direct `data-pipeline/run.py <case>` calls remain available for
isolated experiments but cannot create a release candidate.

Train a model candidate into an external directory, then use that same directory as the immutable
model input for a separate artifact bake:

```bash
export CAOS_MODELS_ROOT=/external/model-candidate
python scripts/train_learned.py
export CAOS_MODEL_SOURCE_ROOT="$CAOS_MODELS_ROOT"
./scripts/local/02_generate-data.sh
```

The local workflow binds every staged model byte into its source receipt, runs the bake and artifact
checks against that exact bundle, and promotes models only with the validated artifact stage.

Outputs: `<root>/<case>/trace.json`, `<root>/manifests/<case>.json` and `<root>/manifests/index.json`
([data-contract/03](../data-contract/03_trace-and-manifest.md)). Scientific outputs are deterministic for
fixed inputs and seeds (every random choice is seeded, no solver stops on wall-clock time); measured run
times and byte counts change between bakes.

## Sandbox by default, and why

`data/derived/` is the committed evidence the deployed site replays. Generation writes a full, source-bound candidate into an external `CAOS_TEMP_ROOT`; the repository and system temporary directory are never fallback destinations. The stage must pass source identity, complete case inventory, readiness, contract, artifact and document checks before explicit promotion. `--release --from-stage` revalidates the exact candidate, prepares rollback copies for all promoted directories, and reports retained recovery paths if restoration cannot complete.
## What it costs, and how to run it

The 0.09.000 rebake completed all thirteen cases with oreblocks 0.6.3. The longest measured case took
21.1 hours (`twin-core-halo`); `twin-layered` took 18.8 hours and `kd-declared` 11.5 hours. Per-case
times are recorded in [`release-0.09.000.md`](../validation/release-0.09.000.md). The 0.08.000 release
times remain in [`release-0.08.000.md`](../validation/release-0.08.000.md) for historical comparison.

For the previous 0.08 release, per-case cost was (two BLAS threads each, cases side by side):

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

They land in `$CAOS_DATA_ROOT/minelib` (an external machine data directory; set it before fetching). `PHASEFLOW_DATA_DIR` remains an explicit compatibility alias. The bake reads those files; CONTRACT 2 refuses to commit their per-block data. The external source directory is checked before generation.

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
