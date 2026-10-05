/**
 * Experiments and Benchmark panels: the case matrix and the method results, read from the committed
 * manifests. Statements about the results are COMPUTED from the same numbers they describe, so a
 * sentence cannot outlive the evidence it summarises.
 */
import { useState } from 'react';
import { dec, fmtInt, fmtMoney } from '../lib/artifacts.ts';
import type { CaseManifest, ScoreboardRow } from '../lib/contract.types.ts';
import { MethodBars } from '../viz/Charts.tsx';
import { periodCss } from '../viz/colormap.ts';
import type { Lang } from './doc.tsx';
import { Pending, caseTitle, useManifests } from './panels.tsx';

const CATEGORY: Record<string, { en: string; es: string }> = {
  published: { en: 'published', es: 'publicado' },
  declared: { en: 'declared', es: 'declarado' },
  deposit: { en: 'deposit', es: 'depósito' },
  regime: { en: 'regime', es: 'régimen' },
  control: { en: 'control', es: 'control' },
};

export const LADDER_ORDER = [
  'bench-by-bench', 'nested-shells', 'toposort-greedy', 'toposort-gershon',
  'toposort-expected', 'exts-two-resource', 'shift-local-search', 'sliding-window', 'cpitD-local-search',
  'learned-expected-time', 'min-width', 'destination-toposort', 'destination-sliding-window', 'destination-local-search',
];
const CLASSICAL = ['bench-by-bench', 'nested-shells', 'toposort-greedy', 'toposort-gershon'];
const COMPARABLE = new Set(['classical', 'sota', 'learned']);

const get = (m: CaseManifest, method: string): ScoreboardRow | undefined => m.scoreboard.find((r) => r.method === method);
const pctTxt = (v: number | null | undefined, d = 2) => (v == null || !Number.isFinite(v) ? '-' : `${dec(v, d)}%`);
const nontrivial = (m: CaseManifest) => m.scenario.periods > 1 && m.scenario.discount_rate > 0;

/** The thirteen cases: what each is for, its size and its scenario. */
export function CaseMatrixPanel({ lang }: { lang: Lang }) {
  const es = lang === 'es';
  const data = useManifests();
  if (!data || data === 'error') return <Pending lang={lang} state={data as null | 'error'} />;
  return (
    <div className="pfd-scroll">
      <table className="pfd-table">
        <caption>{es ? 'La matriz de casos, leída de los manifiestos versionados. Fracción de capacidad: límite por período sobre (total del pit / períodos).' : 'The case matrix, read from the committed manifests. Capacity fraction: limit per period over (pit total / periods).'}</caption>
        <thead>
          <tr>
            <th>{es ? 'caso' : 'case'}</th><th>{es ? 'categoría' : 'category'}</th><th className="num">{es ? 'bloques' : 'blocks'}</th>
            <th className="num">{es ? 'arcos' : 'arcs'}</th><th className="num">T</th><th className="num">{es ? 'tasa' : 'rate'}</th>
            <th className="num">{es ? 'capacidad mina, planta' : 'capacity mine, plant'}</th><th>{es ? 'carril' : 'lane'}</th>
            <th>{es ? 'para qué está' : 'what it is for'}</th>
          </tr>
        </thead>
        <tbody>
          {data.manifests.map((m) => {
            const entry = data.index.cases.find((c) => c.case_id === m.case_id);
            const caps = m.scenario.capacity_fraction;
            return (
              <tr key={m.case_id}>
                <th scope="row">{caseTitle(data.index, m.case_id, lang)}</th>
                <td>{CATEGORY[m.category]?.[lang] ?? m.category}</td>
                <td className="num">{fmtInt(m.instance.n_blocks, lang)}</td>
                <td className="num">{fmtInt(m.instance.n_precedence_arcs, lang)}</td>
                <td className="num">{m.scenario.periods}</td>
                <td className="num">{pctTxt(100 * m.scenario.discount_rate, 0)}</td>
                <td className="num">{caps ? caps.map((c) => dec(c, 2)).join(', ') : '-'}</td>
                <td>{m.lane === 'live' ? (es ? 'en vivo' : 'live') : (es ? 'reproducción' : 'replay')}</td>
                <td style={{ whiteSpace: 'normal', minWidth: '20rem' }}>{entry?.role?.[lang] ?? ''}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Every method on every case: the gap to the bound of its own problem, best comparable highlighted,
 *  and the selected case drawn as captured share of the bound. */
export function LadderGridPanel({ lang }: { lang: Lang }) {
  const es = lang === 'es';
  const data = useManifests();
  const [sel, setSel] = useState<string | null>(null);
  if (!data || data === 'error') return <Pending lang={lang} state={data as null | 'error'} />;
  const methods = LADDER_ORDER.filter((mt) => data.manifests.some((m) => get(m, mt)));
  const chosen = data.manifests.find((m) => m.case_id === (sel ?? 'newman1-published')) ?? data.manifests[0];
  const shade = (gap: number) => {
    const g = Math.max(0, Math.min(60, gap)) / 60;
    return `color-mix(in oklab, var(--color-bad) ${Math.round(6 + 44 * g)}%, transparent)`;
  };
  return (
    <div className="pfd-panel">
      <div className="pfd-scroll">
        <table className="pfd-table" data-testid="ladder-grid">
          <caption>{es ? 'Brecha de cada método a la cota de su propio problema (CPIT para todos salvo los dos con destino, contra la LP PCPSP). Sombreado: brecha mayor; resaltado: el mejor plan comparable del caso.' : 'Each method\'s gap to the bound of its own problem (CPIT for all but the two destination rungs, which use the PCPSP LP). Shading: larger gap; highlighted: the case\'s best comparable plan.'}</caption>
          <thead>
            <tr><th>{es ? 'caso' : 'case'}</th>{methods.map((mt) => <th key={mt} className="num" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', whiteSpace: 'nowrap', padding: '6px 4px' }}>{mt}</th>)}</tr>
          </thead>
          <tbody>
            {data.manifests.map((m) => (
              <tr key={m.case_id} className={chosen.case_id === m.case_id ? 'pfd-best' : undefined} onClick={() => setSel(m.case_id)} style={{ cursor: 'pointer' }}>
                <th scope="row">{caseTitle(data.index, m.case_id, lang)}</th>
                {methods.map((mt) => {
                  const r = get(m, mt);
                  const best = m.best?.method === mt;
                  return (
                    <td key={mt} className="num" title={r ? `${mt}: ${fmtMoney(r.npv)} / ${fmtMoney(r.bound)}` : (m.bound_summary?.skipped_methods ?? {})[mt] ?? ''}
                        style={{ background: r ? shade(r.gap_pct) : undefined, fontWeight: best ? 700 : undefined, outline: best ? '2px solid var(--color-accent)' : undefined }}>
                      {r ? dec(r.gap_pct, 1) : '-'}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="pfd-controls">
        <label>{es ? 'caso' : 'case'}{' '}
          <select value={chosen.case_id} onChange={(e) => setSel(e.target.value)}>
            {data.manifests.map((m) => <option key={m.case_id} value={m.case_id}>{caseTitle(data.index, m.case_id, lang)}</option>)}
          </select>
        </label>
        <span className="pfd-muted">{es ? 'o haga clic en una fila de la tabla' : 'or click a row of the table'}</span>
      </div>
      <MethodBars rows={LADDER_ORDER.map((mt) => get(chosen, mt)).filter((r): r is ScoreboardRow => !!r).map((r) => ({
        method: r.method, rung: r.rung, gapPct: r.gap_pct, npv: r.npv, runtimeMs: r.runtime_ms,
        comparable: !r.method.startsWith('destination-'),
      }))} />
    </div>
  );
}

/** Q2: what seeding the plan with the bound buys over the classical rungs, case by case. */
export function SeedingPanel({ lang }: { lang: Lang }) {
  const es = lang === 'es';
  const data = useManifests();
  if (!data || data === 'error') return <Pending lang={lang} state={data as null | 'error'} />;
  const rows = data.manifests.filter(nontrivial).map((m) => {
    const exts = get(m, 'toposort-expected');
    const cl = CLASSICAL.map((mt) => get(m, mt)).filter((r): r is ScoreboardRow => !!r);
    const bestCl = cl.reduce<ScoreboardRow | null>((a, b) => (a == null || b.npv > a.npv ? b : a), null);
    return { m, exts, bestCl, margin: exts && bestCl ? bestCl.gap_pct - exts.gap_pct : null };
  });
  const wins = rows.filter((r) => r.margin != null && r.margin > 0).length;
  const margins = rows.map((r) => r.margin).filter((v): v is number => v != null).sort((a, b) => a - b);
  const median = margins.length ? margins[Math.floor(margins.length / 2)] : null;
  return (
    <div className="pfd-panel">
      <p className="pfd-claim">
        {es
          ? <>El TopoSort de tiempo esperado supera al mejor peldaño clásico en <b>{wins} de {rows.length}</b> casos no triviales; la ventaja mediana es de <b>{pctTxt(median, 1)}</b> puntos de brecha (de {pctTxt(margins[0], 1)} a {pctTxt(margins[margins.length - 1], 1)}).</>
          : <>Expected-time TopoSort beats the best classical rung on <b>{wins} of {rows.length}</b> non-trivial cases; the median advantage is <b>{pctTxt(median, 1)}</b> points of gap (from {pctTxt(margins[0], 1)} to {pctTxt(margins[margins.length - 1], 1)}).</>}
      </p>
      <div className="pfd-scroll">
        <table className="pfd-table">
          <thead><tr><th>{es ? 'caso' : 'case'}</th><th>{es ? 'mejor clásico' : 'best classical'}</th><th className="num">{es ? 'su brecha' : 'its gap'}</th><th className="num">{es ? 'brecha ExTS' : 'ExTS gap'}</th><th className="num">{es ? 'ventaja' : 'advantage'}</th></tr></thead>
          <tbody>
            {rows.map(({ m, exts, bestCl, margin }) => (
              <tr key={m.case_id}>
                <th scope="row">{caseTitle(data.index, m.case_id, lang)}</th>
                <td>{bestCl?.method ?? '-'}</td><td className="num">{pctTxt(bestCl?.gap_pct)}</td>
                <td className="num">{pctTxt(exts?.gap_pct)}</td><td className="num">{pctTxt(margin)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Q3: what the look-ahead and the exact neighbourhoods add on top of the rounding. */
export function LookAheadPanel({ lang }: { lang: Lang }) {
  const es = lang === 'es';
  const data = useManifests();
  if (!data || data === 'error') return <Pending lang={lang} state={data as null | 'error'} />;
  const rows = data.manifests.filter(nontrivial);
  const swBest = rows.filter((m) => m.best?.method === 'sliding-window').length;
  const swRan = rows.filter((m) => get(m, 'sliding-window')).length;
  const cols = ['toposort-expected', 'shift-local-search', 'cpitD-local-search', 'sliding-window'];
  return (
    <div className="pfd-panel">
      <p className="pfd-claim">
        {es
          ? <>La ventana deslizante corrió en <b>{swRan} de {rows.length}</b> casos no triviales y es el mejor plan comparable en <b>{swBest}</b>.</>
          : <>The sliding window ran on <b>{swRan} of {rows.length}</b> non-trivial cases and is the best comparable plan on <b>{swBest}</b>.</>}
      </p>
      <div className="pfd-scroll">
        <table className="pfd-table">
          <thead><tr><th>{es ? 'caso' : 'case'}</th>{cols.map((c) => <th key={c} className="num">{c}</th>)}<th className="num">{es ? 'tiempo ventana' : 'window time'}</th></tr></thead>
          <tbody>
            {rows.map((m) => (
              <tr key={m.case_id}>
                <th scope="row">{caseTitle(data.index, m.case_id, lang)}</th>
                {cols.map((c) => {
                  const r = get(m, c);
                  return <td key={c} className="num" style={m.best?.method === c ? { fontWeight: 700, color: 'var(--color-accent)' } : undefined}>{pctTxt(r?.gap_pct)}</td>;
                })}
                <td className="num">{(() => { const r = get(m, 'sliding-window'); return r ? (r.runtime_ms >= 60_000 ? `${dec(r.runtime_ms / 60_000, 1)} min` : `${dec(r.runtime_ms / 1000, 1)} s`) : '-'; })()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Q4: which capacity binds, period by period, for the best plan of the regime cases. */
export function RegimePanel({ lang }: { lang: Lang }) {
  const es = lang === 'es';
  const data = useManifests();
  if (!data || data === 'error') return <Pending lang={lang} state={data as null | 'error'} />;
  const ids = ['twin-porphyry-s', 'regime-mill-bound', 'regime-mining-bound', 'regime-high-discount'];
  const cases = ids.map((id) => data.manifests.find((m) => m.case_id === id)).filter((m): m is CaseManifest => !!m);
  const resName = (k: number) => (k === 0 ? (es ? 'mina' : 'mining') : (es ? 'planta' : 'plant'));
  return (
    <div className="pfd-panel">
      <div className="pfd-scroll">
        <table className="pfd-table">
          <caption>{es ? 'Uso sobre límite por período del mejor plan comparable de cada caso: 100 por ciento es una capacidad que limita. Mismo depósito (pórfido 24 x 24 x 12), cuatro escenarios.' : 'Use over limit per period for each case\'s best comparable plan: 100 percent is a capacity that binds. Same deposit (porphyry 24 x 24 x 12), four scenarios.'}</caption>
          <tbody>
            {cases.flatMap((m) => {
              const best = m.best ? get(m, m.best.method) : undefined;
              const util = best?.utilization;
              if (!util) return [<tr key={m.case_id}><th scope="row">{caseTitle(data.index, m.case_id, lang)}</th><td className="pfd-muted">{es ? 'sin datos de uso en este manifiesto' : 'no utilisation in this manifest'}</td></tr>];
              return util.map((row, k) => (
                <tr key={`${m.case_id}-${k}`} className={k === 0 ? 'pfd-sep' : undefined}>
                  <th scope="row">{k === 0 ? `${caseTitle(data.index, m.case_id, lang)} (${best?.method})` : ''}</th>
                  <td>{resName(k)}</td>
                  {row.map((u, t) => (
                    <td key={t} className="num" title={`${resName(k)}, ${es ? 'período' : 'period'} ${t + 1}: ${u == null ? '-' : pctTxt(100 * u, 1)}`}
                        style={{ background: u == null ? undefined : `color-mix(in oklab, var(--color-accent) ${Math.round(100 * Math.min(1, u) * 0.7)}%, transparent)`, minWidth: '3.2rem' }}>
                      {u == null ? '-' : dec(100 * u, 0)}
                    </td>
                  ))}
                </tr>
              ));
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Q5: what the deposit shape does to each family of methods. */
export function DepositPanel({ lang }: { lang: Lang }) {
  const es = lang === 'es';
  const data = useManifests();
  if (!data || data === 'error') return <Pending lang={lang} state={data as null | 'error'} />;
  const ids = ['twin-porphyry-l', 'twin-vein', 'twin-layered', 'twin-core-halo'];
  const cases = ids.map((id) => data.manifests.find((m) => m.case_id === id)).filter((m): m is CaseManifest => !!m);
  return (
    <div className="pfd-scroll">
      <table className="pfd-table">
        <caption>{es ? 'Los cuatro arquetipos con el mismo tipo de escenario (10 períodos, 10 por ciento, dos recursos). Componentes: media por período del mejor plan.' : 'The four archetypes under the same kind of scenario (10 periods, 10 percent, two resources). Components: per-period mean of the best plan.'}</caption>
        <thead>
          <tr>
            <th>{es ? 'arquetipo' : 'archetype'}</th><th className="num">{es ? 'codicioso' : 'greedy'}</th><th className="num">Gershon</th>
            <th className="num">{es ? 'cáscaras' : 'shells'}</th><th className="num">ExTS</th><th className="num">{es ? 'mejor' : 'best'}</th>
            <th className="num">{es ? 'aprendido / ExTS' : 'learned / ExTS'}</th><th className="num">{es ? 'componentes' : 'components'}</th>
          </tr>
        </thead>
        <tbody>
          {cases.map((m) => {
            const best = m.best ? get(m, m.best.method) : undefined;
            const learned = get(m, 'learned-expected-time');
            return (
              <tr key={m.case_id}>
                <th scope="row">{caseTitle(data.index, m.case_id, lang)}</th>
                <td className="num">{pctTxt(get(m, 'toposort-greedy')?.gap_pct)}</td>
                <td className="num">{pctTxt(get(m, 'toposort-gershon')?.gap_pct)}</td>
                <td className="num">{pctTxt(get(m, 'nested-shells')?.gap_pct)}</td>
                <td className="num">{pctTxt(get(m, 'toposort-expected')?.gap_pct)}</td>
                <td className="num">{pctTxt(best?.gap_pct)}</td>
                <td className="num">{learned?.measured_vs_exact != null ? pctTxt(100 * learned.measured_vs_exact, 1) : '-'}</td>
                <td className="num">{best?.components_mean != null ? dec(best.components_mean, 1) : '-'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Beyond CPIT: what choosing destinations is worth, case by case. */
export function DestinationPanel({ lang }: { lang: Lang }) {
  const es = lang === 'es';
  const data = useManifests();
  if (!data || data === 'error') return <Pending lang={lang} state={data as null | 'error'} />;
  const rows = data.manifests.filter((m) => get(m, 'destination-local-search'));
  if (!rows.length) return <p className="pfd-muted">{es ? 'Los manifiestos versionados aún no traen el peldaño con destinos.' : 'The committed manifests do not carry the destination rung yet.'}</p>;
  return (
    <div className="pfd-scroll">
      <table className="pfd-table">
        <caption>{es ? 'El plan con destinos parte del mejor plan CPIT leído como PCPSP; lo que gana es el valor de elegir destinos.' : 'The destination plan starts from the best CPIT plan read as PCPSP; what it gains is the value of choosing destinations.'}</caption>
        <thead>
          <tr>
            <th>{es ? 'caso' : 'case'}</th><th className="num">{es ? 'LP PCPSP' : 'PCPSP LP'}</th><th className="num">{es ? 'plan con destinos' : 'destination plan'}</th>
            <th className="num">{es ? 'brecha PCPSP' : 'PCPSP gap'}</th><th className="num">{es ? 'ganancia sobre CPIT' : 'gain over CPIT'}</th>
            <th className="num">{es ? 'bloques que cambian destino' : 'blocks changing destination'}</th><th className="num">{es ? 'ley de corte efectiva' : 'effective cutoff'}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((m) => {
            const r = get(m, 'destination-local-search')!;
            const x = (r.extra ?? {}) as Record<string, number | null>;
            return (
              <tr key={m.case_id}>
                <th scope="row">{caseTitle(data.index, m.case_id, lang)}</th>
                <td className="num">{fmtMoney(r.bound)}</td><td className="num">{fmtMoney(r.npv)}</td>
                <td className="num">{pctTxt(r.gap_pct)}</td>
                <td className="num">{x.gain_vs_cpit != null ? fmtMoney(x.gain_vs_cpit) : '-'}</td>
                <td className="num">{x.moved_vs_fixed ?? '-'}</td>
                <td className="num">{x.cutoff_min != null && x.cutoff_max != null ? `${dec(x.cutoff_min, 4)} - ${dec(x.cutoff_max, 4)}` : '-'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Operability: coherence of the best plan, and what the min-width smoothing costs. */
export function OperabilityPanel({ lang }: { lang: Lang }) {
  const es = lang === 'es';
  const data = useManifests();
  if (!data || data === 'error') return <Pending lang={lang} state={data as null | 'error'} />;
  const rows = data.manifests.filter((m) => get(m, 'min-width') && m.scenario.periods > 1);
  return (
    <div className="pfd-scroll">
      <table className="pfd-table">
        <caption>{es ? 'Coherencia del mejor plan y del plan suavizado (ancho objetivo 3 bloques), y el costo en VAN; ambos planes son factibles.' : 'Coherence of the best plan and of the smoothed plan (target width 3 blocks), and the cost in NPV; both plans are feasible.'}</caption>
        <thead>
          <tr>
            <th>{es ? 'caso' : 'case'}</th><th className="num">{es ? 'componentes, mejor' : 'components, best'}</th><th className="num">{es ? 'fracción mayor' : 'largest share'}</th>
            <th className="num">{es ? 'bloques angostos antes' : 'narrow blocks before'}</th><th className="num">{es ? 'después' : 'after'}</th>
            <th className="num">{es ? 'movidos, rechazados' : 'moved, refused'}</th><th className="num">{es ? 'costo VAN' : 'NPV cost'}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((m) => {
            const best = m.best ? get(m, m.best.method) : undefined;
            const mw = get(m, 'min-width')!;
            const x = (mw.extra ?? {}) as Record<string, number>;
            return (
              <tr key={m.case_id}>
                <th scope="row">{caseTitle(data.index, m.case_id, lang)}</th>
                <td className="num">{best?.components_mean != null ? dec(best.components_mean, 1) : '-'}</td>
                <td className="num">{best?.largest_share_mean != null ? pctTxt(100 * best.largest_share_mean, 0) : '-'}</td>
                <td className="num">{x.below_before ?? '-'}</td><td className="num">{x.below_after ?? '-'}</td>
                <td className="num">{x.moved != null ? `${x.moved}, ${x.refused_for_capacity ?? 0}` : '-'}</td>
                <td className="num">{x.npv_cost_pct != null ? pctTxt(x.npv_cost_pct, 3) : '-'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Uncertainty: the robust choice against the best on average, and the value of re-planning. */
export function EnsemblePanel({ lang }: { lang: Lang }) {
  const es = lang === 'es';
  const data = useManifests();
  if (!data || data === 'error') return <Pending lang={lang} state={data as null | 'error'} />;
  const rows = data.manifests.filter((m) => m.ensemble_summary?.ran);
  if (!rows.length) return <p className="pfd-muted">{es ? 'Los manifiestos versionados aún no traen el resumen del ensamble.' : 'The committed manifests do not carry the ensemble summary yet.'}</p>;
  return (
    <div className="pfd-scroll">
      <table className="pfd-table">
        <caption>{es ? 'Planes candidatos evaluados en 12 realizaciones sintéticas correlacionadas (sigma 0,25). El valor de re-planificar es una cota inferior de EVPI.' : 'Candidate plans evaluated on 12 correlated synthetic realisations (sigma 0.25). The value of re-planning is a lower bound on EVPI.'}</caption>
        <thead><tr><th>{es ? 'caso' : 'case'}</th><th>{es ? 'mejor en promedio' : 'best on average'}</th><th>{es ? 'mejor P10 (robusto)' : 'best P10 (robust)'}</th><th className="num">{es ? 'valor de re-planificar' : 'value of re-planning'}</th></tr></thead>
        <tbody>
          {rows.map((m) => {
            const e = m.ensemble_summary!;
            const differ = e.bestByExpected !== e.bestByP10;
            return (
              <tr key={m.case_id}>
                <th scope="row">{caseTitle(data.index, m.case_id, lang)}</th>
                <td>{e.bestByExpected ?? '-'}</td>
                <td style={differ ? { color: 'var(--color-warn)', fontWeight: 600 } : undefined}>{e.bestByP10 ?? '-'}</td>
                <td className="num">{pctTxt(e.valueOfReplanningPct, 2)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** The learned rung inside the ladder: its measured share of the exact plan on each case. */
export function LearnedLadderPanel({ lang }: { lang: Lang }) {
  const es = lang === 'es';
  const data = useManifests();
  if (!data || data === 'error') return <Pending lang={lang} state={data as null | 'error'} />;
  const rows = data.manifests.map((m) => ({ m, r: get(m, 'learned-expected-time'), e: get(m, 'toposort-expected') }));
  return (
    <div className="pfd-scroll">
      <table className="pfd-table">
        <caption>{es ? 'El peldaño aprendido en la escalera: su plan sobre el plan ExTS exacto del mismo caso, medido, y las dos brechas.' : 'The learned rung in the ladder: its plan over the exact ExTS plan of the same case, measured, and the two gaps.'}</caption>
        <thead><tr><th>{es ? 'caso' : 'case'}</th><th className="num">{es ? 'bloques' : 'blocks'}</th><th className="num">{es ? 'aprendido / ExTS' : 'learned / ExTS'}</th><th className="num">{es ? 'brecha aprendido' : 'learned gap'}</th><th className="num">{es ? 'brecha ExTS' : 'ExTS gap'}</th><th className="num">{es ? 'tiempo aprendido' : 'learned time'}</th><th className="num">{es ? 'tiempo ExTS' : 'ExTS time'}</th></tr></thead>
        <tbody>
          {rows.map(({ m, r, e }) => (
            <tr key={m.case_id}>
              <th scope="row">{caseTitle(data.index, m.case_id, lang)}</th>
              <td className="num">{fmtInt(m.instance.n_blocks, lang)}</td>
              {r ? (
                <>
                  <td className="num" style={r.measured_vs_exact != null && r.measured_vs_exact < 0.9 ? { color: 'var(--color-warn)', fontWeight: 600 } : undefined}>{r.measured_vs_exact != null ? pctTxt(100 * r.measured_vs_exact, 1) : '-'}</td>
                  <td className="num">{pctTxt(r.gap_pct)}</td><td className="num">{pctTxt(e?.gap_pct)}</td>
                  <td className="num">{`${dec(r.runtime_ms / 1000, 2)} s`}</td><td className="num">{e ? `${dec(e.runtime_ms / 1000, 1)} s` : '-'}</td>
                </>
              ) : <td colSpan={5} className="pfd-muted" style={{ whiteSpace: 'normal' }}>{(m.bound_summary?.skipped_methods ?? {})['learned-expected-time'] ?? (es ? 'no corre en este caso' : 'does not run on this case')}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** A small strip of the period colours, for captions that refer to them. */
export function PeriodStrip({ n }: { n: number }) {
  return (
    <span style={{ display: 'inline-flex', gap: 2, verticalAlign: 'middle' }}>
      {Array.from({ length: n }, (_, t) => <i key={t} style={{ width: 12, height: 12, background: periodCss(t, n), display: 'inline-block', borderRadius: 2 }} />)}
    </span>
  );
}

export { COMPARABLE };
