/**
 * Panels on the reading pages that read the committed artifacts at run time: the learned models'
 * studies and the case manifests and traces. A number on a reading page comes from here, never typed.
 */
import { useEffect, useState } from 'react';
import { APP_VERSION, boundSlackText, dec, fmtDuration, fmtInt, fmtMoney, jointAbsentText, pcpspBoundMethod } from '../lib/artifacts.ts';
import type { CaseIndex, CaseManifest, ScoreboardRow } from '../lib/contract.types.ts';
import type { Lang } from './doc.tsx';

const cache = new Map<string, Promise<unknown>>();

export function useJson<T>(path: string): T | null | 'error' {
  const [data, setData] = useState<T | null | 'error'>(null);
  useEffect(() => {
    let alive = true;
    const p = cache.get(path) ?? fetch(`${path}?v=${APP_VERSION}`).then((r) => {
      if (!r.ok) throw new Error(`${path}: HTTP ${r.status}`);
      return r.json();
    });
    cache.set(path, p);
    p.then((d) => { if (alive) setData(d as T); }).catch(() => { if (alive) setData('error'); });
    return () => { alive = false; };
  }, [path]);
  return data;
}

export function Pending({ lang, state }: { lang: Lang; state: null | 'error' }) {
  return (
    <p className="pfd-muted">
      {state === 'error'
        ? (lang === 'es' ? 'No se pudo leer el artefacto.' : 'The artifact could not be read.')
        : (lang === 'es' ? 'Leyendo el artefacto...' : 'Reading the artifact...')}
    </p>
  );
}

const pct = (v: number | null | undefined, d = 1) => (v == null || !Number.isFinite(v) ? '-' : `${dec(100 * v, d)}%`);
const num = (v: number | null | undefined, d = 3) => (v == null || !Number.isFinite(v) ? '-' : dec(v, d));

interface ModelFile { metrics: Record<string, unknown> }
interface Breakdown { n: number; median: number; p10: number; min: number; failures: number }
interface FailureStudy {
  failure_below: number;
  shipped_rule: string;
  rules: Record<string, { statement: string; holdout: { precision: number | null; recall: number | null; flagged: number } }>;
  train: { n: number; failures: number; by_archetype: Record<string, Breakdown>; by_size?: Record<string, Breakdown> };
  holdout: { n: number; failures: number; by_archetype: Record<string, Breakdown>; by_size?: Record<string, Breakdown> };
}
interface GuardValidation { rule: string; n: number; failures: number; precision: number | null; recall: number | null; worst_unflagged: number | null; median: number; median_by_size?: Record<string, number> }

const ARCH: Record<string, { en: string; es: string }> = {
  porphyry: { en: 'porphyry', es: 'pórfido' },
  vein: { en: 'vein', es: 'veta' },
  layered: { en: 'layered', es: 'estratificado' },
  core_halo: { en: 'core-halo', es: 'núcleo-halo' },
};

/** The expected-time surrogate's held-out study, by archetype and by grid size, and the guard. */
export function LearnedStudyPanel({ lang }: { lang: Lang }) {
  const es = lang === 'es';
  const model = useJson<ModelFile>('/models/expected-time.json');
  const study = useJson<FailureStudy>('/models/learned-failure-modes.json');
  const guard = useJson<GuardValidation>('/models/guard-validation.json');
  if (!model || model === 'error') return <Pending lang={lang} state={model as null | 'error'} />;
  const m = model.metrics as Record<string, number | string>;
  const rows: Array<[string, string]> = [
    [es ? 'correlación de rangos de Spearman, retenido' : 'Spearman rank correlation, held out', num(m.holdout_spearman as number)],
    [es ? 'plan aprendido / plan ExTS exacto, mediana' : 'learned plan / exact ExTS plan, median', pct(m.holdout_npv_vs_exact_exts_median as number)],
    [es ? 'percentil 10' : 'tenth percentile', pct(m.holdout_npv_vs_exact_exts_p10 as number)],
    [es ? 'peor caso retenido' : 'worst held-out case', pct(m.holdout_npv_vs_exact_exts_min as number)],
    [es ? 'casos donde supera al codicioso' : 'cases where it beats greedy', pct(m.holdout_beats_greedy_rate as number, 0)],
    [es ? `casos bajo ${pct(m.failure_below as number, 0)} del plan exacto` : `cases below ${pct(m.failure_below as number, 0)} of the exact plan`, pct(m.failure_rate as number, 0)],
  ];
  const group = (b?: Record<string, Breakdown>, label = (k: string) => k) => b ? Object.entries(b).map(([k, v]) => (
    <tr key={k}><th scope="row">{label(k)}</th><td className="num">{v.n}</td><td className="num">{pct(v.median)}</td><td className="num">{pct(v.p10)}</td><td className="num">{pct(v.min)}</td><td className="num">{v.failures}</td></tr>
  )) : null;
  const head = (
    <thead><tr><th>{es ? 'grupo' : 'group'}</th><th className="num">n</th><th className="num">{es ? 'mediana' : 'median'}</th><th className="num">P10</th><th className="num">{es ? 'mínimo' : 'minimum'}</th><th className="num">{es ? 'fallas' : 'failures'}</th></tr></thead>
  );
  const study_ok = study && study !== 'error' ? study : null;
  const guard_ok = guard && guard !== 'error' ? guard : null;
  return (
    <div className="pfd-panel">
      <div className="pfd-two">
        <div className="pfd-scroll">
          <table className="pfd-table">
            <caption>{es ? 'Métricas sobre depósitos retenidos, leídas del modelo versionado.' : 'Metrics on held-out deposits, read from the committed model.'}</caption>
            <tbody>{rows.map(([k, v]) => <tr key={k}><th scope="row">{k}</th><td className="num">{v}</td></tr>)}</tbody>
          </table>
        </div>
        {guard_ok && (
          <div className="pfd-scroll">
            <table className="pfd-table">
              <caption>{es ? 'La guarda elegida, medida en una tercera partición que no participó en elegirla.' : 'The chosen guard, measured on a third split that had no part in choosing it.'}</caption>
              <tbody>
                <tr><th scope="row">{es ? 'regla' : 'rule'}</th><td>{guard_ok.rule}</td></tr>
                <tr><th scope="row">{es ? 'casos, fallas' : 'cases, failures'}</th><td className="num">{guard_ok.n}, {guard_ok.failures}</td></tr>
                <tr><th scope="row">{es ? 'precisión, recall' : 'precision, recall'}</th><td className="num">{num(guard_ok.precision, 2)}, {num(guard_ok.recall, 2)}</td></tr>
                <tr><th scope="row">{es ? 'peor caso sin bandera' : 'worst unflagged case'}</th><td className="num">{pct(guard_ok.worst_unflagged)}</td></tr>
                <tr><th scope="row">{es ? 'mediana' : 'median'}</th><td className="num">{pct(guard_ok.median)}</td></tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
      {study_ok && (
        <div className="pfd-two">
          <div className="pfd-scroll">
            <table className="pfd-table">
              <caption>{es ? 'Retenido, por arquetipo: plan aprendido como fracción del plan exacto.' : 'Held out, by archetype: the learned plan as a share of the exact plan.'}</caption>
              {head}
              <tbody>{group(study_ok.holdout.by_archetype, (k) => ARCH[k]?.[lang] ?? k)}</tbody>
            </table>
          </div>
          {study_ok.holdout.by_size && (
            <div className="pfd-scroll">
              <table className="pfd-table">
                <caption>{es ? 'Retenido, por tamaño de grilla (bloques).' : 'Held out, by grid size (blocks).'}</caption>
                {head}
                <tbody>{group(study_ok.holdout.by_size)}</tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** The bound surrogate's held-out error and its two monotonicity checks. */
export function BoundSurrogatePanel({ lang }: { lang: Lang }) {
  const es = lang === 'es';
  const model = useJson<ModelFile>('/models/bound.json');
  if (!model || model === 'error') return <Pending lang={lang} state={model as null | 'error'} />;
  const m = model.metrics as Record<string, number>;
  return (
    <div className="pfd-scroll">
      <table className="pfd-table">
        <caption>{es ? 'Error relativo sobre depósitos retenidos y las dos direcciones físicas, leídos del modelo versionado.' : 'Relative error on held-out deposits and the two physical directions, read from the committed model.'}</caption>
        <tbody>
          <tr><th scope="row">{es ? 'error relativo medio' : 'mean relative error'}</th><td className="num">{pct(m.holdout_mean_rel_err, 2)}</td></tr>
          <tr><th scope="row">{es ? 'percentil 90' : 'ninetieth percentile'}</th><td className="num">{pct(m.holdout_p90_rel_err, 2)}</td></tr>
          <tr><th scope="row">{es ? 'máximo' : 'maximum'}</th><td className="num">{pct(m.holdout_max_rel_err, 2)}</td></tr>
          <tr><th scope="row">{es ? 'depósitos donde más capacidad no baja la cota' : 'deposits where more capacity does not lower the bound'}</th><td className="num">{pct(m.monotone_capacity_rate, 0)}</td></tr>
          <tr><th scope="row">{es ? 'depósitos donde más tasa no sube la cota' : 'deposits where a higher rate does not raise the bound'}</th><td className="num">{pct(m.monotone_rate_rate, 0)}</td></tr>
        </tbody>
      </table>
    </div>
  );
}

/* ---------------------------------------------------------------------------------------------
 * Manifest-backed panels: every case of the matrix, read from the committed manifests.
 * ------------------------------------------------------------------------------------------- */

const FAMILY_ORDER = ['published', 'declared', 'deposit', 'regime', 'control'];

export function useManifests():{ index: CaseIndex; manifests: CaseManifest[] } | null | 'error' {
  const [state, setState] = useState<{ index: CaseIndex; manifests: CaseManifest[] } | null | 'error'>(null);
  useEffect(() => {
    let alive = true;
    const get = <T,>(p: string) => {
      const hit = cache.get(p) ?? fetch(`${p}?v=${APP_VERSION}`).then((r) => {
        if (!r.ok) throw new Error(`${p}: HTTP ${r.status}`);
        return r.json();
      });
      cache.set(p, hit);
      return hit as Promise<T>;
    };
    get<CaseIndex>('/data/manifests/index.json')
      .then(async (index) => {
        const manifests = await Promise.all(index.cases.map((c) => get<CaseManifest>(`/data/manifests/${c.case_id}.json`)));
        // the order the argument is made in: the published anchor, the real models, then the twins
        manifests.sort((a, b) => (FAMILY_ORDER.indexOf(a.category) - FAMILY_ORDER.indexOf(b.category))
          || (a.instance.n_blocks - b.instance.n_blocks) || a.case_id.localeCompare(b.case_id));
        if (alive) setState({ index, manifests });
      })
      .catch(() => { if (alive) setState('error'); });
    return () => { alive = false; };
  }, []);
  return state;
}

export const caseTitle = (index: CaseIndex, id: string, lang: Lang) => index.cases.find((c) => c.case_id === id)?.title[lang] ?? id;

const row = (m: CaseManifest, method: string): ScoreboardRow | undefined => m.scoreboard.find((r) => r.method === method);

/** One method across every case: its gap to the bound of its problem, its time, and its own notes. */
export function MethodCasesPanel({ lang, method, showNotes = false }: { lang: Lang; method: string; showNotes?: boolean }) {
  const es = lang === 'es';
  const data = useManifests();
  if (!data || data === 'error') return <Pending lang={lang} state={data as null | 'error'} />;
  const rows = data.manifests.map((m) => ({ m, r: row(m, method) }));
  return (
    <div className="pfd-scroll">
      <table className="pfd-table">
        <caption>{es ? `${method} en cada caso, leído de los manifiestos versionados.` : `${method} on every case, read from the committed manifests.`}</caption>
        <thead>
          <tr>
            <th>{es ? 'caso' : 'case'}</th><th className="num">{es ? 'bloques' : 'blocks'}</th><th className="num">NPV</th>
            <th className="num">{es ? 'cota' : 'bound'}</th><th className="num">{es ? 'brecha' : 'gap'}</th><th className="num">{es ? 'tiempo' : 'time'}</th>
            {showNotes && <th>{es ? 'qué hizo' : 'what it did'}</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map(({ m, r }) => (
            <tr key={m.case_id}>
              <th scope="row">{caseTitle(data.index, m.case_id, lang)}</th>
              <td className="num">{fmtInt(m.instance.n_blocks, lang)}</td>
              {r ? (
                <>
                  <td className="num">{fmtMoney(r.npv)}</td>
                  <td className="num">{fmtMoney(r.bound)}</td>
                  <td className="num">{`${dec(r.gap_pct, 2)}%`}</td>
                  <td className="num">{r.runtime_ms >= 60_000 ? `${dec(r.runtime_ms / 60_000, 1)} min` : r.runtime_ms >= 1000 ? `${dec(r.runtime_ms / 1000, 1)} s` : `${dec(r.runtime_ms, 0)} ms`}</td>
                  {showNotes && <td style={{ whiteSpace: 'normal', minWidth: '18rem' }}>{r.notes ?? ''}</td>}
                </>
              ) : (
                <td colSpan={showNotes ? 5 : 4} className="pfd-muted" style={{ whiteSpace: 'normal' }}>
                  {(m.bound_summary?.skipped_methods ?? {})[method] ?? (es ? 'no corre en este caso' : 'does not run on this case')}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** The bounds of every case: Algorithm 4, the joint bound, which one each gap uses, and the PCPSP bound
 *  with the method that produced it. */
export function BoundSummaryPanel({ lang }: { lang: Lang }) {
  const es = lang === 'es';
  const data = useManifests();
  if (!data || data === 'error') return <Pending lang={lang} state={data as null | 'error'} />;
  return (
    <div className="pfd-scroll">
      <table className="pfd-table">
        <caption>{es ? 'Las cotas de cada caso, leídas de los manifiestos versionados. La cota usada es la menor certificada. Sobre 1,1 millones de filas la LP PCPSP queda fuera del alcance de HiGHS, y su cota es el dual lagrangiano por cierres máximos: válido en cada iteración e igual a la LP salvo la holgura del redondeo.' : 'The bounds of every case, read from the committed manifests. The bound used is the smaller certified one. Above 1.1 million rows the PCPSP LP is out of reach for HiGHS, and its bound is the Lagrangian dual by maximum closures: valid at every iteration and equal to the LP up to the rounding slack.'}</caption>
        <thead>
          <tr>
            <th>{es ? 'caso' : 'case'}</th><th className="num">{es ? 'Algoritmo 4' : 'Algorithm 4'}</th><th className="num">{es ? 'conjunta BZ' : 'joint BZ'}</th>
            <th className="num">{es ? 'holgura' : 'slack'}</th><th>{es ? 'usada' : 'used'}</th><th className="num">{es ? 'iter. BZ' : 'BZ iter.'}</th>
            <th className="num">{es ? 'cota PCPSP' : 'PCPSP bound'}</th><th>{es ? 'método PCPSP' : 'PCPSP method'}</th><th className="num">{es ? 'tiempo cota PCPSP' : 'PCPSP bound time'}</th>
          </tr>
        </thead>
        <tbody>
          {data.manifests.map((m) => {
            const b = m.bound_summary;
            if (!b) return <tr key={m.case_id}><th scope="row">{caseTitle(data.index, m.case_id, lang)}</th><td colSpan={8} className="pfd-muted">{es ? 'sin resumen de cotas en este manifiesto' : 'no bound summary in this manifest'}</td></tr>;
            return (
              <tr key={m.case_id}>
                <th scope="row">{caseTitle(data.index, m.case_id, lang)}</th>
                <td className="num">{fmtMoney(b.algorithm4)}</td>
                <td className="num">{b.joint != null ? fmtMoney(b.joint) : <span className="pfd-muted">{b.joint_skipped ? jointAbsentText(b) : '-'}</span>}</td>
                <td className="num">{boundSlackText(b.tightening_pct)}</td>
                <td>{b.used === 'bienstock-zuckerberg' ? 'BZ' : (es ? 'Alg. 4' : 'Alg. 4')}</td>
                <td className="num">{b.joint_iterations ?? '-'}</td>
                <td className="num">{b.pcpsp_lp != null ? fmtMoney(b.pcpsp_lp) : '-'}</td>
                <td>{pcpspBoundMethod(b)}</td>
                <td className="num">{fmtDuration(b.pcpsp_lp_ms)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
