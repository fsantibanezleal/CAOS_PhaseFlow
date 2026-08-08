# data/, the contract and the layout

Governed by the two data contracts of ADR-0057. This page is the ingestion side; the artifact side is
[`docs/architecture/08_data-contracts.md`](../docs/architecture/08_data-contracts.md).

## Layout

| Path | What | Git |
|---|---|---|
| `raw/minelib/` | the published MineLib instances, an academic download | **git-ignored**, staged by `scripts/fetch_minelib.py` |
| `examples/` | a tiny instance that PASSES CONTRACT 1, so a fresh clone can verify | committed |
| `derived/<case>/trace.json` | the compact artifact the web replays | committed |
| `derived/manifests/` | `<case>.json` per case plus the flat `index.json` | committed |
| `demo/` | a small deterministic payload for the smoke test | committed |

**The MineLib files are never redistributed.** Their licence does not permit it, so `raw/` is
git-ignored, the artifact of a published instance carries no per-block data, and
`scripts/check_artifacts.py` fails the build if one ever does.

## CONTRACT 1, ingestion

`data-pipeline/pipeline/io/contract.py`. The input is a block model with slope precedence and a
scheduling scenario, in the MineLib family of formats. Every check below exists because it is a real
failure mode, most of them measured on `newman1` during the research pass.

| # | Check | Verdict if violated | Why |
|---|---|---|---|
| 1 | block ids are dense and cover `0..n-1` | reject | a gap turns an array index into the wrong block |
| 2 | precedence arcs point at existing blocks, and the graph is acyclic | reject | a cycle makes the closure problem meaningless and the topological sort loop forever |
| 3 | precedence points **upward** | reject | levels increase upward and predecessors sit above; arcs pointing down are a different problem read as this one, and they grow a pit from the bottom |
| 4 | resource coefficients are non-negative, and the extraction resource is strictly positive per block | reject | a block with zero tonnage consumes no capacity and would be mined free |
| 5 | the objective has no NaN | reject | one NaN propagates into the bound and it is no longer a bound |
| 6 | values at or below `-1e18` are FORBIDDEN-destination sentinels | mapped | reading the sentinel as a cost of 5e19 makes every pit look worthless |
| 7 | at least one period, a discount rate in `(0, 0.5)`, a slope in `[20, 80]` degrees, and enough total capacity to mine something | reject | otherwise the scenario has no answer to give |
| 8 | the capacity can never exhaust the pit | **flag** | a legitimate scenario and a common mistake, so the app SAYS the plan is truncated instead of presenting it as complete |

Rejections carry a code and a detail. Flags are accepted and recorded in the manifest, and the app
surfaces them. Nothing is silently coerced.

## Bringing your own block model

1. Put the instance in a MineLib-family format under `data/raw/` (see `examples/` for a passing file).
2. Register a case in the case registry, giving it a scenario: periods, discount rate, capacities.
3. `./scripts/local/02_generate-data.sh <your-case>` bakes it into `build/local`.
4. The result replays in the SPA exactly like the built-in cases, and the
   [lane gate](../docs/architecture/03_the-gate.md) decides whether it can also be re-solved live in
   the browser.

If your data legitimately does not fit, extend CONTRACT 1 and its tests DELIBERATELY. Never loosen it
so that bad data passes: every clause above is a shape of wrong answer that looks right.
