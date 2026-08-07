// Offline versus live parity, and the two product gates the whole rendering argument rests on.
//
// Without a parity test, "live" and "replay" can be two different sciences presented as one: the
// browser shows one number, the committed artifact shows another, and nothing in the build notices.
// This asserts the TypeScript engine reproduces the Python bound on a committed case, from the same
// block model, under the same scenario.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { buildLiveInstance, buildPrecedence, toLiveModel } from '../src/engine/instance.ts';
import { cpitLpRelaxation, solveCpit } from '../src/engine/cpit.ts';
import { solveUltimatePit } from '../src/engine/maxflow.ts';
import { voidBoundaryPeriods } from '../src/engine/coherence.ts';
import type { ScheduleTrace } from '../src/lib/contract.types.ts';

const DERIVED = join(process.cwd(), '..', 'data', 'derived');
const load = (id: string): ScheduleTrace =>
  JSON.parse(readFileSync(join(DERIVED, id, 'trace.json'), 'utf8')) as ScheduleTrace;

const CASE = 'twin-porphyry-s';

test('the ultimate pit matches the offline lane block for block', () => {
  const t = load(CASE);
  const model = toLiveModel(t.blocks!, t.instance.dims);
  const prec = buildPrecedence(t.instance.dims[0], t.instance.dims[1], t.instance.dims[2], 45);
  const upl = solveUltimatePit(model.value, prec.pstart, prec.plist);

  assert.equal(prec.plist.length, t.instance.nPrecedenceArcs, 'precedence arc count must match');
  assert.equal(upl.nInPit, t.instance.upitBlocks, 'the pit must contain the same blocks');
  const rel = Math.abs(upl.pitValue - t.instance.upitValue) / Math.abs(t.instance.upitValue);
  assert.ok(rel < 1e-7, `ultimate pit value relative error ${rel}`);  // the trace rounds to 0.1
  for (let b = 0; b < model.n; b++) {
    assert.equal(upl.inPit[b], t.blocks!.inPit[b], `block ${b} disagrees on pit membership`);
  }
});

test('the certified bound matches the offline lane', () => {
  const t = load(CASE);
  const model = toLiveModel(t.blocks!, t.instance.dims);
  const prec = buildPrecedence(t.instance.dims[0], t.instance.dims[1], t.instance.dims[2], 45);
  const upl = solveUltimatePit(model.value, prec.pstart, prec.plist);

  // reconstruct the baked scenario exactly, from the absolute per-period limits in the trace
  const T = t.scenario.periods;
  const inst = buildLiveInstance(
    model,
    { periods: T, discountRate: t.scenario.discountRate, capacityFraction: [1, 1], slopeDeg: 45, periodOneUndiscounted: t.scenario.periodOneUndiscounted },
    prec,
    upl.inPit,
  );
  inst.limit = t.scenario.resources.map((r) => Float64Array.from(r.limitPerPeriod));

  const bounds = inst.coef.map((_, r) => cpitLpRelaxation(inst, r).bound);
  const bound = Math.min(...bounds);
  const baked = t.methods[0].bound;
  const rel = Math.abs(bound - baked) / Math.abs(baked);
  assert.ok(rel < 1e-6, `bound relative error ${rel} (live ${bound}, baked ${baked})`);
});

test('a live schedule is feasible and never beats the bound', () => {
  const t = load(CASE);
  const model = toLiveModel(t.blocks!, t.instance.dims);
  const prec = buildPrecedence(t.instance.dims[0], t.instance.dims[1], t.instance.dims[2], 45);
  const upl = solveUltimatePit(model.value, prec.pstart, prec.plist);
  const inst = buildLiveInstance(
    model,
    { periods: t.scenario.periods, discountRate: t.scenario.discountRate, capacityFraction: [1, 1], slopeDeg: 45, periodOneUndiscounted: true },
    prec,
    upl.inPit,
  );
  inst.limit = t.scenario.resources.map((r) => Float64Array.from(r.limitPerPeriod));
  const out = solveCpit(inst);

  for (const res of out.results) {
    assert.ok(res.npv <= out.bound * (1 + 1e-9), `${res.method} beats the certified bound`);
    const use = inst.limit.map(() => new Float64Array(inst.nPeriods));
    for (let b = 0; b < inst.nBlocks; b++) {
      const p = res.periodOfBlock[b];
      if (p < 0) continue;
      for (let k = prec.pstart[b]; k < prec.pstart[b + 1]; k++) {
        const q = res.periodOfBlock[prec.plist[k]];
        if (!upl.inPit[prec.plist[k]]) continue;
        assert.ok(q >= 0 && q <= p, `${res.method}: block ${b} mined before predecessor`);
      }
      for (let r = 0; r < inst.coef.length; r++) use[r][p] += inst.coef[r][b];
    }
    for (let r = 0; r < inst.coef.length; r++) {
      for (let tt = 0; tt < inst.nPeriods; tt++) {
        assert.ok(use[r][tt] <= inst.limit[r][tt] + 1e-6, `${res.method}: resource ${r} over capacity in period ${tt + 1}`);
      }
    }
  }
});

// ------------------------------------------------------------------------------------------------
// THE PRODUCT GATES
// ------------------------------------------------------------------------------------------------
test('TRAP 2: the FINAL frame still carries period colour on the visible surface', () => {
  const t = load(CASE);
  const dims: [number, number, number] = [t.instance.dims[0], t.instance.dims[1], t.instance.dims[2]];
  const best = t.methods.reduce((a, b) => (a.npv >= b.npv ? a : b));
  const per = best.periodOfBlock!;
  const last = t.scenario.periods - 1;

  const wall = voidBoundaryPeriods(per, t.blocks!.x, t.blocks!.y, t.blocks!.level, dims, last);
  const [nx, ny, nz] = dims;
  const at = new Int32Array(nx * ny * nz).fill(-1);
  for (let b = 0; b < per.length; b++) at[(t.blocks!.level[b] * ny + t.blocks!.y[b]) * nx + t.blocks!.x[b]] = b;
  const mined = (b: number) => per[b] >= 0 && per[b] <= last;
  const dirs = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]] as const;

  let visible = 0, coloured = 0, pitWall = 0, pitWallColoured = 0;
  for (let b = 0; b < per.length; b++) {
    if (mined(b)) continue;
    let exposed = false, touchesVoid = false;
    for (const [da, db, dc] of dirs) {
      const jx = t.blocks!.x[b] + da, jy = t.blocks!.y[b] + db, jz = t.blocks!.level[b] + dc;
      if (jx < 0 || jx >= nx || jy < 0 || jy >= ny || jz < 0 || jz >= nz) { exposed = true; continue; }
      const nb = at[(jz * ny + jy) * nx + jx];
      if (nb < 0) { exposed = true; continue; }
      if (mined(nb)) { exposed = true; touchesVoid = true; }
    }
    if (!exposed) continue;
    visible++;
    if (wall[b] >= 0) coloured++;
    if (touchesVoid) { pitWall++; if (wall[b] >= 0) pitWallColoured++; }
  }

  assert.ok(visible > 0, 'the final frame must still show standing rock');
  // 1. every block that touches the excavated void carries a period colour, BY CONSTRUCTION. This is
  //    the claim the whole rendering rule rests on, and it is what the carve-away render fails: under
  //    carve-away the period colour lives INSIDE the volume and the final frame shows none of it.
  assert.equal(pitWallColoured, pitWall, 'a block touching the void has no period colour');
  assert.ok(pitWall > 0, 'the final frame must still have an exposed pit wall');
  // 2. and that wall is a real share of everything visible from outside. The rest of the visible
  //    surface is the model box, which is not the pit. Measured on this case: 33 percent, against
  //    0 percent for the carve-away rendering at the same frame.
  const share = coloured / visible;
  assert.ok(share > 0.25, `only ${(100 * share).toFixed(1)}% of the visible surface carries period colour`);

  let anyEarly = 0;
  for (let b = 0; b < per.length; b++) if (wall[b] >= 0 && wall[b] < last) anyEarly++;
  assert.ok(anyEarly > 0, 'the final frame must show bands from EARLIER periods, not only the last one');
});

test('the last mining period is not empty on the default case', () => {
  const index = JSON.parse(readFileSync(join(DERIVED, 'manifests', 'index.json'), 'utf8')) as {
    cases: { case_id: string; default: boolean }[];
  };
  const def = index.cases.find((c) => c.default);
  assert.ok(def, 'exactly one case must be the default');
  const t = load(def!.case_id);
  const best = t.methods.reduce((a, b) => (a.npv >= b.npv ? a : b));
  const last = best.periods[best.periods.length - 1];
  assert.ok(
    last.blocks > 0,
    `the default case ends on a dead frame: period ${last.t} mines ${last.blocks} blocks. ` +
      'A landing animation whose last frame is empty is a defect no rendering quality fixes.',
  );
});
