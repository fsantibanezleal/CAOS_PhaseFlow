import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateGuardEligibility, type GuardReceipt } from '../src/lib/guardEligibility.ts';

const validReceipt = (): GuardReceipt => ({
  rule: 'archetype == vein',
  failure_below: 0.9,
  train_seeds: [101],
  holdout_seeds: [211],
  validation_seeds: [241],
  n: 1,
  rows: [{ seed: 241 }],
  recall: 0.818,
  precision: 0.667,
  worst_unflagged: 0.7852,
});

test('adversarial: third-split metrics below any frozen minimum disable live rule use', () => {
  const receipt = validReceipt();
  receipt.recall = 0.8179;

  const result = evaluateGuardEligibility('archetype == vein', receipt);

  assert.equal(result.available, false);
  assert.match(result.reason, /recall/);
});

test('adversarial: overlapping or malformed split evidence fails closed', () => {
  const receipt = validReceipt();
  receipt.validation_seeds = [211];

  const result = evaluateGuardEligibility('archetype == vein', receipt);

  assert.equal(result.available, false);
  assert.match(result.reason, /reuses a seed/);
});

test('adversarial: a receipt must include rows from every third-split seed', () => {
  const receipt = validReceipt();
  receipt.validation_seeds = [241, 243];

  const result = evaluateGuardEligibility('archetype == vein', receipt);

  assert.equal(result.available, false);
  assert.match(result.reason, /validation seed provenance/);
});

test('the exact frozen thresholds permit a matching receipt with disjoint provenance', () => {
  const result = evaluateGuardEligibility('archetype == vein', validReceipt());

  assert.deepEqual(result, {
    available: true,
    reason: 'the frozen rule passed all third-split thresholds',
  });
});
