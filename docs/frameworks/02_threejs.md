# 02 · three.js: the 3D stage

**What it is.** The renderer behind the stage: one `InstancedMesh` of boxes, one instance per block,
whose colours and count are mutated in place as the period cursor moves.

**Pin.** `three@^0.171.0` (and `@types/three`) in `frontend/package.json`, with `OrbitControls` from
`three/examples/jsm`.

**Why this one.** The stage draws up to 14,400 identical cubes and re-colours them at cursor speed.
Instancing is the whole requirement, and it is a first-class primitive here. A points-based or SVG view
cannot show a bench face, which is what a planner reads.

**What it is not used for.** The pit profile and the bench plan are plain 2D canvas: the drawings the
discipline already reads, cheap, and with no reason to go through a 3D renderer.

**What would make us change it.** A stage that needs a hundred thousand blocks at interactive rates, where
the answer is a shader over a 3D texture rather than an instanced mesh.

| page | content |
|---|---|
| [installation](02_threejs/01_installation.md) | the pin and the import paths |
| [usage](02_threejs/02_usage.md) | build once, mutate per cursor; the void-boundary rule; two defects it taught |
| [applying](02_threejs/03_applying.md) | drawing a different block model or another per-block quantity |
