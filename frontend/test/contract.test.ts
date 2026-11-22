// CONTRACT 2, asserted rather than asserted-about.
//
// Three module docstrings said a drift between the artifact and this mirror "fails the build,
// because test/contract.test.ts reads the committed artifacts and checks them against these shapes".
// That file did not exist. Nor could the build have caught a drift if it had: tsconfig included only
// `src`, so `tsc --noEmit` never looked at `test/`, and the one place a trace met its type was a
// `JSON.parse(...) as ScheduleTrace`, which is a cast and validates nothing.
//
// A drift was already shipping: `ensemble.resolveMethod` is written into twelve of the thirteen
// committed traces and `EnsembleReport` did not know the field existed, so no panel could read it.
//
// The field names are read from the JSON Schema source. TypeScript is generated from those same
// schemas and `npm run build` checks the generated file byte-for-byte, so the schema remains the
// one field inventory instead of maintaining a parallel handwritten type list.

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

import { INDEX_SCHEMA, MANIFEST_SCHEMA, TRACE_SCHEMA } from '../src/lib/contract.types.ts';
import type { CaseIndex, CaseManifest, ScheduleTrace } from '../src/lib/contract.types.ts';

const DERIVED = join(process.cwd(), '..', 'data', 'derived');
const MANIFESTS = join(DERIVED, 'manifests');
const TRACE_SCHEMA_SOURCE = JSON.parse(readFileSync(join(process.cwd(), '..', 'docs', 'contracts', 'schemas', 'trace.schema.json'), 'utf8')) as {
  properties: Record<string, unknown>;
  $defs: Record<string, { properties?: Record<string, unknown> }>;
};

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

function caseIds(): string[] {
  return readdirSync(DERIVED, { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name !== 'manifests')
    .map((e) => e.name)
    .sort();
}

/** The property names a contract schema declares, read from its single source of truth. */
function declaredFields(name: string): Set<string> {
  const definitions: Record<string, string> = {
    TraceMethod: 'traceMethod',
    EnsembleReport: 'ensembleReport',
    BoundReport: 'boundReport',
  };
  const definition = name === 'ScheduleTrace'
    ? { properties: TRACE_SCHEMA_SOURCE.properties }
    : TRACE_SCHEMA_SOURCE.$defs[definitions[name] ?? name];
  assert.ok(definition, `trace.schema.json declares no definition ${name}`);
  const fields = new Set(Object.keys(definition.properties ?? {}));
  assert.ok(fields.size > 0, `parsed no fields out of ${name}`);
  return fields;
}

const NUMBER = 'number';
const STRING = 'string';

function requireField(obj: Record<string, unknown>, key: string, kind: string, where: string): void {
  assert.ok(key in obj, `${where}: missing ${key}`);
  const v = obj[key];
  assert.equal(typeof v, kind, `${where}: ${key} is ${typeof v}, expected ${kind}`);
  if (kind === NUMBER) assert.ok(Number.isFinite(v as number), `${where}: ${key} is not finite (${v})`);
}

test('the index and every manifest carry the schema id this mirror declares', () => {
  const idx = readJson<CaseIndex>(join(MANIFESTS, 'index.json'));
  assert.equal(idx.schema, INDEX_SCHEMA);
  assert.equal(idx.cases.length, caseIds().length);
  for (const c of idx.cases) {
    const m = readJson<CaseManifest>(join(MANIFESTS, `${c.case_id}.json`));
    assert.equal(m.schema, MANIFEST_SCHEMA, `${c.case_id}: manifest schema`);
    assert.equal(m.case_id, c.case_id);
  }
});

test('every committed trace matches the mirrored shape, field by field', () => {
  for (const id of caseIds()) {
    const t = readJson<ScheduleTrace>(join(DERIVED, id, 'trace.json'));
    const where = id;
    assert.equal(t.schema, TRACE_SCHEMA, `${where}: trace schema`);
    requireField(t as unknown as Record<string, unknown>, 'caseId', STRING, where);

    const inst = t.instance as unknown as Record<string, unknown>;
    for (const k of ['nBlocks', 'nPrecedenceArcs']) requireField(inst, k, NUMBER, `${where}.instance`);
    assert.ok(Array.isArray(t.instance.dims) && t.instance.dims.length === 3, `${where}: dims`);

    const sc = t.scenario as unknown as Record<string, unknown>;
    for (const k of ['periods', 'discountRate']) requireField(sc, k, NUMBER, `${where}.scenario`);

    assert.ok(t.methods.length > 0, `${where}: no methods`);
    for (const m of t.methods) {
      const row = m as unknown as Record<string, unknown>;
      for (const k of ['method', 'rung', 'notes']) requireField(row, k, STRING, `${where}.${m.method}`);
      for (const k of ['npv', 'bound', 'gapPct', 'runtimeMs', 'minedBlocks']) {
        requireField(row, k, NUMBER, `${where}.${m.method}`);
      }
      assert.ok(
        ['classical', 'sota', 'learned', 'beyond'].includes(m.rung),
        `${where}.${m.method}: unknown rung ${m.rung}`,
      );
      assert.equal(
        m.periods.length,
        t.scenario.periods,
        `${where}.${m.method}: ${m.periods.length} period rows for ${t.scenario.periods} periods`,
      );
    }
  }
});

test('no field is written into an artifact that the mirror does not declare', () => {
  // The direction that catches a real drift. `resolveMethod` was written into twelve traces while
  // `EnsembleReport` had never heard of it, so the number it describes could not reach a panel.
  const traceFields = declaredFields('ScheduleTrace');
  const methodFields = declaredFields('TraceMethod');
  const ensembleFields = declaredFields('EnsembleReport');
  // the bound report too: four PCPSP keys were written into every trace with destination economics
  // and the mirror declared none of them
  const boundFields = declaredFields('BoundReport');

  const unknown: string[] = [];
  for (const id of caseIds()) {
    const t = readJson<Record<string, unknown>>(join(DERIVED, id, 'trace.json'));
    for (const k of Object.keys(t)) if (!traceFields.has(k)) unknown.push(`ScheduleTrace.${k}`);
    for (const m of t.methods as Record<string, unknown>[]) {
      for (const k of Object.keys(m)) if (!methodFields.has(k)) unknown.push(`TraceMethod.${k}`);
    }
    const ens = t.ensemble as Record<string, unknown> | undefined;
    if (ens) for (const k of Object.keys(ens)) if (!ensembleFields.has(k)) unknown.push(`EnsembleReport.${k}`);
    const bound = t.bound as Record<string, unknown> | undefined;
    if (bound) for (const k of Object.keys(bound)) if (!boundFields.has(k)) unknown.push(`BoundReport.${k}`);
  }
  assert.deepEqual(
    [...new Set(unknown)].sort(),
    [],
    'fields written into the artifact that contract.types.ts does not declare',
  );
});
