# Frameworks: what the product is built with

One card per engine or library the product depends on (what it is, the exact pin, why this one, what it is
not used for, what would make us change it), and for each a folder with installation, usage in this
product, and how to apply it elsewhere. Every card matches a pin in a `requirements-*.txt` or in
`frontend/package.json`.

| # | framework | role | pin |
|---|---|---|---|
| 01 | [oreblocks](frameworks/01_oreblocks.md) | the scheduling engine: bounds, ladder, destinations, operability, ensemble | `oreblocks[milp]==0.6.1` |
| 02 | [three.js](frameworks/02_threejs.md) | the 3D stage: one instanced mesh, the void-boundary rule | `three@^0.171.0` |
| 03 | [uPlot](frameworks/03_uplot.md) | the interactive charts with a value readout at the cursor | `uplot@^1.6.31` |
| 04 | [ONNX and onnxruntime](frameworks/04_onnx.md) | the learned models' portable export and its verification (offline only) | `onnx==1.22.0`, `onnxruntime==1.28.0` |
| 05 | [scipy and HiGHS](frameworks/05_scipy-highs.md) | the LP and MILP solver behind five rungs and the PCPSP LP | `scipy==1.18.0` |
| 06 | [KaTeX](frameworks/06_katex.md) | the equations on the reading pages, through the shell | `katex@^0.16.11` |
| 07 | [caos-app-shell](frameworks/07_caos-app-shell.md) | the shared header, footer, theme, language, modal, citations and document components | `@fasl-work/caos-app-shell@^0.6.13` |

Also in the stack, without a card because nothing product-specific rides on them: numpy (`numpy==2.5.1`,
the arrays and the hand-written MLP and Adam), React 19 with React Router 7, Vite 6 and TypeScript 5, and
Playwright for the browser gates (a development dependency; browsers installed under the machine's temp
folder).

PhaseFlow declares **no package of its own** (`conventions/no-internal-packages.md`): where an engine is
required it is a separate repository with a published project, consumed pinned, and named for the domain
rather than for this product.
