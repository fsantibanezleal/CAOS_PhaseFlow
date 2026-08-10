// The two claims this release adds, asserted against the baked artifacts.
//
// Both are the kind of claim that degrades quietly. A joint bound that stops being computed falls
// back to a looser certified one and every page still renders, with a gap that is right for the
// wrong reason. A guard that stops flagging leaves the learned rung looking like any other row in a
// table, and its worst held-out case is 0.344 of the alternative.

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const DERIVED = join(process.cwd(), '..', 'data', 'derived');

interface Trace {
  caseId: string;
  scenario: { periods: number; discountRate?: number; rate?: number };
  bound?: {
    algorithm4?: number;
    joint?: number | null;
    used?: string;
    joint_slack?: number;
    joint_skipped?: string;
    joint_error?: string;
    joint_note?: string;
  };
  methods: {
    method: string;
    rung: string;
    unreliable?: boolean;
    measuredVsExact?: number | null;
    flaggedByRule?: boolean;
    notes: string;
  }[];
}

function traces(): Trace[] {
  return readdirSync(DERIVED, { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name !== 'manifests')
    .map((e) => JSON.parse(readFileSync(join(DERIVED, e.name, 'trace.json'), 'utf8')) as Trace);
}

test('a joint bound that was computed is CERTIFIED, never a rounded one', () => {
  // The compiled pricing path rounds its integer capacities, which over-estimates by design and is
  // safe, but a bound carrying that slack cannot measure a tightening of the same order. The engine
  // re-derives it exactly at the best dual vector, and `joint_slack === 0` is that claim.
  for (const t of traces()) {
    const b = t.bound;
    if (!b || b.joint == null) continue;
    assert.equal(
      b.joint_slack ?? 0,
      0,
      `${t.caseId}: the joint bound carries rounding slack ${b.joint_slack}, so it is not certified`,
    );
    // The joint bound is not always the tighter one, and when it is not it lands a few parts per
    // million above Algorithm 4: column generation stops on a relative tolerance. What must hold is
    // that the bound USED is the smaller of the two, and that a joint bound which was not adopted
    // says why rather than leaving a null field.
    if (b.used === 'bienstock-zuckerberg') {
      assert.ok(
        b.algorithm4 != null && b.joint <= b.algorithm4 * (1 + 1e-9),
        `${t.caseId}: BZ was adopted while being LOOSER than Algorithm 4`,
      );
    } else {
      assert.ok(
        b.joint_note && b.joint_note.length > 20,
        `${t.caseId}: a joint bound that ran and was not adopted must say why`,
      );
    }
  }
});

test('a case that skipped the joint bound says why, in words', () => {
  for (const t of traces()) {
    const b = t.bound;
    if (!b || b.joint != null) continue;
    const reason = b.joint_skipped ?? b.joint_error ?? b.joint_note;
    assert.ok(
      reason && reason.length > 20,
      `${t.caseId}: no joint bound and no reason. A blank field is not an answer.`,
    );
  }
});

test('the learned rung carries a MEASUREMENT of this case, not a prediction about cases like it', () => {
  // Every baked case contains the exact plan the learned rung approximates, so the ratio between
  // them is a fact rather than a forecast. The scenario rule stays for the live lane, where that
  // exact plan is precisely what has not been solved, and its clean third-split numbers are recall
  // 0.625 with a worst unflagged case of 0.866: good enough to warn with, not good enough to stand
  // in front of an available measurement.
  const FAILURE_BELOW = 0.9;
  let seen = 0;
  for (const t of traces()) {
    const learned = t.methods.filter((m) => m.rung === 'learned');
    if (!learned.length) continue;
    const exact = t.methods.find((m) => m.method === 'toposort-expected');
    for (const m of learned) {
      seen += 1;
      assert.ok(
        m.measuredVsExact != null,
        `${t.caseId}: ${m.method} has no measurement, and ${exact ? 'the exact rung IS in this bake' : 'the exact rung is missing too'}`,
      );
      assert.equal(
        Boolean(m.unreliable),
        (m.measuredVsExact as number) < FAILURE_BELOW,
        `${t.caseId}: the flag disagrees with the measurement ${m.measuredVsExact}`,
      );
      assert.match(
        m.notes,
        /MEASURED on this case/,
        `${t.caseId}: the note does not carry the measurement`,
      );
    }
  }
  assert.ok(seen > 0, 'no case was baked with the learned lane');
});

test('the shipped rule is recorded on every learned row, whatever the rule currently is', () => {
  // Read from the model's own metrics, never restated here. This assertion has been rewritten twice
  // already, because the study moved twice: a scenario rule chosen on a five-point sweep that ran
  // rate and capacity together, then an orebody rule once the sweep was crossed. A test that hardcodes
  // one of them stops testing the moment the science improves, which is exactly when it matters.
  const metrics = JSON.parse(
    readFileSync(join(process.cwd(), '..', 'models', 'expected-time.json'), 'utf8'),
  ).metrics as Record<string, string>;
  const rule = String(metrics.failure_rule ?? '');
  assert.ok(rule.length > 0, 'the model carries no failure rule');

  for (const t of traces()) {
    const learned = t.methods.filter((m) => m.rung === 'learned');
    if (!learned.length) continue;
    let expected: boolean;
    if (rule.startsWith('archetype ==')) {
      // the rule needs a label the artifact does not carry, so the case id is the only handle here;
      // the pipeline reads the real one off the instance
      const want = rule.split('==')[1].trim();
      expected = t.caseId.includes(want.replace('_', '-')) || t.caseId.includes(want);
    } else if (rule.includes('discount rate >=')) {
      const at = Number(rule.split('>=')[1].split(',')[0]);
      expected = (t.scenario.discountRate ?? 0) >= at;
    } else {
      // an unknown rule shape must FAIL rather than silently pass every case
      assert.fail(`the gate does not know how to apply the shipped rule: ${rule}`);
    }
    for (const m of learned) {
      assert.equal(
        Boolean(m.flaggedByRule),
        expected,
        `${t.caseId}: rule ${rule} should ${expected ? '' : 'not '}flag ${m.method}`,
      );
    }
  }
});
