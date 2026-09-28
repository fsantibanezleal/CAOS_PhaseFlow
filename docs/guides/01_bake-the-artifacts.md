# Guide: bake the artifacts

```bash
./scripts/local/02_generate-data.sh                    # all cases -> build/local (a sandbox)
./scripts/local/02_generate-data.sh twin-porphyry-l    # one case  -> build/local
./scripts/local/02_generate-data.sh --release          # all cases -> data/derived (the committed set)
```

Outputs land as `data/derived/<case>/trace.json`, `data/derived/manifests/<case>.json` and
`index.json`. Scientific outputs are deterministic for fixed inputs and seeds; measured wall times
and resulting byte counts can change between bakes.

## Sandbox by default, and why

`data/derived/` is the committed evidence the deployed site replays. A bake that writes it is a
RELEASE action, so it takes an explicit flag, and a release bake is refused for a single case: the
index is built from the manifests on disk, so a tree that mixes two engine versions is internally
consistent and passes every per-case check there is.

## What it costs

Plan for a long run on one core, dominated by the certified bound on `zuck-small-declared` and
`kd-declared`. It prints a line per case as each lands, so a slow bake and a stuck bake are
distinguishable. If you need to know where
it is inside a case:

```bash
.venv/Scripts/py-spy.exe dump --pid <pid>
```

That is not a debugging nicety here. It is how a four-hour runaway was diagnosed as the uncertainty
ensemble computing the certified bound once per realisation and never reading it.

## The MineLib instances

They are an academic download and are never redistributed:

```bash
python scripts/fetch_minelib.py --all
```

They land in a git-ignored folder. The bake reads them, and CONTRACT 2 refuses to commit their
per-block data: a published case ships numbers and charts, not a 3D replay, and the app says which.

## After a release bake

```bash
.venv/Scripts/python.exe scripts/check_artifacts.py --root build/release-candidate
.venv/Scripts/python.exe scripts/compare_rebake.py build/release-candidate --output build/rebake-comparison.json
# Inspect the report before promoting the complete candidate into data/derived.
.venv/Scripts/python.exe scripts/check_artifacts.py    # CONTRACT 2 on the committed tree
cd frontend && npm test                                # parity against the offline lane
```

`compare_rebake.py` permits only titles, roles, version stamps, byte counts and measured times to
change without review. A changed bound, NPV, schedule, control or lane fails it. The artifact guard
also compares the published case metadata and product version with the source registry.

The parity test is the one that matters after an engine change: it rebuilds the same instance in
TypeScript and compares the precedence arcs, the pit membership block by block, the objective and the
bound.
