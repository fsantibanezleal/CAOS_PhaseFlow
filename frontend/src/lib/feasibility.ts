// A schedule is feasible only if every period stays within every capacity, and a gap against the
// certified bound only means something for a feasible schedule.
//
// `min-width` is an operability view that does not re-impose capacity. Its own record runs over a
// period's limit on 12 of the 13 cases (+154.5% mining on `regime-mining-bound`, +32.2% processing on
// `twin-vein`), and on `twin-vein` its NPV sits ABOVE the certified bound, a gap of -1.23%. The rung
// asterisk said "not comparable", but the method ladder still printed that gap and drew the plan at the
// full bound, and the App showed its NPV with nothing to say it cannot be run. The overrun is read
// from the record, not from the method's name, so any schedule that
// breaks capacity is labelled the same way and a feasible `beyond` row (ctrl-degenerate's min-width,
// every destination-toposort plan) is not.

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
