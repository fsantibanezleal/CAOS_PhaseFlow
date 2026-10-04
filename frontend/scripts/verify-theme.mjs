// Browser gate: every native select reads in both themes.
//
// The shell declares no `color-scheme`, so a native select kept its light face in the dark theme and
// the Case and Method pickers rendered as white boxes (see the override in phaseflow.css). The check
// is MEASURED on the rendered control, text against its own background, so a later shell or stylesheet
// change that drops the override fails here rather than in a reader's screenshot.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';
import { createServer } from 'vite';

function rgb(css) {
  const m = css.match(/rgba?\(([^)]+)\)/);
  assert.ok(m, `unparsed colour ${css}`);
  const [r, g, b, a = 1] = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
  return { r, g, b, a };
}

function luminance({ r, g, b }) {
  const lin = (c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

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
  await page.locator('select[aria-label="Method"]').waitFor();

  for (const theme of ['light', 'dark']) {
    await page.evaluate((t) => { document.documentElement.dataset.theme = t; }, theme);
    await page.waitForTimeout(150);
    const pageBg = rgb(await page.evaluate(() => getComputedStyle(document.body).backgroundColor));
    const selects = await page.locator('select').evaluateAll((els) =>
      els.map((el) => {
        const cs = getComputedStyle(el);
        return { label: el.getAttribute('aria-label') ?? el.name ?? '?', color: cs.color, bg: cs.backgroundColor, scheme: cs.colorScheme };
      }),
    );
    assert.ok(selects.length >= 2, `expected the Case and Method selects, found ${selects.length}`);
    for (const s of selects) {
      const fg = rgb(s.color);
      const bg = rgb(s.bg);
      assert.equal(bg.a, 1, `${theme}: select ${s.label} has a transparent background`);
      const ratio = contrast(fg, bg);
      assert.ok(ratio >= 4.5, `${theme}: select ${s.label} text ${s.color} on ${s.bg} is ${ratio.toFixed(2)}:1`);
      assert.equal(s.scheme, theme, `${theme}: select ${s.label} color-scheme is ${s.scheme}`);
      // the white-box defect: in the dark theme the control must sit on a dark surface like the page
      if (theme === 'dark') {
        assert.ok(luminance(bg) < 0.1, `dark: select ${s.label} background ${s.bg} is a light box`);
        assert.ok(Math.abs(luminance(bg) - luminance(pageBg)) < 0.1, `dark: select ${s.label} stands out from the page`);
      }
      console.log(`${theme}: select ${s.label} ${ratio.toFixed(2)}:1 on ${s.bg}`);
    }
  }
  assert.deepEqual(errors, []);
  console.log('PASS theme: every select reads in light and dark');
} finally {
  await browser?.close();
  await server?.close();
}
