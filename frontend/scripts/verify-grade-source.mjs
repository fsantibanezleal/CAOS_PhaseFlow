// Browser gate: a MineLib case without grade must not display an invented grade curve.
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
  await page.goto(server.resolvedUrls.local[0], { waitUntil: 'networkidle' });
  const caseSelect = page.locator('select[aria-label="Case"]');
  await caseSelect.selectOption('zuck-small-declared');
  await page.locator('button', { hasText: 'Production and NPV' }).click();
  await page.getByText('The MineLib source has no block grade for this case.').waitFor();
  assert.equal(await page.locator('.pf-panel h4').filter({ hasText: 'Head grade and strip ratio' }).count(), 0);
  assert.equal(await page.locator('.pf-panel h4').filter({ hasText: 'Strip ratio' }).count(), 1);
  await caseSelect.selectOption('newman1-published');
  await page.getByText('Source grade: MineLib Newman1 .blocks grade column (percent).', { exact: false }).waitFor();
  assert.equal(await page.locator('.pf-panel h4').filter({ hasText: 'Head grade and strip ratio' }).count(), 1);
  await page.locator('button').filter({ hasText: /^en$/ }).click();
  await page.locator('select[aria-label="Caso"]').selectOption('zuck-small-declared');
  await page.locator('button', { hasText: 'Producción y NPV' }).click();
  await page.getByText('La fuente MineLib no proporciona ley por bloque para este caso.', { exact: false }).waitFor();
  assert.equal(await page.locator('.pf-panel h4').filter({ hasText: 'Razón lastre-mineral' }).count(), 1);
  assert.deepEqual(errors, []);
  console.log('PASS MineLib grade provenance: Zuck omits grade in EN/ES; Newman1 renders sourced grade');
} finally {
  await browser?.close();
  await server?.close();
}
