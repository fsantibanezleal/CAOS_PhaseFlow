// The learned preview against the exact live solve, per committed twin: time, and the preview plan's
// NPV as a fraction of the exact ExTS plan at the same setting, each at the case's own baked setting.
// Writes ../models/learned-preview-timing.json, which the Implementation page reads. Run after a
// retraining or a rebake:
//   node --import tsx scripts/measure-learned-preview.mjs
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildLiveInstance, buildPrecedence, toLiveModel } from '../src/engine/instance.ts';
import { solveCpit } from '../src/engine/cpit.ts';
import { solveUltimatePit } from '../src/engine/maxflow.ts';
import { learnedSchedule } from '../src/engine/learned.ts';

const ROOT = join(process.cwd(), '..');
const model = JSON.parse(readFileSync(join(ROOT, 'models', 'expected-time.json'), 'utf8'));
const DERIVED = join(ROOT, 'data', 'derived');
const rows = [];
for (const id of readdirSync(DERIVED)) {
  let t;
  try { t = JSON.parse(readFileSync(join(DERIVED, id, 'trace.json'), 'utf8')); } catch { continue; }
  if (!t.blocks || t.scenario.periods < 2) continue;
  const [nx, ny, nz] = t.instance.dims;
  const T = t.scenario.periods;
  const pit = (arr) => arr.reduce((s, v, i) => s + (t.blocks.inPit[i] ? v : 0), 0);
  const caps = t.scenario.resources.map((r, k) => (r.limitPerPeriod[0] * T) / pit(k === 0 ? t.blocks.tonnage : t.blocks.processTonnage));
  const scenario = { periods: T, discountRate: t.scenario.discountRate, capacityFraction: caps, slopeDeg: 45, periodOneUndiscounted: true };

  const p0 = performance.now();
  const live = toLiveModel(t.blocks, t.instance.dims);
  const prec = buildPrecedence(nx, ny, nz, 45);
  const upl = solveUltimatePit(live.value, prec.pstart, prec.plist);
  const inst = buildLiveInstance(live, scenario, prec, upl.inPit);
  const { result } = learnedSchedule(inst, model, t.blocks, t.instance.dims, scenario, upl.inPit);
  const previewMs = performance.now() - p0;

  const e0 = performance.now();
  const out = solveCpit(inst);
  const exactMs = performance.now() - e0;
  const exts = out.results.find((r) => r.method === 'toposort-expected');
  rows.push({ case: id, nBlocks: t.instance.nBlocks, previewMs: Math.round(previewMs), exactMs: Math.round(exactMs),
    share: +(result.npv / exts.npv).toFixed(4), previewGapPct: +((100 * (out.bound - result.npv)) / out.bound).toFixed(3), extsGapPct: +exts.gapPct.toFixed(3) });
  console.log(`${id.padEnd(22)} preview ${previewMs.toFixed(0).padStart(5)} ms  exact ${exactMs.toFixed(0).padStart(5)} ms  ` +
    `preview/ExTS ${(result.npv / exts.npv).toFixed(3)}  preview gap ${((100 * (out.bound - result.npv)) / out.bound).toFixed(2)}%  ExTS gap ${exts.gapPct.toFixed(2)}%`);
}

writeFileSync(join(ROOT, 'models', 'learned-preview-timing.json'), JSON.stringify({
  schema: 'phaseflow.learned-preview-timing/v1',
  measured: new Date().toISOString().slice(0, 10),
  runtime: `node ${process.version}, the browser engine's TypeScript, single thread`,
  note: 'each committed twin at its own baked setting; exact = bound per resource, three TopoSorts and a shift search',
  rows,
}, null, 1) + '\n');
console.log(`wrote models/learned-preview-timing.json (${rows.length} cases)`);
