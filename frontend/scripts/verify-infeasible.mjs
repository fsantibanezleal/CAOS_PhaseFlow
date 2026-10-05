// Browser gate: the infeasibility label never fires on the committed plans, and the method bars draw.
//
// Until 0.08.000 `min-width` did not re-impose capacity, and this gate clicked through its +32.2 percent
// processing overrun on twin-vein. Since oreblocks 0.6.0 every rung keeps capacity and
// `scripts/check_artifacts.py` asserts it, so on the committed artifacts the label must stay silent on
// every case and every method, in English and Spanish: a label that fires on a feasible plan is the
// defect now. The unit tests (test/feasibility.test.ts) hold the label to a synthetic overrun.
//
// Run against the local Vite app by default; set PHASEFLOW_BASE to verify a built or deployed release.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';
import { createServer } from 'vite';

const baseOverride = process.env.PHASEFLOW_BASE;
let server;
let browser;

async function selectCase(page, id, best) {
  await page.locator('select[aria-label="Case"]').selectOption(id);
  // the case is loaded when the method picker opens on that case's own best plan
  await page.waitForFunction((b) => document.querySelector('select[aria-label="Method"]')?.value === b, best,
    { timeout: 60000 });
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
  await page.goto(base, { waitUntil: 'networkidle' });

  const cases = await page.evaluate(async () => {
    const idx = await (await fetch('/data/manifests/index.json')).json();
    return Promise.all(idx.cases.map(async (c) => {
      const m = await (await fetch(`/data/manifests/${c.case_id}.json`)).json();
      return { id: c.case_id, best: m.best?.method ?? null };
    }));
  });
  assert.equal(cases.length, 13, 'the index lists thirteen cases');

  for (const c of cases) {
    await selectCase(page, c.id, c.best);
    const options = (await page.locator('select[aria-label="Method"] option').allInnerTexts()).join('\n');
    assert.doesNotMatch(options, /infeasible/, `${c.id}: a method is labelled infeasible`);
    assert.equal(await page.locator('[data-testid="method-infeasible"]').count(), 0, `${c.id}: warning shown`);
    await page.locator('select[aria-label="Method"]').selectOption('min-width');
    assert.equal(await page.locator('[data-testid="method-infeasible"]').count(), 0, `${c.id}: min-width warned`);
    assert.equal(await page.locator('[data-testid="hud-infeasible"]').count(), 0, `${c.id}: min-width HUD warned`);
  }
  console.log(`no infeasibility label on ${cases.length} cases, min-width selected on each`);

  // the methods table and bars, on the case whose min-width used to overrun
  const vein = cases.find((c) => c.id === 'twin-vein');
  await selectCase(page, vein.id, vein.best);
  await page.locator('button', { hasText: /^Methods$/ }).click();
  await page.locator('[data-testid="method-bars"]').waitFor();
  assert.equal(await page.locator('tr[data-infeasible="true"]').count(), 0, 'a methods-table row is labelled infeasible');
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 800 });
    await page.waitForTimeout(300);
    const tracks = await page.locator('[data-testid="method-bars"] .pf-mb-row .pf-mb-track').evaluateAll((els) =>
      els.map((el) => el.getBoundingClientRect().width));
    const narrowest = Math.min(...tracks);
    assert.ok(narrowest >= 80, `${width}px: a method bar track is ${narrowest.toFixed(0)}px wide`);
    const spill = await page.locator('[data-testid="method-bars"] .pf-mb-row').evaluateAll((els) =>
      els.filter((el) => el.scrollWidth > el.clientWidth + 1).length);
    assert.equal(spill, 0, `${width}px: ${spill} method bar rows spill their text`);
    console.log(`method bars ${width}px: narrowest track ${narrowest.toFixed(0)}px, no row spills`);
  }
  await page.setViewportSize({ width: 1280, height: 800 });

  // Spanish: the label is localised, so the silence is checked in that language too
  await page.locator('button').filter({ hasText: /^en$/i }).first().click();
  await page.waitForFunction(() => document.documentElement.lang === 'es' || /Métodos/.test(document.body.innerText));
  const opciones = (await page.locator('select[aria-label="Method"] option').allInnerTexts()).join('\n');
  assert.doesNotMatch(opciones, /infactible/, 'a method is labelled infactible in Spanish');
  await page.locator('button').filter({ hasText: /^es$/i }).first().click();

  await page.goto(new URL('/benchmark', base).href, { waitUntil: 'networkidle' });
  const minelib = await page.locator('[data-testid="minelib-cpit"]').innerText();
  assert.match(minelib, /24,486,184\.09\s+24,486,184\s+\+0\.09/, minelib);
  assert.match(minelib, /23,483,671/, minelib);

  assert.deepEqual(errors, []);
  console.log('PASS infeasible: the label is silent on every committed plan in EN/ES, the method bars draw, MineLib CPIT row present');
} finally {
  await browser?.close();
  await server?.close();
}
