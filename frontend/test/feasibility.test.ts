// The infeasibility label is computed from each schedule's own per-period record. These assertions pin
// it to the baked artifacts: every rung that is ranked against the certified bound must be within
// capacity, the operability view that does not re-impose capacity must be caught where it overruns, and
// the twin-vein plan whose NPV is above the bound must be one of the plans the label catches.

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

test('the twin-vein min-width overrun is the one the record holds', () => {
  const t = traces().find((x) => x.caseId === 'twin-vein');
  assert.ok(t);
  const m = t.methods.find((x) => x.method === 'min-width');
  assert.ok(m);
  const o = largestOverrun(m.periods);
  assert.ok(o);
  assert.equal(t.scenario.resources[o.resource].name, 'processing');
  assert.equal(o.period, 1);
  assert.ok(Math.abs(o.pct - 32.2233) < 1e-3, `overrun ${o.pct}`);
});

test('a feasible beyond plan is not labelled infeasible', () => {
  const t = traces().find((x) => x.caseId === 'ctrl-degenerate');
  assert.ok(t);
  const m = t.methods.find((x) => x.method === 'min-width');
  assert.ok(m);
  assert.equal(largestOverrun(m.periods), null);
});
