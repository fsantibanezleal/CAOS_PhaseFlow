import { cpSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/** Add released model metadata to the same rebuilt, path-checked public data overlay as the case artifacts. */
export default async function copyProductData({ out, repo }) {
  const source = join(repo, 'models');
  if (!existsSync(source)) return { copied: [], absent: [], problems: [`model directory is missing: ${source}`] };

  const files = readdirSync(source, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => entry.name)
    .sort();
  if (!files.length) return { copied: [], absent: [], problems: [`no JSON models found under ${source}`] };

  const target = join(out, 'models');
  mkdirSync(target, { recursive: true });
  for (const name of files) cpSync(join(source, name), join(target, name));
  return { copied: files.map((name) => `models/${name}`), absent: [], problems: [] };
}
