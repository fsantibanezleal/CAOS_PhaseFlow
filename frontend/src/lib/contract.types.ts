// CONTRACT 2 mirror. This file is the TypeScript image of the Python manifest and trace schemas
// (`data-pipeline/pipeline/core/manifest.py` and `core/trace.py`). A drift fails the build, because
// `test/contract.test.ts` reads the committed artifacts and checks them against these shapes.

export const TRACE_SCHEMA = 'phaseflow.schedule-trace/v1';
export const MANIFEST_SCHEMA = 'phaseflow.manifest/v1';
export const INDEX_SCHEMA = 'phaseflow.index/v1';

export interface Bilingual { en: string; es: string }

export interface TracePeriod {
  t: number;
  minedTonnes: number;
  oreTonnes: number;
  wasteTonnes: number;
  headGrade: number;
  metal: number;
  value: number;
  discCashFlow: number;
  cumNpv: number;
  stripRatio: number;
  resourceUse: number[];
  resourceLimit: number[];
  components: number;
  largestComponentShare: number;
  minWidthBlocks: number;
  blocks: number;
}

export type MethodRung = 'classical' | 'sota' | 'learned' | 'beyond';

export interface TraceMethod {
  method: string;
  rung: MethodRung;
  heuristic: boolean;
  npv: number;
  bound: number;
  gapPct: number;
  runtimeMs: number;
  minedBlocks: number;
  notes: string;
  periods: TracePeriod[];
  /** present only for redistributable (synthetic) cases; MineLib cases commit aggregates only */
  periodOfBlock?: number[];
}

export interface TraceBlocks {
  x: number[];
  y: number[];
  level: number[];
  grade: number[];
  tonnage: number[];
  value: number[];
  inPit: number[];
}

export interface TraceResource { id: number; name: string; limitPerPeriod: number[] }

export interface TraceControls {
  dualitySetMatches: boolean;
  dualityBoundError: number;
  boundGeqFeasible: boolean;
  orderInvariant: boolean;
  orderInvarianceError: number;
  allPass: boolean;
  bestGapPct: number;
  worstGapPct: number;
}

export interface TracePublished {
  upit_optimum?: number;
  lp_bound?: number;
  best_known?: number;
  best_known_gap_pct?: number;
  source?: string;
}

export interface ScheduleTrace {
  schema: string;
  caseId: string;
  category: string;
  title: Bilingual;
  role: Bilingual;
  instance: {
    source: 'twin' | 'minelib';
    synthetic: boolean;
    nBlocks: number;
    nPrecedenceArcs: number;
    dims: number[];
    upitValue: number;
    upitBlocks: number;
    licence: string;
  };
  scenario: {
    periods: number;
    discountRate: number;
    periodOneUndiscounted: boolean;
    declared: boolean;
    resources: TraceResource[];
  };
  published: TracePublished;
  controls: TraceControls;
  contract: { accepted: boolean; flags: { code: string; detail: string }[]; facts: Record<string, number> };
  methods: TraceMethod[];
  blocks?: TraceBlocks;
}

export interface CaseManifest {
  schema: string;
  case_id: string;
  category: string;
  real_or_synthetic: 'real' | 'synthetic';
  default: boolean;
  engine: Record<string, string>;
  scenario: { periods: number; discount_rate: number; period_one_undiscounted: boolean; n_resources: number; declared: boolean };
  instance: { n_blocks: number; n_precedence_arcs: number; upit_value: number; upit_blocks: number };
  artifact: { path: string; format: string; trace_schema: string; bytes: number };
  lane: 'live' | 'replay';
  gate: {
    lane: string; n_blocks: number; n_arcs: number; trace_bytes: number; offline_ms: number;
    budgets: { blocks: number; arcs: number; trace_bytes: number }; reasons: string[];
  };
  flags: { code: string; detail: string }[];
  controls: TraceControls;
  published: TracePublished;
  scoreboard: { method: string; rung: MethodRung; npv: number; bound: number; gap_pct: number; runtime_ms: number }[];
  best: { method: string; gap_pct: number } | null;
}

export interface CaseIndexEntry {
  case_id: string;
  category: string;
  manifest_path: string;
  default: boolean;
  lane: 'live' | 'replay';
  title: Bilingual;
}

export interface CaseIndex {
  schema: string;
  engine_version: string;
  n_cases: number;
  cases: CaseIndexEntry[];
}
