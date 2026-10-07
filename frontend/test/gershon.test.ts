// Gershon's weight is a SET sum over the successors of a block, each counted once. Summing along
// precedence paths counts a deep block once per path, which is the defect this guards against.

import assert from 'node:assert/strict';
import test from 'node:test';
import { gershonWeights, type CpitInstance } from '../src/engine/cpit.ts';
import { buildPrecedence } from '../src/engine/instance.ts';

function instance(value: number[], pstart: number[], plist: number[]): CpitInstance {
  return {
    nBlocks: value.length, nPeriods: 1, discountRate: 0, periodOneUndiscounted: true,
    value: Float64Array.from(value), coef: [new Float64Array(value.length)], limit: [Float64Array.from([1])],
    prec: { pstart: Int32Array.from(pstart), plist: Int32Array.from(plist) },
  };
}

test('a block reachable along two paths counts once', () => {
  // 0 on top; 1 and 2 below it; 3 below both (block requires predecessor)
  const w = gershonWeights(instance([-1, 2, 3, 10], [0, 0, 1, 2, 4], [0, 0, 1, 2]));
  assert.deepEqual(Array.from(w), [15, 10, 10, 0]);
});

test('the bitset sum equals the set definition on a real slope cone', () => {
  const [nx, ny, nz] = [7, 7, 5];
  const prec = buildPrecedence(nx, ny, nz, 45);
  const n = nx * ny * nz;
  const value = Array.from({ length: n }, (_, b) => ((b * 7919) % 101) - 50);
  const w = gershonWeights(instance(value, Array.from(prec.pstart), Array.from(prec.plist)));

  const succ: number[][] = Array.from({ length: n }, () => []);
  for (let b = 0; b < n; b++) for (let k = prec.pstart[b]; k < prec.pstart[b + 1]; k++) succ[prec.plist[k]].push(b);
  for (let b = 0; b < n; b++) {
    const seen = new Set<number>();
    const stack = [...succ[b]];
    while (stack.length) {
      const c = stack.pop()!;
      if (seen.has(c)) continue;
      seen.add(c);
      stack.push(...succ[c]);
    }
    let want = 0;
    for (const c of seen) want += value[c];
    assert.equal(w[b], want, `block ${b}`);
  }
});
