// Browser gate for the 3D stage: the pit must be ON the canvas, in both themes, after the page has
// settled. Run against the local Vite app by default; set PHASEFLOW_BASE to verify a built or
// deployed release.
//
// The stage advertises `data-drawn` once a frame with instances has reached the canvas, and every
// earlier gate keyed off that flag. It is not enough: the 0.08 build loses its WebGL context once
// after the first frame under headless Chromium, the stage renders on demand, and the canvas stayed
// blank with the flag set. So this gate waits past the flag and reads the pixels.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';
import { createServer } from 'vite';

const baseOverride = process.env.PHASEFLOW_BASE;
// Measured on the default case at 1600x900 with the fix: 0.224 of the stage is the model and 0.118
// carries period colour, in both themes. Without it, after the context restore, both read 0.000.
const MIN_MODEL_SHARE = 0.12;
const MIN_COLOUR_SHARE = 0.04;
let server;
let browser;

async function stageStats(page) {
  return page.evaluate(() => {
    const gl = document.querySelector('[data-testid="schedule-stage"] canvas');
    if (!gl) return null;
    const c = document.createElement('canvas');
    c.width = gl.width;
    c.height = gl.height;
    const ctx = c.getContext('2d');
    ctx.drawImage(gl, 0, 0);
    const { data } = ctx.getImageData(0, 0, c.width, c.height);
    const bg = [data[0], data[1], data[2]];
    let model = 0;
    let colour = 0;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      if (Math.abs(r - bg[0]) + Math.abs(g - bg[1]) + Math.abs(b - bg[2]) <= 24) continue;
      model++;
      const hi = Math.max(r, g, b), lo = Math.min(r, g, b);
      if (hi > 40 && (hi - lo) / hi > 0.35) colour++;
    }
    const n = data.length / 4;
    return { model: model / n, colour: colour / n, width: c.width, height: c.height };
  });
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
  for (const theme of ['dark', 'light']) {
    const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 }, colorScheme: theme });
    await ctx.addInitScript((t) => localStorage.setItem('caos.theme', t), theme);
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(String(error)));
    const response = await page.goto(base, { waitUntil: 'networkidle', timeout: 60000 });
    assert.equal(response?.status(), 200, `${theme}: PhaseFlow must load`);
    assert.match(await page.title(), /^PhaseFlow\b/, `${theme}: wrong app at ${base}`);
    await page.waitForSelector('[data-testid="schedule-stage"][data-drawn="1"]', { timeout: 60000 });
    // past the flag: a context lost and restored after the first frame shows up only now
    await page.waitForTimeout(4000);
    const s = await stageStats(page);
    assert.ok(s, `${theme}: the stage has no canvas`);
    console.log(`${theme}: model ${(100 * s.model).toFixed(1)}%, period colour ${(100 * s.colour).toFixed(1)}% of ${s.width}x${s.height}`);
    assert.ok(s.model >= MIN_MODEL_SHARE,
      `${theme}: the model covers ${(100 * s.model).toFixed(1)}% of the stage (floor ${100 * MIN_MODEL_SHARE}%): a blank or lost canvas`);
    assert.ok(s.colour >= MIN_COLOUR_SHARE,
      `${theme}: period colour covers ${(100 * s.colour).toFixed(1)}% (floor ${100 * MIN_COLOUR_SHARE}%): the walls carry no schedule`);
    assert.deepEqual(errors, [], `${theme}: page errors`);
    await ctx.close();
  }
  console.log('verify-stage: OK');
} finally {
  await browser?.close();
  await server?.close();
}
