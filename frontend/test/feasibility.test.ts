// The infeasibility label is computed from each schedule's own per-period record. These assertions pin
// it to the baked artifacts, where every rung must be within capacity, and to a synthetic record, where
// it must catch the overrun with its resource and period.

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { largestOverrun } from '../src/lib/feasibility.ts';
import type { ScheduleTrace } from '../src/lib/contract.types.ts';

const DERIVED = join(process.cwd(), '..', 'data', 'derived');

function traces(): ScheduleTrace[] {
  return readdirSync(DERIVED, { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name !== 'manifests')
    .map((e) => JSON.parse(readFileSync(join(DERIVED, e.name, 'trace.json'), 'utf8')) as ScheduleTrace);
}

test('every comparable rung is within capacity on every case', () => {
  for (const t of traces()) {
    for (const m of t.methods.filter((x) => x.rung !== 'beyond')) {
      assert.equal(largestOverrun(m.periods), null, `${t.caseId}/${m.method} overruns capacity`);
    }
  }
});

test('a plan above the certified bound is always caught as infeasible', () => {
  for (const t of traces()) {
    for (const m of t.methods) {
      if (Number.isFinite(m.bound) && m.npv > m.bound * (1 + 1e-9)) {
        assert.notEqual(largestOverrun(m.periods), null, `${t.caseId}/${m.method} beats the bound but reads feasible`);
      }
    }
  }
});

test('every rung, the beyond ones included, is within capacity on every case', () => {
  // Until 0.08.000 min-width did not re-impose capacity and its twin-vein record ran +32.2 percent over
  // processing in period 1; since oreblocks 0.6.0 every rung keeps capacity, and a label firing on the
  // committed artifacts would now be the defect.
  for (const t of traces()) {
    for (const m of t.methods) {
      assert.equal(largestOverrun(m.periods), null, `${t.caseId}/${m.method} overruns capacity`);
    }
  }
});

test('the label catches an overrun on a synthetic record, with its resource and period', () => {
  // the committed artifacts no longer hold an overrun, so the label is held to one built here
  const periods = [
    { t: 1, resourceUse: [80, 40], resourceLimit: [100, 50] },
    { t: 2, resourceUse: [100, 66.11], resourceLimit: [100, 50] },
    { t: 3, resourceUse: [104, 20], resourceLimit: [100, 50] },
  ];
  const o = largestOverrun(periods);
  assert.ok(o);
  assert.equal(o.resource, 1);
  assert.equal(o.period, 2);
  assert.ok(Math.abs(o.pct - 32.22) < 1e-9, `overrun ${o.pct}`);
  assert.equal(largestOverrun([{ t: 1, resourceUse: [100 * (1 + 1e-9)], resourceLimit: [100] }]), null,
    'float accumulation inside the tolerance is not an overrun');
});

test('a feasible beyond plan is not labelled infeasible', () => {
  const t = traces().find((x) => x.caseId === 'ctrl-degenerate');
  assert.ok(t);
  const m = t.methods.find((x) => x.method === 'min-width');
  assert.ok(m);
  assert.equal(largestOverrun(m.periods), null);
});
