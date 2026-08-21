// Three views that only exist because the engine now computes two bounds, an ensemble and a learned
// lane. Each answers a question the method table cannot.

import { Cite } from '@fasl-work/caos-app-shell';
import { fmtInt, fmtMoney } from '../lib/artifacts.ts';
import type { BoundReport, EnsembleReport, LearnedReport, TraceMethod } from '../lib/contract.types.ts';


/**
 * WHOSE looseness is the gap?
 *
 * A reported gap mixes two things: how much the heuristic loses, and how much the BOUND loses. With
 * one resource per period the critical multiplier algorithm gives the exact LP bound and there is no
 * ambiguity. With two, Algorithm 4 relaxes them one at a time and keeps the smallest result, which is
 * certified and loose, so part of the gap is the bound's fault. Bienstock-Zuckerberg computes the
 * joint bound and separates them. This panel shows both numbers and says which one every gap on the
 * case is measured against.
 */
export function BoundPanel({ bound, best, es }: { bound: BoundReport; best: TraceMethod; es: boolean }) {
  const a4 = bound.algorithm4;
  const joint = bound.joint ?? null;
  const gapA4 = a4 ? (100 * (a4 - best.npv)) / a4 : NaN;
  const gapJoint = joint ? (100 * (joint - best.npv)) / joint : NaN;

  return (
    <div className="pf-panel" data-testid="bound-panel">
      <h4>{es ? 'De quien es la brecha' : 'Whose looseness is the gap'}</h4>
      <div className="pf-scroll-x">
        <table className="pf-table">
          <thead>
            <tr>
              <th>{es ? 'cota' : 'bound'}</th><th>{es ? 'valor' : 'value'}</th>
              <th>{es ? 'brecha del mejor plan' : 'best plan gap'}</th><th>ms</th><th>{es ? 'nota' : 'note'}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Algorithm 4 <span className="pf-muted">({es ? 'un recurso a la vez' : 'one resource at a time'})</span></td>
              <td>{a4 ? fmtMoney(a4) : '-'}</td>
              <td>{Number.isFinite(gapA4) ? `${gapA4.toFixed(2)}%` : '-'}</td>
              <td>{bound.algorithm4_ms?.toFixed(0) ?? '-'}</td>
              <td style={{ textAlign: 'left' }} className="pf-cap pf-muted">
                {bound.closure_solves} {es ? 'cierres maximos' : 'maximum closures'}
              </td>
            </tr>
            <tr>
              <td>
                Bienstock-Zuckerberg <span className="pf-muted">({es ? 'conjunta' : 'joint'})</span>
              </td>
              <td>{joint ? fmtMoney(joint) : <span className="pf-muted">{es ? 'no corrida' : 'not run'}</span>}</td>
              <td>{Number.isFinite(gapJoint) ? `${gapJoint.toFixed(2)}%` : '-'}</td>
              <td>{bound.joint_ms?.toFixed(0) ?? '-'}</td>
              <td style={{ textAlign: 'left' }} className="pf-cap pf-muted">
                {bound.joint_skipped
                  ? bound.joint_skipped
                  : bound.joint_error
                    ? bound.joint_error
                    : bound.joint_note
                      ? bound.joint_note
                    : `${bound.joint_iterations} ${es ? 'iteraciones' : 'iterations'}, ${fmtInt(bound.joint_nodes ?? 0, es ? 'es' : 'en')} ${es ? 'nodos' : 'nodes'}${
                        bound.joint_solver === 'scipy-maxflow'
                          ? es
                            ? ', precio compilado y cota certificada con una resolucion exacta'
                            : ', compiled pricing, bound certified by one exact solve'
                          : ''
                      }`}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="pf-cap">
        {es ? 'Usada para cada brecha de este caso: ' : 'Used for every gap on this case: '}
        <b>{bound.used === 'bienstock-zuckerberg' ? 'Bienstock-Zuckerberg' : 'Algorithm 4'}</b>
        {bound.tightening_pct != null && bound.tightening_pct > 0 && (
          <> · {es ? 'la cota conjunta es' : 'the joint bound is'} <b>{bound.tightening_pct.toFixed(3)}%</b> {es ? 'mas ajustada' : 'tighter'}</>
        )}
      </p>
      <p className="pf-cap pf-muted">
        {es
          ? 'La cota BZ nunca es mas ajustada que la relajacion LP: esta demostrado que Z_BZ = Z_LP, porque el sistema de precedencia es totalmente unimodular. Lo que aporta es la cota CONJUNTA sobre todos los recursos, que Algorithm 4 no puede dar, y velocidad a escalas donde un solver LP no entrega nada.'
          : 'The BZ bound is never tighter than the LP relaxation: Z_BZ = Z_LP is proven, because the precedence system is totally unimodular. What it adds is the JOINT bound over all resources, which Algorithm 4 cannot give, and speed at scales where a general LP solver produces nothing.'}{' '}
        <Cite id="munoz2017" /> <Cite id="chicoisne2012" />
      </p>
    </div>
  );
}

/**
 * What geological uncertainty does to each plan. NOT a stochastic optimiser, and it says so.
 */
export function RiskPanel({ ensemble, es }: { ensemble: EnsembleReport; es: boolean }) {
  if (!ensemble.ran || !ensemble.methods) {
    return (
      <div className="pf-panel">
        <h4>{es ? 'Riesgo geologico' : 'Geological risk'}</h4>
        <p className="pf-cap pf-muted">{ensemble.reason ?? (es ? 'no corrido' : 'not run')}</p>
      </div>
    );
  }
  // WHY THIS IS NOT A LINE CHART ANY MORE.
  //
  // It used to plot four uPlot series against the method INDEX, 1..N. That draws a line from
  // "bench-by-bench" to "nested-shells" to "toposort-greedy" as though the x axis were a continuum,
  // when it is an unordered list of different algorithms: the slope between two points meant nothing.
  // The method names never appeared anywhere on it either, so nine ticks read 1..9 and the reader could
  // not tell which plan was which. The axis was labelled "plan" in both languages, which was the only
  // hint, and it was not enough.
  //
  // What the data actually is: for each method, a P10-to-P90 interval with an expected value inside it.
  // That is a categorical range comparison, so it is drawn as one - a row per method, names on the left
  // where there is room for them, intervals on a shared linear scale where they can be compared, and the
  // two answers the panel exists to separate (best by expected, best by P10) marked ON the rows.
  const rows = ensemble.methods.map((m, i) => ({
    method: m,
    p10: (ensemble.p10?.[i] ?? 0) / 1e6,
    exp: (ensemble.expected?.[i] ?? 0) / 1e6,
    p90: (ensemble.p90?.[i] ?? 0) / 1e6,
    mean: (ensemble.meanModel?.[i] ?? 0) / 1e6,
  }));
  const lo = Math.min(...rows.map((r) => Math.min(r.p10, r.mean)));
  const hi = Math.max(...rows.map((r) => Math.max(r.p90, r.mean)));
  const span = Math.max(1e-9, hi - lo);
  const padF = span * 0.08;
  const dLo = lo - padF;
  const dHi = hi + padF;
  const VBW = 620;
  const NAMEW = 168;
  const PLOTW = VBW - NAMEW - 58;
  const ROWH = 22;
  const H = rows.length * ROWH + 46;
  const xOf = (v: number) => NAMEW + ((v - dLo) / (dHi - dLo)) * PLOTW;
  const ticks = [dLo, dLo + (dHi - dLo) / 2, dHi];

  return (
    <div className="pf-panel" data-testid="risk-panel">
      <h4>{es ? 'Riesgo geologico' : 'Geological risk'}</h4>

      <svg viewBox={`0 0 ${VBW} ${H}`} role="img" className="pf-riskplot"
           aria-label={es ? 'Intervalo P10 a P90 por metodo' : 'P10 to P90 interval per method'}
           style={{ width: '100%', height: 'auto', display: 'block' }}>
        <style>{`
          .rk-n  { fill: currentColor; font: 11px ui-monospace, SFMono-Regular, Menlo, monospace }
          .rk-t  { fill: currentColor; font: 10px system-ui, sans-serif; opacity: .7 }
          .rk-g  { stroke: currentColor; opacity: .16; stroke-width: 1 }
          .rk-bar{ stroke: var(--color-fg-subtle, currentColor); stroke-width: 5; opacity: .45; stroke-linecap: round }
          .rk-row:hover .rk-bar { opacity: .8 }
          .rk-row:hover .rk-n { font-weight: 700 }
        `}</style>

        {ticks.map((v, i) => (
          <g key={i}>
            <line className="rk-g" x1={xOf(v)} y1={16} x2={xOf(v)} y2={H - 28} />
            <text className="rk-t" x={xOf(v)} y={H - 16} textAnchor={i === 0 ? 'start' : i === 2 ? 'end' : 'middle'}>
              {v.toFixed(0)} M
            </text>
          </g>
        ))}

        {rows.map((r, i) => {
          const y = 24 + i * ROWH;
          const isExp = r.method === ensemble.bestByExpected;
          const isP10 = r.method === ensemble.bestByP10;
          return (
            <g className="rk-row" key={r.method}>
              <title>
                {`${r.method}  P10 ${r.p10.toFixed(1)} M  ${es ? 'esperado' : 'expected'} ${r.exp.toFixed(1)} M  P90 ${r.p90.toFixed(1)} M`}
              </title>
              <rect x={0} y={y - 10} width={VBW} height={ROWH - 2} fill="transparent" />
              <text className="rk-n" x={4} y={y + 4}>
                {r.method.length > 22 ? `${r.method.slice(0, 21)}…` : r.method}
              </text>
              {/* the P10..P90 interval */}
              <line className="rk-bar" x1={xOf(r.p10)} y1={y} x2={xOf(r.p90)} y2={y} />
              {/* the mean-model value: what you would have believed with no ensemble at all */}
              <line x1={xOf(r.mean)} y1={y - 6} x2={xOf(r.mean)} y2={y + 6}
                    stroke="var(--color-warn, #d29922)" strokeWidth={1.6} />
              {/* expected value */}
              <circle cx={xOf(r.exp)} cy={y} r={isExp ? 5 : 3.6}
                      fill="var(--color-accent, #58a6ff)"
                      stroke={isExp ? 'currentColor' : 'none'} strokeWidth={1.4} />
              {/* the robust choice is marked at its P10, because that is the number it wins on */}
              {isP10 && (
                <circle cx={xOf(r.p10)} cy={y} r={4.4} fill="none"
                        stroke="var(--color-good, #3fb950)" strokeWidth={2} />
              )}
            </g>
          );
        })}
      </svg>

      <div className="pf-mb-key" aria-hidden="true">
        <span><i style={{ background: 'var(--color-fg-subtle)', opacity: 0.45 }} />P10 - P90</span>
        <span><i style={{ background: 'var(--color-accent)', borderRadius: '50%', width: 8, height: 8 }} />{es ? 'esperado' : 'expected'}</span>
        <span><i style={{ background: 'var(--color-warn)', width: 3, height: 11 }} />{es ? 'modelo medio' : 'mean model'}</span>
        <span><i style={{ background: 'transparent', border: '2px solid var(--color-good)', borderRadius: '50%', width: 9, height: 9 }} />{es ? 'mejor por P10' : 'best by P10'}</span>
      </div>

      <div className="pf-scroll-x">
        <table className="pf-table">
          <thead>
            <tr>
              <th>{es ? 'plan' : 'plan'}</th><th>P10</th><th>{es ? 'esperado' : 'expected'}</th><th>P90</th>
              <th>{es ? 'optimismo' : 'optimism'}</th>
            </tr>
          </thead>
          <tbody>
            {ensemble.methods.map((m, i) => (
              <tr key={m}>
                <td>{m}</td>
                <td>{fmtMoney(ensemble.p10?.[i] ?? 0)}</td>
                <td>{fmtMoney(ensemble.expected?.[i] ?? 0)}</td>
                <td>{fmtMoney(ensemble.p90?.[i] ?? 0)}</td>
                <td>{fmtMoney(ensemble.optimism?.[i] ?? 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="pf-cap">
        {es ? 'Mejor por valor esperado' : 'Best by expected value'}: <b>{ensemble.bestByExpected}</b> ·{' '}
        {es ? 'mejor por P10 (la eleccion robusta)' : 'best by P10 (the robust choice)'}: <b>{ensemble.bestByP10}</b>
        {ensemble.bestByExpected !== ensemble.bestByP10 && (
          <> · <span className="pf-badge">{es ? 'no son el mismo plan' : 'not the same plan'}</span></>
        )}
      </p>
      <p className="pf-cap pf-muted">
        {es ? 'Valor de re-planificar sabiendo la realizacion' : 'Value of re-planning once the realisation is known'}:{' '}
        <b>{ensemble.valueOfReplanningPct?.toFixed(3)}%</b>. {ensemble.replanningNote}
      </p>
      <p className="pf-cap pf-muted">{ensemble.note}</p>
      <p className="pf-cap pf-muted">
        {es
          ? 'Esto NO es un programa entero estocastico de dos etapas. Es lo que hacen los planificadores: resolver muchas instancias deterministas con parametros variados y leer la dispersion'
          : 'This is NOT a two-stage stochastic integer program. It is what planners do: solve many deterministic instances with varied parameters and read the spread'}{' '}
        <Cite id="blom2024" />. {es ? 'El programa estocastico real es otro modelo' : 'The real stochastic program is a different model'} <Cite id="ramazan2013" />.
      </p>
    </div>
  );
}

/** What the learned lane is worth, measured on deposits it never saw. */
export function LearnedPanel({ learned, methods, es }: { learned: LearnedReport; methods: TraceMethod[]; es: boolean }) {
  const et = learned.expectedTime ?? {};
  const bd = learned.bound ?? {};
  const learnedRow = methods.find((m) => m.rung === 'learned');
  const exactRow = methods.find((m) => m.method === 'toposort-expected');
  if (!Object.keys(et).length) {
    return (
      <div className="pf-panel">
        <h4>{es ? 'Carril aprendido' : 'Learned lane'}</h4>
        <p className="pf-cap pf-muted">
          {es ? 'No horneado con modelos aprendidos en este caso.' : 'Not baked with the learned models on this case.'}
        </p>
      </div>
    );
  }
  // A missing key must not become a quiet NaN on the page. `holdout_npv_vs_greedy_mean` was renamed
  // when the metric was fixed, and this panel went on printing "NaN%" next to four real numbers,
  // which reads as a rendering glitch rather than as a scorecard pointing at a field that no longer
  // exists. A dash says ABSENT, and `learned-keys.test.ts` fails the build so it never gets shipped.
  const num = (v: unknown) => (typeof v === 'number' ? v : NaN);
  const pct = (v: unknown, digits = 1) =>
    typeof v === 'number' && Number.isFinite(v) ? `${(100 * v).toFixed(digits)}%` : '-';
  return (
    <div className="pf-panel" data-testid="learned-panel">
      <h4>{es ? 'Carril aprendido' : 'Learned lane'}</h4>
      <div className="pf-kpis">
        <div className="pf-kpi"><b>{num(et.holdout_spearman).toFixed(3)}</b><span>{es ? 'Spearman fuera de muestra' : 'holdout Spearman'}</span></div>
        <div className="pf-kpi"><b>{pct(et.holdout_npv_vs_exact_exts_median)}</b><span>{es ? 'NPV vs ExTS (mediana)' : 'NPV vs exact ExTS (median)'}</span></div>
        <div className="pf-kpi"><b>{pct(et.holdout_npv_vs_exact_exts_p10)}</b><span>P10</span></div>
        <div className="pf-kpi"><b>{pct(et.holdout_npv_vs_exact_exts_min)}</b><span>{es ? 'peor caso' : 'worst case'}</span></div>
        <div className="pf-kpi"><b>{pct(et.holdout_beats_greedy_rate, 0)}</b><span>{es ? 'gana al codicioso' : 'beats greedy'}</span></div>
        <div className="pf-kpi"><b>{pct(bd.holdout_mean_rel_err, 2)}</b><span>{es ? 'error de la cota' : 'bound surrogate error'}</span></div>
      </div>
      {learnedRow && exactRow && (
        <p className="pf-cap">
          {es ? 'En este caso' : 'On this case'}: {learnedRow.method} {fmtMoney(learnedRow.npv)} ({learnedRow.runtimeMs.toFixed(0)} ms,{' '}
          {es ? 'sin ninguna resolucion LP' : 'with no LP solve at all'}) {es ? 'contra' : 'against'} {exactRow.method}{' '}
          {fmtMoney(exactRow.npv)} ({exactRow.runtimeMs.toFixed(0)} ms).{' '}
          <b>{((100 * learnedRow.npv) / exactRow.npv).toFixed(1)}%</b> {es ? 'del NPV por' : 'of the NPV for'}{' '}
          <b>{((100 * learnedRow.runtimeMs) / Math.max(1, exactRow.runtimeMs)).toFixed(0)}%</b> {es ? 'del tiempo' : 'of the time'}.
        </p>
      )}
      <p className="pf-cap pf-muted">
        {es ? 'Division por SEMILLA DE DEPOSITO, nunca por fila' : 'Split by DEPOSIT SEED, never by row'}: {String(et.split ?? '')}.{' '}
        {learned.honesty}
      </p>
    </div>
  );
}
