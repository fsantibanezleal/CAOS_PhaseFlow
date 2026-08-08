# Frameworks

One card per engine or library the product depends on: what it is, why this one, the exact pin, and
what would make us change it. Every card matches a pin in a `requirements-*.txt` or in
`frontend/package.json`.

- [01, oreblocks](frameworks/01_oreblocks.md): the scheduling engine, a separate repo and a published
  PyPI project
- [02, three.js](frameworks/02_threejs.md): the 3D stage
- [03, uPlot](frameworks/03_uplot.md): the charts
- [04, onnxruntime](frameworks/04_onnxruntime.md): the learned lane's export and its verification

PhaseFlow declares **no package of its own** (`conventions/no-internal-packages.md`). Where an engine
is required it is a separate repo with a published project, consumed pinned, and it is named for the
domain rather than for this product.
