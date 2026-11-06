import assert from 'node:assert/strict';
import { test } from 'node:test';
import { localizeEngineText } from '../src/lib/EngineText.tsx';

test('Spanish engine notes localise decimals before semicolons without changing IDs or versions', () => {
  const note = 'recall 0.8180; precision 0.6670; worst unflagged 0.7852; model v0.20.0; DOI 10.1234/1234.5678';
  assert.equal(
    localizeEngineText(note, 'es'),
    'recall 0,8180; precision 0,6670; worst unflagged 0,7852; model v0.20.0; DOI 10.1234/1234.5678',
  );
});

test('English engine notes preserve their source decimal punctuation', () => {
  assert.equal(localizeEngineText('ratio 0.8180; version v0.20.0', 'en'), 'ratio 0.8180; version v0.20.0');
});
