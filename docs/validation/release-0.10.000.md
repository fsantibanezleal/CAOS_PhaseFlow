# PhaseFlow 0.10.000 release record

Date: 2026-10-28. Shell: CAOS App Shell 0.19.5. Product template: 0.12.000. Baseline: released 0.09.000.

## Scope

This release refreshes the product-template integration, contract catalog and JSON schemas, readiness record, documentation case studies, bilingual worked notebooks, and frontend content and layout. The Profile and plan visualisation has a bounded responsive height, and the workbench layout and reading routes are being checked across phone, tablet, desktop, light/dark, and English/Spanish states.

## Scientific data

No pipeline solver or scientific method changed, so no fresh numerical bake was run. All thirteen committed case bundles were checked and carried forward from 0.09.000 with only the top-level engine/product version metadata advanced to 0.10.000. The field-level comparison at [`artifact-review-0.09.000-to-0.10.000.json`](artifact-review-0.09.000-to-0.10.000.json) reports unchanged scientific outputs and only allowed metadata or timing differences. This is a version-stamped carry-forward, not a rebake.

## Content and contracts

The release includes 26 English and Spanish notebooks (13 mirrored pairs), worked examples and executed outputs, six catalogued data contracts with schemas, a version lock, and a generated readiness record. Detailed case documentation is under [`docs/cases/`](../cases/).

## Verification

- Artifact validation: 13 cases pass schema, capacity, and control checks.
- Contract catalog: 6 contracts pass.
- Readiness: current for version 0.10.000.
- Generated documentation tables: match committed artifacts.
- Notebook check: 26 notebooks execute in fresh kernels.
- Frontend build and tests: pass; profile sizing verifier covers six viewport sizes.
- Full browser matrix, full Python suite, CI, promotion, and live deployment checks: pending. This record must be updated with their results before release promotion.
