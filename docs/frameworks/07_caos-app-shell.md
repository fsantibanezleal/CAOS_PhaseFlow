# 07 · @fasl-work/caos-app-shell: the shared web shell

**What it is.** The shell every CAOS product shares: header with the six routes, language (EN/ES) and theme
(light/dark) toggles, the one-line footer, the architecture modal, citations, and the document components
(`Equation`, `InlineMath`, `Figure`, `Callout`, `Refs`, `Tabs`, `SubTabs`) the reading pages are built from.

**Pin.** `@fasl-work/caos-app-shell@0.19.5` in `frontend/package.json`, resolved from npm and locked in `frontend/package-lock.json`. The corresponding shell repository release tag is `v0.19.005`.

**Current release note.** Shell 0.19.5 localizes its own Spanish labels, keeps long replay badges inside the rail, measures drawings only when enough of them are visible, and lets meaningful case notes use their full height while preserving the workbench stage floor. PhaseFlow opts into `CaseWorkbench`'s `noteFit` because the published-case anchor is part of its case context. The package pin and lockfile are checked by `scripts/check_tech_matrix.py`.

**Why a shared shell.** Products in this line must read as one system and keep one standard of structure
(ADR-0016: the six pages, the header, the footer) and quality (ADR-0071: sized containers, one navigation
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
