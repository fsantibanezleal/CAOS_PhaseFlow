// Loaders for the committed artifacts. Every fetch is cache-busted with the app version, because a
// GitHub Pages CDN happily serves a stale JSON next to a fresh bundle and the result is an app that
// shows last release's numbers with this release's labels.

import type { CaseIndex, CaseManifest, ScheduleTrace } from './contract.types.ts';
import { INDEX_SCHEMA, MANIFEST_SCHEMA, TRACE_SCHEMA } from './contract.types.ts';

export const APP_VERSION = (import.meta.env?.VITE_APP_VERSION as string) ?? '0.01.000';

// ROOT-relative. A bare `data/...` resolves against the CURRENT path, so every fetch from
// `/focus/<case>` went to `/focus/data/...`, hit the SPA fallback, and parsed index.html as JSON:
// "Unexpected token '<'". It never showed up while the gate clicked through from `/` with a warm
// cache, and it broke every deep link, which ADR-0070 requires to work.
const BASE = '/data';
const cache = new Map<string, unknown>();

async function getJSON<T>(rel: string): Promise<T> {
  const hit = cache.get(rel);
  if (hit) return hit as T;
  const res = await fetch(`${BASE}/${rel}?v=${APP_VERSION}`);
  if (!res.ok) throw new Error(`${rel}: HTTP ${res.status}`);
  const data = (await res.json()) as T;
  cache.set(rel, data);
  return data;
}

function expect(actual: string, wanted: string, what: string): void {
  if (actual !== wanted) throw new Error(`${what}: schema ${actual}, expected ${wanted}`);
}

export async function loadIndex(): Promise<CaseIndex> {
  const idx = await getJSON<CaseIndex>('manifests/index.json');
  expect(idx.schema, INDEX_SCHEMA, 'case index');
  return idx;
}

export async function loadManifest(caseId: string): Promise<CaseManifest> {
  const m = await getJSON<CaseManifest>(`manifests/${caseId}.json`);
  expect(m.schema, MANIFEST_SCHEMA, `manifest ${caseId}`);
  return m;
}

export async function loadTrace(caseId: string): Promise<ScheduleTrace> {
  const t = await getJSON<ScheduleTrace>(`${caseId}/trace.json`);
  expect(t.schema, TRACE_SCHEMA, `trace ${caseId}`);
  return t;
}

export function fmtMoney(v: number): string {
  const a = Math.abs(v);
  if (a >= 1e9) return `${(v / 1e9).toFixed(2)} B`;
  if (a >= 1e6) return `${(v / 1e6).toFixed(1)} M`;
  if (a >= 1e3) return `${(v / 1e3).toFixed(1)} k`;
  return v.toFixed(0);
}

/**
 * Group digits by the APP's language, never by the browser's.
 *
 * A bare `toLocaleString()` asks the browser, so an English page rendered on a Spanish machine
 * printed 14,153 blocks as `14.153`, which an English reader parses as fourteen point one five
 * three. The number was right and the page said something else.
 */
export function fmtInt(v: number, lang: string): string {
  return v.toLocaleString(lang === 'es' ? 'es-CL' : 'en-US');
}

export function fmtTonnes(v: number): string {
  const a = Math.abs(v);
  if (a >= 1e6) return `${(v / 1e6).toFixed(2)} Mt`;
  if (a >= 1e3) return `${(v / 1e3).toFixed(1)} kt`;
  return `${v.toFixed(0)} t`;
}
