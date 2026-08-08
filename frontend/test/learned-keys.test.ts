// Every metric key a panel reads must exist in the baked artifact.
//
// `holdout_npv_vs_greedy_mean` was renamed to `holdout_beats_greedy_rate` when the metric was fixed
// (a mean of per-case ratios whose denominator can approach zero came out as 1.37e14). The panel kept
// reading the old name and printed "NaN%" next to four correct numbers, on the deployed site, for a
// release. Nothing failed: TypeScript indexes a `Record<string, number>` happily, and a NaN reads as
// a rendering glitch rather than as a field that no longer exists.
//
// This asserts the JOIN between the two sides, which is the thing neither side can check alone.

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const DERIVED = join(process.cwd(), '..', 'data', 'derived');

/** Keys the Analysis tab, the Benchmark page and the docs all quote. */
const EXPECTED_TIME_KEYS = [
  'holdout_spearman',
  'holdout_npv_vs_exact_exts_median',
  'holdout_npv_vs_exact_exts_p10',
  'holdout_npv_vs_exact_exts_min',
  'holdout_beats_greedy_rate',
  'holdout_worst_case',
  'split',
];

const BOUND_KEYS = ['holdout_mean_rel_err', 'holdout_p90_rel_err', 'split'];

function tracesWithLearned(): { id: string; learned: Record<string, Record<string, unknown>> }[] {
  const out: { id: string; learned: Record<string, Record<string, unknown>> }[] = [];
  for (const entry of readdirSync(DERIVED, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name === 'manifests') continue;
    const t = JSON.parse(readFileSync(join(DERIVED, entry.name, 'trace.json'), 'utf8'));
    if (t.learned) out.push({ id: entry.name, learned: t.learned });
  }
  return out;
}

test('every learned metric the panels read is present in the artifact', () => {
  const traces = tracesWithLearned();
  assert.ok(traces.length > 0, 'no case was baked with the learned lane');
  for (const { id, learned } of traces) {
    for (const k of EXPECTED_TIME_KEYS) {
      assert.ok(k in (learned.expectedTime ?? {}), `${id}: learned.expectedTime is missing ${k}`);
    }
    for (const k of BOUND_KEYS) {
      assert.ok(k in (learned.bound ?? {}), `${id}: learned.bound is missing ${k}`);
    }
  }
});

test('the learned scorecard reports the WORST case, not only a central number', () => {
  // The failure mode this product argues about elsewhere: a median hides exactly the case a user
  // meets. If the minimum ever disappears from the artifact, the page loses the honest number and
  // nothing else would notice.
  for (const { id, learned } of tracesWithLearned()) {
    const et = learned.expectedTime as Record<string, unknown>;
    const min = et.holdout_npv_vs_exact_exts_min;
    const median = et.holdout_npv_vs_exact_exts_median;
    assert.equal(typeof min, 'number', `${id}: the worst case must be a number`);
    assert.equal(typeof median, 'number', `${id}: the median must be a number`);
    assert.ok((min as number) <= (median as number) + 1e-9, `${id}: the minimum is above the median`);
  }
});
