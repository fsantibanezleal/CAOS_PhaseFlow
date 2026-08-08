// Every design token this product references must be one the shared shell actually publishes.
//
// A `var(--name)` whose name does not exist is invalid at computed-value time. For `color` that
// means the property INHERITS, so muted text looks approximately right and nothing seems wrong; for
// `background` it becomes TRANSPARENT. PhaseFlow invented four token names, and the visible symptom
// was four method bars rendered at 100 percent width and completely invisible, next to three that
// rendered fine, on a page whose every other check passed.
//
// This is a source-level gate rather than a browser one on purpose: it catches the typo at the point
// where it is written, and it names the token instead of describing a missing rectangle.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

/**
 * The tokens `@fasl-work/caos-app-shell` defines on :root, read from the installed package rather
 * than restated, so a shell upgrade that renames one fails here instead of in a screenshot.
 */
function shellTokens(): Set<string> {
  const dir = join(process.cwd(), 'node_modules', '@fasl-work', 'caos-app-shell');
  const found = new Set<string>();
  const walk = (p: string): void => {
    for (const entry of readdirSync(p)) {
      const full = join(p, entry);
      if (statSync(full).isDirectory()) {
        walk(full);
      } else if (/\.(css|js|mjs|cjs)$/.test(entry)) {
        for (const m of readFileSync(full, 'utf8').matchAll(/(--color-[a-z0-9-]+)\s*:/g)) {
          found.add(m[1]);
        }
      }
    }
  };
  walk(dir);
  return found;
}

function ourTokens(): Map<string, string[]> {
  const uses = new Map<string, string[]>();
  const walk = (p: string): void => {
    for (const entry of readdirSync(p)) {
      const full = join(p, entry);
      if (statSync(full).isDirectory()) {
        walk(full);
      } else if (/\.(css|ts|tsx)$/.test(entry)) {
        const src = readFileSync(full, 'utf8');
        for (const m of src.matchAll(/var\(\s*(--color-[a-z0-9-]+)\s*(,)?/g)) {
          // a var() WITH a fallback is a deliberate choice and cannot render as nothing
          if (m[2]) continue;
          uses.set(m[1], [...(uses.get(m[1]) ?? []), full]);
        }
        // the canvas views read tokens through getComputedStyle, always with a fallback, so they are
        // safe by construction and are not checked here
      }
    }
  };
  walk(join(process.cwd(), 'src'));
  return uses;
}

test('every design token used without a fallback is one the shell defines', () => {
  const shell = shellTokens();
  assert.ok(shell.size > 5, `expected the shell to define tokens, found ${shell.size}`);
  const missing: string[] = [];
  for (const [token, files] of ourTokens()) {
    // tokens PhaseFlow defines itself are fine
    const ownRoot = readFileSync(join(process.cwd(), 'src', 'phaseflow.css'), 'utf8');
    if (new RegExp(`${token}\\s*:`).test(ownRoot)) continue;
    if (!shell.has(token)) missing.push(`${token} (${files.length} use(s), e.g. ${files[0]})`);
  }
  assert.deepEqual(missing, [], `tokens the shell does not define:\n${missing.join('\n')}`);
});
