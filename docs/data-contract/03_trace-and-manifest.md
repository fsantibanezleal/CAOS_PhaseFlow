# 03 · CONTRACT 2, the artifact: trace, manifest, index

Every bake writes, per case, a compact **trace** (`phaseflow.schedule-trace/v1`) and a **manifest**
(`phaseflow.manifest/v1`), and one **index** (`phaseflow.index/v1`) for the whole matrix, under
`data/derived/`. The web loads only these; the live lane recomputes but emits the same shapes.

## 1. The trace: `data/derived/<case>/trace.json`

| field | content |
|---|---|
| `schema`, `caseId`, `category`, `title`, `role` | identity; title and role bilingual, transcribed from the case source |
| `instance` | `source` (`twin` or `minelib`), `synthetic`, `nBlocks`, `nPrecedenceArcs`, `gradeSource`, `dims`, `upitValue`, `upitBlocks`, `licence` |
| `scenario` | `periods`, `discountRate`, `periodOneUndiscounted`, `declared`, `resources[{id, name, limitPerPeriod}]` |
| `published` | the published reference values for a published case (problem, source, LP bound, best known, gap) |
| `controls` | duality (set match, bound error), bound, order invariance (error), `allPass`, best and worst comparable gap |
| `bound` | Algorithm 4 (value, time, closure solves), the joint LP (value, time, iterations, converged, graph size, or the reason it was skipped), the PCPSP LP (value, time, rows, status), the bound used, and `skipped_methods` with a reason per missing rung |
| `ensemble` | realisations, sigma, per-method expected, P10, P90, mean-model value, optimism, best by expected and by P10, value of re-planning, `resolveMethod` |
| `learned` | the learned lane's metadata for the case |
| `contract` | `accepted`, `flags`, `facts` from CONTRACT 1 |
| `methods[]` | per method: `method`, `rung`, `heuristic`, `npv`, `bound` (of its own problem), `gapPct`, `runtimeMs`, `minedBlocks`, `notes`, `unreliable`, `measuredVsExact`, `flaggedByRule`, `periods[]`, and for synthetic cases `periodOfBlock` |
| `methods[].periods[]` | `t`, `minedTonnes`, `oreTonnes`, `wasteTonnes`, `headGrade`, `metal`, `value`, `discCashFlow`, `cumNpv`, `stripRatio`, `resourceUse[]`, `resourceLimit[]`, `components`, `largestComponentShare`, `minWidthBlocks`, `blocks` |
| `blocks` (synthetic only) | `x`, `y`, `level`, `grade`, `tonnage`, `processTonnage`, `value`, `inPit`: what the browser needs to re-solve |

**Two sizes of trace, and the difference is a licence, not an engineering choice.** Synthetic twins
commit the full `periodOfBlock` array and the `blocks` section, so the browser replays the pit block by
block and re-solves it. MineLib cases commit aggregates only (see [04](04_licences.md)).

**A destination plan's period rows use the destination the plan chose**: the value and the resource use
of the dump when a nominal ore block is dumped. Charging CPIT's plant value and plant tonnage regardless
once made the chart disagree with the solver's objective and report overruns that did not exist.

## 2. The manifest: `data/derived/manifests/<case>.json`

| field | content |
|---|---|
| `schema`, `case_id`, `category`, `real_or_synthetic`, `default` | identity |
| `engine` | the product and its version, the engine pins (`oreblocks`, numpy) and a one-line solver description |
| `scenario` | periods, rate, first-period convention, resources, `declared`, `capacity_fraction`, `limit_per_period`, `resource_names` |
| `instance` | blocks, arcs, UPIT value and blocks |
| `artifact` | path, format, trace schema, byte size |
| `lane`, `gate` | the measured live-or-replay verdict and every number behind it ([architecture/03](../architecture/03_the-gate.md)) |
| `flags` | CONTRACT 1 flags |
| `controls`, `published` | as in the trace |
| `scoreboard[]` | per method: `method`, `rung`, `npv`, `bound`, `gap_pct`, `runtime_ms`, `notes`, `measured_vs_exact`, `components_mean`, `largest_share_mean`, `utilization`, `extra` (the destination and operability facts) |
| `bound_summary` | as `bound` in the trace |
| `ensemble_summary` | as `ensemble` in the trace |
| `best` | the best comparable plan (classical, sota or learned; ties broken by name) and its gap |

The manifest is what the reading pages and this wiki's generated tables read; the trace is what the app's
case view reads.

## 3. The index: `data/derived/manifests/index.json`

One entry per case: `case_id`, `category`, `manifest_path`, `default`, `lane`, bilingual `title` and
`role`. The full bake (`run.py all`) writes it after every case of the registry has been baked in that
run; a single-case bake does not touch it, so a partial bake is never indexed beside stale cases.

## 4. Enforcement, three mechanisms because one is not enough

1. **The types.** `frontend/src/lib/contract.types.ts` mirrors the schemas, so a drift fails `tsc`.
2. **The re-read at bake time.** `pipeline.py::_validate` re-reads what was written and checks: the
   schema id, case id agreement, at least one method, every plan of every rung below its OWN bound, every
   period's resource use within its limit, period rows matching the horizon, and the licence clause.
3. **The guard in CI and before deploy.** `scripts/check_artifacts.py` checks index to manifests to
   artifacts, byte sizes, `lane == gate`, the engine pin against the version the artifacts were baked with,
   the artifact version against `VERSION`, roles against the case source, capacity on every committed
   plan, every plan under its own bound, a PCPSP LP present for every destination plan and never below the
   joint CPIT LP, and the negative licence clause. It reads; it never runs the pipeline.

And the loaders check the schema id at runtime and throw on a mismatch rather than render three panels
correctly and one silently wrong.

## 5. Reproducibility

A bake is a function of the case definition, the seeds and the engine versions. Every random choice is
seeded (`pipeline/core/rng.py`); no MILP stops on wall-clock time, only on a relative gap, because a time
limit makes the answer depend on the machine. `scripts/compare_rebake.py` compares a fresh sandbox bake
with the committed evidence and lists every changed number; tests never write to `data/derived/`.
