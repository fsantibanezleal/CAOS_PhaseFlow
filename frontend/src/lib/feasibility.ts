// A schedule is feasible only if every period stays within every capacity, and a gap against the
// certified bound only means something for a feasible schedule.
//
// The overrun is read from each schedule's own record, never from the method's name, so any schedule
// that breaks a capacity is labelled the same way wherever it is shown. The pipeline refuses to bake an
// infeasible plan and min-width refuses every move that would break a capacity, so a committed record
// should never overrun; this check is what shows it if one ever does (an earlier min-width that did not
// re-impose capacity put a plan above its own certified bound, and only this check caught it).

import type { TracePeriod } from './contract.types.ts';

export interface CapacityOverrun {
  /** largest excess over a period's limit, in percent of that limit */
  pct: number;
  /** resource index into `scenario.resources` */
  resource: number;
  /** 1-based period, as the trace numbers them */
  period: number;
}

/** Relative excess below this is float accumulation of tonnages, not an overrun. */
export const OVERRUN_TOLERANCE = 1e-6;

/** The largest capacity overrun in a schedule's record, or null when every period is within capacity. */
export function largestOverrun(periods: readonly Pick<TracePeriod, 't' | 'resourceUse' | 'resourceLimit'>[]): CapacityOverrun | null {
  let worst: CapacityOverrun | null = null;
  for (const p of periods) {
    for (let r = 0; r < p.resourceUse.length; r++) {
      const limit = p.resourceLimit[r];
      if (!(limit > 0)) continue;
      const excess = p.resourceUse[r] / limit - 1;
      if (excess > OVERRUN_TOLERANCE && (worst === null || 100 * excess > worst.pct)) {
        worst = { pct: 100 * excess, resource: r, period: p.t };
      }
    }
  }
  return worst;
}
