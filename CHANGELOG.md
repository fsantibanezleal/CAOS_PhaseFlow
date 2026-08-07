# Changelog

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
