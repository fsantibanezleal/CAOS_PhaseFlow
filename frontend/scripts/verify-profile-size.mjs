// Browser gate for the Profile and plan canvas resize loop. Run against the
// local Vite app by default; set PHASEFLOW_BASE to verify a deployed release.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';
import { createServer } from 'vite';

const sizes = [[1600, 900], [1280, 800], [768, 900], [390, 844], [320, 700]];
const baseOverride = process.env.PHASEFLOW_BASE;
let server;
let browser;

async function measure(page) {
  return page.evaluate(() => [...document.querySelectorAll('.pf-canvas-host')].map((host) => {
    const canvas = host.querySelector('canvas');
    const panel = host.closest('.pf-panel');
    return {
      host: host.getBoundingClientRect().height,
      canvas: canvas?.getBoundingClientRect().height ?? 0,
      backing: canvas?.height ?? 0,
      panel: panel?.getBoundingClientRect().height ?? 0,
    };
  }));
}

function check(rows, viewportHeight, label) {
  assert.equal(rows.length, 2, `${label}: both section drawings must exist`);
  const ceiling = Math.max(260, Math.min(viewportHeight * 0.5, 480)) + 2;
  for (const [i, row] of rows.entries()) {
    assert.ok(row.host >= 200 && row.host <= ceiling,
      `${label}: section ${i} host grew to ${row.host}px (ceiling ${ceiling}px)`);
    assert.ok(Math.abs(row.canvas - row.host) <= 2,
      `${label}: section ${i} canvas ${row.canvas}px differs from host ${row.host}px`);
    assert.ok(row.backing <= row.host * 2 + 3,
      `${label}: section ${i} backing bitmap grew to ${row.backing}px`);
  }
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
  for (const [width, height] of sizes) {
    const page = await browser.newPage({ viewport: { width, height } });
    const errors = [];
    page.on('pageerror', (error) => errors.push(String(error)));
    const response = await page.goto(base, { waitUntil: 'networkidle', timeout: 60000 });
    assert.equal(response?.status(), 200, `${width}x${height}: PhaseFlow must load`);
    assert.match(await page.title(), /^PhaseFlow\b/, `${width}x${height}: wrong app at ${base}`);
    const tab = page.locator('button', { hasText: 'Profile and plan' }).first();
    await tab.click();
    const initial = await measure(page);
    check(initial, height, `${width}x${height} initial`);
    for (let i = 0; i < 6; i++) {
      await page.waitForTimeout(200);
      const now = await measure(page);
      check(now, height, `${width}x${height} t=${i}`);
      for (let j = 0; j < 2; j++) {
        assert.ok(now[j].host <= initial[j].host + 2,
          `${width}x${height}: section ${j} drifts taller over time`);
      }
    }
    const controls = page.locator('.pf-panel input[type="range"]');
    assert.equal(await controls.count(), 2, 'profile and bench sliders must both exist');
    for (let i = 0; i < 2; i++) {
      await controls.nth(i).focus();
      await controls.nth(i).press('Home');
      await controls.nth(i).press('ArrowRight');
    }
    await page.waitForTimeout(350);
    check(await measure(page), height, `${width}x${height} sliders`);
    await page.setViewportSize({ width: width - 20, height: height - 40 });
    await page.waitForTimeout(350);
    check(await measure(page), height - 40, `${width}x${height} resized`);
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(350);
    const restored = await measure(page);
    check(restored, height, `${width}x${height} restored`);
    for (let j = 0; j < 2; j++) {
      assert.ok(Math.abs(restored[j].canvas - initial[j].canvas) <= 2,
        `${width}x${height}: section ${j} did not redraw at restored viewport size`);
    }
    if (width === 390) {
      await page.locator('button').filter({ hasText: /^en$/ }).click();
      await page.locator('button', { hasText: 'Perfil y planta' }).click();
      check(await measure(page), height, '390x844 Spanish profile');
    }
    assert.deepEqual(errors, [], `${width}x${height}: browser errors`);
    console.log(`PASS Profile and plan ${width}x${height}: bounded after time, controls and resize`);
    await page.close();
  }
} finally {
  await browser?.close();
  await server?.close();
}
