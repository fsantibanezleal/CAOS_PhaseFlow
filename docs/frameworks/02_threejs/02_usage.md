# three.js · 02 · How the stage uses it

`frontend/src/viz/ScheduleView3D.tsx`.

## Build once, mutate per cursor

The scene, camera, renderer, lights, one `BoxGeometry`, one `MeshStandardMaterial` and one
`InstancedMesh` with an `instanceColor` attribute are built in ONE effect whose dependencies are the block
arrays, the stage height and the theme. The period cursor never rebuilds anything: a second effect rewrites
the instance matrices and colours in place and sets `mesh.count` to the number of blocks drawn.

```ts
const geo = new THREE.BoxGeometry(unit * 0.94, unit * 0.94, unit * 0.94);
const mat = new THREE.MeshStandardMaterial({ roughness: 0.82, metalness: 0.0 });   // NOT vertexColors
const mesh = new THREE.InstancedMesh(geo, mat, n);
mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3);
```

A component that rebuilt scene and camera on every prop change would tear the renderer down and reset the
camera on each animation step; the stage replaces one that did.

## The rendering rule: colour the void boundary

![Three ways to draw a block schedule](../../assets/the-void-boundary.svg)

There are three things to draw from a block-level schedule and only one is honest
([architecture/01](../../architecture/01_overview.md)): draw the mined blocks (a growing solid, not a pit),
carve them away and colour by grade (a pit with no schedule in it), or carve them away and colour the
**exposed wall** by the period of the mined neighbour that exposed it. The stage draws the third:
`engine/coherence.ts::voidBoundaryPeriods` gives every standing block adjacent to the void the period of the
neighbour that exposed it, so the pit wall carries period colour by construction at every frame, the last
included. Chicoisne et al. 2012, Figure 1(d), is that drawing in a cross-section.

## The loop only runs when something moves

The animation loop renders while orbit controls are active and for a short tail after (`kick(ms)`), stops on
a hidden tab, and the cursor effect calls one render. The stage starts paused: no autoplay, no compute while
nobody is looking.

## Two defects it taught, both written into the source

1. **`instanceColor` with `vertexColors: true` renders black.** `vertexColors` also defines `USE_COLOR`,
   which multiplies by a per-vertex colour attribute `BoxGeometry` does not have; WebGL supplies (0, 0, 0)
   and every instance is black while the specular highlight keeps the pixel statistics alive. The browser
   gate now asserts colour SATURATION, not a count of distinct colours.
2. **`renderer.setSize` clears the drawing buffer.** A resize re-renders synchronously, or the stage goes
   black until the next frame.

The host also sets `data-drawn` only once the mesh has instances, so a gate cannot read an empty first
frame as a drawn stage.
