// Preserve PhaseFlow's separate compact-artifact root while keeping the shared template copier verbatim.
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const env = { ...process.env };
if (env.PHASEFLOW_DERIVED_ROOT?.trim()) env.CAOS_DATA_ROOT = env.PHASEFLOW_DERIVED_ROOT.trim();
else delete env.CAOS_DATA_ROOT;
const run = spawnSync(process.execPath, [join(here, 'copy-data.mjs')], { stdio: 'inherit', env });
process.exit(run.status ?? 1);
