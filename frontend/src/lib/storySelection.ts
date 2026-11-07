import type { ScheduleTrace } from './contract.types.ts';

export interface SelectedStoryState {
  methodId: string | null;
  period: number | null;
}

const STORY_STEPS = ['deposit', 'method', 'constraints', 'compare'] as const;
export type StoryStepId = typeof STORY_STEPS[number];

export function resolveStoryStep(value: string | undefined): StoryStepId {
  return STORY_STEPS.includes(value as StoryStepId) ? value as StoryStepId : 'deposit';
}

export function resolveBenchLevel(levels: readonly number[], raw: string | number | null): number | null {
  if (raw == null || raw === '') return null;
  const level = typeof raw === 'number' ? raw : (/^\d+$/.test(raw) ? Number(raw) : NaN);
  return Number.isSafeInteger(level) && levels.includes(level) ? level : null;
}

/** Parse shareable case-workbench state without allowing malformed URLs to invent a result. */
export function resolveStorySelection(trace: ScheduleTrace, params: URLSearchParams): SelectedStoryState {
  const caseId = params.get('case');
  if (caseId && caseId !== trace.caseId) return { methodId: null, period: null };
  const requestedMethod = params.get('method');
  const methodId = requestedMethod && trace.methods.some((method) => method.method === requestedMethod)
    ? requestedMethod
    : null;
  const rawPeriod = params.get('period');
  if (rawPeriod == null || !/^\d+$/.test(rawPeriod) || !trace.scenario.periods) return { methodId, period: null };
  const requestedPeriod = Number(rawPeriod);
  if (!Number.isSafeInteger(requestedPeriod)) return { methodId, period: null };
  const period = Math.max(0, Math.min(trace.scenario.periods - 1, requestedPeriod));
  return { methodId, period };
}
