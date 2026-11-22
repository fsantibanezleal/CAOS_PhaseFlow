// Compatibility entrypoint for existing verification scripts. Keep artifact copying in the
// template-derived path-checked copier and its PhaseFlow product hook.
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const run = spawnSync(process.execPath, [join(here, 'scripts', 'copy-data-entry.mjs')], { stdio: 'inherit' });
process.exit(run.status ?? 1);
