# PhaseFlow 0.07.006 validation record

Date: 2026-10-03. Baseline: released 0.07.005. Issue: #34. Source: the 2026-10-02 pre-publication
review. This release changes presentation and documentation only. No case was re-baked: the
manifests carry the new product version in `engine.version` and `engine_version` and are otherwise
byte-identical to 0.07.005, as in the 0.07.005 release.

## What changed and the evidence for it

- **Infeasible plans.** `largestOverrun` (`frontend/src/lib/feasibility.ts`) reads each schedule's
  per-period `resourceUse` against `resourceLimit`. On the committed artifacts it finds an overrun
  only for `min-width`, on 12 of the 13 cases, from +2.77% (`ctrl-abundant`, processing, period 2)
  to +154.49% (`regime-mining-bound`, mining, period 11); `ctrl-degenerate`'s `min-width` is within
  capacity. On `twin-vein` the overrun is +32.22% processing in period 1, the plan whose NPV
  (288,885,486.29) is above the certified bound (285,385,073.56). Every classical, SOTA and learned
  schedule is within capacity on every case, which `scripts/check_artifacts.py` also asserts.
- **MineLib CPIT check.** [MineLib's results page](https://minelib.org/v1/Results.xhtml), read on
  2026-10-02, lists for `newman1`: ultimate pit 26,086,899; CPIT LP upper bound 24,486,184; best
  known feasible CPIT solution 23,483,671; gap 4.1%. PhaseFlow's committed values are 26,086,899.03,
  24,486,184.09 and 24,149,869.40. The site answered with a bot challenge on 2026-10-03, so the values
  are the ones read the day before.
- **Learned-lane page.** The figures are `models/training-report.json` `expected_time` and `bound`:
  Spearman 0.931, median 0.9626, P10 0.8437, minimum 0.5608, beats greedy 97.2%, bound surrogate mean
  relative error 1.16% (p90 3.50%).
- **Ladder layout.** On the live 0.07.005 Experiments page every ladder track measured 0px at
  1440px. After the change the narrowest track is 230px at 1280px and 102px at 390px, and no panel
  passes the viewport edge.

## Gates executed on the candidate

| Gate | Result |
|---|---|
| `python scripts/check_artifacts.py` | PASS: 13 cases; `min-width` overruns reported as declared |
| `python scripts/check_readme_numbers.py` | PASS |
| `python scripts/check_content_standards.py` | PASS |
| `python scripts/check_template_residue.py` | PASS |
| `.venv/Scripts/python.exe -m pytest -q` | PASS: 12 Python tests |
| `.venv/Scripts/python.exe -m ruff check data-pipeline scripts tests` | PASS |
| `npm test` | PASS: 24 frontend tests (4 new, capacity) and 52 architecture labels within viewBox |
| `npm run build` | PASS: TypeScript, Vite and 19 materialized routes |
| `npm run verify:theme` | PASS: Case and Method selects 14.18:1 (light) and 10.30:1 (dark), colour scheme per theme; fails with the override removed |
| `npm run verify:infeasible` | PASS: label in EN/ES, ladder drawn at 1280 and 390 px, MineLib row |
| `npm run verify:focus` | PASS |
| `npm run verify:grade` | PASS |
| `npm run verify:profile` | PASS at 1600, 1280, 768, 390 and 320 px |

Rendered pages inspected in light and dark: the App with `min-width` selected on `twin-vein`, its
Methods tab, the Experiments ladder at 1440 and 390 px, and the Benchmark's MineLib table.
