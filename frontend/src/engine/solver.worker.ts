// The exact live solve, off the main thread.
//
// The certified bound is tens of maximum closures, measured at 0.9 to 3.6 s per change on the committed
// twins. Run on the main thread it froze the page for that long on every slider movement. Here it runs
// in a worker: the page stays responsive, the learned plan is drawn at once, and the exact plan replaces
// it when it arrives, with the learned plan scored against it.

/// <reference lib="webworker" />
import { buildLiveInstance, buildPrecedence, toLiveModel, type LiveModel, type LiveScenario } from './instance.ts';
import { solveCpit } from './cpit.ts';
import { solveUltimatePit } from './maxflow.ts';
import { scheduleCoherence } from './coherence.ts';
import type { TraceBlocks } from '../lib/contract.types.ts';

export type SolverRequest =
  | { type: 'load'; blocks: TraceBlocks; dims: number[] }
  | { type: 'solve'; id: number; scenario: LiveScenario };

export interface SolverResponse {
  type: 'solved';
  id: number;
  periodOfBlock: Int32Array;
  npv: number;
  bound: number;
  gapPct: number;
  ms: number;
  boundMs: number;
  solves: number;
  components: number[];
  resourceLimit: number[][];
  /** the exact ExTS plan at this setting: the plan the learned rung approximates */
  extsNpv: number;
  method: string;
}

let model: LiveModel | null = null;
let dims: [number, number, number] = [1, 1, 1];

self.onmessage = (ev: MessageEvent<SolverRequest>) => {
  const msg = ev.data;
  if (msg.type === 'load') {
    model = toLiveModel(msg.blocks, msg.dims);
    dims = [msg.dims[0], msg.dims[1], msg.dims[2]];
    return;
  }
  if (msg.type !== 'solve' || !model) return;
  const t0 = performance.now();
  const s = msg.scenario;
  const prec = buildPrecedence(dims[0], dims[1], dims[2], s.slopeDeg);
  const upl = solveUltimatePit(model.value, prec.pstart, prec.plist);
  const inst = buildLiveInstance(model, s, prec, upl.inPit);
  const out = solveCpit(inst);
  const best = out.results.reduce((a, b) => (a.npv >= b.npv ? a : b));
  const exts = out.results.find((r) => r.method === 'toposort-expected');
  const coh = scheduleCoherence(best.periodOfBlock, model.blocks.x, model.blocks.y, model.blocks.level, dims, s.periods);
  const res: SolverResponse = {
    type: 'solved',
    id: msg.id,
    periodOfBlock: best.periodOfBlock,
    npv: best.npv,
    bound: out.bound,
    gapPct: best.gapPct,
    ms: performance.now() - t0,
    boundMs: out.boundMs,
    solves: out.relaxations.reduce((acc, r) => acc + r.closureSolves, 0),
    components: coh.map((c) => c.components),
    resourceLimit: inst.limit.map((row) => Array.from(row)),
    extsNpv: exts ? exts.npv : Number.NaN,
    method: best.method,
  };
  (self as unknown as Worker).postMessage(res, [best.periodOfBlock.buffer]);
};
