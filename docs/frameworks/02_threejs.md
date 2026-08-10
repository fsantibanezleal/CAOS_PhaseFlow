# three.js

**What it is.** The renderer behind the stage: an `InstancedMesh` of one box per block, whose colours
and count are mutated in place as the period cursor moves.

**Pin.** `three@^0.171.0` in `frontend/package.json`, with `OrbitControls` from
`three/examples/jsm`.

**Why this one.** The stage draws tens of thousands of identical cubes and re-colours them at cursor
speed. Instancing is the whole requirement, and it is a first-class primitive here. A points-based or
SVG approach cannot show a bench face, which is the thing a planner reads.

**What we do NOT use it for.** The pit profile and the bench plan are plain 2D canvas
(`viz/SectionViews.tsx`). They are the drawings the discipline already reads, they are cheap, and
putting them through a 3D renderer would add a dependency to no end.

**Two things it taught us, both in the source.** An `InstancedMesh` with `instanceColor` must NOT set
`vertexColors: true`: that also defines `USE_COLOR`, which multiplies by a per-vertex attribute
`BoxGeometry` does not have, and every instance renders black while the pixel statistics still look
alive. And `renderer.setSize` CLEARS the drawing buffer, so a resize must re-render synchronously or
the stage goes blank until the next animation frame.

**What would make us change it.** A stage that needs a hundred thousand blocks at interactive rates,
where the answer is a custom shader over a texture rather than an instanced mesh. Not the case today:
the largest committed case is 14,400 blocks.
