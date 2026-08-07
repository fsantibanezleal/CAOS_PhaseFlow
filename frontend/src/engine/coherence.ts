// Spatial coherence of a schedule: is each period one workable volume, or confetti?
//
// Chicoisne, Espinoza, Goycoolea, Moreno and Rubio say it themselves in the Final Remarks of the
// paper that introduced the algorithm (Operations Research 60(3):517-528,
// doi:10.1287/opre.1120.1050):
//
//   "It is likely that the C-PIT solutions are such that blocks scheduled in a same time period are
//   scattered throughout the mine. This might lead to schedules that require manual intervention by
//   mining engineers to consider additional operational constraints [...] exacerbated by the fact
//   that our minimal planning units are blocks rather than bench-phases."
//
// A schedule with a high NPV and forty disconnected fragments per year is not a mine plan, and no
// NPV chart shows the difference. Connectivity is 6-neighbour: two blocks touching only along an
// edge or a corner are not the same mining front.

export interface PeriodCoherence {
  period: number;
  blocks: number;
  components: number;
  largestComponent: number;
  largestShare: number;
  minWidthBlocks: number;
}

export function periodCoherence(
  periodOfBlock: Int32Array | number[], x: number[], y: number[], level: number[],
  dims: [number, number, number], period: number,
): PeriodCoherence {
  const [nx, ny] = dims;
  const sel: number[] = [];
  for (let b = 0; b < periodOfBlock.length; b++) if (periodOfBlock[b] === period) sel.push(b);
  if (sel.length === 0) {
    return { period, blocks: 0, components: 0, largestComponent: 0, largestShare: 0, minWidthBlocks: 0 };
  }

  const key = (a: number, bb: number, c: number) => (c * ny + bb) * nx + a;
  const index = new Map<number, number>();
  sel.forEach((b, i) => index.set(key(x[b], y[b], level[b]), i));

  const parent = new Int32Array(sel.length);
  for (let i = 0; i < sel.length; i++) parent[i] = i;
  const find = (i: number): number => {
    let root = i;
    while (parent[root] !== root) root = parent[root];
    while (parent[i] !== root) { const nxt = parent[i]; parent[i] = root; i = nxt; }
    return root;
  };
  for (let i = 0; i < sel.length; i++) {
    const b = sel[i];
    for (const [da, db, dc] of [[1, 0, 0], [0, 1, 0], [0, 0, 1]] as const) {
      const j = index.get(key(x[b] + da, y[b] + db, level[b] + dc));
      if (j === undefined) continue;
      const ri = find(i), rj = find(j);
      if (ri !== rj) parent[ri] = rj;
    }
  }
  const sizes = new Map<number, number>();
  for (let i = 0; i < sel.length; i++) {
    const r = find(i);
    sizes.set(r, (sizes.get(r) ?? 0) + 1);
  }
  const largest = Math.max(...sizes.values());

  // narrowest run of consecutive mined blocks along a bench: a crude but honest proxy for the
  // minimum mining width, which Bai et al. 2018 (doi:10.17159/2411-9717/2018/v118n5a8) target at
  // about 100 m for equipment reasons
  let minWidth = Infinity;
  for (const axis of [0, 1] as const) {
    const lanes = new Map<number, number[]>();
    for (const b of sel) {
      const laneKey = level[b] * 100000 + (axis === 0 ? y[b] : x[b]);
      const v = axis === 0 ? x[b] : y[b];
      const arr = lanes.get(laneKey);
      if (arr) arr.push(v); else lanes.set(laneKey, [v]);
    }
    for (const arr of lanes.values()) {
      arr.sort((a, b) => a - b);
      let run = 1;
      for (let k = 1; k < arr.length; k++) {
        if (arr[k] === arr[k - 1] + 1) run++;
        else { minWidth = Math.min(minWidth, run); run = 1; }
      }
      minWidth = Math.min(minWidth, run);
    }
  }

  return {
    period,
    blocks: sel.length,
    components: sizes.size,
    largestComponent: largest,
    largestShare: largest / sel.length,
    minWidthBlocks: Number.isFinite(minWidth) ? minWidth : 0,
  };
}

export function scheduleCoherence(
  periodOfBlock: Int32Array | number[], x: number[], y: number[], level: number[],
  dims: [number, number, number], nPeriods: number,
): PeriodCoherence[] {
  return Array.from({ length: nPeriods }, (_, t) => periodCoherence(periodOfBlock, x, y, level, dims, t));
}

/**
 * The VOID BOUNDARY: for each standing block adjacent to an already-mined one, the period of the
 * mined neighbour that exposed it.
 *
 * This is the rendering rule the whole product turns on. Drawing the mined blocks gives a growing
 * solid that is not a pit; carving them away gives a pit whose period colour is buried inside the
 * volume, so on the measured PitForge case only 25 percent of the model is ever visible, 65 percent
 * of that surface carries no period colour mid-animation, and the FINAL frame carries none at all.
 * Colouring the exposed wall by the year that exposed it puts period colour on every visible surface
 * by construction, and it is what the discipline already draws: Chicoisne et al. 2012 Figure 1(d) is
 * a pit cross-section with the period numbers written into bands climbing the wall.
 *
 * Returns -1 for a block that is not on the boundary at this cursor (either already mined, or buried
 * behind rock that is still standing).
 */
export function voidBoundaryPeriods(
  periodOfBlock: Int32Array | number[], x: number[], y: number[], level: number[],
  dims: [number, number, number], cursor: number,
): Int32Array {
  const [nx, ny, nz] = dims;
  const n = periodOfBlock.length;
  const at = new Int32Array(nx * ny * nz).fill(-1);
  for (let b = 0; b < n; b++) at[(level[b] * ny + y[b]) * nx + x[b]] = b;

  const out = new Int32Array(n).fill(-1);
  const dirs = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]] as const;
  for (let b = 0; b < n; b++) {
    const p = periodOfBlock[b];
    if (p >= 0 && p <= cursor) continue;            // already mined: it is the void, not the wall
    let best = -1;
    for (const [da, db, dc] of dirs) {
      const jx = x[b] + da, jy = y[b] + db, jz = level[b] + dc;
      if (jx < 0 || jx >= nx || jy < 0 || jy >= ny || jz < 0 || jz >= nz) continue;
      const nb = at[(jz * ny + jy) * nx + jx];
      if (nb < 0) continue;
      const q = periodOfBlock[nb];
      if (q >= 0 && q <= cursor && q > best) best = q;   // the LATEST year that exposed this face
    }
    out[b] = best;
  }
  return out;
}
