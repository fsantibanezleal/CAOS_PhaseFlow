// The learned expected-time rung, in the browser: an instant plan while the exact one is computed.
//
// The exact live solve spends nearly all of its time in the certified bound (the critical multiplier
// algorithm, tens of maximum closures): measured 0.9 to 3.6 s per change on the committed twins.
// The surrogate predicts each block's LP expected extraction time from eleven block and scenario
// features, so the same TopoSort walk runs with no LP at all. The plan is a preview, and it is scored
// against the exact one as soon as the exact one arrives; it never stands in for the bound.
//
// Everything here mirrors the pipeline term for term: `pipeline/model/features.py ::
// block_feature_matrix` (including the float32 rounding of the features), `Mlp.forward` (ReLU hidden
// layers, sigmoid head) and `LearnedBundle.predict_expected_times`. `test/surrogate-parity.test.ts`
// holds both the features and the outputs to values the Python side wrote.

import type { CpitInstance, Precedence, ScheduleResult } from './cpit.ts';
import { toposortSchedule } from './cpit.ts';

type Layers = { w: number[][]; b: number[] }[];

export interface MlpModel {
  features: string[];
  mu: number[];
  sigma: number[];
  layers: Layers;
  /** further ensemble members (same standardisation, other seeds); the output is their mean */
  members?: { layers: Layers }[];
  metrics?: Record<string, unknown>;
}

/** One member's layers compiled once: weights transposed into contiguous rows, buffers reused. */
interface Compiled { w: Float64Array[]; b: Float64Array[]; nIn: number[]; buf: Float64Array[] }
interface CompiledModel { mu: Float64Array; inv: Float64Array; z: Float64Array; members: Compiled[] }

const compiledCache = new WeakMap<object, CompiledModel>();

function compileLayers(layers: Layers): Compiled {
  const w: Float64Array[] = [], b: Float64Array[] = [], nIn: number[] = [], buf: Float64Array[] = [];
  for (const layer of layers) {
    const inN = layer.w.length, outN = layer.b.length;
    const wt = new Float64Array(outN * inN);
    for (let j = 0; j < outN; j++) for (let i = 0; i < inN; i++) wt[j * inN + i] = layer.w[i][j];
    w.push(wt);
    b.push(Float64Array.from(layer.b));
    nIn.push(inN);
    buf.push(new Float64Array(outN));
  }
  return { w, b, nIn, buf };
}

function compile(model: Pick<MlpModel, 'mu' | 'sigma' | 'layers' | 'members'>): CompiledModel {
  let c = compiledCache.get(model);
  if (!c) {
    c = {
      mu: Float64Array.from(model.mu),
      inv: Float64Array.from(model.sigma, (s) => (s > 1e-8 ? s : 1)),
      z: new Float64Array(model.mu.length),
      members: [model.layers, ...(model.members ?? []).map((m) => m.layers)].map(compileLayers),
    };
    compiledCache.set(model, c);
  }
  return c;
}

/**
 * Forward pass: standardise, ReLU through the hidden layers, sigmoid head, averaged over the ensemble
 * members when there are any (`Mlp.forward` in the pipeline, term for term, in the same summation order).
 * The model is compiled once (transposed contiguous weights, reused buffers): the five-member ensemble of
 * 0.09.000 ran two to three times slower than one member through nested arrays allocated per block.
 */
export function mlpForward(model: Pick<MlpModel, 'mu' | 'sigma' | 'layers' | 'members'>, x: ArrayLike<number>): number {
  const c = compile(model);
  const z = c.z;
  for (let i = 0; i < z.length; i++) z[i] = (x[i] - c.mu[i]) / c.inv[i];
  let sum = 0;
  for (const m of c.members) sum += memberForward(m, z);
  return sum / c.members.length;
}

function memberForward(m: Compiled, z: Float64Array): number {
  let a: Float64Array = z;
  const last = m.w.length - 1;
  for (let li = 0; li <= last; li++) {
    const w = m.w[li], b = m.b[li], out = m.buf[li], inN = m.nIn[li];
    for (let j = 0; j < out.length; j++) {
      let s = b[j];
      const row = j * inN;
      for (let i = 0; i < inN; i++) s += a[i] * w[row + i];
      out[j] = li < last ? Math.max(0, s) : 1 / (1 + Math.exp(-s));
    }
    a = out;
  }
  return a[0];
}

export interface BlockArrays {
  x: ArrayLike<number>;
  y: ArrayLike<number>;
  level: ArrayLike<number>;
  grade: ArrayLike<number>;
  tonnage: ArrayLike<number>;
  value: ArrayLike<number>;
  inPit: ArrayLike<number>;
}

export interface FeatureScenario {
  periods: number;
  discountRate: number;
  capacityFraction: number[];
}

/**
 * Size and value of the cone ABOVE each block by the immediate-predecessor recursion
 * size[b] = |preds| + max size[preds], value[b] = sum p[preds] + max value[preds]: a monotone FEATURE,
 * not the exact transitive closure, and independent of which topological order computes it.
 */
function coneStats(prec: Precedence, values: ArrayLike<number>, n: number): { size: Float64Array; val: Float64Array } {
  const size = new Float64Array(n);
  const val = new Float64Array(n);
  // Kahn's order: every predecessor is finished before the block that needs it
  const indeg = new Int32Array(n);
  for (let b = 0; b < n; b++) indeg[b] = prec.pstart[b + 1] - prec.pstart[b];
  const succCount = new Int32Array(n);
  for (let k = 0; k < prec.plist.length; k++) succCount[prec.plist[k]]++;
  const sstart = new Int32Array(n + 1);
  for (let b = 0; b < n; b++) sstart[b + 1] = sstart[b] + succCount[b];
  const slist = new Int32Array(sstart[n]);
  const fill = sstart.slice(0, n);
  for (let b = 0; b < n; b++) for (let k = prec.pstart[b]; k < prec.pstart[b + 1]; k++) slist[fill[prec.plist[k]]++] = b;
  const queue: number[] = [];
  for (let b = 0; b < n; b++) if (indeg[b] === 0) queue.push(b);
  for (let qi = 0; qi < queue.length; qi++) {
    const b = queue[qi];
    const p0 = prec.pstart[b], p1 = prec.pstart[b + 1];
    if (p1 > p0) {
      let maxS = 0, maxV = -Infinity, sumV = 0;
      for (let k = p0; k < p1; k++) {
        const a = prec.plist[k];
        if (size[a] > maxS) maxS = size[a];
        if (val[a] > maxV) maxV = val[a];
        sumV += values[a];
      }
      // numpy's `.max(initial=0.0)` in the pipeline: the maximum of zero and the predecessors' values
      size[b] = (p1 - p0) + maxS;
      val[b] = sumV + Math.max(0, maxV);
    }
    for (let k = sstart[b]; k < sstart[b + 1]; k++) if (--indeg[slist[k]] === 0) queue.push(slist[k]);
  }
  return { size, val };
}

/**
 * The eleven block features, in the pipeline's order, rounded to float32 as the pipeline does. There is
 * no tonnage feature: every training twin has uniform tonnage, so its weights were never trained and
 * acted as noise on real deposits (features.py says how that was measured).
 */
export function blockFeatures(
  blocks: BlockArrays, dims: readonly number[], prec: Precedence, scenario: FeatureScenario,
): Float64Array[] {
  const n = blocks.value.length;
  const [nx, ny, nz] = dims;
  let vmax = 0, gmax = 0;
  for (let b = 0; b < n; b++) {
    vmax = Math.max(vmax, Math.abs(blocks.value[b]));
    gmax = Math.max(gmax, blocks.grade[b]);
  }
  const vscale = Math.max(1, vmax), gscale = Math.max(1e-9, gmax);
  const { size, val } = coneStats(prec, blocks.value, n);
  let smax = 0;
  for (let b = 0; b < n; b++) smax = Math.max(smax, size[b]);
  const sdiv = Math.max(1, smax);
  const cx = (nx - 1) / 2, cy = (ny - 1) / 2;
  const caps = [...scenario.capacityFraction, 0];
  const f = Math.fround;
  const rows: Float64Array[] = new Array(n);
  for (let b = 0; b < n; b++) {
    const rx = (blocks.x[b] - cx) / Math.max(1, cx), ry = (blocks.y[b] - cy) / Math.max(1, cy);
    const radial = Math.sqrt(rx * rx + ry * ry);
    rows[b] = Float64Array.from([
      f(blocks.value[b] / vscale),
      f(1 - blocks.level[b] / Math.max(1, nz - 1)),
      f(size[b] / sdiv),
      f(val[b] / vscale / sdiv),
      f(blocks.grade[b] / gscale),
      f(Math.min(2, Math.max(0, radial)) / 2),
      f(blocks.inPit[b] ? 1 : 0),
      f(scenario.discountRate),
      f(Math.min(3, caps[0]) / 3),
      f(Math.min(3, caps[1]) / 3),
      f(scenario.periods / 20),
    ]);
  }
  return rows;
}

/** Predicted expected extraction time per block: the model's fraction of the horizon times (T + 1). */
export function predictExpectedTimes(model: MlpModel, rows: Float64Array[], periods: number): Float64Array {
  const e = new Float64Array(rows.length);
  for (let b = 0; b < rows.length; b++) e[b] = mlpForward(model, rows[b]) * (periods + 1);
  return e;
}

/** The learned plan: TopoSort on -E_hat, inside the ultimate pit. No LP, no bound. */
export function learnedSchedule(
  inst: CpitInstance, model: MlpModel, blocks: BlockArrays, dims: readonly number[],
  scenario: FeatureScenario, allowed: Uint8Array,
): { result: ScheduleResult; ms: number } {
  const t0 = performance.now();
  const rows = blockFeatures(blocks, dims, inst.prec, scenario);
  const e = predictExpectedTimes(model, rows, scenario.periods);
  const w = new Float64Array(e.length);
  for (let b = 0; b < e.length; b++) w[b] = -e[b];
  const result = toposortSchedule(inst, w, allowed, 'learned-expected-time');
  return { result, ms: performance.now() - t0 };
}

let cached: Promise<MlpModel> | null = null;

export function loadExpectedTimeSurrogate(version: string): Promise<MlpModel> {
  cached ??= fetch(`/models/expected-time.json?v=${version}`).then((r) => {
    if (!r.ok) throw new Error(`expected-time surrogate: HTTP ${r.status}`);
    return r.json() as Promise<MlpModel>;
  });
  return cached;
}
