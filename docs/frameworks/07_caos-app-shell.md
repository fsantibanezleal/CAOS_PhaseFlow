# 07 · @fasl-work/caos-app-shell: the shared web shell

**What it is.** The shell every CAOS product shares: header with the six routes, language (EN/ES) and theme
(light/dark) toggles, the one-line footer, the architecture modal, citations, and the document components
(`Equation`, `InlineMath`, `Figure`, `Callout`, `Refs`, `Tabs`, `SubTabs`) the reading pages are built from.

**Pin.** `@fasl-work/caos-app-shell@0.25.0` in `frontend/package.json`, resolved from npm and locked in `frontend/package-lock.json`. The corresponding shell repository release tag is `v0.25.000`.

**Current release note.** Shell 0.25.000 adds the native-select layout for long `VariantBar` lists and prevents a scroll under a resting pointer from changing a chart readout. PhaseFlow has a short native method selector and does not need the variant layout. Its four-step story uses the 0.24.000 measured header band: `SceneCallouts.onLayout` reports the card height, the drawing is padded by that measured band, data anchors and linked markers are remapped into the remaining drawing, and the phone stage floor grows with the band while retaining at least 490 px for the drawing. The product's uPlot charts remain product-owned; the shell's pointer fix does not change their event handling. The shell also supplies compact tab density, guided-story framing, 3D scene frames, reciprocal linked views, reduced-motion transitions and the measured ADR-0082 story gate. Earlier releases added full artifact verification (0.19.12), complete scrollable-document measurement (0.19.11), optional `document` framing for `SurfacePage` and transformed executive-illustration label measurement (0.19.10), and the normal `CaseWorkbench` instrument marker (0.19.9). PhaseFlow's reading pages continue to use `DocPage`; the product keeps its `noteFit` adaptation because the published-case anchor is part of its context. The package pin and lockfile are checked by `scripts/check_tech_matrix.py`.

**Why a shared shell.** Products in this line must read as one system and keep one standard of structure
(the six pages, the header, the footer) and quality (sized containers, one navigation
row). Hand-rolling a header or a footer per product drifts; adopting the shell keeps the floor shared and
fixes it once.

**What PhaseFlow adds on top.** The App (the workbench), the content components of `frontend/src/content/`
(`DocPage`, `TopicGroups`, the data panels and the theme-aware figures), and `phaseflow.css` for what the
shell does not cover.

**What would make us change it.** A missing shared capability belongs in the shell repository with a release and regression gate. PhaseFlow keeps product-specific adaptations in its SDD and frontend gates; it does not fork the shell's shared navigation, accessibility or layout primitives.

| page | content |
|---|---|
| [installation](07_caos-app-shell/01_installation.md) | the pin and the one stylesheet import |
| [usage](07_caos-app-shell/02_usage.md) | the shell config, the footer, the architecture modal, citations, language and theme |
| [applying](07_caos-app-shell/03_applying.md) | adding a page or a topic the way the product does |
