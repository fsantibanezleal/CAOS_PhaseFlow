import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';
import { createServer } from 'vite';

const slugs = ['deposit', 'method', 'constraints', 'compare'];
const baseOverride = process.env.PHASEFLOW_BASE;
let server;
let browser;

try {
  let base = baseOverride;
  if (!base) {
    execFileSync(process.execPath, ['copy-data.mjs'], { stdio: 'inherit' });
    server = await createServer({ server: { host: '127.0.0.1', port: 0 } });
    await server.listen();
    base = server.resolvedUrls.local[0];
  }
  browser = await chromium.launch();
  for (const lang of ['en', 'es']) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
    await context.addInitScript((language) => localStorage.setItem('caos.lang', language), lang);
    const page = await context.newPage();
    const pageErrors = [];
    page.on('pageerror', (error) => pageErrors.push(String(error)));
    const query = '?case=twin-porphyry-s&method=toposort-gershon&period=1';
    for (const slug of slugs) {
      const response = await page.goto(new URL(`/story/${slug}${query}`, base).toString(), { waitUntil: 'networkidle', timeout: 60000 });
      assert.equal(response?.status(), 200, `${lang}/${slug}: route response`);
      await page.waitForSelector(`[data-story][data-story-step="${slug}"]`, { timeout: 30000 });
      assert.ok((await page.locator('[data-story-headline]').innerText()).trim(), `${lang}/${slug}: data-derived headline`);
      assert.equal(await page.locator('[data-caos-callout]').count(), 3, `${lang}/${slug}: three sourced callouts`);
      assert.equal(await page.locator('[data-stage]').count(), 1, `${lang}/${slug}: one main stage`);
      assert.equal(await page.locator('[data-stage-panel]').count(), 1, `${lang}/${slug}: one evidence panel`);
      assert.equal(await page.locator('[data-story] [data-linked-view="scene"][data-linked-id]').count(), 3, `${lang}/${slug}: three linked scene objects`);
      assert.equal(await page.locator('[data-story] [data-linked-view="panel"][data-linked-id]').count(), 3, `${lang}/${slug}: three linked panel items`);
      const linked = page.locator('[data-story] [data-linked-view="scene"][data-linked-id]').first();
      const linkedId = await linked.getAttribute('data-linked-id');
      await linked.click();
      await page.waitForFunction((id) => document.querySelector(`[data-linked-view="panel"][data-linked-id="${CSS.escape(id)}"]`)?.getAttribute('data-linked-selected') === 'true', linkedId);
      const linkedPanelItem = page.locator(`[data-linked-view="panel"][data-linked-id="${linkedId}"]`);
      await linkedPanelItem.click();
      await page.waitForFunction((id) => document.querySelector(`[data-linked-view="scene"][data-linked-id="${CSS.escape(id)}"]`)?.getAttribute('data-linked-selected') === 'true', linkedId);
      const scrubber = page.locator('[data-story] [data-linked-cursor]');
      const maxCursor = Number(await scrubber.getAttribute('max'));
      const scrubTo = Math.max(0, Math.floor(maxCursor * 0.63));
      await scrubber.evaluate((el, value) => {
        const input = el;
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, String(value));
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }, scrubTo);
      await page.waitForFunction((value) => [...document.querySelectorAll('[data-linked-cursor-marker]')].every((marker) => marker.getAttribute('data-linked-cursor-position') === String(value)), scrubTo);
      assert.match(page.url(), /case=twin-porphyry-s/);
      assert.match(page.url(), /method=toposort-gershon/);
      assert.match(page.url(), new RegExp(`period=${scrubTo}(?:&|$)`));
      console.log(`${lang}/${slug}: ${await page.locator('[data-story-headline]').innerText()}`);
    }
    await page.goto(new URL(`/story/deposit${query}`, base).toString(), { waitUntil: 'networkidle' });
    const benchPicker = page.getByRole('combobox', { name: /selected bench|banco seleccionado/i });
    const benchValue = await benchPicker.locator('option:not([value=""])').first().getAttribute('value');
    assert.ok(benchValue, `${lang}: a real bench is selectable`);
    await benchPicker.selectOption(benchValue);
    await page.waitForFunction((value) => document.querySelector('[data-highlight-level]')?.getAttribute('data-highlight-level') === value, benchValue);
    assert.match(await page.locator('[data-stage-panel]').innerText(), /precedence|precedencia/i);
    assert.match(await page.locator('[data-stage-panel]').innerText(), /blocks|bloques/i);
    await page.goto(new URL(`/story/compare${query}`, base).toString(), { waitUntil: 'networkidle' });
    assert.ok(await page.locator('.pf-story-table tbody tr').count() >= 2, `${lang}: same-case method comparison rows`);
    assert.match(await page.locator('.pf-story-table').innerText(), /matching bound|cota correspondiente/i);
    assert.match(await page.locator('.pf-story-table').innerText(), /feasible|factible/i);
    await page.goto(new URL(`/app${query}`, base).toString(), { waitUntil: 'networkidle' });
    const periodPicker = page.locator('[data-control="period"]');
    await page.waitForFunction(() => document.querySelector('[data-control="period"]')?.value === '1');
    await periodPicker.fill('2');
    await page.waitForFunction(() => document.querySelector('[data-control="period"]')?.value === '2');
    await page.waitForFunction(() => /period 3|período 3/i.test(document.querySelector('.pf-hud-title')?.textContent ?? ''));
    await page.getByRole('tab', { name: /^method$|^método$/i }).click();
    const methodPicker = page.locator('[data-control="method"]');
    const currentMethod = await methodPicker.inputValue();
    const nextMethod = await methodPicker.locator('option').evaluateAll((options, current) => options.map((option) => option.value).find((value) => value && value !== current), currentMethod);
    assert.ok(nextMethod, `${lang}: an alternate method is available`);
    await methodPicker.selectOption(nextMethod);
    assert.equal(await methodPicker.inputValue(), nextMethod, `${lang}: method selection remains user-controlled`);
    const casePicker = page.getByRole('combobox', { name: /case selector|selector de casos/i });
    await casePicker.selectOption('newman1-published');
    await page.getByText(/no 3D replay for this instance|sin replay 3D para esta instancia/i).waitFor({ timeout: 30000 });
    await page.goto(new URL(`/story/deposit?case=newman1-published`, base).toString(), { waitUntil: 'networkidle' });
    await page.locator('.caos-scene3d-status').getByText(/published aggregates only|solo agregados publicados/i).waitFor({ timeout: 30000 });
    assert.equal(await page.locator('[data-testid="schedule-stage"] canvas').count(), 0, `${lang}: aggregate-only case must not synthesize block geometry`);
    assert.match(await page.locator('[data-stage]').innerText(), /aggregate|agregados/i);
    await page.goto(new URL(`/story/compare${query}`, base).toString(), { waitUntil: 'networkidle' });
    await page.locator('[data-story]').focus();
    await page.keyboard.press('ArrowLeft');
    await page.waitForSelector('[data-story-step="constraints"]');
    assert.match(page.url(), /\/story\/constraints/);
    await page.getByRole('button', { name: /return to the workbench|volver al espacio de trabajo/i }).click();
    await page.waitForURL(/\/app\?/);
    assert.match(page.url(), /case=twin-porphyry-s/);
    assert.match(page.url(), /method=toposort-gershon/);
    assert.match(page.url(), /period=1/);
    assert.deepEqual(pageErrors, [], `${lang}: browser errors`);
    await context.close();
  }
  console.log('verify:showcase: four deep links, both languages, reduced motion, keyboard navigation and selection-preserving exit passed');
} finally {
  await browser?.close();
  await server?.close();
}
