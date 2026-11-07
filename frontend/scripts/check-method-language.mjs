import { readdirSync, readFileSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const frontend = fileURLToPath(new URL('..', import.meta.url));
const root = fileURLToPath(new URL('../..', import.meta.url));
const forbidden = /\b(?:classical|state[\s-]+of[\s-]+the[\s-]+art|SOTA|beyond[\s-]+SOTA|BS-\d+|tiers?)\b|clásic[oa]s?|estado del arte|más allá del estado del arte|peldañ(?:o|os)|rungs?\b/iu;
const internalLiterals = new Set(['classical', 'sota', 'beyond', 'rung']);
const findings = [];

function checkText(file, text) {
  const match = forbidden.exec(text);
  if (match) findings.push(`${relative(root, file)}: user-facing method label ${JSON.stringify(match[0])}`);
}

function checkPublicJson(file, value, key = '') {
  if (['method', 'rung', 'schema', 'caseId', 'case_id'].includes(key)) return;
  if (Array.isArray(value)) {
    for (const item of value) checkPublicJson(file, item, key);
  } else if (value && typeof value === 'object') {
    for (const [childKey, child] of Object.entries(value)) checkPublicJson(file, child, childKey);
  } else if (typeof value === 'string') {
    checkText(file, value);
  }
}

function checkMarkdown(file, text) {
  let fenced = false;
  for (const line of text.split(/\r?\n/)) {
    if (/^\s*(```+|~~~+)/.test(line)) {
      fenced = !fenced;
      continue;
    }
    if (fenced) continue; // code examples preserve machine field names and values
    const visible = /^\s{0,3}#{1,6}\s/.test(line) ? line : line.replace(/`[^`]*`/g, '');
    checkText(file, visible);
  }
}

function sourceFiles(directory) {
  const out = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) out.push(...sourceFiles(path));
    else if (['.ts', '.tsx'].includes(extname(entry.name))) out.push(path);
  }
  return out;
}

function contentFiles(directory, extensions, skip = () => false) {
  const out = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (skip(path)) continue;
    if (entry.isDirectory()) out.push(...contentFiles(path, extensions, skip));
    else if (extensions.has(extname(entry.name).toLowerCase())) out.push(path);
  }
  return out;
}

for (const file of sourceFiles(join(frontend, 'src'))) {
  const code = readFileSync(file, 'utf8');
  const kind = file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const tree = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true, kind);
  function visit(node) {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      if (!internalLiterals.has(node.text)) checkText(file, node.text);
    } else if (ts.isJsxText(node)) {
      checkText(file, node.getText(tree));
    } else if (ts.isTemplateExpression(node)) {
      checkText(file, node.head.text);
      for (const span of node.templateSpans) checkText(file, span.literal.text);
    }
    ts.forEachChild(node, visit);
  }
  visit(tree);
}

for (const file of ['README.md', 'notebooks/README.md', 'notebooks/en/README.md', 'notebooks/es/README.md']) {
  checkText(join(root, file), readFileSync(join(root, file), 'utf8'));
}

checkText(join(root, 'CHANGELOG.md'), readFileSync(join(root, 'CHANGELOG.md'), 'utf8'));
for (const file of contentFiles(join(root, 'content'), new Set(['.json']))) {
  checkText(file, readFileSync(file, 'utf8'));
}
for (const file of ['data/derived/manifests/index.json', 'frontend/public/data/manifests/index.json']) {
  const path = join(root, file);
  try {
    const index = JSON.parse(readFileSync(path, 'utf8'));
    checkPublicJson(path, index);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}
for (const directory of ['data/derived', 'frontend/public/data']) {
  for (const path of contentFiles(join(root, directory), new Set(['.json']))) {
    if (/[/\\]manifests[/\\]index\.json$/u.test(path)) continue;
    checkPublicJson(path, JSON.parse(readFileSync(path, 'utf8')));
  }
}
for (const file of ['models/expected-time.json', 'models/training-report.json']) {
  const path = join(root, file);
  checkPublicJson(path, JSON.parse(readFileSync(path, 'utf8')));
}
const trainingSource = readFileSync(join(root, 'scripts/train_learned.py'), 'utf8');
const generatedLabel = trainingSource.match(/"target_relaxation"\s*:\s*"([^"]+)"/u);
if (generatedLabel) checkText(join(root, 'scripts/train_learned.py'), generatedLabel[1]);
// The data-contract is a reader-facing explanation of the product's records. Keep
// machine identifiers in inline code/fenced examples, but scan its explanatory prose.
const internalDocs = /[\\/]docs[\\/](?:design|validation)(?:[\\/]|$)/;
for (const file of contentFiles(join(root, 'docs'), new Set(['.md', '.svg']), (path) => internalDocs.test(path))) {
  const text = readFileSync(file, 'utf8');
  if (extname(file).toLowerCase() === '.md') checkMarkdown(file, text);
  else checkText(file, text);
}

for (const language of ['en', 'es']) {
  for (const topic of readdirSync(join(root, 'notebooks', language), { withFileTypes: true })) {
    if (!topic.isDirectory()) continue;
    const directory = join(root, 'notebooks', language, topic.name);
    for (const name of readdirSync(directory).filter((item) => item.endsWith('.ipynb'))) {
      const file = join(directory, name);
      const notebook = JSON.parse(readFileSync(file, 'utf8'));
      checkText(file, name);
      checkText(file, notebook.metadata?.caos?.title ?? '');
      for (const [index, cell] of (notebook.cells ?? []).entries()) {
        if (cell.cell_type === 'markdown') checkText(file, Array.isArray(cell.source) ? cell.source.join('') : cell.source ?? '');
        if (cell.cell_type === 'code') {
          const source = Array.isArray(cell.source) ? cell.source.join('') : cell.source ?? '';
          // Python comments and chart/print labels are reader-facing even though they live in code cells.
          for (const line of source.split(/\r?\n/)) {
            const comment = line.match(/^\s*#\s?(.*)$/);
            if (comment) checkText(file, comment[1]);
            for (const match of line.matchAll(/(?:title|label|xlabel|ylabel|set_title|set_xlabel|set_ylabel|legend|print)\s*(?:=\s*|\(\s*)(["'])(.*?)\1/giu)) {
              checkText(file, match[2]);
            }
          }
        }
        for (const output of cell.outputs ?? []) {
          checkText(file, Array.isArray(output.text) ? output.text.join('') : output.text ?? '');
          for (const value of Object.values(output.data ?? {})) {
            if (typeof value === 'string') checkText(file, value);
            else if (Array.isArray(value) && value.every((part) => typeof part === 'string')) checkText(file, value.join(''));
          }
        }
      }
    }
  }
}

for (const file of contentFiles(join(root, 'manuscripts'), new Set(['.tex', '.svg', '.md']))) {
  let text = readFileSync(file, 'utf8');
  // Bibliography entries may retain the wording in a cited publication's own title.
  text = text.replace(/\\begin\{thebibliography\}[\s\S]*?\\end\{thebibliography\}/giu, '');
  checkText(file, text);
}

if (findings.length) {
  for (const finding of findings) console.error(`method-language: ${finding}`);
  process.exitCode = 1;
} else {
  console.log('method-language: no internal method-tier labels in app copy, content, notebooks, public docs, README, changelog, or manuscripts');
}
