# PhaseFlow 0.10.000 release record

Date: 2026-10-28. Shell: CAOS App Shell 0.19.5. Product template: 0.12.000. Baseline: released 0.09.000.

## Scope

This release refreshes the product-template integration, contract catalog and JSON schemas, readiness record, documentation case studies, bilingual worked notebooks, and frontend content and layout. The Profile and plan visualisation has a bounded responsive height. The workbench layout and reading routes passed the phone, tablet, desktop, light/dark, and English/Spanish browser matrix.

## Scientific data

All thirteen cases were rebaked with the learned methods enabled into an isolated candidate directory. The candidate index and all manifests carry engine version 0.10.000; all thirteen traces include learned-method results. `scripts/check_artifacts.py --root <candidate>` passes, and the field-level comparison at [`artifact-review-0.09.000-to-0.10.000.json`](artifact-review-0.09.000-to-0.10.000.json) reports unchanged scientific outputs. The comparison permits only presentation/product metadata, artifact byte counts, and measured runtime differences; it found no scientific drift.

## Content and contracts

The release includes 26 English and Spanish notebooks (13 mirrored pairs), worked examples and executed outputs, six catalogued data contracts with schemas, a version lock, and a generated readiness record. Detailed case documentation is under [`docs/cases/`](../cases/).

## Verification

- Artifact validation: all 13 candidate cases pass schema, capacity, and control checks.
- Contract catalog: 6 contracts pass.
- Readiness: current for version 0.10.000.
- Generated documentation tables: match committed artifacts.
- Notebook check: 26 notebooks execute in fresh kernels with committed outputs matching.
- Frontend build and tests: pass; Profile and plan sizing verifier covers six viewport sizes.
- Full browser matrix: 632 states per viewport passed at 390x844, 768x1024, 1280x800, 1600x900, and 2560x1440; the focused content-width run also passed 368 states.
- Full Python suite, Ruff, architecture bounds, shell baseline, content and contract checks: pass.
- CI on promotion, merge to `develop`, merge to `main`, Pages deployment, and live SHA/route/Profile checks: pending.
