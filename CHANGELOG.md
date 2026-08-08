# Changelog

All notable changes to PhaseFlow. Format: Keep a Changelog, newest on top.
Versions are `X.XX.XXX` (major.minor.patch, zero-padded); the manifests carry the semver form.

## [0.02.000] - 2026-08-08

The full method ladder: 12 methods across 4 rungs, two bounds, a learned lane, an uncertainty
ensemble, and a docs wiki with the theory behind each.

### Added
- **A second bound.** Algorithm 4 relaxes the resources one at a time and keeps the smallest, which is
  certified and LOOSE. `cpit_bz_bound` computes the JOINT Bienstock-Zuckerberg bound. The difference
  between them is the part of a reported gap that belongs to the BOUND rather than to the plan, and
  the App shows both and names which one it used. On the published `newman1.cpit`: Algorithm 4
  24,487,410, BZ 24,486,184 in 9 iterations, correctly below the published PCPSP LP bound of
  24,486,549. Where the time-expanded graph exceeds a MEASURED budget for a pure-Python max-flow, the
  report says so in words rather than leaving the field blank.
- **`sliding-window`** (Cullenbine, Wood and Newman 2011): the industrial baseline.
- **`cpitD-local-search`**: the EXACT restricted re-solve (Chicoisne et al. section 3.3), the rung the
  shift neighbourhood is explicitly not.
- **`destination-toposort`**: PCPSP, where the cutoff grade becomes an OUTPUT of the schedule rather
  than an input. Labelled `beyond` and NOT NPV-comparable with the CPIT rungs, which the app says.
- **`min-width`**: operability, reporting how many slivers were absorbed and what it cost in NPV.
- **The learned lane**: an expected-time surrogate that produces an ExTS-quality schedule with NO LP
  solve, and a bound surrogate for the sensitivity surface. Trained in explicit numpy Adam, exported
  to real ONNX with the standardisation folded into the graph, and the export EXECUTED with
  onnxruntime and compared against the numpy forward pass before the file is written. Split by
  DEPOSIT SEED, never by row. Held out: Spearman 0.901, median 0.9997 of exact ExTS, P10 0.938,
  **worst case 0.344**, beats greedy on 97 percent of held-out cases.
- **An uncertainty ensemble**: spatially correlated and mean-preserving, P10/P90 per plan, the robust
  choice by P10, the optimism of the single-model forecast, and the value of re-planning.
- **`docs/methods/`**: eight pages, each with the theory, the citations, and the bug that method
  shipped with.
- App: a fourth **Analysis** tab (two bounds, learned scorecard, risk fan, rung summary); Methodology
  gains a **Learned** sub-tab; Benchmark gains the two-bound table and the learned scorecard.

### Fixed
- **The pit rendered UPSIDE DOWN.** Levels increase upward, and the vertical axis was negated, so the
  deepest bench, the only one entirely outside the pit, became a flat lid across the top and hid the
  excavation. The wall share, the coherence and the drawn count were all correct throughout.
- **Every block rendered BLACK.** `vertexColors: true` on an `InstancedMesh` also defines `USE_COLOR`,
  which multiplies by a per-vertex colour attribute `BoxGeometry` does not have, and WebGL supplies
  (0,0,0). The stage still measured 98 distinct colours and 62 percent non-background, because the
  specular highlight survives. After the fix, 75 percent of the drawn stage carries period colour,
  against zero saturated pixels out of 19,563 sampled before it.
- **Five hidden tab panels were still laid out**, as empty 76px boxes above the active one, stealing
  380px. `[hidden] {display:none}` is one class of specificity and the stage rule was two.
- **The Analysis tab white-screened the entire app** on a case baked before the fields it reads
  existed. Fixed twice over: the fields are optional in the contract with an honest ABSENT panel, and
  a `PanelBoundary` keeps a panel that throws from taking anything else with it.
- **The section sliders opened on empty slices**, the outermost northing and the deepest bench. They
  now default to the middle slice and the bench where the most rock is moved.
- **The pit section carried 2.1x unlabelled vertical exaggeration**, so the 45 degree slope the
  precedence graph enforces read off the drawing as 63. One scale for both axes now.
- **The stage showed nothing while it prepared**, with no indication. It now says so, and clears the
  message when a frame actually lands rather than after a timeout.
- **Four charts across a full-width stage** left each 290px wide with 250px of empty page underneath.
  Two columns, 300px plots.
- **The pipeline stamped its own version**, one release behind, onto every artifact including the
  cache-busting query. It reads `VERSION` now.
- **A bake printed nothing until it finished**, so a stuck bake and a slow one looked identical for
  four hours. One line per case as it lands.
- **The App stage was 22 percent of the viewport** against the ADR-0071 rule 8 floor of 50 percent.
  The break was the shared shell's `.tabs` wrapper: a plain BLOCK, so as a flex item it sized to its
  content at 359px and every descendant inherited that ceiling. Presence, pixel sampling and
  no-scroll all passed on it. Fixing the tab panel alone, as the previous release tried, was not
  enough.

### Notes
- Engine bumped to `oreblocks[milp]` 0.3.1, for `solve_cpit(..., bound=False)`. The uncertainty
  ensemble was computing the certified bound once per realisation and never reading it: the first full
  bake ran four hours and finished one case of thirteen. All thirteen now bake in about 90 minutes.
- Engine bumped to `oreblocks[milp]` 0.3.0. Three rungs need a MILP solver; without it they record
  NOT RUN with the reason rather than substituting a weaker method under the stronger name.

All notable changes to PhaseFlow. Format: Keep a Changelog, newest on top.
Versions are `X.XX.XXX` (major.minor.patch, zero-padded); the manifests carry the semver form.

## [0.01.000] - 2026-08-07

First release. An open-pit production schedule, solved with a certified bound and animated year by
year over the block model.

### Added
- **Engine**: `oreblocks` 0.2.x consumed as a pinned PyPI dependency. PhaseFlow declares no package
  of its own (`conventions/no-internal-packages.md`, ADR-0057); `data-pipeline/` is repo-local
  tooling invoked by path.
- **Method ladder** on every case: bench-by-bench and nested-shells (classical), greedy and Gershon
  TopoSort (classical), the critical multiplier certified bound, expected-time TopoSort, Algorithm 4
  for two resources, and a shift local search (SOTA). Every schedule carries its gap to the same
  certified bound.
- **Thirteen cases** across five categories, each with a stated role: the published `newman1.cpit`
  solved as published, two real block models under declared scenarios, four seeded archetypes, three
  capacity regimes, and two controls.
- **Three controls** run on every case and recorded in the artifact: duality (rate 0 with unlimited
  capacity reproduces the exact ultimate pit block for block), bound (no feasible objective exceeds
  the certified bound), and order invariance. All 13 cases pass.
- **Spatial coherence** per period: connected components, largest-component share and narrowest
  mined run. Nothing in the line reported this before, and the algorithm's own authors predict
  block-level schedules scatter.
- **The void-boundary rendering**: each standing block adjacent to an already-mined one takes the
  period of the neighbour that exposed it, so the pit wall is 100 percent period-coloured at every
  frame including the last. Measured at the final frame on the shipping case: that wall is 33 percent
  of everything visible from outside, against 0 percent for the carve-away rendering.
- **A live TypeScript engine** (`frontend/src/engine/`) that re-solves the whole problem in the
  browser, so the ADR-0070 focus route's discount rate, capacities and slope angle move the answer
  rather than switching between baked chips. A parity test asserts it reproduces the Python bound.
- Six pages, the ADR-0058 architecture modal with hand-authored theme-aware SVGs, EN and ES, light
  and dark, and the ADR-0071 UI floor.
- CI: lint, pytest, a sandboxed pipeline smoke that never touches committed evidence, the CONTRACT 2
  drift guard, the frontend build, and the engine, parity and product gates.

### Notes
- Both `check_template_residue.py` token lists were stale after the no-internal-packages sweep:
  `data-pipeline/pipeline/` and the word `pipeline` were forbidden, although both are now the
  CORRECT shape. Corrected here with the reason in the source; the template in CAOS_MANAGE carries
  the same defect.
