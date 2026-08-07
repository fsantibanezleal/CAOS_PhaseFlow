// The CPIT scheduling engine, in the browser. A port of the oreblocks Python lane, kept close enough
// to it that `frontend/test/parity.test.ts` can assert the two agree to floating tolerance on a
// committed case.
//
// Why the browser has a real solver at all: ADR-0070 requires the focus view's parameters to
// recompute live, and a scheduling product whose discount rate and capacity are pre-baked chips is a
// brochure with a slider on it. Everything below runs on the block model the trace already carries,
// so moving the rate re-solves the actual problem rather than fetching a different answer.
//
// References, transcribed in `docs/methods/`:
// - Chicoisne, Espinoza, Goycoolea, Moreno and Rubio, Operations Research 60(3):517-528, 2012,
//   doi:10.1287/opre.1120.1050. Theorem 3.1 (the critical multiplier algorithm), section 3.2
//   (the TopoSort heuristic family), equations (3a)-(3f) (the formulation).
// - Munoz, Espinoza, Goycoolea, Moreno, Queyranne and Rivera Letelier, Comput Optim Appl, 2017,
//   doi:10.1007/s10589-017-9946-1. Z_BZ = Z_LP: Bienstock-Zuckerberg is a speed result, not a
//   tighter bound.

import { maxClosureWithin, solveUltimatePit } from './maxflow.ts';

const TOL = 1e-9;

export interface Precedence { pstart: Int32Array; plist: Int32Array }

export interface CpitInstance {
  nBlocks: number;
  nPeriods: number;
  discountRate: number;
  periodOneUndiscounted: boolean;
  value: Float64Array;
  /** coef[r][b], the amount of resource r consumed by extracting block b */
  coef: Float64Array[];
  /** limit[r][t] */
  limit: Float64Array[];
  prec: Precedence;
}

export interface LpRelaxation {
  bound: number;
  /** x[t][b], cumulative fractional extraction, monotone in t */
  x: Float64Array[];
  periodValue: Float64Array;
  multipliers: Float64Array;
  integral: Uint8Array;
  closureSolves: number;
  resource: number;
}

export interface ScheduleResult {
  method: string;
  periodOfBlock: Int32Array;
  npv: number;
  bound: number;
  gapPct: number;
  minedBlocks: number;
  runtimeMs: number;
  notes: string;
}

/** d[t] for t = 0..T-1, applied to value realised in period t+1. */
export function discountFactors(inst: CpitInstance): Float64Array {
  const d = new Float64Array(inst.nPeriods);
  for (let t = 0; t < inst.nPeriods; t++) {
    const e = inst.periodOneUndiscounted ? t : t + 1;
    d[t] = 1 / Math.pow(1 + inst.discountRate, e);
  }
  return d;
}

/** Abel-summation weights turning the by-period objective into a sum over cumulative pit values. */
export function gamma(inst: CpitInstance): Float64Array {
  const d = discountFactors(inst);
  const g = new Float64Array(d.length);
  for (let t = 0; t < d.length - 1; t++) g[t] = d[t] - d[t + 1];
  g[d.length - 1] = d[d.length - 1];
  return g;
}

// ------------------------------------------------------------------------------------------------
// the parametric pit family, shared across periods
// ------------------------------------------------------------------------------------------------
class ParametricPits {
  lams: number[] = [];
  pits: Uint8Array[] = [];
  caps: number[] = [];
  vals: number[] = [];
  solves = 0;

  constructor(
    private v: Float64Array,
    private a: Float64Array,
    private prec: Precedence,
    full: Uint8Array,
  ) {
    this.lams.push(0);
    this.pits.push(full);
    this.caps.push(this.dot(a, full));
    this.vals.push(this.dot(v, full));
  }

  private dot(w: Float64Array, mask: Uint8Array): number {
    let s = 0;
    for (let b = 0; b < mask.length; b++) if (mask[b]) s += w[b];
    return s;
  }

  private insert(lam: number, pit: Uint8Array): number {
    let i = 0;
    while (i < this.lams.length && this.lams[i] < lam) i++;
    if (i < this.lams.length && this.lams[i] === lam) return i;
    this.lams.splice(i, 0, lam);
    this.pits.splice(i, 0, pit);
    this.caps.splice(i, 0, this.dot(this.a, pit));
    this.vals.splice(i, 0, this.dot(this.v, pit));
    return i;
  }

  at(lam: number): number {
    for (let i = 0; i < this.lams.length; i++) if (this.lams[i] === lam) return i;
    let candidates = this.pits[0];
    for (let i = 0; i < this.lams.length; i++) {
      if (this.lams[i] < lam) candidates = this.pits[i]; else break;
    }
    const priced = new Float64Array(this.v.length);
    for (let b = 0; b < priced.length; b++) priced[b] = this.v[b] - lam * this.a[b];
    const pit = maxClosureWithin(priced, this.prec.pstart, this.prec.plist, candidates);
    this.solves++;
    return this.insert(lam, pit);
  }

  extendUntilBelow(target: number, hint: number): void {
    let lam = Math.max(hint, 1);
    while (this.caps[this.caps.length - 1] > target) {
      this.at(lam);
      lam *= 4;
      if (lam > 1e18) throw new Error('no multiplier empties the pit; check the resource coefficients');
    }
  }

  private brackets(target: number): [number, number] {
    let u = 0;
    for (let j = 0; j < this.caps.length; j++) if (this.caps[j] >= target) u = j;
    let l = this.caps.length - 1;
    for (let j = this.caps.length - 1; j >= 0; j--) if (this.caps[j] <= target) l = j;
    return [u, l];
  }

  /**
   * Optimum of CP(target) = max v.x over closures with a.x <= target.
   *
   * Stops on the duality CERTIFICATE, not on an interval width: strong duality gives
   * CP(U) = min_lambda [ UPL(v - lambda a) + lambda U ], so the search refines until the primal
   * estimate and that dual expression agree. When they do, the two bracketing pits are provably
   * consecutive break-points.
   */
  solveCp(target: number, maxRefine = 80, tol = 1e-9): { u: number; l: number; alpha: number; z: number } {
    let [u, l] = this.brackets(target);
    for (let it = 0; it < maxRefine; it++) {
      if (u >= l) return { u, l: u, alpha: 1, z: this.vals[u] };
      const bU = this.caps[u], bL = this.caps[l];
      const alpha = bU - bL <= TOL ? 1 : Math.min(1, Math.max(0, (bU - target) / (bU - bL)));
      const z = alpha * this.vals[l] + (1 - alpha) * this.vals[u];
      const lam = this.lams[l];
      let dual = 0;
      const pit = this.pits[l];
      for (let b = 0; b < pit.length; b++) if (pit[b]) dual += this.v[b] - lam * this.a[b];
      dual += lam * target;
      if (Math.abs(dual - z) <= tol * Math.max(1, Math.abs(z))) return { u, l, alpha, z };
      const lo = this.lams[u], hi = this.lams[l];
      if (hi - lo <= 1e-13 * Math.max(1, hi)) return { u, l, alpha, z };
      this.at(0.5 * (lo + hi));
      [u, l] = this.brackets(target);
    }
    const [u2, l2] = this.brackets(target);
    const bU = this.caps[u2], bL = this.caps[l2];
    const alpha = bU - bL <= TOL ? 1 : Math.min(1, Math.max(0, (bU - target) / (bU - bL)));
    return { u: u2, l: l2, alpha, z: alpha * this.vals[l2] + (1 - alpha) * this.vals[u2] };
  }
}

/** Exact CPIT LP relaxation for ONE resource, by the critical multiplier algorithm. */
export function cpitLpRelaxation(inst: CpitInstance, resource = 0): LpRelaxation {
  const n = inst.nBlocks, T = inst.nPeriods;
  const v = inst.value, a = inst.coef[resource];
  const caps = new Float64Array(T);
  let run = 0;
  for (let t = 0; t < T; t++) { run += inst.limit[resource][t]; caps[t] = run; }

  const full = solveUltimatePit(v, inst.prec.pstart, inst.prec.plist);
  let aFull = 0;
  for (let b = 0; b < n; b++) if (full.inPit[b]) aFull += a[b];
  const family = new ParametricPits(v, a, inst.prec, full.inPit);

  let hint = 1;
  for (let b = 0; b < n; b++) if (a[b] > 0) hint = Math.max(hint, v[b] / a[b]);

  const x: Float64Array[] = [];
  const periodValue = new Float64Array(T);
  const multipliers = new Float64Array(T);
  const integral = new Uint8Array(T);

  for (let t = 0; t < T; t++) x.push(new Float64Array(n));

  for (let t = T - 1; t >= 0; t--) {
    const target = caps[t];
    if (aFull <= target + TOL) {
      for (let b = 0; b < n; b++) x[t][b] = full.inPit[b] ? 1 : 0;
      periodValue[t] = full.pitValue;
      integral[t] = 1;
      continue;
    }
    family.extendUntilBelow(target, hint);
    const { u, l, alpha, z } = family.solveCp(target);
    const pitU = family.pits[u], pitL = family.pits[l];
    integral[t] = u === l || alpha === 0 || alpha === 1 ? 1 : 0;
    for (let b = 0; b < n; b++) x[t][b] = pitL[b] ? 1 : pitU[b] ? 1 - alpha : 0;
    periodValue[t] = z;
    multipliers[t] = family.lams[l];
  }

  for (let t = 0; t < T - 1; t++) {
    for (let b = 0; b < n; b++) {
      if (x[t][b] > x[t + 1][b] + 1e-9) throw new Error(`cumulative solution not monotone at period ${t + 1}`);
    }
  }

  const g = gamma(inst);
  let bound = 0;
  for (let t = 0; t < T; t++) bound += g[t] * periodValue[t];
  return { bound, x, periodValue, multipliers, integral, closureSolves: family.solves + 1, resource };
}

/** E_b = sum_t t (x_bt - x_b,t-1) + (T+1)(1 - x_bT), the LP expected extraction time. */
export function expectedExtractionTimes(x: Float64Array[]): Float64Array {
  const T = x.length, n = x[0].length;
  const e = new Float64Array(n);
  const prev = new Float64Array(n);
  for (let t = 0; t < T; t++) {
    for (let b = 0; b < n; b++) { e[b] += (t + 1) * (x[t][b] - prev[b]); prev[b] = x[t][b]; }
  }
  for (let b = 0; b < n; b++) e[b] += (T + 1) * (1 - prev[b]);
  return e;
}

// ------------------------------------------------------------------------------------------------
// feasible schedules
// ------------------------------------------------------------------------------------------------
function successors(prec: Precedence, n: number): { sstart: Int32Array; slist: Int32Array } {
  const counts = new Int32Array(n);
  for (let k = 0; k < prec.plist.length; k++) counts[prec.plist[k]]++;
  const sstart = new Int32Array(n + 1);
  for (let b = 0; b < n; b++) sstart[b + 1] = sstart[b] + counts[b];
  const fill = sstart.slice(0, n);
  const slist = new Int32Array(prec.plist.length);
  for (let b = 0; b < n; b++) {
    for (let k = prec.pstart[b]; k < prec.pstart[b + 1]; k++) slist[fill[prec.plist[k]]++] = b;
  }
  return { sstart, slist };
}

/** A binary max-heap over (weight, block), ties broken on block id so the order is deterministic. */
class MaxHeap {
  private ids: number[] = [];
  private keys: number[] = [];
  get size(): number { return this.ids.length; }
  push(id: number, key: number): void {
    this.ids.push(id); this.keys.push(key);
    let i = this.ids.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.better(p, i)) break;
      this.swap(i, p); i = p;
    }
  }
  pop(): number {
    const top = this.ids[0];
    const lid = this.ids.pop()!, lk = this.keys.pop()!;
    if (this.ids.length) {
      this.ids[0] = lid; this.keys[0] = lk;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = 2 * i + 2;
        let m = i;
        if (l < this.ids.length && !this.better(m, l)) m = l;
        if (r < this.ids.length && !this.better(m, r)) m = r;
        if (m === i) break;
        this.swap(i, m); i = m;
      }
    }
    return top;
  }
  private better(i: number, j: number): boolean {
    if (this.keys[i] !== this.keys[j]) return this.keys[i] > this.keys[j];
    return this.ids[i] <= this.ids[j];
  }
  private swap(a: number, b: number): void {
    [this.ids[a], this.ids[b]] = [this.ids[b], this.ids[a]];
    [this.keys[a], this.keys[b]] = [this.keys[b], this.keys[a]];
  }
}

/** Topological ordering preferring HIGH weight early (Chicoisne et al. Algorithm 2). */
export function toposortOrder(prec: Precedence, weight: Float64Array, allowed: Uint8Array): Int32Array {
  const n = weight.length;
  const { sstart, slist } = successors(prec, n);
  const indeg = new Int32Array(n);
  let count = 0;
  for (let b = 0; b < n; b++) {
    if (!allowed[b]) continue;
    count++;
    for (let k = prec.pstart[b]; k < prec.pstart[b + 1]; k++) if (allowed[prec.plist[k]]) indeg[b]++;
  }
  const heap = new MaxHeap();
  for (let b = 0; b < n; b++) if (allowed[b] && indeg[b] === 0) heap.push(b, weight[b]);
  const order = new Int32Array(count);
  let at = 0;
  while (heap.size) {
    const b = heap.pop();
    order[at++] = b;
    for (let k = sstart[b]; k < sstart[b + 1]; k++) {
      const c = slist[k];
      if (!allowed[c]) continue;
      if (--indeg[c] === 0) heap.push(c, weight[c]);
    }
  }
  if (at !== count) throw new Error('precedence graph has a cycle');
  return order;
}

export function scheduleValue(inst: CpitInstance, period: Int32Array): number {
  const d = discountFactors(inst);
  let npv = 0;
  for (let b = 0; b < inst.nBlocks; b++) if (period[b] >= 0) npv += d[period[b]] * inst.value[b];
  return npv;
}

/** The TopoSort heuristic (Chicoisne et al. Algorithm 3). Feasibility is by construction. */
export function toposortSchedule(
  inst: CpitInstance, weight: Float64Array, allowed: Uint8Array, label: string,
): ScheduleResult {
  const t0 = performance.now();
  const n = inst.nBlocks, T = inst.nPeriods, R = inst.coef.length;
  const order = toposortOrder(inst.prec, weight, allowed);
  const remaining: Float64Array[] = inst.limit.map((row) => Float64Array.from(row));
  const period = new Int32Array(n).fill(-1);

  for (let i = 0; i < order.length; i++) {
    const b = order[i];
    let earliest = 0, blocked = false;
    for (let k = inst.prec.pstart[b]; k < inst.prec.pstart[b + 1]; k++) {
      const p = inst.prec.plist[k];
      if (!allowed[p]) continue;
      if (period[p] < 0) { blocked = true; break; }
      if (period[p] > earliest) earliest = period[p];
    }
    if (blocked) continue;
    let placed = -1;
    for (let t = earliest; t < T; t++) {
      let ok = true;
      for (let r = 0; r < R; r++) if (remaining[r][t] < inst.coef[r][b] - TOL) { ok = false; break; }
      if (ok) { placed = t; break; }
    }
    if (placed < 0) continue;
    period[b] = placed;
    for (let r = 0; r < R; r++) remaining[r][placed] -= inst.coef[r][b];
  }

  let mined = 0;
  for (let b = 0; b < n; b++) if (period[b] >= 0) mined++;
  return {
    method: label, periodOfBlock: period, npv: scheduleValue(inst, period),
    bound: NaN, gapPct: NaN, minedBlocks: mined, runtimeMs: performance.now() - t0, notes: '',
  };
}

/** w(b) = p_b + the total value of the whole successor cone (Gershon 1987a). */
export function gershonWeights(inst: CpitInstance): Float64Array {
  const n = inst.nBlocks;
  const { sstart, slist } = successors(inst.prec, n);
  const indeg = new Int32Array(n);
  for (let b = 0; b < n; b++) indeg[b] = inst.prec.pstart[b + 1] - inst.prec.pstart[b];
  const stack: number[] = [];
  for (let b = 0; b < n; b++) if (indeg[b] === 0) stack.push(b);
  const order: number[] = [];
  const deg = Int32Array.from(indeg);
  while (stack.length) {
    const b = stack.pop()!;
    order.push(b);
    for (let k = sstart[b]; k < sstart[b + 1]; k++) if (--deg[slist[k]] === 0) stack.push(slist[k]);
  }
  const w = Float64Array.from(inst.value);
  for (let i = order.length - 1; i >= 0; i--) {
    const b = order[i];
    let acc = 0;
    for (let k = sstart[b]; k < sstart[b + 1]; k++) acc += w[slist[k]];
    w[b] += acc;
  }
  return w;
}

/** Shift local search: pull value forward, push cost back. Both moves strictly improving. */
export function improveSchedule(inst: CpitInstance, base: ScheduleResult, maxPasses = 12): ScheduleResult {
  const t0 = performance.now();
  const n = inst.nBlocks, T = inst.nPeriods, R = inst.coef.length;
  const period = Int32Array.from(base.periodOfBlock);
  const { sstart, slist } = successors(inst.prec, n);
  const remaining: Float64Array[] = inst.limit.map((row) => Float64Array.from(row));
  for (let b = 0; b < n; b++) if (period[b] >= 0) for (let r = 0; r < R; r++) remaining[r][period[b]] -= inst.coef[r][b];

  const byPeriod = Array.from({ length: n }, (_, b) => b);
  let moves = 0;
  for (let pass = 0; pass < maxPasses; pass++) {
    let moved = 0;
    byPeriod.sort((a, b) => period[a] - period[b]);
    for (const b of byPeriod) {
      const t = period[b];
      if (t <= 0 || inst.value[b] <= 0) continue;
      let floor = 0;
      for (let k = inst.prec.pstart[b]; k < inst.prec.pstart[b + 1]; k++) {
        const p = inst.prec.plist[k];
        if (period[p] >= 0 && period[p] > floor) floor = period[p];
      }
      for (let s = floor; s < t; s++) {
        let ok = true;
        for (let r = 0; r < R; r++) if (remaining[r][s] < inst.coef[r][b] - TOL) { ok = false; break; }
        if (!ok) continue;
        for (let r = 0; r < R; r++) { remaining[r][t] += inst.coef[r][b]; remaining[r][s] -= inst.coef[r][b]; }
        period[b] = s; moved++; moves++;
        break;
      }
    }
    byPeriod.sort((a, b) => period[b] - period[a]);
    for (const b of byPeriod) {
      const t = period[b];
      if (t < 0 || t >= T - 1 || inst.value[b] >= 0) continue;
      let ceiling = T - 1;
      for (let k = sstart[b]; k < sstart[b + 1]; k++) {
        const c = slist[k];
        if (period[c] >= 0 && period[c] < ceiling) ceiling = period[c];
      }
      for (let s = ceiling; s > t; s--) {
        let ok = true;
        for (let r = 0; r < R; r++) if (remaining[r][s] < inst.coef[r][b] - TOL) { ok = false; break; }
        if (!ok) continue;
        for (let r = 0; r < R; r++) { remaining[r][t] += inst.coef[r][b]; remaining[r][s] -= inst.coef[r][b]; }
        period[b] = s; moved++; moves++;
        break;
      }
    }
    if (moved === 0) break;
  }

  const npv = scheduleValue(inst, period);
  if (npv < base.npv - 1e-6 * Math.max(1, Math.abs(base.npv))) {
    throw new Error(`local search made it worse: ${base.npv} -> ${npv}`);
  }
  let mined = 0;
  for (let b = 0; b < n; b++) if (period[b] >= 0) mined++;
  return {
    method: `${base.method}+shift-ls`, periodOfBlock: period, npv,
    bound: base.bound, gapPct: NaN, minedBlocks: mined,
    runtimeMs: performance.now() - t0, notes: `${moves} shift moves accepted`,
  };
}

export interface SolveOutcome {
  bound: number;
  relaxations: LpRelaxation[];
  results: ScheduleResult[];
  boundMs: number;
  totalMs: number;
}

/** Bound, then schedule, then improve: the whole ladder, live. */
export function solveCpit(inst: CpitInstance, methods: string[] = ['greedy', 'gershon', 'expected']): SolveOutcome {
  const tAll = performance.now();
  const t0 = performance.now();
  const relaxations = inst.coef.map((_, r) => cpitLpRelaxation(inst, r));
  const bound = Math.min(...relaxations.map((r) => r.bound));
  const boundMs = performance.now() - t0;

  const full = solveUltimatePit(inst.value, inst.prec.pstart, inst.prec.plist);
  const allowed = full.inPit;
  const results: ScheduleResult[] = [];

  const tight = relaxations.reduce((a, b) => (a.bound <= b.bound ? a : b));
  for (const m of methods) {
    let w: Float64Array;
    let label: string;
    if (m === 'greedy') { w = inst.value; label = 'toposort-greedy'; }
    else if (m === 'gershon') { w = gershonWeights(inst); label = 'toposort-gershon'; }
    else {
      const e = expectedExtractionTimes(tight.x);
      w = new Float64Array(e.length);
      for (let b = 0; b < e.length; b++) w[b] = -e[b];
      label = 'toposort-expected';
    }
    const res = toposortSchedule(inst, w, allowed, label);
    res.bound = bound;
    res.gapPct = (100 * (bound - res.npv)) / bound;
    results.push(res);
  }

  const best = results.reduce((a, b) => (a.npv >= b.npv ? a : b));
  const improved = improveSchedule(inst, best);
  improved.bound = bound;
  improved.gapPct = (100 * (bound - improved.npv)) / bound;
  results.push(improved);

  for (const r of results) {
    if (r.npv > bound + 1e-6 * Math.abs(bound)) {
      throw new Error(`feasible ${r.npv} exceeds the certified bound ${bound}`);
    }
  }
  return { bound, relaxations, results, boundMs, totalMs: performance.now() - tAll };
}
