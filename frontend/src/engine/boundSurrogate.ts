// The bound surrogate, running in the browser.
//
// It was trained, exported and scored, and then it did nothing: no panel read it, and the sensitivity
// surface the plan promised (`NPV and gap against discount rate and against capacity`) never shipped.
// A model whose only appearance is a metric on a scorecard is not an accelerator of anything.
//
// This is that surface. The exact certified bound is a parametric family of maximum closures, a few
// hundred of them, which is fine once and impossible across a grid; the surrogate predicts the bound
// as a fraction of the ultimate-pit value from eleven deposit statistics plus the scenario, so a
// whole plane can be drawn at once. The EXACT value at the case's own point is drawn on top of it as
// the anchor, which is the only reason the surface is allowed to be believed anywhere.
//
// Implemented as a plain forward pass rather than through `onnxruntime-web`. The model is
// 11 -> 24 -> 12 -> 1 with tanh activations: twenty lines here against a multi-megabyte wasm runtime
// for the same arithmetic. The ONNX export still exists and is still verified against numpy before
// it is written; its job is to be portable for someone else, not to be how this page does its own
// multiplication.

import type { ScheduleTrace } from '../lib/contract.types.ts';

export interface Mlp {
  schema: string;
  target: string;
  features: string[];
  mu: number[];
  sigma: number[];
  layers: { w: number[][]; b: number[]; act?: string | null }[];
  /** the held-out scores, including the two monotonicity rates a surface may not ignore */
  metrics?: Record<string, number | string | number[]>;
}

/** Mirrors `pipeline/model/features.py :: deposit_feature_vector`, term for term. */
export function depositFeatures(
  trace: ScheduleTrace,
  rate: number,
  capFrac: [number, number],
): number[] | null {
  const b = trace.blocks;
  if (!b) return null;
  const n = b.value.length;
  const grade = b.grade;
  const tonnage = b.tonnage;
  const value = b.value;
  const inPit = b.inPit;

  let pitT = 0;
  let oreT = 0;
  let inPitCount = 0;
  let absValue = 0;
  let gradeSum = 0;
  let gradeMax = 0;
  for (let i = 0; i < n; i++) {
    absValue += Math.abs(value[i]);
    gradeSum += grade[i];
    if (grade[i] > gradeMax) gradeMax = grade[i];
    if (inPit[i]) {
      inPitCount++;
      pitT += tonnage[i];
      if (value[i] > 0) oreT += tonnage[i];
    }
  }
  const sorted = Float64Array.from(grade).sort();
  const p90 = sorted[Math.min(n - 1, Math.floor(0.9 * (n - 1)))];
  const wasteT = Math.max(1e-9, pitT - oreT);

  return [
    Math.log10(Math.max(10, n)) / 7,
    inPitCount / n,
    trace.instance.upitValue / Math.max(1, absValue),
    gradeSum / n / Math.max(1e-9, gradeMax),
    p90 / Math.max(1e-9, gradeMax),
    oreT / Math.max(1e-9, pitT),
    Math.min(20, wasteT / Math.max(1e-9, oreT)) / 20,
    rate,
    Math.min(3, capFrac[0]) / 3,
    Math.min(3, capFrac[1]) / 3,
    trace.scenario.periods / 20,
  ];
}

/** Forward pass. Standardise, then tanh through the hidden layers, then a linear head. */
export function predict(model: Mlp, x: number[]): number {
  let a = x.map((v, i) => (v - model.mu[i]) / (model.sigma[i] || 1));
  model.layers.forEach((layer, li) => {
    const out = new Array<number>(layer.b.length).fill(0);
    for (let j = 0; j < out.length; j++) {
      let s = layer.b[j];
      for (let i = 0; i < a.length; i++) s += a[i] * layer.w[i][j];
      out[j] = li < model.layers.length - 1 ? Math.tanh(s) : s;
    }
    a = out;
  });
  return a[0];
}

let cached: Promise<Mlp> | null = null;

export function loadBoundSurrogate(version: string): Promise<Mlp> {
  cached ??= fetch(`/models/bound.json?v=${version}`).then((r) => {
    if (!r.ok) throw new Error(`bound surrogate: HTTP ${r.status}`);
    return r.json() as Promise<Mlp>;
  });
  return cached;
}

export interface SurfacePoint {
  rate: number;
  capFrac: number;
  /** predicted certified bound, in currency, for this (rate, capacity) point */
  bound: number;
}

/**
 * The bound over a grid of (discount rate, processing-capacity fraction).
 *
 * The second capacity is held at the case's own value: a surface over both at once is a volume, and
 * the promise was a plane a reader can actually read.
 */
export function boundSurface(
  model: Mlp,
  trace: ScheduleTrace,
  rates: number[],
  capFracs: number[],
  miningFrac: number,
): SurfacePoint[] {
  const out: SurfacePoint[] = [];
  for (const rate of rates) {
    for (const capFrac of capFracs) {
      const x = depositFeatures(trace, rate, [miningFrac, capFrac]);
      if (!x) return [];
      out.push({ rate, capFrac, bound: predict(model, x) * trace.instance.upitValue });
    }
  }
  return out;
}
