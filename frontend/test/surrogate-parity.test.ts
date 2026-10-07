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
  test(`the ${name} surrogate computes the trained function`, () => {
    const model = read<MlpModel>('models', file);
    const { x, y } = fixture[name];
    for (let i = 0; i < x.length; i++) {
      const got = mlpForward(model, x[i]);
      assert.ok(Math.abs(got - y[i]) < 1e-9, `${name} sample ${i}: browser ${got}, python ${y[i]}`);
    }
  });
}

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
    assert.equal(rows[b].length, model.features.length, `block ${b}: ${rows[b].length} features, the model reads ${model.features.length}`);
    for (let j = 0; j < model.features.length; j++) {
      assert.ok(Math.abs(rows[b][j] - f.values[k][j]) < 1e-6, `block ${b} feature ${j}: ${rows[b][j]} vs ${f.values[k][j]}`);
    }
    assert.ok(Math.abs(mlpForward(model, rows[b]) - f.prediction[k]) < 1e-6, `block ${b} prediction`);
  });
});
