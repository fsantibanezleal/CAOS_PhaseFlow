// Dinic max-flow on typed arrays, and Picard's maximum-closure reduction.
//
// The whole certified bound rests on one primitive: the maximum-value CLOSED subset of a precedence
// DAG (mine a block only if everything above it is mined). Picard (1976) showed that is the source
// side of a minimum s-t cut of the graph
//
//     source -> block          capacity  v_b      for every block with v_b > 0
//     block  -> sink           capacity -v_b      for every block with v_b < 0
//     block  -> predecessor    capacity  INF      for every precedence arc
//
// so a max-flow gives the exact answer with no LP solver anywhere. This is the same reduction the
// Python lane uses through oreblocks, and `frontend/test/parity.test.ts` asserts the two agree on a
// committed case, so "live" and "replay" are the same science rather than two different answers.
//
// Typed arrays throughout: an adjacency-list Dinic on JS arrays is roughly an order of magnitude
// slower, and this runs on every slider move.

const EPS = 1e-7;

export class Dinic {
  private readonly n: number;
  private head: Int32Array;
  private nextEdge: Int32Array;
  private to: Int32Array;
  private cap: Float64Array;
  private count = 0;
  private level!: Int32Array;
  private iter!: Int32Array;

  constructor(n: number, maxEdges: number) {
    this.n = n;
    this.head = new Int32Array(n).fill(-1);
    this.nextEdge = new Int32Array(2 * maxEdges);
    this.to = new Int32Array(2 * maxEdges);
    this.cap = new Float64Array(2 * maxEdges);
  }

  addEdge(u: number, v: number, c: number): void {
    const e = this.count;
    this.to[e] = v; this.cap[e] = c; this.nextEdge[e] = this.head[u]; this.head[u] = e;
    this.to[e + 1] = u; this.cap[e + 1] = 0; this.nextEdge[e + 1] = this.head[v]; this.head[v] = e + 1;
    this.count += 2;
  }

  private bfs(s: number, t: number): boolean {
    this.level = new Int32Array(this.n).fill(-1);
    const q = new Int32Array(this.n);
    let qh = 0, qt = 0;
    this.level[s] = 0; q[qt++] = s;
    while (qh < qt) {
      const u = q[qh++];
      for (let e = this.head[u]; e !== -1; e = this.nextEdge[e]) {
        const v = this.to[e];
        if (this.cap[e] > EPS && this.level[v] < 0) { this.level[v] = this.level[u] + 1; q[qt++] = v; }
      }
    }
    return this.level[t] >= 0;
  }

  private blockingFlow(s: number, t: number): number {
    // iterative, because a deep pit blows the recursion stack
    const stack = new Int32Array(this.n + 2);
    let total = 0;
    for (;;) {
      let u = s, depth = 0;
      for (;;) {
        if (u === t) break;
        let e = this.iter[u];
        while (e !== -1 && !(this.cap[e] > EPS && this.level[this.to[e]] === this.level[u] + 1)) {
          e = this.nextEdge[e];
        }
        this.iter[u] = e;
        if (e === -1) {
          this.level[u] = -1;              // dead end: prune for the rest of the phase
          if (depth === 0) return total;
          depth -= 1;
          u = depth === 0 ? s : this.to[stack[depth - 1]];
        } else {
          stack[depth++] = e;
          u = this.to[e];
        }
      }
      let push = Infinity;
      for (let k = 0; k < depth; k++) push = Math.min(push, this.cap[stack[k]]);
      for (let k = 0; k < depth; k++) { this.cap[stack[k]] -= push; this.cap[stack[k] ^ 1] += push; }
      total += push;
    }
  }

  maxflow(s: number, t: number): number {
    let flow = 0;
    while (this.bfs(s, t)) {
      this.iter = Int32Array.from(this.head);
      flow += this.blockingFlow(s, t);
    }
    return flow;
  }

  reachable(s: number): Uint8Array {
    const seen = new Uint8Array(this.n);
    const q = new Int32Array(this.n);
    let qh = 0, qt = 0;
    seen[s] = 1; q[qt++] = s;
    while (qh < qt) {
      const u = q[qh++];
      for (let e = this.head[u]; e !== -1; e = this.nextEdge[e]) {
        const v = this.to[e];
        if (this.cap[e] > EPS && !seen[v]) { seen[v] = 1; q[qt++] = v; }
      }
    }
    return seen;
  }
}

/**
 * Maximum-value closed subset of `candidates`, over the precedence CSR `pstart`/`plist`.
 *
 * `candidates` must be closed downward through the precedence it keeps: every predecessor of a
 * candidate is either a candidate itself or already accounted for outside this call. The nested
 * structure of the parametric pit family guarantees exactly that, which is what makes the sequence
 * of solves cheap: each one runs on the shrinking difference, not on the whole model.
 */
export function maxClosureWithin(
  values: Float64Array, pstart: Int32Array, plist: Int32Array, candidates: Uint8Array,
): Uint8Array {
  const n = values.length;
  const out = new Uint8Array(n);
  const local = new Int32Array(n).fill(-1);
  let m = 0;
  for (let b = 0; b < n; b++) if (candidates[b]) local[b] = m++;
  if (m === 0) return out;

  const idx = new Int32Array(m);
  for (let b = 0; b < n; b++) if (candidates[b]) idx[local[b]] = b;

  let sumPositive = 0;
  let arcs = 0;
  for (let j = 0; j < m; j++) {
    const v = values[idx[j]];
    if (v > 0) sumPositive += v;
    const b = idx[j];
    for (let k = pstart[b]; k < pstart[b + 1]; k++) if (local[plist[k]] >= 0) arcs++;
  }
  if (sumPositive <= 0) return out;

  const s = m, t = m + 1;
  const g = new Dinic(m + 2, m + arcs);
  const inf = sumPositive + 1;
  for (let j = 0; j < m; j++) {
    const v = values[idx[j]];
    if (v > 0) g.addEdge(s, j, v);
    else if (v < 0) g.addEdge(j, t, -v);
  }
  for (let j = 0; j < m; j++) {
    const b = idx[j];
    for (let k = pstart[b]; k < pstart[b + 1]; k++) {
      const p = local[plist[k]];
      if (p >= 0) g.addEdge(j, p, inf);
    }
  }
  g.maxflow(s, t);
  const seen = g.reachable(s);
  for (let j = 0; j < m; j++) if (seen[j]) out[idx[j]] = 1;
  return out;
}

/** Exact ultimate pit over the whole model. */
export function solveUltimatePit(
  values: Float64Array, pstart: Int32Array, plist: Int32Array,
): { inPit: Uint8Array; pitValue: number; nInPit: number } {
  const n = values.length;
  const all = new Uint8Array(n).fill(1);
  const inPit = maxClosureWithin(values, pstart, plist, all);
  let pitValue = 0, nInPit = 0;
  for (let b = 0; b < n; b++) if (inPit[b]) { pitValue += values[b]; nInPit++; }
  return { inPit, pitValue, nInPit };
}
