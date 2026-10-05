# 05 · Run the checks locally

Everything CI runs can be run on a laptop, and so can the slower checks CI deliberately does not run.

## What CI runs (cheap checks only, ADR-0074)

```bash
ruff check data-pipeline tests
python scripts/check_artifacts.py          # CONTRACT 2 on the committed evidence
python scripts/check_template_residue.py   # no template leftovers
python scripts/check_content_standards.py  # no em-dash or emoji in tracked content
python scripts/check_readme_numbers.py     # the README trust anchor equals the artifact
python scripts/docs_tables.py --check      # every measured table in docs/ equals the artifacts
python scripts/check_ci_budget.py          # trunk-only triggers, no training in CI
cd frontend && npm ci && npm run build && npm test   # typecheck, build, engine and parity tests
```

The deploy job runs the same gates again before it publishes.

## What CI does not run, and you should before a release

```bash
python -m pytest -q --basetemp "<the machine's temp folder>/pytest"   # the pipeline tests; one bakes a full twin
cd frontend && npm run verify:theme       # browser gates (Playwright): theme, profile size,
cd frontend && npm run verify:profile     #   grade source, focus capacity, infeasible plans
```

Point pytest's `--basetemp` and Playwright's browsers (`PLAYWRIGHT_BROWSERS_PATH`) at the machine's temp
folder, not the system drive or the repository. The pipeline suite includes a sandbox bake of a 6,912-block
twin (tens of minutes) that asserts the committed trace is byte-identical afterwards: tests never write
canonical artifacts.

## When a check fails

Fix the cause, never the check. Each guard exists because a defect once passed every other gate: a stale
README table, 23 plans over capacity with all gates green, a plan above its own bound, a wiki that disagreed
with its artifacts. If a check is wrong, change it in its own commit and say why.
