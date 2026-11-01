# 07 · @fasl-work/caos-app-shell: the shared web shell

**What it is.** The shell every CAOS product shares: header with the six routes, language (EN/ES) and theme
(light/dark) toggles, the one-line footer, the architecture modal, citations, and the document components
(`Equation`, `InlineMath`, `Figure`, `Callout`, `Refs`, `Tabs`, `SubTabs`) the reading pages are built from.

**Pin.** `@fasl-work/caos-app-shell@0.19.12` in `frontend/package.json`, resolved from npm and locked in `frontend/package-lock.json`. The corresponding shell repository release tag is `v0.19.012`.

**Current release note.** Shell 0.19.12 keeps complete JSON artifact verification valid when navigation interrupts a page-owned response-body read or a conditional response has no body. The verifier performs one bounded complete GET against the observed URL, preserves authorization context, records the transport retry and still rejects empty, malformed and HTML responses. This changes the deployed-site gate only; shell components, PhaseFlow layout and scientific calculations are unchanged. Shell 0.19.11 added readable viewport evidence for complete scrollable documents while retaining clipping, hidden-text and rendered-font checks. Shell 0.19.10 added optional `document` framing to `SurfacePage`; PhaseFlow's reading pages use `DocPage`, so their framing remains unchanged. That release also measures transformed executive-illustration labels. Shell 0.19.9 adds `data-instrument` to the normal `CaseWorkbench` root, matching Focus mode and satisfying gate G6. Shell 0.19.6 marks SPDX licence identifiers `translate="no"`; PhaseFlow uses MIT and continues to opt into `CaseWorkbench`'s `noteFit` because the published-case anchor is part of its case context. The package pin and lockfile are checked by `scripts/check_tech_matrix.py`.

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
