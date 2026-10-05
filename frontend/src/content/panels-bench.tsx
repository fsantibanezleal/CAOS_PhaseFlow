/**
 * Benchmark panels: the published instance against its published and external references, the real
 * models' ultimate pits, the bounds and runtimes of every case, and the browser engine against the
 * bake. PhaseFlow's numbers are read from the committed manifests and traces; the external numbers are
 * attributed constants, each with its source and the date it was read.
 */
import { useEffect, useRef, useState } from 'react';
import { dec, fmtInt, fmtMoney, loadTrace } from '../lib/artifacts.ts';
import type { CaseManifest, ScheduleTrace, ScoreboardRow } from '../lib/contract.types.ts';
import type { ParityResponse } from '../engine/solver.worker.ts';
import { GapLadderFigure } from './figures/gap.tsx';
import type { Lang } from './doc.tsx';
import { LADDER_ORDER } from './panels-exp.tsx';
import { Pending, caseTitle, useJson, useManifests } from './panels.tsx';

/** MineLib's CPIT results for newman1, read from its results page on 2026-10-02 (rounded to the unit). */
export const MINELIB_NEWMAN1_CPIT = { upit: 26_086_899, lpBound: 24_486_184, bestKnown: 23_483_671, gapPct: 4.1 };
/** The external integer optimum of newman1 CPIT: the AMPL notebook's Gurobi 13.0.0 log, tolerance 1e-9. */
export const AMPL_NEWMAN1_CPIT_OPTIMUM = 24_176_864.82482;
/** Jelvez, Morales and Nancel-Penard 2018, Tables 3 and 4: newman1 PCPSP LP bound and OPBSP feasible value. */
export const JELVEZ_NEWMAN1_PCPSP = { lpBound: 24_486_549, feasible: 24_176_861, gapPct: 1.26 };

const NEWMAN = 'newman1-published';
const get = (m: CaseManifest, method: string): ScoreboardRow | undefined => m.scoreboard.find((r) => r.method === method);
const pctTxt = (v: number | null | undefined, d = 2) => (v == null || !Number.isFinite(v) ? '-' : `${dec(v, d)}%`);

function useExact(lang: Lang) {
  const f = new Intl.NumberFormat(lang === 'es' ? 'es-CL' : 'en-US', { maximumFractionDigits: 2 });
  const exact = (v: number | null | undefined) => (v == null || !Number.isFinite(v) ? '-' : f.format(v));
  const signed = (v: number | null | undefined) => (v == null || !Number.isFinite(v) ? '-' : `${v > 0 ? '+' : v < 0 ? '-' : ''}${f.format(Math.abs(v))}`);
  return { exact, signed };
}

/** The bounds of newman1: Algorithm 4 and the joint LP, from the manifest or, in an older manifest,
 *  from the trace. */
function useNewman() {
  const data = useManifests();
  const trace = useJson<ScheduleTrace>(`/data/${NEWMAN}/trace.json`);
  if (!data || data === 'error') return { state: data as null | 'error' };
  const m = data.manifests.find((x) => x.case_id === NEWMAN);
  if (!m) return { state: 'error' as const };
  const tb = trace && trace !== 'error' ? trace.bound : undefined;
  const alg4 = m.bound_summary?.algorithm4 ?? tb?.algorithm4 ?? null;
  const joint = m.bound_summary?.joint ?? tb?.joint ?? null;
  const cpitBound = m.scoreboard.find((r) => !r.method.startsWith('destination-'))?.bound ?? null;
  const best = m.best ? get(m, m.best.method) : undefined;
  return { state: 'ok' as const, data, m, alg4, joint, cpitBound, best };
}

/** Newman1 CPIT: the ultimate pit, the bound and the best plan, beside MineLib and the external optimum. */
export function NewmanCpitPanel({ lang }: { lang: Lang }) {
  const es = lang === 'es';
  const { exact, signed } = useExact(lang);
  const n = useNewman();
  if (n.state !== 'ok') return <Pending lang={lang} state={n.state} />;
  const { m, cpitBound, best } = n;
  const optGap = best ? (100 * (AMPL_NEWMAN1_CPIT_OPTIMUM - best.npv)) / AMPL_NEWMAN1_CPIT_OPTIMUM : null;
  const intGap = cpitBound ? (100 * (cpitBound - AMPL_NEWMAN1_CPIT_OPTIMUM)) / cpitBound : null;
  return (
    <div className="pfd-panel">
      <p className="pfd-claim">
        {es
          ? <>El mejor plan CPIT de PhaseFlow en newman1 es <b>{best?.method ?? '-'}</b>, a <b>{pctTxt(best?.gap_pct, 3)}</b> de la cota LP CPIT y a <b>{pctTxt(optGap, 3)}</b> del óptimo entero externo; de la brecha a la cota, <b>{pctTxt(intGap, 3)}</b> es integralidad que ningún plan puede cerrar.</>
          : <>PhaseFlow's best CPIT plan on newman1 is <b>{best?.method ?? '-'}</b>, <b>{pctTxt(best?.gap_pct, 3)}</b> below the CPIT LP bound and <b>{pctTxt(optGap, 3)}</b> below the external integer optimum; of the gap to the bound, <b>{pctTxt(intGap, 3)}</b> is integrality that no plan can close.</>}
      </p>
      <div className="pfd-scroll">
        <table className="pfd-table" data-testid="minelib-cpit">
          <caption>{es ? 'Newman1, CPIT de seis períodos tal como se publica. MineLib redondea a la unidad; el óptimo entero es una ejecución externa, no un certificado de PhaseFlow.' : 'Newman1, six-period CPIT as published. MineLib rounds to the unit; the integer optimum is an external run, not a PhaseFlow certificate.'}</caption>
          <thead>
            <tr>
              <th>{es ? 'cantidad' : 'quantity'}</th><th className="num">PhaseFlow</th><th className="num">{es ? 'MineLib, resultados CPIT' : 'MineLib, CPIT results'}</th>
              <th className="num">{es ? 'PhaseFlow menos MineLib' : 'PhaseFlow minus MineLib'}</th><th className="num">{es ? 'óptimo entero externo' : 'external integer optimum'}</th>
            </tr>
          </thead>
          <tbody>
            <tr><th scope="row">{es ? 'valor del pit final' : 'ultimate pit value'}</th><td className="num">{exact(m.instance.upit_value)}</td><td className="num">{exact(MINELIB_NEWMAN1_CPIT.upit)}</td><td className="num">{signed(m.instance.upit_value - MINELIB_NEWMAN1_CPIT.upit)}</td><td className="num">-</td></tr>
            <tr><th scope="row">{es ? 'cota superior LP CPIT' : 'CPIT LP upper bound'}</th><td className="num">{exact(cpitBound)}</td><td className="num">{exact(MINELIB_NEWMAN1_CPIT.lpBound)}</td><td className="num">{cpitBound != null ? signed(cpitBound - MINELIB_NEWMAN1_CPIT.lpBound) : '-'}</td><td className="num">-</td></tr>
            <tr><th scope="row">{es ? 'mejor plan factible' : 'best feasible plan'}</th><td className="num">{exact(best?.npv)}</td><td className="num">{exact(MINELIB_NEWMAN1_CPIT.bestKnown)}</td><td className="num">{best ? signed(best.npv - MINELIB_NEWMAN1_CPIT.bestKnown) : '-'}</td><td className="num">{exact(AMPL_NEWMAN1_CPIT_OPTIMUM)}</td></tr>
            <tr><th scope="row">{es ? 'brecha a la cota LP CPIT' : 'gap to the CPIT LP bound'}</th><td className="num">{pctTxt(best?.gap_pct, 3)}</td><td className="num">{pctTxt(MINELIB_NEWMAN1_CPIT.gapPct, 1)}</td><td className="num">-</td><td className="num">{pctTxt(intGap, 3)}</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** The gap figure alone, drawn from the committed newman1 numbers. */
export function NewmanGapFigure({ lang }: { lang: Lang }) {
  const n = useNewman();
  if (n.state !== 'ok') return <Pending lang={lang} state={n.state} />;
  const lp = n.joint ?? n.cpitBound;
  if (n.alg4 == null || lp == null || !n.best) return <Pending lang={lang} state="error" />;
  return <GapLadderFigure lang={lang} levels={[n.alg4, lp, AMPL_NEWMAN1_CPIT_OPTIMUM, n.best.npv]} planMethod={n.best.method} />;
}

/** The gap of newman1 split into bound slack, integrality and method loss, from the committed numbers. */
export function NewmanGapPanel({ lang }: { lang: Lang }) {
  const es = lang === 'es';
  const { exact } = useExact(lang);
  const n = useNewman();
  if (n.state !== 'ok') return <Pending lang={lang} state={n.state} />;
  const { alg4, joint, cpitBound, best } = n;
  const lp = joint ?? cpitBound;
  if (alg4 == null || lp == null || !best) return <Pending lang={lang} state="error" />;
  const terms = [
    { k: es ? 'holgura de la cota (Algoritmo 4 menos LP conjunta)' : 'bound slack (Algorithm 4 minus joint LP)', v: alg4 - lp, of: alg4 },
    { k: es ? 'integralidad (LP conjunta menos óptimo entero)' : 'integrality (joint LP minus integer optimum)', v: lp - AMPL_NEWMAN1_CPIT_OPTIMUM, of: lp },
    { k: es ? 'pérdida del método (óptimo entero menos plan)' : 'method loss (integer optimum minus plan)', v: AMPL_NEWMAN1_CPIT_OPTIMUM - best.npv, of: AMPL_NEWMAN1_CPIT_OPTIMUM },
  ];
  return (
    <div className="pfd-panel">
      <GapLadderFigure lang={lang} levels={[alg4, lp, AMPL_NEWMAN1_CPIT_OPTIMUM, best.npv]} planMethod={best.method} />
      <div className="pfd-scroll">
        <table className="pfd-table">
          <caption>{es ? 'Las tres diferencias suman exactamente la distancia de la cota del Algoritmo 4 al plan; cada porcentaje usa su propio denominador, por eso se suman los valores y no los porcentajes.' : 'The three differences add up exactly to the distance from the Algorithm 4 bound to the plan; each percentage has its own denominator, so values add and percentages do not.'}</caption>
          <thead><tr><th>{es ? 'término' : 'term'}</th><th className="num">{es ? 'valor' : 'value'}</th><th className="num">{es ? 'porcentaje de su referencia' : 'percent of its reference'}</th></tr></thead>
          <tbody>
            {terms.map((t) => <tr key={t.k}><th scope="row">{t.k}</th><td className="num">{exact(t.v)}</td><td className="num">{pctTxt((100 * t.v) / t.of, 4)}</td></tr>)}
            <tr className="pfd-sep"><th scope="row">{es ? 'total: Algoritmo 4 menos plan' : 'total: Algorithm 4 minus plan'}</th><td className="num">{exact(alg4 - best.npv)}</td><td className="num">{pctTxt((100 * (alg4 - best.npv)) / alg4, 4)}</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Newman1 with destinations: the PCPSP LP and the destination plan beside the 2018 values. */
export function NewmanPcpspPanel({ lang }: { lang: Lang }) {
  const es = lang === 'es';
  const { exact, signed } = useExact(lang);
  const n = useNewman();
  if (n.state !== 'ok') return <Pending lang={lang} state={n.state} />;
  const { m, cpitBound } = n;
  const lp = m.bound_summary?.pcpsp_lp ?? null;
  const dest = get(m, 'destination-local-search');
  const x = (dest?.extra ?? {}) as Record<string, number | string | null>;
  const gap = dest && lp ? (100 * (lp - dest.npv)) / lp : null;
  if (lp == null && !dest) {
    return <p className="pfd-muted">{es ? 'Los manifiestos versionados aún no traen la LP de PCPSP ni el plan con destinos.' : 'The committed manifests do not carry the PCPSP LP or the destination plan yet.'}</p>;
  }
  return (
    <div className="pfd-panel">
      <div className="pfd-scroll">
        <table className="pfd-table">
          <caption>{es ? 'Newman1 como PCPSP: el destino de cada bloque es una decisión. Valores publicados de Jélvez, Morales y Nancel-Penard 2018, Tablas 3 y 4.' : 'Newman1 as PCPSP: each block\'s destination is a decision. Published values from Jelvez, Morales and Nancel-Penard 2018, Tables 3 and 4.'}</caption>
          <thead><tr><th>{es ? 'cantidad' : 'quantity'}</th><th className="num">PhaseFlow</th><th className="num">{es ? 'publicado 2018' : 'published 2018'}</th><th className="num">{es ? 'diferencia' : 'difference'}</th></tr></thead>
          <tbody>
            <tr><th scope="row">{es ? 'cota LP PCPSP' : 'PCPSP LP bound'}</th><td className="num">{exact(lp)}</td><td className="num">{exact(JELVEZ_NEWMAN1_PCPSP.lpBound)}</td><td className="num">{lp != null ? signed(lp - JELVEZ_NEWMAN1_PCPSP.lpBound) : '-'}</td></tr>
            <tr><th scope="row">{es ? 'plan factible con destinos' : 'feasible destination plan'}</th><td className="num">{exact(dest?.npv)}</td><td className="num">{exact(JELVEZ_NEWMAN1_PCPSP.feasible)}</td><td className="num">{dest ? signed(dest.npv - JELVEZ_NEWMAN1_PCPSP.feasible) : '-'}</td></tr>
            <tr><th scope="row">{es ? 'brecha a la LP PCPSP' : 'gap to the PCPSP LP'}</th><td className="num">{pctTxt(gap, 3)}</td><td className="num">{pctTxt(JELVEZ_NEWMAN1_PCPSP.gapPct, 2)}</td><td className="num">-</td></tr>
            <tr><th scope="row">{es ? 'LP PCPSP menos LP CPIT (debe ser no negativa)' : 'PCPSP LP minus CPIT LP (must be non-negative)'}</th><td className="num">{lp != null && cpitBound != null ? signed(lp - cpitBound) : '-'}</td><td className="num">{signed(JELVEZ_NEWMAN1_PCPSP.lpBound - MINELIB_NEWMAN1_CPIT.lpBound)}</td><td className="num">-</td></tr>
            <tr><th scope="row">{es ? 'bloques con destino distinto del corte fijo' : 'blocks with a destination other than the fixed cutoff'}</th><td className="num">{x.moved_vs_fixed ?? '-'}</td><td className="num">-</td><td className="num">-</td></tr>
            <tr><th scope="row">{es ? 'plan inicial de la búsqueda' : 'start of the search'}</th><td className="num">{(x.start_method as string) ?? '-'}</td><td className="num">-</td><td className="num">-</td></tr>
            <tr><th scope="row">{es ? 'tiempo de la LP PCPSP' : 'PCPSP LP time'}</th><td className="num">{m.bound_summary?.pcpsp_lp_ms != null ? `${dec(m.bound_summary.pcpsp_lp_ms / 1000, 1)} s` : '-'}</td><td className="num">-</td><td className="num">-</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** The three real block models: the ultimate pit against the published value, and the plan's gap
 *  labelled by whether its scenario is published or declared. */
export function RealPitsPanel({ lang }: { lang: Lang }) {
  const es = lang === 'es';
  const { exact } = useExact(lang);
  const data = useManifests();
  if (!data || data === 'error') return <Pending lang={lang} state={data as null | 'error'} />;
  const real = data.manifests.filter((m) => m.real_or_synthetic === 'real');
  return (
    <div className="pfd-scroll">
      <table className="pfd-table">
        <caption>{es ? 'El pit final no depende del escenario de programación, así que es comparable en los tres modelos reales; la brecha del plan solo es comparable con la literatura en el escenario publicado.' : 'The ultimate pit does not depend on the scheduling scenario, so it is comparable on all three real models; the plan gap is comparable with the literature only on the published scenario.'}</caption>
        <thead>
          <tr>
            <th>{es ? 'instancia' : 'instance'}</th><th className="num">{es ? 'bloques' : 'blocks'}</th><th className="num">{es ? 'bloques en el pit' : 'blocks in the pit'}</th>
            <th className="num">{es ? 'pit final, aquí' : 'ultimate pit, here'}</th><th className="num">{es ? 'publicado' : 'published'}</th>
            <th className="num">{es ? 'error relativo' : 'relative error'}</th><th className="num">{es ? 'brecha del mejor plan' : 'best plan gap'}</th><th>{es ? 'escenario' : 'scenario'}</th>
          </tr>
        </thead>
        <tbody>
          {real.map((m) => {
            const pub = m.published.upit_optimum;
            const rel = pub ? Math.abs(m.instance.upit_value - pub) / Math.abs(pub) : null;
            return (
              <tr key={m.case_id}>
                <th scope="row">{caseTitle(data.index, m.case_id, lang)}</th>
                <td className="num">{fmtInt(m.instance.n_blocks, lang)}</td>
                <td className="num">{fmtInt(m.instance.upit_blocks, lang)}</td>
                <td className="num">{exact(m.instance.upit_value)}</td>
                <td className="num">{exact(pub)}</td>
                <td className="num">{rel == null ? '-' : rel === 0 ? '0' : rel.toExponential(1)}</td>
                <td className="num">{pctTxt(m.best?.gap_pct, 3)}</td>
                <td>{m.scenario.declared ? (es ? 'declarado aquí' : 'declared here') : (es ? 'publicado' : 'published')}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** The best comparable plan of every case, the bound it is measured against, and the three controls. */
export function BestPerCasePanel({ lang }: { lang: Lang }) {
  const es = lang === 'es';
  const data = useManifests();
  if (!data || data === 'error') return <Pending lang={lang} state={data as null | 'error'} />;
  return (
    <div className="pfd-scroll">
      <table className="pfd-table">
        <caption>{es ? 'El mejor plan comparable de cada caso contra la menor cota CPIT certificada. La holgura es la parte de la brecha que pertenece a la cota del Algoritmo 4 cuando la conjunta no corrió.' : 'The best comparable plan of every case against the smaller certified CPIT bound. The slack is the part of a gap that belongs to the Algorithm 4 bound when the joint one did not run.'}</caption>
        <thead>
          <tr>
            <th>{es ? 'caso' : 'case'}</th><th>{es ? 'mejor método' : 'best method'}</th><th className="num">NPV</th><th className="num">{es ? 'cota' : 'bound'}</th>
            <th>{es ? 'tipo de cota' : 'bound type'}</th><th className="num">{es ? 'brecha' : 'gap'}</th><th className="num">{es ? 'holgura Alg. 4 - conjunta' : 'Alg. 4 - joint slack'}</th><th>{es ? 'controles' : 'controls'}</th>
          </tr>
        </thead>
        <tbody>
          {data.manifests.map((m) => {
            const best = m.best ? get(m, m.best.method) : undefined;
            const b = m.bound_summary;
            return (
              <tr key={m.case_id}>
                <th scope="row">{caseTitle(data.index, m.case_id, lang)}</th>
                <td>{best?.method ?? '-'}</td>
                <td className="num">{best ? fmtMoney(best.npv) : '-'}</td>
                <td className="num">{best ? fmtMoney(best.bound) : '-'}</td>
                <td>{b ? (b.used === 'bienstock-zuckerberg' ? (es ? 'LP conjunta (BZ)' : 'joint LP (BZ)') : (es ? 'Algoritmo 4' : 'Algorithm 4')) : '-'}</td>
                <td className="num">{pctTxt(best?.gap_pct, 3)}</td>
                <td className="num">{b?.tightening_pct != null ? pctTxt(b.tightening_pct, 3) : (b?.joint_skipped ? (es ? 'conjunta no corrió' : 'joint not run') : '-')}</td>
                <td>{m.controls.allPass ? (es ? 'pasan' : 'pass') : <b style={{ color: 'var(--color-bad)' }}>{es ? 'fallan' : 'fail'}</b>}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const timeTxt = (ms: number | null | undefined) => (ms == null || !Number.isFinite(ms) ? '-' : ms >= 60_000 ? `${dec(ms / 60_000, 1)} min` : ms >= 1000 ? `${dec(ms / 1000, 1)} s` : `${dec(ms, 0)} ms`);

/** The wall time of every bound and method on every case, as the bake measured it. */
export function RuntimePanel({ lang }: { lang: Lang }) {
  const es = lang === 'es';
  const data = useManifests();
  if (!data || data === 'error') return <Pending lang={lang} state={data as null | 'error'} />;
  const methods = LADDER_ORDER.filter((mt) => data.manifests.some((m) => get(m, mt)));
  const cols: Array<{ id: string; label: string; ms: (m: CaseManifest) => number | null | undefined }> = [
    { id: 'alg4', label: es ? 'Algoritmo 4' : 'Algorithm 4', ms: (m) => m.bound_summary?.algorithm4_ms },
    { id: 'bz', label: es ? 'LP conjunta BZ' : 'joint LP BZ', ms: (m) => m.bound_summary?.joint_ms },
    { id: 'pcpsp', label: es ? 'cota PCPSP' : 'PCPSP bound', ms: (m) => m.bound_summary?.pcpsp_lp_ms },
    ...methods.map((mt) => ({ id: mt, label: mt, ms: (m: CaseManifest) => get(m, mt)?.runtime_ms })),
  ];
  return (
    <div className="pfd-scroll">
      <table className="pfd-table">
        <caption>{es ? 'Tiempo de pared de cada cota y cada método, medido en el horneado (un proceso por caso, sin límite de tiempo). El mayor de cada fila está en negrita.' : 'Wall time of every bound and every method, measured in the bake (one process per case, no time limit). The largest of each row is bold.'}</caption>
        <thead>
          <tr>
            <th>{es ? 'caso' : 'case'}</th><th className="num">{es ? 'bloques' : 'blocks'}</th>
            {cols.map((c) => <th key={c.id} className="num" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', whiteSpace: 'nowrap', padding: '6px 4px' }}>{c.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {data.manifests.map((m) => {
            const vals = cols.map((c) => c.ms(m) ?? null);
            const top = Math.max(...vals.map((v) => v ?? -1));
            return (
              <tr key={m.case_id}>
                <th scope="row">{caseTitle(data.index, m.case_id, lang)}</th>
                <td className="num">{fmtInt(m.instance.n_blocks, lang)}</td>
                {vals.map((v, i) => <td key={cols[i].id} className="num" style={v != null && v === top ? { fontWeight: 700 } : undefined}>{timeTxt(v)}</td>)}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

interface ParityRow { k: string; browser: number | null; baked: number | null; tol: number }

/** The browser's TypeScript engine re-solves a committed live case at its baked setting, on demand,
 *  and every item is set beside the trace the Python pipeline wrote. */
export function LiveParityPanel({ lang }: { lang: Lang }) {
  const es = lang === 'es';
  const { exact } = useExact(lang);
  const data = useManifests();
  const [caseId, setCaseId] = useState('twin-porphyry-s');
  const [state, setState] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const [rows, setRows] = useState<ParityRow[]>([]);
  const [meta, setMeta] = useState<{ ms: number; boundMs: number; mismatched: number } | null>(null);
  const worker = useRef<Worker | null>(null);
  useEffect(() => () => worker.current?.terminate(), []);
  if (!data || data === 'error') return <Pending lang={lang} state={data as null | 'error'} />;
  const live = data.manifests.filter((m) => m.lane === 'live');

  const run = async () => {
    setState('running'); setRows([]); setMeta(null);
    try {
      const t = await loadTrace(caseId);
      if (!t.blocks) throw new Error('no blocks');
      worker.current?.terminate();
      const w = new Worker(new URL('../engine/solver.worker.ts', import.meta.url), { type: 'module' });
      worker.current = w;
      w.onmessage = (ev: MessageEvent<ParityResponse>) => {
        const r = ev.data;
        if (r.type !== 'parity') return;
        const baked = (mt: string) => t.methods.find((x) => x.method === mt)?.npv ?? null;
        const browser = (mt: string) => r.methods.find((x) => x.method === mt)?.npv ?? null;
        let mismatched = 0;
        for (let b = 0; b < r.inPit.length; b++) if (r.inPit[b] !== t.blocks!.inPit[b]) mismatched++;
        setRows([
          { k: es ? 'arcos de precedencia' : 'precedence arcs', browser: r.arcs, baked: t.instance.nPrecedenceArcs, tol: 0 },
          { k: es ? 'bloques en el pit final' : 'blocks in the ultimate pit', browser: r.pitBlocks, baked: t.instance.upitBlocks, tol: 0 },
          { k: es ? 'valor del pit final' : 'ultimate pit value', browser: r.pitValue, baked: t.instance.upitValue, tol: 1e-7 },
          { k: es ? 'cota del Algoritmo 4' : 'Algorithm 4 bound', browser: r.bound, baked: t.bound?.algorithm4 ?? null, tol: 1e-6 },
          { k: 'toposort-greedy', browser: browser('toposort-greedy'), baked: baked('toposort-greedy'), tol: 1e-6 },
          { k: 'toposort-gershon', browser: browser('toposort-gershon'), baked: baked('toposort-gershon'), tol: 1e-6 },
          { k: 'toposort-expected', browser: browser('toposort-expected'), baked: baked('toposort-expected'), tol: 1e-6 },
        ]);
        setMeta({ ms: r.ms, boundMs: r.boundMs, mismatched });
        setState('done');
        w.terminate();
        worker.current = null;
      };
      w.onerror = () => { setState('error'); w.terminate(); worker.current = null; };
      w.postMessage({ type: 'load', blocks: t.blocks, dims: t.instance.dims });
      w.postMessage({
        type: 'parity', id: 1, limits: t.scenario.resources.map((r) => r.limitPerPeriod),
        scenario: { periods: t.scenario.periods, discountRate: t.scenario.discountRate, capacityFraction: t.scenario.resources.map(() => 1), slopeDeg: 45, periodOneUndiscounted: t.scenario.periodOneUndiscounted },
      });
    } catch {
      setState('error');
    }
  };

  const rel = (r: ParityRow) => (r.browser == null || r.baked == null ? null : r.baked === 0 ? Math.abs(r.browser) : Math.abs(r.browser - r.baked) / Math.abs(r.baked));
  return (
    <div className="pfd-panel" data-testid="live-parity">
      <div className="pfd-controls">
        <label>{es ? 'caso' : 'case'}{' '}
          <select value={caseId} onChange={(e) => { setCaseId(e.target.value); setState('idle'); setRows([]); setMeta(null); }}>
            {live.map((m) => <option key={m.case_id} value={m.case_id}>{caseTitle(data.index, m.case_id, lang)} ({fmtInt(m.instance.n_blocks, lang)})</option>)}
          </select>
        </label>
        <button className="pf-chip" onClick={run} disabled={state === 'running'} data-testid="live-parity-run">
          {state === 'running' ? (es ? 'resolviendo en este navegador...' : 'solving in this browser...') : (es ? 'resolver en este navegador' : 'solve in this browser')}
        </button>
        {meta && <span className="pfd-muted">{es ? `${timeTxt(meta.ms)} en total, cota ${timeTxt(meta.boundMs)}; bloques en desacuerdo sobre el pit: ${meta.mismatched}` : `${timeTxt(meta.ms)} in all, bound ${timeTxt(meta.boundMs)}; blocks disagreeing on the pit: ${meta.mismatched}`}</span>}
        {state === 'error' && <span style={{ color: 'var(--color-bad)' }}>{es ? 'no se pudo resolver este caso' : 'this case could not be solved'}</span>}
      </div>
      {rows.length > 0 && (
        <div className="pfd-scroll">
          <table className="pfd-table" data-testid="live-parity-table">
            <caption>{es ? 'El motor del navegador contra la traza horneada por el pipeline, a la configuración horneada. Igual: diferencia relativa bajo la tolerancia de la fila.' : 'The browser engine against the trace the pipeline baked, at the baked setting. Equal: relative difference under the row\'s tolerance.'}</caption>
            <thead><tr><th>{es ? 'cantidad' : 'quantity'}</th><th className="num">{es ? 'navegador' : 'browser'}</th><th className="num">{es ? 'horneado' : 'baked'}</th><th className="num">{es ? 'diferencia relativa' : 'relative difference'}</th><th>{es ? 'resultado' : 'result'}</th></tr></thead>
            <tbody>
              {rows.map((r) => {
                const d = rel(r);
                const ok = d != null && d <= r.tol;
                return (
                  <tr key={r.k}>
                    <th scope="row">{r.k}</th><td className="num">{exact(r.browser)}</td><td className="num">{exact(r.baked)}</td>
                    <td className="num">{d == null ? '-' : d === 0 ? '0' : d.toExponential(1)}</td>
                    <td style={{ color: ok ? 'var(--color-good)' : 'var(--color-warn)', fontWeight: 600 }}>{d == null ? '-' : ok ? (es ? 'igual' : 'equal') : (es ? 'difiere' : 'differs')}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
