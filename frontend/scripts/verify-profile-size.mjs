// Browser gate for the Profile and plan canvas resize loop. Run against the
// local Vite app by default; set PHASEFLOW_BASE to verify a deployed release.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright';
import { createServer } from 'vite';

const sizes = [[1600, 900], [1280, 800], [1280, 720], [768, 900], [390, 844], [320, 700]];
const baseOverride = process.env.PHASEFLOW_BASE;
const captureRoot = process.env.PHASEFLOW_PROFILE_CAPTURE_DIR ? resolve(process.env.PHASEFLOW_PROFILE_CAPTURE_DIR) : null;
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

function check(rows, viewportWidth, viewportHeight, label) {
  assert.equal(rows.length, 2, `${label}: both section drawings must exist`);
  const ceiling = Math.max(260, viewportWidth <= 900
    ? Math.min(viewportHeight * 0.5, 440)
    : Math.min(viewportHeight * 0.75, 900)) + 2;
  for (const [i, row] of rows.entries()) {
    assert.ok(row.host >= 200 && row.host <= ceiling,
      `${label}: section ${i} host grew to ${row.host}px (ceiling ${ceiling}px)`);
    assert.ok(Math.abs(row.canvas - row.host) <= 2,
      `${label}: section ${i} canvas ${row.canvas}px differs from host ${row.host}px`);
    assert.ok(row.backing <= row.host * 2 + 3,
      `${label}: section ${i} backing bitmap grew to ${row.backing}px`);
    assert.ok(row.panel <= row.host + 360,
      `${label}: section ${i} controls and caption add ${row.panel - row.host}px around the figure`);
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
  if (captureRoot) await mkdir(captureRoot, { recursive: true });
  browser = await chromium.launch();
  for (const [width, height] of sizes) {
    const page = await browser.newPage({ viewport: { width, height } });
    const errors = [];
    page.on('pageerror', (error) => errors.push(String(error)));
    // Resolve against the base directory instead of the origin root so GitHub Pages
    // project sites keep their repository path (for example /CAOS_PhaseFlow/app).
    const response = await page.goto(new URL('app', base.endsWith('/') ? base : `${base}/`).toString(),
      { waitUntil: 'networkidle', timeout: 60000 });
    assert.equal(response?.status(), 200, `${width}x${height}: PhaseFlow must load`);
    assert.match(await page.title(), /^PhaseFlow\b/, `${width}x${height}: wrong app at ${base}`);
    const tab = page.getByRole('tab', { name: 'Profile and plan' });
    await tab.click();
    const initial = await measure(page);
    check(initial, width, height, `${width}x${height} initial`);
    if (captureRoot) await page.screenshot({ path: join(captureRoot, `profile-${width}x${height}.png`) });
    for (let i = 0; i < 6; i++) {
      await page.waitForTimeout(200);
      const now = await measure(page);
      check(now, width, height, `${width}x${height} t=${i}`);
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
    check(await measure(page), width, height, `${width}x${height} sliders`);
    await page.setViewportSize({ width: width - 20, height: height - 40 });
    await page.waitForTimeout(350);
    check(await measure(page), width - 20, height - 40, `${width}x${height} resized`);
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(350);
    const restored = await measure(page);
    check(restored, width, height, `${width}x${height} restored`);
    for (let j = 0; j < 2; j++) {
      assert.ok(Math.abs(restored[j].canvas - initial[j].canvas) <= 2,
        `${width}x${height}: section ${j} did not redraw at restored viewport size`);
    }
    if (width === 390) {
      await page.locator('button').filter({ hasText: /^en$/ }).click();
      await page.getByRole('tab', { name: 'Perfil y planta' }).click();
      check(await measure(page), width, height, '390x844 Spanish profile');
      const scenario = page.locator('.pf-scenario');
      const resourceLabels = (await scenario.locator('dt').allTextContents()).map((label) => label.trim());
      assert.ok(resourceLabels.includes('mina') && resourceLabels.includes('planta'),
        'Spanish scenario uses translated resource names');
      assert.ok(!resourceLabels.includes('mining') && !resourceLabels.includes('processing'),
        'raw resource keys never leak into the Spanish scenario');
      assert.match(await scenario.innerText(), /período/, 'Spanish scenario localises the resource unit');
    }
    assert.deepEqual(errors, [], `${width}x${height}: browser errors`);
    console.log(`PASS Profile and plan ${width}x${height}: bounded after time, controls and resize`);
    await page.close();
  }
} finally {
  await browser?.close();
  await server?.close();
}
