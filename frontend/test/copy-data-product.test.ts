import assert from 'node:assert/strict';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import test, { after } from 'node:test';

const source = new URL('../scripts/', import.meta.url);
const temp = mkdtempSync(join(process.env.CAOS_TEMP_ROOT?.trim() || tmpdir(), 'phaseflow-copy-data-'));
after(() => rmSync(temp, { recursive: true, force: true }));

function fixture() {
  const repo = join(temp, `repo-${Math.random().toString(16).slice(2)}`);
  const scripts = join(repo, 'frontend', 'scripts');
  mkdirSync(scripts, { recursive: true });
  for (const name of ['copy-data.mjs', 'copy-data-entry.mjs', 'copy-data.product.mjs', 'declared.mjs']) {
    copyFileSync(new URL(name, source), join(scripts, name));
  }
  mkdirSync(join(repo, 'models'), { recursive: true });
  writeFileSync(join(repo, 'models', 'expected-time.json'), '{"version":"fixture"}\n');
  const derived = join(repo, 'candidate-data');
  mkdirSync(join(derived, 'manifests'), { recursive: true });
  writeFileSync(join(derived, 'manifests', 'index.json'), '{"cases":[]}\n');
  writeFileSync(join(derived, 'readiness.json'), '{"contracts":[]}\n');
  return { repo, derived, out: join(repo, 'frontend', 'public', 'data') };
}

test('the product copier uses its compact tree and places released model JSON in the guarded data overlay', () => {
  const { repo, derived, out } = fixture();
  const env = { ...process.env, PHASEFLOW_DERIVED_ROOT: derived, CAOS_DATA_ROOT: join(repo, 'raw-source') };
  const run = spawnSync(process.execPath, [join(repo, 'frontend', 'scripts', 'copy-data-entry.mjs')], {
    cwd: join(repo, 'frontend'), env, encoding: 'utf8',
  });
  assert.equal(run.status, 0, run.stderr);
  assert.match(run.stdout, new RegExp(derived.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.equal(readFileSync(join(out, 'models', 'expected-time.json'), 'utf8'), '{"version":"fixture"}\n');
  assert.equal(existsSync(join(repo, 'frontend', 'public', 'models', 'expected-time.json')), false);
});

test('the product copier fails closed when released model metadata is absent', () => {
  const { repo, derived } = fixture();
  rmSync(join(repo, 'models'), { recursive: true, force: true });
  const run = spawnSync(process.execPath, [join(repo, 'frontend', 'scripts', 'copy-data-entry.mjs')], {
    cwd: join(repo, 'frontend'), env: { ...process.env, PHASEFLOW_DERIVED_ROOT: derived }, encoding: 'utf8',
  });
  assert.equal(run.status, 1);
  assert.match(run.stderr, /model directory is missing/u);
});
