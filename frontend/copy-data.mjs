// Prebuild: copy the committed CONTRACT-2 artifacts (../data/derived) into the SPA's public/ so the
// static site replays them. Canonical copies live in ../data; public/ is a build-time overlay and is
// git-ignored, so there is exactly one copy of the evidence in the repo.
//
// PhaseFlow has no Pyodide lane: its live engine is TypeScript (frontend/src/engine/), so there is
// nothing to inline here beyond the artifacts themselves.
import { cpSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const PUB = join(HERE, 'public');

const derived = join(ROOT, 'data', 'derived');
if (!existsSync(derived)) {
  console.error('[copy-data] no data/derived; run "python data-pipeline/run.py" first');
  process.exit(1);
}
mkdirSync(join(PUB, 'data'), { recursive: true });
cpSync(derived, join(PUB, 'data'), { recursive: true });

// The learned models are evidence too: the bound surrogate draws the sensitivity surface in the
// browser, so its weights have to be served. A few kilobytes of JSON, not the ONNX file, which
// exists to be portable for someone else rather than to be how this page multiplies.
const models = join(ROOT, 'models');
if (existsSync(models)) {
  mkdirSync(join(PUB, 'models'), { recursive: true });
  for (const f of readdirSync(models)) {
    if (f.endsWith('.json')) cpSync(join(models, f), join(PUB, 'models', f));
  }
}

const manifests = join(PUB, 'data', 'manifests');
const index = join(manifests, 'index.json');
if (!existsSync(index)) {
  console.error('[copy-data] data/derived/manifests/index.json missing; the bake did not finish');
  process.exit(1);
}
const cases = readdirSync(join(PUB, 'data'), { withFileTypes: true })
  .filter((e) => e.isDirectory() && e.name !== 'manifests')
  .map((e) => e.name);
for (const c of cases) {
  if (!existsSync(join(PUB, 'data', c, 'trace.json'))) {
    console.error(`[copy-data] case ${c} has no trace.json`);
    process.exit(1);
  }
}
console.log(`[copy-data] data/derived -> public/data (${cases.length} cases)`);
