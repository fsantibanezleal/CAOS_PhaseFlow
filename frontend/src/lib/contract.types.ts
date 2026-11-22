// CONTRACT 2 types are generated from docs/contracts/schemas/*.schema.json via
// docs/contracts/api.openapi.json. The same schemas are used by the Python pipeline and artifact gate.
import type { components } from './contract.gen.ts';

type Schemas = components['schemas'];

export type Bilingual = Schemas['bilingual'];
export type TracePeriod = Schemas['tracePeriod'];
export type MethodRung = Schemas['methodRung'];
export type TraceMethod = Schemas['traceMethod'];
export type NeighborhoodReceipt = Schemas['neighborhoodReceipt'];
export type LocalSearchReceipt = Schemas['localSearchReceipt'];
export type TraceBlocks = Schemas['traceBlocks'];
export type TraceResource = Schemas['traceResource'];
export type TraceControls = Schemas['traceControls'];
export type TracePublished = Schemas['tracePublished'];
export type BoundReport = Schemas['boundReport'];
export type EnsembleReport = Schemas['ensembleReport'];
export type LearnedReport = Schemas['learnedReport'];
export type ScheduleTrace = Schemas['Trace'];
export type CaseManifest = Schemas['CaseManifest'];
export type ScoreboardRow = Schemas['scoreboardRow'];
export type BoundSummary = Schemas['boundSummary'];
export type EnsembleSummary = Schemas['ensembleSummary'];
export type CaseIndexEntry = Schemas['CaseIndex']['cases'][number];
export type CaseIndex = Schemas['CaseIndex'];

export const TRACE_SCHEMA = 'phaseflow.schedule-trace/v1';
export const MANIFEST_SCHEMA = 'phaseflow.manifest/v1';
export const INDEX_SCHEMA = 'phaseflow.index/v1';
