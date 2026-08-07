// Build a live CPIT instance from the committed trace, so the browser re-solves the SAME deposit.
//
// The block model is not regenerated in the browser. Regenerating it would mean porting a seeded
// random field generator and hoping the two implementations agree bit for bit, which is exactly the
// kind of silent divergence that makes a "live" lane show a different answer from the baked one.
// Instead the trace carries the per-block arrays (x, y, level, grade, tonnage, value, inPit) for
// every redistributable case, and the browser rebuilds only what is cheap and exactly reproducible:
// the slope precedence, which is a deterministic template over the grid.

import type { CpitInstance, Precedence } from './cpit.ts';
import type { TraceBlocks } from '../lib/contract.types.ts';

/**
 * Slope precedence, the reduced one-level-up template.
 *
 * A pit wall stands at the overall slope angle theta. On a regular grid the standard reduced pattern
 * is arcs only to the (2rx+1)x(2ry+1) box one level ABOVE, with rx = round(dz / (dx tan theta))
 * clamped to at least 1; transitivity up the levels reproduces the full cone exactly. Levels
 * increase UPWARD (the MineLib convention), so a block's predecessors sit above it.
 *
 * This mirrors `oreblocks.build_precedence` term for term, including the flat index
 * `(level * ny + iy) * nx + ix`, so the live lane and the offline lane build the identical graph.
 */
export function buildPrecedence(
  nx: number, ny: number, nz: number, slopeDeg = 45, dx = 10, dy = 10, dz = 10,
): Precedence {
  const t = Math.tan((slopeDeg * Math.PI) / 180);
  const rx = Math.max(1, Math.round(dz / (dx * t)));
  const ry = Math.max(1, Math.round(dz / (dy * t)));
  const per = nx * ny;
  const n = nx * ny * nz;

  const counts = new Int32Array(n);
  for (let level = 0; level < nz - 1; level++) {
    for (let iy = 0; iy < ny; iy++) {
      for (let ix = 0; ix < nx; ix++) {
        const b = level * per + iy * nx + ix;
        let c = 0;
        for (let di = -rx; di <= rx; di++) {
          const jx = ix + di;
          if (jx < 0 || jx >= nx) continue;
          for (let dj = -ry; dj <= ry; dj++) {
            const jy = iy + dj;
            if (jy < 0 || jy >= ny) continue;
            c++;
          }
        }
        counts[b] = c;
      }
    }
  }
  const pstart = new Int32Array(n + 1);
  for (let b = 0; b < n; b++) pstart[b + 1] = pstart[b] + counts[b];
  const plist = new Int32Array(pstart[n]);
  const fill = pstart.slice(0, n);
  for (let level = 0; level < nz - 1; level++) {
    for (let iy = 0; iy < ny; iy++) {
      for (let ix = 0; ix < nx; ix++) {
        const b = level * per + iy * nx + ix;
        for (let di = -rx; di <= rx; di++) {
          const jx = ix + di;
          if (jx < 0 || jx >= nx) continue;
          for (let dj = -ry; dj <= ry; dj++) {
            const jy = iy + dj;
            if (jy < 0 || jy >= ny) continue;
            plist[fill[b]++] = (level + 1) * per + jy * nx + jx;
          }
        }
      }
    }
  }
  return { pstart, plist };
}

export interface LiveScenario {
  periods: number;
  discountRate: number;
  /** per-period capacity as a fraction of (ultimate-pit resource total / periods) */
  capacityFraction: number[];
  slopeDeg: number;
  periodOneUndiscounted: boolean;
}

export interface LiveModel {
  blocks: TraceBlocks;
  dims: [number, number, number];
  n: number;
  value: Float64Array;
  tonnage: Float64Array;
  processTonnage: Float64Array;
  inPit: Uint8Array;
}

export function toLiveModel(blocks: TraceBlocks, dims: number[]): LiveModel {
  const n = blocks.value.length;
  const value = Float64Array.from(blocks.value);
  const tonnage = Float64Array.from(blocks.tonnage);
  const processTonnage = new Float64Array(n);
  for (let b = 0; b < n; b++) processTonnage[b] = value[b] > 0 ? tonnage[b] : 0;
  return {
    blocks,
    dims: [dims[0], dims[1], dims[2]],
    n,
    value,
    tonnage,
    processTonnage,
    inPit: Uint8Array.from(blocks.inPit),
  };
}

/**
 * Assemble a live instance under a scenario.
 *
 * When the slope angle changes the precedence graph changes, so the ultimate pit changes too and is
 * re-solved. That is the whole point: the hole is the computed result, and moving the wall angle
 * must change its shape rather than recolour the same voxels.
 */
export function buildLiveInstance(
  model: LiveModel, scenario: LiveScenario, prec: Precedence, inPit: Uint8Array,
): CpitInstance {
  const T = scenario.periods;
  const coef = [model.tonnage, model.processTonnage];
  const limit = coef.map((c, r) => {
    let total = 0;
    for (let b = 0; b < model.n; b++) if (inPit[b]) total += c[b];
    const frac = scenario.capacityFraction[r] ?? 1;
    const per = (frac * total) / T;
    return Float64Array.from({ length: T }, () => per);
  });
  return {
    nBlocks: model.n,
    nPeriods: T,
    discountRate: scenario.discountRate,
    periodOneUndiscounted: scenario.periodOneUndiscounted,
    value: model.value,
    coef,
    limit,
    prec,
  };
}
