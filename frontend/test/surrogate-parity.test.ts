// The browser runs both learned models with its own code. These tests hold that code to outputs the
// Python side wrote (`scripts/export_surrogate_parity.py`): the forward pass of each model, and the
// expected-time block features of a committed twin. In 0.07.006 the bound surrogate ran tanh and a
// linear head here while the model was trained with ReLU and a sigmoid; nothing noticed.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { blockFeatures, mlpForward, type MlpModel } from '../src/engine/learned.ts';
import { buildPrecedence } from '../src/engine/instance.ts';
import type { ScheduleTrace } from '../src/lib/contract.types.ts';

const ROOT = join(process.cwd(), '..');
const read = <T>(...p: string[]): T => JSON.parse(readFileSync(join(ROOT, ...p), 'utf8')) as T;
const fixture = read<{
  bound: { x: number[][]; y: number[] };
  expectedTime: { x: number[][]; y: number[] };
  features: { case: string; capacityFraction: number[]; rows: number[]; values: number[][]; prediction: number[] };
}>('models', 'surrogate-parity.json');

for (const [name, file] of [['bound', 'bound.json'], ['expectedTime', 'expected-time.json']] as const) {
  test(`adversarial: the ${name} surrogate computes the trained function`, () => {
    const model = read<MlpModel>('models', file);
    const { x, y } = fixture[name];
    for (let i = 0; i < x.length; i++) {
      const got = mlpForward(model, x[i]);
      assert.ok(Math.abs(got - y[i]) < 1e-9, `${name} sample ${i}: browser ${got}, python ${y[i]}`);
    }
  });
}

test('adversarial: the expectedTime surrogate computes the trained function', () => {
  const model = read<MlpModel>('models', 'expected-time.json');
  for (let i = 0; i < fixture.expectedTime.x.length; i++) {
    assert.ok(Math.abs(mlpForward(model, fixture.expectedTime.x[i]) - fixture.expectedTime.y[i]) < 1e-9);
  }
});

test('the expected-time features match the pipeline definition on a committed twin', () => {
  const f = fixture.features;
  const t = read<ScheduleTrace>('data', 'derived', f.case, 'trace.json');
  const [nx, ny, nz] = t.instance.dims;
  const prec = buildPrecedence(nx, ny, nz, 45);
  const rows = blockFeatures(t.blocks!, t.instance.dims, prec, {
    periods: t.scenario.periods, discountRate: t.scenario.discountRate, capacityFraction: f.capacityFraction,
  });
  const model = read<MlpModel>('models', 'expected-time.json');
  f.rows.forEach((b, k) => {
    for (let j = 0; j < 11; j++) {
      assert.ok(Math.abs(rows[b][j] - f.values[k][j]) < 1e-6, `block ${b} feature ${j}: ${rows[b][j]} vs ${f.values[k][j]}`);
    }
    assert.ok(Math.abs(mlpForward(model, rows[b]) - f.prediction[k]) < 1e-6, `block ${b} prediction`);
  });
});

test('adversarial: the browser averages all five expected-time ensemble members', () => {
  const layers = (bias: number) => [{ w: [[0]], b: [bias] }];
  const model: MlpModel = {
    features: ['x'], mu: [0], sigma: [1], layers: layers(0),
    members: [layers(1), layers(2), layers(3), layers(4)].map((layers) => ({ layers })),
  };
  const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));
  const expected = [0, 1, 2, 3, 4].map(sigmoid).reduce((sum, value) => sum + value, 0) / 5;
  assert.ok(Math.abs(mlpForward(model, [0]) - expected) < 1e-12);
});

test('adversarial: the browser refuses a zero-variance expected-time feature', () => {
  assert.throws(
    () => mlpForward({ mu: [0], sigma: [0], layers: [{ w: [[1]], b: [0] }] }, [1]),
    /invalid feature dimensions or a constant trained input/,
  );
});
