// Every label in an architecture diagram must fit inside its own viewBox.
//
// THE DEFECT THIS EXISTS FOR. The diagrams were hand-placed: a literal x, y and width per box, with the
// label poured in afterwards and never measured against the box meant to hold it. On the "What it is"
// tab the closing caption started at x=586 and needed about 224px inside a 760-unit canvas, so it
// shipped as "the gap between them is the honest r", cut mid-word. Nobody noticed because nothing
// measured it: a coordinate is an assertion about where something starts, never about whether it fits.
//
// WHY IT IS STATIC AND NOT A BROWSER GATE. There is a browser bounds check too, and it is the more
// faithful one because the browser does the real text shaping. But it needs a running preview and a
// Playwright install, so in practice it runs at deploy time and not on every push. This one runs in the
// unit-test job in a second, with no browser, so the diagram cannot regress silently between deploys.
// It is deliberately PESSIMISTIC about text width: it over-estimates, so it fails before the browser
// does rather than after.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, '..', 'src', 'architecture.ts'), 'utf8');

// The generated SVG strings are what we want, not the source that generates them, so evaluate the
// module rather than pattern-matching the code that builds it.
const { architecture } = await import('../src/architecture.ts');

// Pessimistic advance widths: comfortably above the real system-ui metrics, so this gate trips first.
const CLASS_W = { tb: 7.6, ts: 6.1, t: 7.0 };

let failures = 0;
let checked = 0;

for (const tab of architecture.tabs) {
  const svg = tab.svg;
  if (!svg) continue;
  const vb = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(svg);
  if (!vb) { console.error(`FAIL ${tab.id}: no viewBox`); failures++; continue; }
  const [vw, vh] = [Number(vb[1]), Number(vb[2])];

  const re = /<text\b([^>]*)>([^<]*)<\/text>/g;
  let m;
  while ((m = re.exec(svg))) {
    const [, attrs, raw] = m;
    const text = raw.trim();
    if (!text) continue;
    checked++;

    const cls = (/class="([^"]*)"/.exec(attrs) || [, ''])[1].split(/\s+/).find((c) => c in CLASS_W) || 't';
    const x = Number((/\bx="([-\d.]+)"/.exec(attrs) || [, NaN])[1]);
    const y = Number((/\by="([-\d.]+)"/.exec(attrs) || [, NaN])[1]);
    const anchor = (/text-anchor="([^"]*)"/.exec(attrs) || [, 'start'])[1];

    const w = text.length * CLASS_W[cls];
    let left = x;
    if (anchor === 'middle') left = x - w / 2;
    else if (anchor === 'end') left = x - w;
    const right = left + w;

    if (right > vw || left < 0 || y > vh) {
      console.error(
        `FAIL ${tab.id}: "${text.slice(0, 40)}" spans x ${left.toFixed(0)}..${right.toFixed(0)} ` +
        `(viewBox width ${vw}), baseline y ${y} (height ${vh})`,
      );
      failures++;
    }
  }

  // A box whose label is wider than the box is the same defect one level down.
  const rects = [...svg.matchAll(/<rect class="bx" x="([-\d.]+)" y="([-\d.]+)" width="([\d.]+)"/g)];
  for (const r of rects) {
    const [, rx, , rw] = r.map(Number);
    if (rx + rw > vw) {
      console.error(`FAIL ${tab.id}: a box spans x ${rx}..${rx + rw} beyond the ${vw}-unit canvas`);
      failures++;
    }
  }
}

if (failures) {
  console.error(`\ncheck-arch-bounds: ${failures} label(s) outside the drawing, ${checked} checked`);
  process.exit(1);
}
console.log(`check-arch-bounds: OK, ${checked} labels inside their viewBox`);
