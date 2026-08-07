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
}

export function ScheduleView3D({
  x, y, level, grade, inPit, periodOfBlock, dims, nPeriods, cursor,
  mode = 'schedule', theme, height = 0, sectionY = -1, onStats,
}: ScheduleView3DProps) {
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<{
    mesh: THREE.InstancedMesh; render: () => void; dispose: () => void;
    scene: THREE.Scene; n: number;
  } | null>(null);

  const gradeMax = useMemo(() => Math.max(1e-9, ...grade), [grade]);

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
    camera.position.set(2.4, 1.9, 2.6);
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
    const mat = new THREE.MeshStandardMaterial({ roughness: 0.82, metalness: 0.0, vertexColors: true });
    const mesh = new THREE.InstancedMesh(geo, mat, n);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3);
    scene.add(mesh);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;

    let raf = 0;
    let until = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      controls.update();
      renderer.render(scene, camera);
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
      renderer.setSize(w2, h2);
      kick(200);
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(el);

    api.current = {
      mesh,
      scene,
      n,
      render: () => { renderer.render(scene, camera); kick(200); },
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

      dummy.position.set((x[b] - cx) * s, -(level[b] - cz) * s, (y[b] - cy) * s);
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
