export interface GuardReceipt {
  rule?: unknown;
  failure_below?: unknown;
  train_seeds?: unknown;
  holdout_seeds?: unknown;
  validation_seeds?: unknown;
  n?: unknown;
  rows?: unknown;
  recall?: unknown;
  precision?: unknown;
  worst_unflagged?: unknown;
}

/** Live learned warnings are allowed only when the frozen rule clears every independent gate. */
export function evaluateGuardEligibility(rule: string, receipt: GuardReceipt): { available: boolean; reason: string } {
  if (!rule || receipt.rule !== rule) return { available: false, reason: 'receipt does not match the frozen rule' };
  if (receipt.failure_below !== 0.9) return { available: false, reason: 'receipt uses a different failure threshold' };
  const splits = [receipt.train_seeds, receipt.holdout_seeds, receipt.validation_seeds];
  if (!splits.every((ids) => Array.isArray(ids) && ids.length > 0
    && ids.every((seed) => typeof seed === 'number' && Number.isInteger(seed)) && new Set(ids).size === ids.length)) {
    return { available: false, reason: 'receipt is missing valid, unique seed IDs' };
  }
  const [train, holdout, validation] = splits as number[][];
  if (train.some((seed) => holdout.includes(seed) || validation.includes(seed)) || holdout.some((seed) => validation.includes(seed))) {
    return { available: false, reason: 'receipt reuses a seed across splits' };
  }
  const rows = Array.isArray(receipt.rows) ? receipt.rows as { seed?: number }[] : null;
  if (typeof receipt.n !== 'number' || !Number.isInteger(receipt.n) || receipt.n <= 0 || !rows
    || rows.length !== receipt.n || rows.some((row) => !row || !validation.includes(row.seed ?? NaN))
    || !validation.every((seed) => rows.some((row) => row.seed === seed))) {
    return { available: false, reason: 'receipt has inconsistent counts or validation seed provenance' };
  }
  const requirements: [keyof GuardReceipt, number][] = [['recall', 0.818], ['precision', 0.667], ['worst_unflagged', 0.7852]];
  const failures = requirements.filter(([key, minimum]) => typeof receipt[key] !== 'number'
    || !Number.isFinite(receipt[key]) || (receipt[key] as number) < minimum);
  if (failures.length) {
    const details = failures.map(([key, minimum]) => {
      const value = receipt[key];
      return `third-split ${key} ${typeof value === 'number' ? value.toFixed(3) : 'missing'} is below ${minimum}`;
    });
    return { available: false, reason: details.join('; ') };
  }
  return { available: true, reason: 'the frozen rule passed all third-split thresholds' };
}
