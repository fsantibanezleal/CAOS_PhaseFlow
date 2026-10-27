# PhaseFlow 0.09.000 validation record

Date: 2026-10-26. Baseline: released 0.08.000. Engine: `oreblocks` 0.6.3, NumPy 2.5.1, HiGHS via
`highspy` 1.15.1. Shell: CAOS App Shell 0.19.2. Template: 0.11.002. All thirteen cases were re-baked.
The committed old bundle was preserved outside the worktree during review. A field-level comparison is
attached at [`rebake-comparison-0.08.000-to-0.09.000.json`](rebake-comparison-0.08.000-to-0.09.000.json).

## What changed

OreBlocks 0.6.3 changes the sliding-window solve: each window is solved cold and the feasible plan is
retained as a floor, rather than passed as a warm start that can close the relative gap near the incumbent.
The exact CPIT and destination bounds are unchanged on all thirteen cases. The selected heuristic schedules
do change: 43 method/case NPV results changed across `sliding-window` (12 cases),
`destination-sliding-window` (10), `destination-local-search` (9), `cpitD-local-search` (2), and
`min-width` (10). Every case keeps the same best-method identity. Across the thirteen best CPIT plans, six
gaps improve, four worsen, and three are unchanged.

| case | best method | gap on 0.08.000 | gap on 0.09.000 | change (percentage points) |
| --- | --- | ---: | ---: | ---: |
| `ctrl-abundant` | `cpitD-local-search` | 0.2580% | 0.2580% | +0.0000 |
| `ctrl-degenerate` | `toposort-greedy` | 0.0000% | 0.0000% | +0.0000 |
| `kd-declared` | `sliding-window` | 6.2252% | 6.4571% | +0.2319 |
| `newman1-published` | `sliding-window` | 1.3735% | 1.4048% | +0.0313 |
| `regime-high-discount` | `sliding-window` | 2.3509% | 1.9179% | -0.4330 |
| `regime-mill-bound` | `sliding-window` | 3.5678% | 3.7955% | +0.2277 |
| `regime-mining-bound` | `sliding-window` | 2.8680% | 2.6784% | -0.1896 |
| `twin-core-halo` | `sliding-window` | 3.1784% | 3.0538% | -0.1246 |
| `twin-layered` | `cpitD-local-search` | 3.5486% | 3.5486% | +0.0000 |
| `twin-porphyry-l` | `sliding-window` | 1.5747% | 1.5788% | +0.0041 |
| `twin-porphyry-s` | `sliding-window` | 1.3436% | 1.1134% | -0.2302 |
| `twin-vein` | `sliding-window` | 0.1704% | 0.0971% | -0.0733 |
| `zuck-small-declared` | `sliding-window` | 2.8150% | 1.9778% | -0.8372 |

The best-plan regressions are bounded: `kd-declared` loses 0.247% NPV, `regime-mill-bound` 0.236%,
`newman1-published` 0.032%, and `twin-porphyry-l` 0.004%. On `twin-layered`, the destination sliding
window loses 1.243% NPV and its destination local search loses 1.153% against the previous bundle; the
best CPIT method and gap remain unchanged. These are heuristic quality changes, not bound changes. The
complete field-level report preserves the changed schedules and metrics for review.

For the MineLib trust anchor, the new schedule is 24,142,200.23 against the 24,486,184.09 joint CPIT
bound: a 1.4048% gap. It is 0.1434% below the external AMPL/Gurobi integer optimum, compared with 0.112%
in 0.08.000. The release updates the app, README, and case discussion to use the new result and retain the
separate CPIT/PCPSP comparison limits.

## Data integrity and cost

`scripts/check_artifacts.py --root <candidate>` passed before promotion; after promotion the same guard
passes the committed `data/derived/` tree. All thirteen cases have a schema-valid trace and manifest,
feasible schedules, and every scored rung remains below the bound of its own problem. All certified
bound values match 0.08.000. The trust-anchor checks and generated docs tables are refreshed from these
manifests.

| case | offline bake time (minutes) |
| --- | ---: |
| `ctrl-abundant` | 18.5 |
| `ctrl-degenerate` | 0.2 |
| `kd-declared` | 689.8 |
| `newman1-published` | 1.2 |
| `regime-high-discount` | 51.1 |
| `regime-mill-bound` | 230.3 |
| `regime-mining-bound` | 60.4 |
| `twin-core-halo` | 1,263.7 |
| `twin-layered` | 1,129.5 |
| `twin-porphyry-l` | 279.3 |
| `twin-porphyry-s` | 125.0 |
| `twin-vein` | 107.9 |
| `zuck-small-declared` | 95.7 |

The strict `compare_rebake.py` mode reports changed scientific fields by design: it has no implicit
allow-list for solver upgrades. The attached comparison covers all 13 cases and 27 files; it reports
45,304 changed field paths and 476 permitted timing/presentation/version paths. The human review above
accepts the measured solver changes explicitly; the report is not represented as a no-drift pass.

## Product changes and verification

- The Profile and plan charts remain bounded through repeated resize/restore at 1600x900, 1280x800,
  768x900, 390x844 and 320x700. Workbench chart heights are bounded separately for phone and tablet
  layouts; the capacity legend clears the shell footer in English and Spanish.
- Shell adoption: `@fasl-work/caos-app-shell` 0.19.2 and template 0.11.002. The app build and browser
  matrix ran against the refreshed data.
- The 0.08.000 docs wiki's generated tables are refreshed from 0.09.000 manifests. EN/ES prose,
  diagrams, controls and methodology explanations are checked against the new results.

| Gate | Result |
| --- | --- |
| `python scripts/check_artifacts.py` | PASS, 13 cases |
| `python scripts/docs_tables.py --check` | PASS, every generated table matches |
| `python scripts/check_readme_numbers.py` | PASS after the trust-anchor refresh |
| `python scripts/check_content_standards.py` | PASS |
| `python scripts/check_sdd.py` | PASS |
| `npm test` and architecture labels | PASS, 30 tests and 52 labels |
| `npm run build` | PASS, 19 materialized routes |
| Profile resize/restore | PASS, 1600x900, 1280x800, 768x900, 390x844, 320x700 |
| grade, theme, infeasibility, stage, focus | PASS, EN/ES provenance and all 13 cases where applicable |
| full shell browser matrix | 1,976 states; all layout, interaction, content, and rendering checks pass. G4 reported three empty captured response bodies for JSON manifests. |
| built Pages-style server JSON check | PASS, all 27 manifest/trace files return HTTP 200 and parse as JSON |
| `python -m pytest -q` in `.venv-pipeline` | PASS, full suite |
| four bilingual notebook executions and freshness check | PASS, 4/4 executed top to bottom; committed outputs are fresh |
| artifact, docs table, README number/area, content, SDD, template-residue, technology-matrix and Ruff guards | PASS |
| GitHub `develop` CI, Pages deployment, deployed URL and live browser gates | Pending promotion |

The G4 result is a shell gate capture limitation, not a missing or malformed shipped file: the shell stores
the first Playwright `response.text()` promise per JSON path, and a few bodies resolve empty after the
browser's route walk. Independent requests through the exact built Pages-style server verified every
manifest and trace as valid JSON; the artifact schema/control guard also passes. The G4 capture remains
reported here as a limitation and is not counted as a fully green shell gate.
