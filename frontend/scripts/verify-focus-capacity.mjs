import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';
import { createServer } from 'vite';

execFileSync(process.execPath, ['copy-data.mjs'], { stdio: 'inherit' });
const server = await createServer({ server: { host: '127.0.0.1', port: 0 } });
await server.listen();
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  const base = server.resolvedUrls.local[0];
  await page.goto(new URL('/focus/twin-porphyry-s', base).href, { waitUntil: 'networkidle' });
  await page.locator('.pf-hud-row', { hasText: 'solved' }).first().waitFor({ timeout: 90000 });
  const before = await page.locator('.pf-hud-row', { hasText: 'NPV' }).first().innerText();
  await page.locator('[data-testid="cap-mine"]').fill('0.3');
  await page.locator('.pf-hud-row', { hasText: 'solved' }).first().waitFor({ timeout: 90000 });
  await page.waitForTimeout(1600);
  const after = await page.locator('.pf-hud-row', { hasText: 'NPV' }).first().innerText();
  assert.notEqual(before, after, 'capacity control must change the live plan value');
  console.log('small twin live focus NPV', before.trim(), '->', after.trim());
  await page.goto(new URL('/focus/ctrl-degenerate', base).href, { waitUntil: 'networkidle' });
  await page.locator('[data-testid="cap-mine"]').waitFor();
  assert.equal(await page.locator('label', { hasText: 'plant capacity' }).count(), 0);
  assert.deepEqual(errors, []);
  console.log('PASS focus: live capacity response and one-resource control');
} finally {
  await browser.close();
  await server.close();
}
