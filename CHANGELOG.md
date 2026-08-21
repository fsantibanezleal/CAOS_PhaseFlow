# Changelog

All notable changes to PhaseFlow. Format: Keep a Changelog, newest on top.
Versions are `X.XX.XXX` (major.minor.patch, zero-padded); the manifests carry the semver form.

## [0.07.000] - 2026-08-20

### Fixed - the footer was not badly styled, it was badly fed

ADR-0016 asks the footer for a ONE-LINE provenance (engine + citation + licence) and a one-line honest
disclaimer. PhaseFlow was passing an 86-word paragraph and a 60-word paragraph: 174 words. At 0.05.000
that produced a 263px footer and I "fixed" it by capping the height at 96px with an inner scrollbar,
which fixed nothing - it hid two thirds of the text behind a scrollbar nobody would find and cut the
last citation mid-sentence at "Moreno and Newman 2013,". Capping a container is not the same as making
its contents fit.

The text is now the one-line form the ADR specifies, the height cap is gone, and the chrome is
tightened (24px padding and a 1.5 line-height over seven line-boxes, plus a `margin-left: auto` on the
version chip that opened a 271px gap and pushed everything after it onto a fresh row). Footer: 178px to
**122px**, with `overflow: visible` and nothing hidden. The long-form provenance already lives on
Implementation and Benchmark and in the architecture modal, where there is room to read it.

### Fixed - the architecture diagrams were hand-placed and one was clipped

Every diagram positioned each box with a literal x, y and width, then poured the label in without ever
measuring it against the box meant to hold it. That works exactly as long as no string changes length.
It did not: on "What it is" the closing caption started at x=586 and needed about 224px inside a
760-unit canvas, so it shipped as "the gap between them is the honest r", cut mid-word. Several other
labels sat within a few pixels of their own box edge, which is the same defect one translation away
from firing.

Replaced the coordinates with a small layout engine: nodes size themselves from their content, rows
distribute the leftover width as equal gaps, and captions are centred rather than positioned. A label
can now change or be translated into a longer language without running off the drawing.

Also fixed in "The lanes": the artifact-to-live-lane handoff was routed as a down-then-left elbow that
travelled along the bottom row's centre line and passed straight THROUGH the stage box. It now drops
into the empty band between the rows and enters `src/engine/` from above.

### Fixed - the rail carried three levels of chrome for four facts

Four bordered cards holding 804px of content in a 715px rail, so it scrolled and the last section was
cut. The Scenario card alone was 183px to show four short facts, because each fact was a separate `<p>`
with its own margin, inside a card with its own border, padding and internal gap, inside the rail;
and inside the Method card the four KPI readouts were themselves bordered boxes inside that box.

Sections now get ONE hairline between them, the KPI readouts use a tint instead of a border, and the
scenario is a compact label/value list. Scenario 183px to **154px**, rail content 804px to 722px, and
with the footer height returned the rail shows 689px of it and scrolls itself for the rest, which is
what ADR-0071 allows a rail to do.

### Added - a gate for the class of defect, not the instance

`frontend/scripts/check-arch-bounds.mjs`, wired into `npm test` and therefore into CI. It evaluates the
architecture module, and for every label asserts that its span - accounting for `text-anchor` - ends
inside the viewBox, using deliberately pessimistic advance widths so it trips before a browser would.
Verified by reintroducing the exact shipped defect: it fails with
`"the gap between them is the honest numbe" spans x 586..836 (viewBox width 760)`.

There is a browser-driven companion (`tools/visual-verify/_pf-archbounds.mjs`) that checks all five
tabs in both languages against real text shaping; it catches the same defect on the deployed 0.6.2.

## [0.06.002] - 2026-08-20

### Fixed - the reading setting, which is what "ugly UI" was describing

- **The prose ran the full width of the shell.** 1392px at a 1440 viewport is roughly 200 characters per
  line; comfortable running text is 45-75, and past about 90 the eye loses the line return. Every
  content page was deep and genuinely hard to read. Text is now capped at 78ch and the whole content
  column is centred at 1000px so the text, the tables and the figures line up as one document. Tables
  keep the full column and figures keep their own 760px cap.

- **Sentences in table cells were right-aligned.** `.pf-table` right-aligns every column but the first,
  which is correct for numbers and wrong for prose: the Implementation trap descriptions each started at
  a different horizontal position, giving the column a ragged LEFT edge, which is the edge the eye
  returns to on every line.

- **The bound table's note column wrapped into eight-line cells.** In an auto-layout table competing
  with five numeric columns, a sentence like "14 iterations, 109,760 nodes, compiled pricing, bound
  certified by one exact solve" was allotted about 9ch, making one row taller than the four numeric
  columns beside it put together. Column widths pinned; rows measured 52 and 63px after, against roughly
  200 before.

## [0.06.001] - 2026-08-20

### Fixed

- **Every deep route returned HTTP 404 on production while rendering perfectly.** The `spa-404.mjs`
  postbuild copied `index.html` to `404.html`, which is what makes a deep link RENDER on GitHub Pages,
  and that was mistaken for the whole fix. MEASURED on the deployed site after 0.06.000: `/app`,
  `/introduction`, `/methodology`, `/implementation`, `/experiments` and `/benchmark` all answered 404
  with the correct page on screen, so any check that only looks at the screen calls it fine. A shared
  link was a 404 to every crawler and every link-preview fetcher, and the product spec asks for
  200-status deep links. The postbuild now writes a real `index.html` at each route path, including the
  13 `/focus/<caseId>` routes, whose ids are read from the built manifest index rather than hardcoded so
  they cannot drift when a case is added or removed. 19 routes materialised, all verified 200.

## [0.06.000] - 2026-08-20

### Fixed - the App tabs and the content pages, measured on the rendered page

- **The tab row was sliced through the middle on the Analysis tab.** `.tablist` is a flex child with the
  default `flex-shrink: 1`, so a tall panel won the negative-space fight and squeezed it. MEASURED: the
  same six-tab row was 48px on Controls, 31px on Methods and 23px on Analysis, and on Analysis it was
  crushed 9px UNDER its own scrollHeight with `overflow-y: hidden`, so the labels were cut in half and
  the ACTIVE tab was unreadable. Two things were wrong: a row that clipped its own labels, and nav
  chrome that changed size depending on which tab you were looking at. Pinned with `flex: 0 0 auto`.

- **The method ladder chart drew the WORST method as the LONGEST bar.** The fill was `gapPct / worstGap`,
  so on the hero case bench-by-bench (a 50.27 percent gap) nearly filled its track while
  cpitD-local-search (5.20 percent, the best schedule in the ladder) drew a stub. Longer read as better
  and longer was worse. Re-encoded so the track IS the certified bound and the fill is the NPV actually
  captured: `npv/bound` is exactly `1 - gap/100`, so the empty remainder IS the gap, at the same scale
  on every row, with the ceiling shared by construction. Added a ruler, a rung key, and a hatched gap
  remainder. The explanatory callout was rewritten in the same commit, because it described the old
  encoding and would otherwise have contradicted the chart it sits under.

- **Content blocks collapsed to zero height inside the scrolling tab panels.** In a flex column a child
  whose `overflow` is not `visible` loses its automatic minimum size, so it absorbs ALL the shrink when
  content exceeds the panel. MEASURED on Controls: the controls table's `.pf-scroll-x` computed to
  height 0 against a scrollHeight of 268, and the figure wrapper to 26 against 463, so a whole table and
  a 384px diagram rendered as two empty strips while every `overflow: visible` sibling was untouched.

- **Numeric table and ladder cells wrapped**, turning "153.6 M" and "40648 ms" into two-line cells and
  doubling those row heights.

### Changed - the Controls tab is now evidence rather than a claim

- Four PASS chips and a bare `0.0e+0`, with nothing tying the number to the assertion it belonged to,
  became a control-by-control table: what each control asserts, what was measured on THIS case, and only
  then the verdict. Added the gap envelope (best, worst, spread) with what a collapsing spread means on
  `ctrl-abundant`, and the data-contract facts, which the trace carried and no screen showed.

### Changed - the sensitivity surface and the risk panel

- The viridis plane had **no colour scale at all**, so the reader could not tell what yellow meant. Added
  a colorbar labelled in the same units as the hover readout. The rotated y-axis label was drawn at x=12
  while the tick labels were drawn at x=6 and the two collided; both now clear each other. The hover
  hit-test pads were realigned with the drawing pads in the same edit, since they must agree.

- The geological-risk panel plotted four uPlot series against the method INDEX, drawing a line from
  bench-by-bench to nested-shells to toposort-greedy as though the x axis were a continuum, when it is an
  unordered list of algorithms. The method names appeared nowhere. Redrawn as what the data is: a
  categorical range plot, one row per method, P10-to-P90 interval on a shared scale, expected value
  marked inside it, and the best-by-expected and best-by-P10 answers marked ON the rows.

### Added - hand-authored theme-aware diagrams

Every content page carried text, equations and DOIs with nothing drawn. Six figures added, each one
transcribed from the persisted dossiers and placed against the argument it illustrates:

- `PrecedenceCone` and `CumulativeStep` (Methodology): what a precedence cone is, and what dropping
  monotonicity silently permits.
- `BoundGap` (Methodology): bound, true optimum, feasible schedule, and which gap is measurable.
- `TwoLanes` (Implementation): the offline and live lanes and the gate between them.
- `TwoBounds` (Benchmark): the SAME schedule against two ceilings, and why the reported gap shrinks
  without the plan improving by a single block.
- `DegeneracyCollapse` (App / Controls): what the degeneracy control actually compares.
- `ThreePressures` (Introduction) and `CaseRoles` (Experiments).

All strokes and fills are `currentColor` or a CSS variable, so they invert with the theme; all are
`viewBox` plus width 100%, capped at their design width so a supporting figure cannot outshout the H1.

### Fixed - tooling

- `tools/visual-verify/_reach.mjs` defaulted to ChancaDEM's production URL. Running it while checking a
  different product silently audited ChancaDEM and printed a clean pass. `URL` is now required, and the
  gate prints and asserts the subject it actually measured.

## [0.05.000] · 2026-08-18

### Fixed - three defects that made this not at bar

- **The ADR-0071 UI floor had never been applied to this repo.** `.app-shell` measured 1256px tall on a
  900px viewport with `overflow: visible`, so the shell did not own the viewport at all and the document
  scrolled instead. Floor applied; shell now locked at 900/900 with every route carrying its own scroll.
- **The footer ate 29% of the screen.** It measured **263px** because it carries a full paragraph of
  ADR-0016 provenance. That provenance is required and is not deleted: the footer is capped at 96px and
  scrolls its own overflow, so nothing is lost and the instrument gets the screen back.
- **The Profile and Plan charts grew without limit.** `Charts.tsx` attached its ResizeObserver to the
  element uPlot draws INTO, so resizing the plot changed that element's own content box, which re-fired
  the observer, which resized again. The chart grew and took the page with it. The observer now watches
  the PARENT, whose box is set by the layout and does not move when the plot inside it changes, plus a
  sub-pixel no-change guard. `SectionViews.tsx` already did this correctly and was the reference.
- **Play did nothing after the animation ended.** The cursor was left on the last period, so the next
  press started the interval, the first tick immediately re-hit the end condition and playback stopped
  again. Pressing play at the end now rewinds to period 1 and replays.

Verified by driving the browser: `_reach.mjs` all six routes clean with 0 unreachable, and `_pf-check.mjs`
3/3 (page height stable across tabs, play restarts after the run ended, no console errors).

### Still outstanding, and NOT fixed here
Felipe's content review stands: Methodology, Analysis and Controls, Implementation and the Architecture
modal are all flagged as weak content, with no high-quality SVG diagrams, and the classical / SOTA /
beyond-SOTA ladder needs validating and showing. **This release fixes the layout and the behaviour. It
does not make the product publishable.**

## [0.04.001] - 2026-08-10

### Fixed
- **A deep link into the focus route never booted the app.** Vite's `base` was `./`, so every asset
  URL was relative to the CURRENT path: the SPA fallback served at `/focus/<case>` asked for
  `/focus/assets/index-*.js`, got a 404 and rendered an empty body. ADR-0070 asks for deep links that
  return 200 and RENDER, and this one had never rendered, for the whole life of the route.

  It survived every gate because the entry control was only ever exercised by CLICKING from the App,
  which is a client-side navigation with the bundle already loaded. Typed or shared, the same URL was
  a blank page. The browser gate now navigates COLD and checks both halves separately: no asset 404,
  and the route actually rendered. 34 checks.

All notable changes to PhaseFlow. Format: Keep a Changelog, newest on top.
Versions are `X.XX.XXX` (major.minor.patch, zero-padded); the manifests carry the semver form.

## [0.04.000] - 2026-08-10

A seven-dimension audit of the shipped product against every binding rule and against its own claims,
adversarially verified, then acted on. 72 findings survived verification. What follows is what they
were, because the list is more useful than the summary.

### Fixed, blockers
- **A capacity-INFEASIBLE plan was the reported best on three cases, and the DEFAULT selection.**
  `best = max(results, key=npv)` ranked the `beyond` rungs alongside the rest. `min-width` does not
  re-impose capacity and `destination-toposort` solves a richer problem; both say so in their own
  notes, and were ranked anyway. Measured: `min-width` was the reported best on `twin-vein` at a 3.69
  percent gap while overshooting a period capacity by 18.65 percent, and the real best feasible plan
  was 4.09. Worse, it opened the 3D pit on that plan. Ranking now excludes those rungs everywhere,
  ties break by name so a degenerate case is reproducible, and there is no fallback that re-admits
  them.
- **The spatial-coherence KPI was 100x wrong.** `(p?.largestComponentShare ?? 0 * 100)` parses as
  `(share ?? 0)`, so a period where 99.4 percent of the tonnage sits in one component rendered as
  "1%". The chart beside it was correct, so the same screen disagreed with itself, on one of the four
  things the front page sells.
- **The README's trust anchor was two releases stale and denied a shipped capability.** It quoted a
  bound of 24,487,410 (the product uses 24,486,184), a best plan of 23,873,589 (it is 23,875,617), a
  gap of 2.51 percent (2.49), and stated that the exact local search was NOT implemented while that
  rung was number nine of twelve and the best method on that very case.
- **The README's PowerShell block contained raw NUL, SOH and ETX bytes**, so none of its three
  commands could run. A script that wrote it had its backslash escapes collapsed on the way in.
- **Em-dashes in four tracked files while the ADR-0067 gate printed OK.** The gate scanned a
  nineteen-extension allowlist that omitted `.sh`, `.ps1`, `.service` and `.nginx`. It is a denylist
  now, so a new extension is covered by default.
- **The private management repo and a personal drive path were published in a PUBLIC repo**, in six
  files. The CI guard looked for one string and missed all of them.
- **`sliding_window_schedule` was a greedy wearing a citation.** See `oreblocks` 0.5.0: `window` of 1,
  2, 3, 5, 8 and T gave bit-identical schedules. With the real one, the best plan on the published
  instance moves from a 2.49 percent gap to **1.37**, against a published best-known 1.26.
- **The Benchmark page explained its own bound difference backwards**, and the Introduction named the
  wrong method as the product's best.

### Fixed, and each one is a gate that did not exist
- Nothing checked that a committed schedule was FEASIBLE. 23 method rows across 13 cases exceeded a
  period capacity, by up to 447 percent, with every gate green. `check_artifacts.py` now checks
  capacity per rung, array shapes, the live-lane contract, and that the pinned dependencies are the
  ones that baked.
- `frontend/test/contract.test.ts` did not exist, while three module docstrings said a drift would
  fail the build because of it. `tsconfig` did not include `test/` either. Both fixed, and the field
  names are PARSED from the mirror rather than restated, because a third copy of a schema drifts the
  same way the second one did. It immediately caught `ensemble.resolveMethod`, written into twelve
  traces and unknown to the mirror.
- The guard that committed evidence is never overwritten compared an mtime against `1e18` seconds
  since the epoch. It could not fail. It now compares bytes.
- The README's four trust-anchor numbers are read out of the manifest by `check_readme_numbers.py`,
  which also refuses control bytes.
- The two product gates the plan promised and nobody wrote: the period cursor must not move the
  CAMERA (drift measured at 1px of 64), and toggling the theme must change the stage background.
- Tracked `.sh` files must be mode 100755, and the deploy runs the gates itself so a red main cannot
  publish.

### Added
- **The sensitivity surface** the plan promised: the certified bound over discount rate and plant
  capacity, drawn from the bound surrogate in the browser as a plain forward pass, with the case's own
  point marked where the bound WAS computed exactly. `onnxruntime-web` was removed rather than wired
  up: eleven inputs through 24 and 12 hidden units is twenty lines of TypeScript.
- **And the surface immediately found something, which then overturned a published conclusion of our
  own.** Asked to hold the rate and vary capacity, the bound surrogate predicted the bound FALLING as
  capacity rose, on every deposit, while scoring a 1.40 percent mean held-out error. More capacity
  cannot lower an LP bound. The training sweep ran rate and capacity together at a correlation of
  **-0.735**, so it had learned one as a proxy for the other.

  The sweep is crossed now (nine scenarios, correlation +0.234) and both models were retrained on it.
  The bound surrogate is monotone in capacity on **100 percent** of held-out deposits and in rate on
  100 percent, and its error improved to 1.16 percent. The training script measures both directions
  and the panel refuses to draw a plane from a model that breaks one.

  And the expected-time study changed its answer. On the narrow sweep the failures looked like the
  discount rate; on the crossed one they are the OREBODY, on both splits: `core_halo` fails on 80 of
  108 training cases and 36 of 54 held out, `layered` on none of either. The shipped rule is
  `archetype == core_halo`, chosen by F2, and on a THIRD split that had no part in choosing it: recall
  0.82, precision 0.67. The scenario rule it replaces scored 0.44 on that same split. Both wrong
  answers came from the same five-point confounded sweep.
- **The learned guard is a MEASUREMENT where one is available.** Every baked case contains the exact
  plan the learned rung approximates, so the ratio between them is a fact about that case rather than
  a forecast about cases like it. And the rule cannot travel to the live lane at all: it is about the
  orebody, and a real deposit does not arrive with an archetype label. The product says that instead
  of applying a rule with a measured recall of 0.44.
- `docs/methods/10_when_the_surrogate_fails.md`, two hand-authored theme-aware SVG diagrams, and the
  studies committed as `models/learned-failure-modes.json` and `models/guard-validation.json`.

### Two more the gate found only once it could reach them
- **Every artifact fetch was path-relative**, so `/focus/<case>` requested `/focus/data/...`, hit the
  SPA fallback and parsed `index.html` as JSON. Every deep link into the focus route was broken, which
  is the one thing ADR-0070 requires of it, and the gate had never seen it because it always clicked
  through from `/` with a warm cache.
- **A hook after an early return.** The live per-period rows were computed below the loading guard, so
  React counted a different number of hooks between renders and the route died with "Rendered more
  hooks than during the previous render" whenever the trace was still loading.

### Also
- Chart axis and series labels follow the app language (they were hardcoded English, and uPlot prints
  them into the live legend). Brush-to-zoom is back on the x axis and the chart host takes focus.
- The Focus HUD sentence describes the schedule ON SCREEN: it was quoting the baked plan's tonnage
  while the NPV above it followed the live one, and reading "Period 12 of 8".
- The 2D sections re-measure on a resize, `.pf-stagewrap` is declared once, and the method bars fit a
  narrow column.
- Two citations carried the same article number: verified against Crossref, the degradation paper is
  104589 and the blending one is 104638.
- Template residue removed: five publicly served SVGs describing a product this is not, the template's
  own instruction sheet shipped as one of three guides, an empty package skeleton, and a residue gate
  that allowlisted the entire docs tree.
- Engine pinned to `oreblocks[milp]==0.5.1`; `numpy` pinned to what actually bakes.

All notable changes to PhaseFlow. Format: Keep a Changelog, newest on top.
Versions are `X.XX.XXX` (major.minor.patch, zero-padded); the manifests carry the semver form.

## [0.03.000] - 2026-08-10

The two things the last release listed as OPEN, closed: the joint bound now runs on every case, and
the learned rung's worst case has a measured answer to WHEN rather than a caveat.

### Added
- **The joint bound on every case.** It previously ran on nothing but the published instance: the
  time-expanded graph of a deposit twin is 109,760 nodes and 972,904 arcs, and a pure-Python max-flow
  cannot price that in a loop. `oreblocks` 0.4.0 prices with the compiled max-flow and then CERTIFIES
  the result with one exact solve, because the compiled path rounds its integer capacities and the
  slack that costs is the same order as the tightening being measured. Measured on `newman1`: the
  same 24,486,184 as before, now in 746 ms instead of tens of seconds. On the twins the two bounds
  agree to machine precision, which is a RESULT: on those cases one resource alone determines the LP
  and Algorithm 4 was never loose.
- **A measured guard on the learned rung.** The surrogate's worst held-out case is 0.344 of the exact
  plan. The archetype hypothesis (all six training failures are `core_halo`) is REFUTED by the
  held-out deposits, three of whose five failures are `vein`. What survives is the scenario, and it
  is the reading with a mechanism: under heavy discounting the value of a plan depends on precise
  timing, and a surrogate scored as a SORT KEY has the least to give there. The shipped rule,
  `discount rate >= 0.15`, catches 5 held-out failures of 5, flags 40 percent of cases, and leaves no
  unflagged case below 93 percent. It travels WITH the method: `unreliable` in the artifact, a mark
  in the selector, a sentence beside it, and the numbers in the method note.
- `docs/methods/10_when_the_surrogate_fails.md`, and the full study committed as
  `models/learned-failure-modes.json` with every case, both splits, and its covariates.
- Three new gates: a joint bound that was computed must carry ZERO rounding slack, a case without one
  must say why in words, and the learned rung must be flagged exactly where the rule says.

### Fixed
- **A sandbox bake could not use the learned lane.** `--output` redirected the MODELS path too, and
  the models are an INPUT: trained by a separate script and committed. `--output build/local
  --learned` failed on a missing file that was never supposed to be there.
- A tightening of exactly zero printed as `-0.0`, which reads as broken arithmetic rather than as the
  result it is.

Versions are `X.XX.XXX` (major.minor.patch, zero-padded); the manifests carry the semver form.

## [0.02.001] - 2026-08-08

### Fixed
- **The learned scorecard printed `NaN%`** next to four correct numbers, on the deployed site, for a
  release: it read `holdout_npv_vs_greedy_mean`, which was renamed when that metric was fixed.
  TypeScript indexes a `Record<string, number>` happily and a NaN reads as a rendering glitch. The
  panel now shows the median, the P10, the WORST case and the beats-greedy rate, a missing key renders
  as a dash rather than a NaN, and `learned-keys.test.ts` asserts the join between the artifact and
  the panels so it cannot ship again.

### Added
- `npm test` DISCOVERS its tests instead of listing them. The list named four files and only two
  existed: Node silently skips a missing path on Windows and hard-fails on Linux, so the local run was
  green for the wrong reason and the CI runner was the first thing to say so.

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
  CORRECT shape. Corrected here with the reason in the source; the template in the operations toolbox carries
  the same defect.
