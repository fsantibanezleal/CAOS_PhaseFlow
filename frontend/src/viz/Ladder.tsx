// Three views that only exist because the engine now computes two bounds, an ensemble and a learned
// lane. Each answers a question the method table cannot.

import { Cite } from '@fasl-work/caos-app-shell';
import { fmtMoney } from '../lib/artifacts.ts';
import type { BoundReport, EnsembleReport, LearnedReport, TraceMethod } from '../lib/contract.types.ts';
import { UPlotChart } from './Charts.tsx';
import uPlot from 'uplot';

function cssVar(name: string, fallback: string): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

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
                    : `${bound.joint_iterations} ${es ? 'iteraciones' : 'iterations'}, ${(bound.joint_nodes ?? 0).toLocaleString()} ${es ? 'nodos' : 'nodes'}`}
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
export function RiskPanel({ ensemble, theme, es }: { ensemble: EnsembleReport; theme: string; es: boolean }) {
  if (!ensemble.ran || !ensemble.methods) {
    return (
      <div className="pf-panel">
        <h4>{es ? 'Riesgo geologico' : 'Geological risk'}</h4>
        <p className="pf-cap pf-muted">{ensemble.reason ?? (es ? 'no corrido' : 'not run')}</p>
      </div>
    );
  }
  const idx = ensemble.methods.map((_, i) => i + 1);
  const data: uPlot.AlignedData = [
    idx,
    (ensemble.p10 ?? []).map((v) => v / 1e6),
    (ensemble.expected ?? []).map((v) => v / 1e6),
    (ensemble.p90 ?? []).map((v) => v / 1e6),
    (ensemble.meanModel ?? []).map((v) => v / 1e6),
  ];
  return (
    <div className="pf-panel" data-testid="risk-panel">
      <h4>{es ? 'Riesgo geologico' : 'Geological risk'}</h4>
      <UPlotChart
        key={`risk-${theme}`}
        data={data}
        height={210}
        build={(w, h) => ({
          width: w,
          height: h,
          scales: { x: { time: false }, y: {} },
          axes: [
            { stroke: cssVar('--color-fg-muted', '#8b949e'), label: es ? 'plan' : 'plan' },
            { stroke: cssVar('--color-fg-muted', '#8b949e'), label: 'M' },
          ],
          series: [
            { label: 'plan' },
            { label: 'P10', stroke: cssVar('--color-danger', '#f85149'), width: 1.6, dash: [4, 3] },
            { label: es ? 'esperado' : 'expected', stroke: cssVar('--color-accent', '#58a6ff'), width: 2.4 },
            { label: 'P90', stroke: cssVar('--color-ok', '#3fb950'), width: 1.6, dash: [4, 3] },
            { label: es ? 'modelo medio' : 'mean model', stroke: cssVar('--color-warn', '#d29922'), width: 1.4 },
          ],
          legend: { live: true },
        })}
      />
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
  const num = (v: unknown) => (typeof v === 'number' ? v : NaN);
  return (
    <div className="pf-panel" data-testid="learned-panel">
      <h4>{es ? 'Carril aprendido' : 'Learned lane'}</h4>
      <div className="pf-kpis">
        <div className="pf-kpi"><b>{num(et.holdout_spearman).toFixed(3)}</b><span>{es ? 'Spearman fuera de muestra' : 'holdout Spearman'}</span></div>
        <div className="pf-kpi"><b>{(100 * num(et.holdout_npv_vs_exact_exts_mean)).toFixed(1)}%</b><span>{es ? 'NPV vs ExTS exacto' : 'NPV vs exact ExTS'}</span></div>
        <div className="pf-kpi"><b>{(100 * num(et.holdout_npv_vs_greedy_mean)).toFixed(0)}%</b><span>{es ? 'NPV vs codicioso' : 'NPV vs greedy'}</span></div>
        <div className="pf-kpi"><b>{(100 * num(bd.holdout_mean_rel_err)).toFixed(2)}%</b><span>{es ? 'error de la cota' : 'bound surrogate error'}</span></div>
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
