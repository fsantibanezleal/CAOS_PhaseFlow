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
  methods: { method: string; rung: string; unreliable?: boolean; notes: string }[];
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

test('the learned rung is FLAGGED exactly where the study says it loses', () => {
  // The rule is `discount rate >= 0.15`: measured recall 1.00 on held-out deposits, and no unflagged
  // held-out case lost more than 7 percent. If the flag stops travelling with the method, the
  // warning silently becomes a documentation caveat again.
  const RATE_AT_LEAST = 0.15;
  let seen = 0;
  for (const t of traces()) {
    const learned = t.methods.filter((m) => m.rung === 'learned');
    if (!learned.length) continue;
    seen += 1;
    const rate = t.scenario.discountRate ?? t.scenario.rate ?? 0;
    const expected = rate >= RATE_AT_LEAST;
    for (const m of learned) {
      assert.equal(
        Boolean(m.unreliable),
        expected,
        `${t.caseId}: rate ${rate} should ${expected ? '' : 'not '}flag ${m.method}`,
      );
      if (expected) {
        assert.match(
          m.notes,
          /UNRELIABLE HERE/,
          `${t.caseId}: flagged but the note does not say why`,
        );
      }
    }
  }
  assert.ok(seen > 0, 'no case was baked with the learned lane');
});
