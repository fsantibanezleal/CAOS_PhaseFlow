// Measure the live lane's exact solve on the committed twins: the number that decides whether an
// instant learned plan is worth showing while it runs. Run: node --import tsx scripts/measure-live-solve.mjs
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { buildLiveInstance, buildPrecedence, toLiveModel } from '../src/engine/instance.ts';
import { solveCpit } from '../src/engine/cpit.ts';
import { solveUltimatePit } from '../src/engine/maxflow.ts';

const DERIVED = join(process.cwd(), '..', 'data', 'derived');
for (const id of readdirSync(DERIVED)) {
  let t;
  try { t = JSON.parse(readFileSync(join(DERIVED, id, 'trace.json'), 'utf8')); } catch { continue; }
  if (!t.blocks) continue;
  const [nx, ny, nz] = t.instance.dims;
  const model = toLiveModel(t.blocks, t.instance.dims);
  const prec = buildPrecedence(nx, ny, nz, 45);
  const upl = solveUltimatePit(model.value, prec.pstart, prec.plist);
  const pit = (arr) => arr.reduce((s, v, i) => s + (t.blocks.inPit[i] ? v : 0), 0);
  const T = t.scenario.periods;
  const caps = t.scenario.resources.map((r, k) => (r.limitPerPeriod[0] * T) / pit(k === 0 ? t.blocks.tonnage : t.blocks.processTonnage));
  const inst = buildLiveInstance(model, { periods: T, discountRate: t.scenario.discountRate, capacityFraction: caps, slopeDeg: 45, periodOneUndiscounted: true }, prec, upl.inPit);
  const t0 = performance.now();
  const out = solveCpit(inst);
  const ms = performance.now() - t0;
  console.log(`${id.padEnd(22)} n=${t.instance.nBlocks} T=${T}  exact live solve ${ms.toFixed(0)} ms (bound ${out.boundMs.toFixed(0)} ms)`);
}
