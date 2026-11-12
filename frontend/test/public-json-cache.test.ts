import assert from 'node:assert/strict';
import test from 'node:test';
import { loadPublicJSON } from '../src/lib/publicJson.ts';

test('concurrent public artifact readers share one request and its parsed result', async () => {
  const originalFetch = globalThis.fetch;
  let requests = 0;
  globalThis.fetch = async () => {
    requests += 1;
    await new Promise((resolve) => setTimeout(resolve, 5));
    return new Response('{"version":1}', { status: 200 });
  };
  try {
    const [first, second] = await Promise.all([
      loadPublicJSON<{ version: number }>('/models/cache-regression.json', 'test-v1'),
      loadPublicJSON<{ version: number }>('/models/cache-regression.json', 'test-v1'),
    ]);
    assert.equal(requests, 1);
    assert.deepEqual(first, { version: 1 });
    assert.deepEqual(second, { version: 1 });
    assert.strictEqual(await loadPublicJSON('/models/cache-regression.json', 'test-v1'), first);
    assert.equal(requests, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('failed public artifact requests are evicted so a later read can retry', async () => {
  const originalFetch = globalThis.fetch;
  let requests = 0;
  globalThis.fetch = async () => {
    requests += 1;
    return requests === 1
      ? new Response('', { status: 503 })
      : new Response('{"ready":true}', { status: 200 });
  };
  try {
    await assert.rejects(loadPublicJSON('/models/retry-regression.json', 'test-v1'), /HTTP 503/);
    assert.deepEqual(await loadPublicJSON('/models/retry-regression.json', 'test-v1'), { ready: true });
    assert.equal(requests, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
