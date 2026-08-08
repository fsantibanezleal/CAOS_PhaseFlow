// The stage: a pit that excavates itself, whose walls carry the year that exposed them.
//
// THE RENDERING RULE. There are three things you can draw from a block-level schedule and only one
// of them is honest:
//
//   A. Draw the MINED blocks, coloured by period. The ramp is fully visible and the object is a
//      growing solid blob, not a pit. It also lands on a banded voxel volume PitForge already ships
//      as its nested-shells mode.
//   B. Carve the mined rock away and colour what is left by grade. It reads as a pit, and the
//      schedule is invisible. Measured on the real PitForge engine (6912 blocks, 8 periods): about
//      25 percent of the model is ever visible, 65 percent of that visible surface carries no period
//      colour at the mid-animation frame, and the FINAL frame carries none at all. The finished pit
//      shows zero schedule.
//   C. Carve the mined rock away and colour the EXPOSED WALL by the period of the mined neighbour
//      that exposed it. Every block touching the void carries period colour BY CONSTRUCTION, so the
//      pit wall is 100 percent coloured at every frame INCLUDING the last. Measured on the shipping
//      case at the final frame that wall is 33 percent of everything visible from outside (the rest
//      is the model box, which is not the pit) against 0 percent for B. The object stays a pit.
//
// C is what this component draws, and it is not an invention: Chicoisne et al. 2012
// (doi:10.1287/opre.1120.1050) Figure 1(d) is a pit cross-section with the period numbers written
// into bands climbing the wall, and Morales et al. (APCOM 2015) present nine pit PROFILES per
// period. The discipline draws the void boundary; this is that drawing in three dimensions.
//
// THE MECHANICS, and they are the reason this is a new component rather than a prop on PitForge's
// PitView3D. That component builds scene, camera, renderer and OrbitControls inside one effect whose
// dependency array contains every prop, so a period cursor would tear the renderer down and reset
// the camera on every animation step, and it reads the theme background once with no theme key. Both
// are disqualifying for an animated view. Here the scene is built ONCE and the period cursor only
// mutates instance colours and counts in place; the theme is an explicit dependency; and the
// animation starts paused and halts on a hidden tab.

import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { voidBoundaryPeriods } from '../engine/coherence.ts';
import { periodColor, viridis } from './colormap.ts';

export type StageMode = 'schedule' | 'grade' | 'mined';

export interface ScheduleView3DProps {
  x: number[];
  y: number[];
  level: number[];
  grade: number[];
  inPit: number[];
  periodOfBlock: number[] | Int32Array;
  dims: [number, number, number];
  nPeriods: number;
  /** 0-based period cursor: everything scheduled at or before it has been mined */
  cursor: number;
  mode?: StageMode;
  theme: string;
  /** 0 means fill the parent, which is the ADR-0070 focus stage contract */
  height?: number;
  /** cut everything with y index above this, to look inside. -1 disables. */
  sectionY?: number;
  onStats?: (s: { drawn: number; wall: number; coloured: number }) => void;
  /** only for the placeholder sentence shown until the first frame lands */
  lang?: string;
}

export function ScheduleView3D({
  x, y, level, grade, inPit, periodOfBlock, dims, nPeriods, cursor,
  mode = 'schedule', theme, height = 0, sectionY = -1, onStats, lang = 'en',
}: ScheduleView3DProps) {
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<{
    mesh: THREE.InstancedMesh; render: () => void; dispose: () => void;
    scene: THREE.Scene; n: number;
  } | null>(null);

  const gradeMax = useMemo(() => Math.max(1e-9, ...grade), [grade]);
  // Shown through ::after until the first frame lands, so a slow machine gets a sentence rather than
  // an empty rectangle. It disappears by CSS on [data-drawn], never by a timeout.
  const label = lang === 'es' ? 'preparando el rajo' : 'preparing the pit';

  // -------- build the scene ONCE per model/theme, never per cursor --------
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const [nx, ny, nz] = dims;
    const n = x.length;
    const W = el.clientWidth || 640;
    const H = height > 0 ? height : Math.max(1, el.clientHeight || 420);

    const cs = getComputedStyle(document.documentElement);
    const bg = cs.getPropertyValue('--color-bg').trim() || '#0d1117';

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(bg);
    const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 1000);
    // FIT the camera to the model instead of hard-coding a distance. A fixed position leaves the pit
    // a small object in a large frame, which is the underfill failure: presence, stage share and
    // no-scroll are all true of a stage whose instrument occupies six percent of its own pixels.
    // Fit to the model's own eight CORNERS, not to its bounding sphere. A deposit 28x28x14 and one
    // 20x20x20 do not want the same distance, and a sphere fit is right for neither: it reserves room
    // for a ball the deposit does not fill, so a flat orebody in a wide stage sits small in the middle
    // of its own frame. Solving the two frustum inequalities per corner gives the smallest distance
    // that clips nothing, for THIS aspect and THIS view direction. FILL is the requirement and
    // CLIPPING is the failure, and the gate checks both: the non-background share AND whether the
    // render touches the border of its own canvas.
    const span = Math.max(nx, ny, nz);
    const half: [number, number, number] = [nx / span, nz / span, ny / span];
    const vFov = (50 * Math.PI) / 180;
    // Elevated enough to look INTO the pit. From near the horizon a pit reads as a rectangle: the
    // void is the subject here, so the default view must see down into it.
    const EL = (38 * Math.PI) / 180, AZ = (35 * Math.PI) / 180;
    const dir = new THREE.Vector3(
      Math.cos(EL) * Math.cos(AZ), Math.sin(EL), Math.cos(EL) * Math.sin(AZ),
    ).normalize();
    const fitDistance = (aspect: number, view: THREE.Vector3 = dir): number => {
      const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);
      const tv = Math.tan(vFov / 2), th = Math.tan(hFov / 2);
      const right = new THREE.Vector3().crossVectors(view, new THREE.Vector3(0, 1, 0)).normalize();
      const up = new THREE.Vector3().crossVectors(right, view).normalize();
      let d = 0;
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
        const p = new THREE.Vector3(sx * half[0], sy * half[1], sz * half[2]);
        const along = p.dot(view);
        d = Math.max(d, along + Math.abs(p.dot(right)) / th, along + Math.abs(p.dot(up)) / tv);
      }
      return d * 1.04;                              // a little air, so nothing sits on the border
    };
    const dist = fitDistance(W / H);
    camera.position.copy(dir).multiplyScalar(dist);
    camera.lookAt(0, 0, 0);
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setSize(W, H);
    el.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.62));
    const key = new THREE.DirectionalLight(0xffffff, 0.85);
    key.position.set(2, 5, 3);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 0.28);
    fill.position.set(-3, 1.5, -2);
    scene.add(fill);

    const unit = 2 / Math.max(nx, ny, nz);
    const geo = new THREE.BoxGeometry(unit * 0.94, unit * 0.94, unit * 0.94);
    // NOT vertexColors. An InstancedMesh with instanceColor already defines USE_INSTANCING_COLOR, and
    // the fragment stage multiplies the diffuse by vColor on that define alone. Adding vertexColors
    // also defines USE_COLOR, which multiplies vColor by a per-VERTEX color attribute that BoxGeometry
    // does not have; WebGL then supplies the default generic attribute (0,0,0) and every instance
    // renders black. The stage still had 98 distinct colours and 62 percent non-background, because
    // the specular highlight survives, so a distinct-colour count passed on an all-black pit. The
    // gate now asserts SATURATION, which is the thing the period colours actually are.
    const mat = new THREE.MeshStandardMaterial({ roughness: 0.82, metalness: 0.0 });
    const mesh = new THREE.InstancedMesh(geo, mat, n);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3);
    scene.add(mesh);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;

    let raf = 0;
    let until = 0;
    // The host advertises that a frame has actually reached the canvas. A stage that is present,
    // correctly sized and scroll-free is all of those things while still blank, so both the CSS
    // placeholder and the browser gate key off THIS rather than off a timer. On a software
    // rasteriser a frame of this scene costs about 100 ms, so a fixed sleep is a promise the stage
    // size can break: growing the stage to meet the ADR-0071 floor tripled its pixels and broke
    // exactly that assumption once already.
    // Only once the mesh actually HAS instances. The build effect renders before the cursor effect
    // has written a single matrix, so a flag set in the render loop alone marks a black frame as
    // drawn: the placeholder disappears over an empty canvas and the gate reads a blank stage as
    // ready. The count is the honest signal.
    const markDrawn = () => { if (mesh.count > 0) el.dataset.drawn = '1'; };
    const loop = () => {
      raf = requestAnimationFrame(loop);
      controls.update();
      renderer.render(scene, camera);
      markDrawn();
      if (performance.now() > until) { cancelAnimationFrame(raf); raf = 0; }
    };
    const kick = (ms: number) => {
      until = performance.now() + ms;
      if (!raf && !document.hidden) raf = requestAnimationFrame(loop);
    };
    controls.addEventListener('start', () => kick(4000));
    controls.addEventListener('change', () => kick(1200));
    const onVis = () => { if (document.hidden && raf) { cancelAnimationFrame(raf); raf = 0; } };
    document.addEventListener('visibilitychange', onVis);

    const onResize = () => {
      const w2 = el.clientWidth || W;
      const h2 = height > 0 ? height : Math.max(1, el.clientHeight || H);
      camera.aspect = w2 / h2;
      camera.updateProjectionMatrix();
      // Re-fit for the new aspect, keeping whatever direction the reader has orbited to. Scaling the
      // CURRENT position preserves their view; only the distance changes.
      const cur = camera.position.length() || 1;
      const view = camera.position.clone().normalize();
      camera.position.multiplyScalar(fitDistance(camera.aspect, view) / cur);
      // setSize CLEARS the drawing buffer, so re-render here and now rather than waiting for the
      // next animation frame. On a software rasteriser that wait is about 100 ms of a stage that has
      // gone completely black, and the layout settles late enough that a reader sees it.
      renderer.setSize(w2, h2);
      renderer.render(scene, camera);
      markDrawn();
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(el);

    api.current = {
      mesh,
      scene,
      n,
      render: () => { renderer.render(scene, camera); markDrawn(); kick(200); },
      dispose: () => {
        ro.disconnect();
        document.removeEventListener('visibilitychange', onVis);
        if (raf) cancelAnimationFrame(raf);
        controls.dispose();
        geo.dispose();
        mat.dispose();
        renderer.dispose();
        if (renderer.domElement.parentNode === el) el.removeChild(renderer.domElement);
      },
    };
    kick(600);
    return () => { api.current?.dispose(); api.current = null; };
    // theme IS a dependency: reading --color-bg once with no theme key is how a toggle leaves a
    // stale canvas behind, which is a live defect in the component this one replaces.
  }, [x, y, level, dims, height, theme]);

  // -------- the cursor only MUTATES the existing mesh --------
  useEffect(() => {
    const a = api.current;
    if (!a) return;
    const [nx, ny, nz] = dims;
    const span = Math.max(nx, ny, nz);
    const s = 2 / span;
    const cx = (nx - 1) / 2, cy = (ny - 1) / 2, cz = (nz - 1) / 2;
    const dummy = new THREE.Object3D();
    const colors = a.mesh.instanceColor!.array as Float32Array;

    const wall = mode === 'schedule'
      ? voidBoundaryPeriods(periodOfBlock, x, y, level, dims, cursor)
      : null;

    let drawn = 0, wallCount = 0, coloured = 0;
    for (let b = 0; b < x.length; b++) {
      if (sectionY >= 0 && y[b] > sectionY) continue;
      const p = periodOfBlock[b];
      const mined = p >= 0 && p <= cursor;

      let rgb: [number, number, number] | null = null;
      if (mode === 'mined') {
        if (!mined) continue;
        rgb = periodColor(p, nPeriods);
      } else if (mode === 'grade') {
        if (mined) continue;
        rgb = viridis(grade[b] / gradeMax);
      } else {
        if (mined) continue;                     // the void is not drawn: it IS the pit
        const w = wall![b];
        if (w >= 0) { rgb = periodColor(w, nPeriods); wallCount++; coloured++; }
        else {
          // country rock behind the wall: faded grade, so grade and schedule read in one frame
          const g = viridis(grade[b] / gradeMax);
          const k = inPit[b] ? 0.42 : 0.24;
          rgb = [0.5 + (g[0] - 0.5) * k, 0.5 + (g[1] - 0.5) * k, 0.5 + (g[2] - 0.5) * k];
        }
      }

      // Levels increase UPWARD: `buildPrecedence` puts a block's predecessors one level ABOVE it, and
      // the data agrees (the ultimate pit holds every block of the top four benches and none of the
      // bottom one). Negating this rendered the deposit UPSIDE DOWN, which put the one fully intact
      // bench, the deepest, on top as a flat lid and hid the entire pit behind it. Every numeric gate
      // passed: the wall share, the coherence, the drawn count. The picture was of the underside.
      dummy.position.set((x[b] - cx) * s, (level[b] - cz) * s, (y[b] - cy) * s);
      dummy.updateMatrix();
      a.mesh.setMatrixAt(drawn, dummy.matrix);
      colors[drawn * 3] = rgb[0];
      colors[drawn * 3 + 1] = rgb[1];
      colors[drawn * 3 + 2] = rgb[2];
      drawn++;
    }
    a.mesh.count = drawn;
    a.mesh.instanceMatrix.needsUpdate = true;
    a.mesh.instanceColor!.needsUpdate = true;
    a.render();
    onStats?.({ drawn, wall: wallCount, coloured });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor, mode, sectionY, periodOfBlock, nPeriods, gradeMax, theme]);

  return (
    <div
      ref={host}
      className="pf-stage3d"
      data-testid="schedule-stage"
      data-label={label}
      style={height > 0 ? { height } : undefined}
    />
  );
}

/**
 * The MEASURED answer to the objection this whole component exists for.
 *
 * Returns the share of the visible surface that carries period colour at a given cursor. Under the
 * carve-away rendering this falls to zero at the last frame; under the void-boundary rendering it
 * rises to one. The product gate asserts the second, in the browser, on the final frame.
 */
export function wallColourShare(
  periodOfBlock: number[] | Int32Array, x: number[], y: number[], level: number[],
  dims: [number, number, number], cursor: number,
): { standing: number; wall: number; share: number } {
  const w = voidBoundaryPeriods(periodOfBlock, x, y, level, dims, cursor);
  let standing = 0, wall = 0;
  for (let b = 0; b < w.length; b++) {
    const p = periodOfBlock[b];
    if (p >= 0 && p <= cursor) continue;
    standing++;
    if (w[b] >= 0) wall++;
  }
  return { standing, wall, share: standing ? wall / standing : 0 };
}
