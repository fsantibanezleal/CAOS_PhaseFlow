import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveBenchLevel, resolveStorySelection, resolveStoryStep } from '../src/lib/storySelection.ts';
import { storyCalloutContentKey } from '../src/lib/storyCalloutLayout.ts';
import type { ScheduleTrace } from '../src/lib/contract.types.ts';

const trace = {
  caseId: 'case-a',
  methods: [{ method: 'method-a' }, { method: 'method-b' }],
  scenario: { periods: 8 },
} as unknown as ScheduleTrace;

test('adversarial: changed story callout copy forces fresh measured card sizes', () => {
  const initial = [{ id: 'capacity', eyebrow: { en: 'CAPACITY', es: 'CAPACIDAD' }, value: '99.9%',
    unit: { en: 'of processing', es: 'de planta' }, state: 'observed',
    source: { en: 'Committed schedule', es: 'Plan comprometido' } }];
  const movedAnchor = [{ ...initial[0], anchor: { x: 0.2, y: 0.4 } }];
  const changedCard = [{ ...initial[0], value: '100%', source: { en: 'New step', es: 'Nuevo paso' } }];
  assert.equal(storyCalloutContentKey(initial), storyCalloutContentKey(movedAnchor),
    'moving an anchor alone must not remount measured cards');
  assert.notEqual(storyCalloutContentKey(initial), storyCalloutContentKey(changedCard),
    'a changed value or source must remount the shell measurer');
});

test('adversarial: a mismatched case URL cannot apply another trace selection', () => {
  assert.deepEqual(resolveStorySelection(trace, new URLSearchParams('case=case-b&method=method-a&period=2')),
    { methodId: null, period: null });
});

test('adversarial: an unknown method cannot replace the case method', () => {
  assert.equal(resolveStorySelection(trace, new URLSearchParams('case=case-a&method=untrained-model&period=2')).methodId, null);
});

test('adversarial: malformed or unsafe period input cannot reach the schedule cursor', () => {
  for (const raw of ['-1', '1.5', '1;alert(1)', 'not-a-period', '9007199254740993']) {
    const result = resolveStorySelection(trace, new URLSearchParams(`case=case-a&period=${encodeURIComponent(raw)}`));
    assert.equal(result.period, null, raw);
  }
});

test('adversarial: a period above the horizon is bounded to the final committed row', () => {
  assert.equal(resolveStorySelection(trace, new URLSearchParams('case=case-a&period=999')).period, 7);
});

test('adversarial: an unknown bench level cannot select absent geometry', () => {
  assert.equal(resolveBenchLevel([1, 2, 3], '999'), null);
  assert.equal(resolveBenchLevel([1, 2, 3], '2'), 2);
});

test('adversarial: an unknown story slug falls back to a valid direct step', () => {
  assert.equal(resolveStoryStep('../../outside'), 'deposit');
});
