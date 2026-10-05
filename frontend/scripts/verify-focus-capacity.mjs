// Browser gate for the focus route: a capacity control re-solves the plan live, and a one-resource case
// shows no plant control. Run against the local Vite app by default; set PHASEFLOW_BASE to verify a
// built or deployed release.
//
// Since 0.08 the HUD answers twice per change: the learned plan on the next frame ("learned, no LP"),
// then the exact plan from the worker ("exact, in a worker"). The gate waits for the EXACT answer and
// for its value to move, because the learned preview also changes the NPV and would pass on its own.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';
import { createServer } from 'vite';

const EXACT = /exact, in a worker/;
const baseOverride = process.env.PHASEFLOW_BASE;
let server;
let browser;

async function exactNpv(page, previous) {
  await page.waitForFunction(([exactSrc, prev]) => {
    const rows = [...document.querySelectorAll('.pf-hud-row')].map((r) => r.textContent ?? '');
    const exact = rows.some((t) => new RegExp(exactSrc).test(t));
    const npv = rows.find((t) => t.includes('NPV')) ?? '';
    return exact && npv !== '' && npv !== prev;
  }, [EXACT.source, previous ?? ''], { timeout: 90000 });
  return (await page.locator('.pf-hud-row', { hasText: 'NPV' }).first().innerText()).trim();
}

try {
  let base = baseOverride;
  if (!base) {
    execFileSync(process.execPath, ['copy-data.mjs'], { stdio: 'inherit' });
    server = await createServer({ server: { host: '127.0.0.1', port: 0 } });
    await server.listen();
    base = server.resolvedUrls.local[0];
  }
  browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await ctx.addInitScript(() => localStorage.setItem('caos.lang', 'en'));
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.goto(new URL('/focus/twin-porphyry-s', base).href, { waitUntil: 'networkidle' });
  const before = await exactNpv(page, null);
  await page.locator('[data-testid="cap-mine"]').fill('0.3');
  const after = await exactNpv(page, before);
  assert.notEqual(before, after, 'capacity control must change the live plan value');
  console.log('small twin live focus NPV', before, '->', after);
  await page.goto(new URL('/focus/ctrl-degenerate', base).href, { waitUntil: 'networkidle' });
  await page.locator('[data-testid="cap-mine"]').waitFor();
  assert.equal(await page.locator('label', { hasText: 'plant capacity' }).count(), 0);
  assert.deepEqual(errors, []);
  console.log('PASS focus: live capacity response from the exact worker, and one-resource control');
} finally {
  await browser?.close();
  await server?.close();
}
