// Browser gate: a plan that runs over capacity is labelled infeasible and never shown with a gap.
//
// `min-width` does not re-impose capacity. On twin-vein its record runs +32.2% over processing in
// period 1 and its NPV is above the certified bound (gap -1.23%). This clicks through the places a
// reader meets it: the App's method picker and its warning, the HUD, the KPIs and the methods table,
// then the Experiments ladder, in English and Spanish. It also measures that the ladder draws its bars
// at desktop and phone width, and checks the Benchmark's MineLib CPIT row.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';
import { createServer } from 'vite';

let server;
let browser;
try {
  execFileSync(process.execPath, ['copy-data.mjs'], { stdio: 'inherit' });
  server = await createServer({ server: { host: '127.0.0.1', port: 0 } });
  await server.listen();
  browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  const base = server.resolvedUrls.local[0];
  await page.goto(base, { waitUntil: 'networkidle' });

  await page.locator('select[aria-label="Case"]').selectOption('twin-vein');
  const method = page.locator('select[aria-label="Method"]');
  // the default case has a min-width option too, so wait for twin-vein's own: selecting before its
  // trace lands is undone when the case loads and resets the method to the best comparable plan
  await page.waitForFunction(() =>
    document.querySelector('select[aria-label="Method"] option[value="min-width"]')?.textContent?.includes('32.2'));
  const option = await method.locator('option[value="min-width"]').innerText();
  assert.match(option, /infeasible \+32\.2%/, `picker option reads "${option}"`);
  assert.doesNotMatch(option, /-1\.2/, 'the picker must not show the negative gap');
  // the default stays a comparable plan
  assert.notEqual(await method.inputValue(), 'min-width');
  assert.equal(await page.locator('[data-testid="method-infeasible"]').count(), 0);

  await method.selectOption('min-width');
  const warning = await page.locator('[data-testid="method-infeasible"]').innerText();
  assert.match(warning, /infeasible: \+32\.2% over processing capacity, period 1/, warning);
  assert.equal(await page.locator('[data-testid="hud-infeasible"]').count(), 1);
  const kpis = await page.locator('.pf-kpis').first().innerText();
  assert.match(kpis, /over capacity/i, kpis);
  assert.doesNotMatch(kpis, /-1\.2/, 'the KPIs must not show the negative gap');

  await page.locator('button', { hasText: /^Methods$/ }).click();
  const row = page.locator('tr[data-infeasible="true"]', { hasText: 'min-width' });
  await row.waitFor();
  assert.match(await row.innerText(), /infeasible \+32\.2%/);
  // destination-toposort is beyond but within capacity: not labelled
  assert.equal(await page.locator('tr[data-infeasible="true"]', { hasText: 'destination-toposort' }).count(), 0);

  await page.locator('button').filter({ hasText: /^en$/ }).click();
  const aviso = await page.locator('[data-testid="method-infeasible"]').innerText();
  assert.match(aviso, /infactible: \+32,2% sobre la capacidad de planta, período 1/, aviso);
  await page.locator('button').filter({ hasText: /^es$/ }).click();

  await page.goto(new URL('/experiments', base).href, { waitUntil: 'networkidle' });
  await page.locator('button', { hasText: 'Method ladder' }).click();
  const off = page.locator('.pf-mb-row[data-comparable="false"]');
  await off.first().waitFor();
  assert.ok((await off.count()) > 0);
  assert.equal(await off.locator('.pf-mb-fill').count(), 0, 'a non-comparable row must not draw a captured share');
  const offText = (await off.allInnerTexts()).join('\n');
  assert.doesNotMatch(offText, /gap/, 'a non-comparable row must not print a gap');
  assert.match(offText, /not comparable/);

  // The ladder must DRAW its bars. In 290px panels the fixed columns took every pixel and each track
  // resolved to 0px on the live 0.07.005 page; measured here at a desktop and a phone width.
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 800 });
    await page.waitForTimeout(300);
    const tracks = await page.locator('[data-testid="ladder-grid"] .pf-mb-row .pf-mb-track').evaluateAll((els) =>
      els.map((el) => el.getBoundingClientRect().width));
    const narrowest = Math.min(...tracks);
    assert.ok(narrowest >= 80, `${width}px: a ladder track is ${narrowest.toFixed(0)}px wide`);
    const spill = await page.locator('[data-testid="ladder-grid"] .pf-panel').evaluateAll((els) =>
      els.filter((el) => el.scrollWidth > el.clientWidth + 1).length);
    assert.equal(spill, 0, `${width}px: ${spill} ladder panels overflow`);
    const pastEdge = await page.locator('[data-testid="ladder-grid"] .pf-panel').evaluateAll((els) =>
      els.filter((el) => el.getBoundingClientRect().right > document.documentElement.clientWidth + 1).length);
    assert.equal(pastEdge, 0, `${width}px: ${pastEdge} ladder panels run past the viewport`);
    console.log(`ladder ${width}px: narrowest track ${narrowest.toFixed(0)}px, no panel overflows`);
  }
  await page.setViewportSize({ width: 1280, height: 800 });

  await page.goto(new URL('/benchmark', base).href, { waitUntil: 'networkidle' });
  const minelib = await page.locator('[data-testid="minelib-cpit"]').innerText();
  assert.match(minelib, /24,486,184\.09\s+24,486,184\s+\+0\.09/, minelib);
  assert.match(minelib, /23,483,671/, minelib);

  assert.deepEqual(errors, []);
  console.log('PASS infeasible: min-width labelled with its overrun in EN/ES, no gap in the ladder, MineLib CPIT row present');
} finally {
  await browser?.close();
  await server?.close();
}
