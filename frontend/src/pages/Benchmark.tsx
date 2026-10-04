import { useEffect, useState } from 'react';
import { Callout, Cite, Refs, useShellLang } from '@fasl-work/caos-app-shell';
import { TwoBounds } from '../viz/Diagrams.tsx';
import { fmtInt, fmtMoney, loadIndex, loadManifest, loadTrace, dec, exp } from '../lib/artifacts.ts';
import type { CaseManifest, ScheduleTrace } from '../lib/contract.types.ts';

// External, attributed reference result. The value is not a PhaseFlow output
// and does not replace the 2018 published row in the committed manifest.
const AMPL_NEWMAN_CPIT_OPTIMUM = 24_176_864.82482;

// MineLib's own CPIT results for newman1, read from its results page on 2026-10-02. This is the one
// external check on the SAME problem as PhaseFlow's bound: the 2018 row above is PCPSP. The page
// publishes values rounded to the unit and still lists the older best known feasible value; see
// docs/cases/newman1-external-optimum.md for why that value is shown with its source and date.
const MINELIB_NEWMAN1_CPIT = { upit: 26_086_899, lpBound: 24_486_184, bestKnown: 23_483_671, gapPct: 4.1 };

export default function Benchmark() {
  const lang = useShellLang();
  const es = lang === 'es';
  const [manifests, setManifests] = useState<CaseManifest[]>([]);
  const [traces, setTraces] = useState<Record<string, ScheduleTrace>>({});

  useEffect(() => {
    loadIndex().then(async (idx) => {
      setManifests(await Promise.all(idx.cases.map((c) => loadManifest(c.case_id))));
      const ts = await Promise.all(idx.cases.map((c) => loadTrace(c.case_id)));
      setTraces(Object.fromEntries(ts.map((t) => [t.caseId, t])));
    });
  }, []);

  const real = manifests.filter((m) => m.real_or_synthetic === 'real');
  const published = real.find((m) => m.category === 'published');
  const publishedBest = published?.scoreboard.find((row) => row.method === published.best?.method);
  const exact = (value: number) => new Intl.NumberFormat(es ? 'es-CL' : 'en-US', {
    maximumFractionDigits: 2,
  }).format(value);
  const signed = (value: number) => `${value > 0 ? '+' : value < 0 ? '-' : ''}${exact(Math.abs(value))}`;
  const boundDifference = published?.published.lp_bound != null
    ? dec(published.published.lp_bound - (published.scoreboard[0]?.bound ?? 0), 0)
    : '-';

  return (
    <div className="page-body">
      <h1>{es ? 'Comparación' : 'Benchmark'}</h1>

      <p>
        {es
          ? 'Newman1 conserva su escenario publicado de seis períodos. Esta tabla muestra la solución CPIT de PhaseFlow junto al resultado PCPSP de Jélvez et al. (2018). Son problemas distintos: el segundo permite decidir el destino de cada bloque. Los valores CPIT de MineLib, sobre el mismo problema, siguen en una segunda tabla, y la referencia entera CPIT externa aparece debajo por separado.'
          : 'Newman1 retains its published six-period scenario. This table places PhaseFlow’s CPIT result beside the PCPSP result of Jélvez et al. (2018). These are different problems: the latter can choose each block’s destination. MineLib’s own CPIT values, on the same problem, follow in a second table, and the external CPIT integer reference is identified separately below.'}{' '}
        <Cite id="espinoza2013" /> <Cite id="jelvez2018" />
      </p>

      {published && (
        <>
          <h2>{es ? 'La instancia publicada' : 'The published instance'}</h2>
          <div className="pf-scroll-x">
            <table className="pf-table">
              <thead>
                <tr><th>{es ? 'cantidad' : 'quantity'}</th><th>PhaseFlow CPIT</th><th>{es ? 'Jélvez et al. 2018 PCPSP' : 'Jelvez et al. 2018 PCPSP'}</th><th>{es ? 'diferencia absoluta' : 'absolute difference'}</th></tr>
              </thead>
              <tbody>
                <tr>
                  <td>{es ? 'óptimo del pit final' : 'ultimate pit optimum'}</td>
                  <td>{exact(published.instance.upit_value)}</td>
                  <td>{published.published.upit_optimum ? exact(published.published.upit_optimum) : '-'}</td>
                  <td>
                    {published.published.upit_optimum
                      ? exact(Math.abs(published.instance.upit_value - published.published.upit_optimum))
                      : '-'}
                  </td>
                </tr>
                <tr>
                  <td>{es ? 'cota LP' : 'LP bound'}</td>
                  <td>{exact(published.scoreboard[0]?.bound ?? 0)}</td>
                  <td>{published.published.lp_bound ? exact(published.published.lp_bound) : '-'}</td>
                  <td>
                    {published.published.lp_bound
                      ? exact(Math.abs((published.scoreboard[0]?.bound ?? 0) - published.published.lp_bound))
                      : '-'}
                  </td>
                </tr>
                <tr>
                  <td>{es ? 'mejor plan factible' : 'best feasible schedule'}</td>
                  <td>{publishedBest ? exact(publishedBest.npv) : '-'}</td>
                  <td>{published.published.best_known ? exact(published.published.best_known) : '-'}</td>
                  <td>
                    {published.published.best_known && publishedBest
                      ? exact(Math.abs(published.published.best_known - publishedBest.npv))
                      : '-'}
                  </td>
                </tr>
                <tr>
                  <td>{es ? 'brecha frente a su propia cota LP' : 'gap to each problem’s own LP bound'}</td>
                  <td>{published.best ? `${dec(published.best.gap_pct, 2)}%` : '-'}</td>
                  <td>{published.published.best_known_gap_pct != null ? `${dec(published.published.best_known_gap_pct, 2)}%` : '-'}</td>
                  <td>-</td>
                </tr>
              </tbody>
            </table>
          </div>
          <h3>{es ? 'Frente a los resultados CPIT de MineLib' : 'Against MineLib’s own CPIT results'}</h3>
          <p className="pf-cap pf-muted">
            {es
              ? 'Esta es la comparación sobre el MISMO problema: MineLib publica, para newman1, la cota superior LP CPIT y la mejor solución CPIT factible conocida. Los valores de MineLib están redondeados a la unidad.'
              : 'This is the comparison on the SAME problem: MineLib publishes, for newman1, the CPIT LP upper bound and the best known feasible CPIT solution. MineLib’s values are rounded to the unit.'}{' '}
            <Cite id="minelibresults" />
          </p>
          <div className="pf-scroll-x">
            <table className="pf-table" data-testid="minelib-cpit">
              <thead>
                <tr><th>{es ? 'cantidad' : 'quantity'}</th><th>PhaseFlow CPIT</th><th>MineLib CPIT</th><th>{es ? 'PhaseFlow menos MineLib' : 'PhaseFlow minus MineLib'}</th></tr>
              </thead>
              <tbody>
                <tr>
                  <td>{es ? 'óptimo del pit final' : 'ultimate pit optimum'}</td>
                  <td>{exact(published.instance.upit_value)}</td>
                  <td>{exact(MINELIB_NEWMAN1_CPIT.upit)}</td>
                  <td>{signed(published.instance.upit_value - MINELIB_NEWMAN1_CPIT.upit)}</td>
                </tr>
                <tr>
                  <td>{es ? 'cota superior LP CPIT' : 'CPIT LP upper bound'}</td>
                  <td>{exact(published.scoreboard[0]?.bound ?? 0)}</td>
                  <td>{exact(MINELIB_NEWMAN1_CPIT.lpBound)}</td>
                  <td>{signed((published.scoreboard[0]?.bound ?? 0) - MINELIB_NEWMAN1_CPIT.lpBound)}</td>
                </tr>
                <tr>
                  <td>{es ? 'mejor plan factible' : 'best feasible schedule'}</td>
                  <td>{publishedBest ? exact(publishedBest.npv) : '-'}</td>
                  <td>{exact(MINELIB_NEWMAN1_CPIT.bestKnown)}</td>
                  <td>{publishedBest ? signed(publishedBest.npv - MINELIB_NEWMAN1_CPIT.bestKnown) : '-'}</td>
                </tr>
                <tr>
                  <td>{es ? 'brecha frente a la cota LP CPIT' : 'gap to the CPIT LP bound'}</td>
                  <td>{published.best ? `${dec(published.best.gap_pct, 2)}%` : '-'}</td>
                  <td>{`${dec(MINELIB_NEWMAN1_CPIT.gapPct, 1)}%`}</td>
                  <td>-</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="pf-cap pf-muted">
            {es
              ? 'Las diferencias de las dos primeras filas son el redondeo de MineLib: el pit final y la cota LP CPIT se reproducen a la unidad, y la cota no necesita un solver LP. El mejor valor factible que MineLib todavía lista es anterior a los resultados de 2018 y al óptimo entero externo de abajo; el plan de PhaseFlow lo supera y queda bajo ese óptimo.'
              : 'The differences in the first two rows are MineLib’s rounding: the ultimate pit and the CPIT LP bound are reproduced to the unit, and the bound needs no LP solver. The best feasible value MineLib still lists predates the 2018 results and the external integer optimum below; PhaseFlow’s plan is above it and below that optimum.'}
          </p>
          {publishedBest && (
            <Callout variant="note" title={es ? 'Referencia entera externa' : 'External integer reference'}>
              {es
                ? `Un cuaderno ejecutable de AMPL resuelve Newman1 CPIT con Gurobi 13.0.0 y reporta una solución óptima de 24.176.864,82, con cota MIP igual y tolerancia de brecha 1e-9. Esta es una ejecución externa, no una certificación producida por PhaseFlow. Nuestro mejor plan está ${dec(100 * (AMPL_NEWMAN_CPIT_OPTIMUM - publishedBest.npv) / AMPL_NEWMAN_CPIT_OPTIMUM, 3)}% por debajo de ese óptimo entero. La mayor parte de su brecha de ${dec(published.best?.gap_pct, 2)}% frente a la cota LP es la separación entre el óptimo entero y la relajación LP.`
                : `An executable AMPL notebook solves Newman1 CPIT with Gurobi 13.0.0 and reports an integer optimum of 24,176,864.82, with equal MIP best bound and a 1e-9 gap tolerance. This is an external run, not a certificate produced by PhaseFlow. Our best schedule is ${dec(100 * (AMPL_NEWMAN_CPIT_OPTIMUM - publishedBest.npv) / AMPL_NEWMAN_CPIT_OPTIMUM, 3)}% below that integer optimum. Most of its ${dec(published.best?.gap_pct, 2)}% LP-bound gap is the distance between the integer optimum and the LP relaxation.`}{' '}
              <Cite id="amplminelib" />
            </Callout>
          )}
          <p className="pf-cap pf-muted">
            {es ? 'Escenario: ' : 'Scenario: '}
            {published.scenario.periods} {es ? 'períodos' : 'periods'}, {es ? 'tasa' : 'rate'} {dec((published.scenario.discount_rate * 100), 0)}%,{' '}
            {published.scenario.n_resources} {es ? 'restricciones de recurso, todas leídas del archivo publicado' : 'resource constraints, all read from the published file'}.{' '}
            {es ? 'Fuente de los valores publicados' : 'Source of the published values'}: {published.published.source}
          </p>

          <Callout variant="note" title={es ? 'Qué dice y qué no dice esta tabla' : 'What this table says and does not say'}>
            {/* The best method and its gap are READ from the artifact. The sentence used to carry
                "2.49 percent" and "the C-PIT[D] neighbourhood is the rung that produces it" as prose,
                and it stayed on the page after sliding-window took the case to 1.37: the table above
                said one thing and the paragraph under it said another. */}
            {es
              ? `El pit final se reproduce exactamente. La cota LP CPIT de PhaseFlow está ${boundDifference} unidades bajo la cota LP PCPSP publicada, como requiere la inclusión de problemas. El mejor plan CPIT de PhaseFlow, ${published.best?.method ?? '-'}, queda a ${dec(published.best?.gap_pct, 2) ?? '-'}% de su propia cota; el resultado PCPSP de 2018 queda a ${dec(published.published.best_known_gap_pct, 2)}% de la suya. Esas brechas no miden el mismo problema. La referencia entera CPIT externa permite separar la brecha de integralidad de la pérdida de nuestro método solo para Newman1.`
              : `The ultimate pit is reproduced exactly. PhaseFlow’s CPIT LP bound is ${boundDifference} units below the published PCPSP LP bound, as the problem inclusion requires. PhaseFlow’s best CPIT schedule, ${published.best?.method ?? '-'}, is ${dec(published.best?.gap_pct, 2) ?? '-'}% below its own bound; the 2018 PCPSP result is ${dec(published.published.best_known_gap_pct, 2)}% below its bound. Those gaps measure different problems. The external CPIT integer reference separates integrality gap from our method’s loss only for Newman1.`}
          </Callout>
        </>
      )}

      <h2>{es ? 'Instancias reales bajo escenario declarado' : 'Real instances under a declared scenario'}</h2>
      <p className="pf-cap pf-muted">
        {es
          ? 'Para estas el .cpit publicado no es alcanzable, así que el escenario lo declaramos nosotros y la brecha es contra NUESTRA cota. El óptimo del pit final sí es comparable, porque no depende del escenario.'
          : 'For these the published .cpit is not reachable, so the scenario is ours and the gap is against OUR bound. The ultimate pit optimum IS comparable, because it does not depend on the scenario.'}
      </p>
      <div className="pf-scroll-x">
        <table className="pf-table">
          <thead>
            <tr>
              <th>{es ? 'instancia' : 'instance'}</th><th>{es ? 'bloques' : 'blocks'}</th>
              <th>{es ? 'pit final (nuestro)' : 'ultimate pit (ours)'}</th><th>{es ? 'publicado' : 'published'}</th>
              <th>{es ? 'error relativo' : 'relative error'}</th><th>{es ? 'brecha del plan' : 'schedule gap'}</th>
            </tr>
          </thead>
          <tbody>
            {real.map((m) => (
              <tr key={m.case_id}>
                <td>{m.case_id}</td>
                <td>{fmtInt(m.instance.n_blocks, lang)}</td>
                <td>{fmtMoney(m.instance.upit_value)}</td>
                <td>{m.published.upit_optimum ? fmtMoney(m.published.upit_optimum) : '-'}</td>
                <td>
                  {m.published.upit_optimum
                    ? exp(Math.abs(m.instance.upit_value - m.published.upit_optimum) / m.published.upit_optimum, 1)
                    : '-'}
                </td>
                <td>{m.best ? `${dec(m.best.gap_pct, 2)}%` : '-'}{m.scenario.declared ? ` (${es ? 'declarado' : 'declared'})` : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>{es ? 'Dos niveles de cota' : 'Two bound levels'}</h2>
      <p className="pf-cap pf-muted">
        {es
          ? 'Con dos capacidades por período hay dos cotas. El Algoritmo 4 relaja los recursos de a uno y conserva la menor cota certificada. Bienstock-Zuckerberg aproxima la cota LP CONJUNTA dentro de su tolerancia. Cuando esta última es menor, la diferencia mide la flojedad adicional del Algoritmo 4; en controles casi degenerados BZ puede terminar ligeramente por encima de Algoritmo 4 y se usa la menor. Lo que queda entre LP y plan mezcla integralidad y pérdida del método. BZ se omite cuando el grafo expandido supera el presupuesto declarado.'
          : 'With two capacities per period there are two bounds. Algorithm 4 relaxes the resources one at a time and keeps the smaller certified value. Bienstock-Zuckerberg approximates the JOINT LP bound within its tolerance. When it is lower, the difference measures Algorithm 4’s extra looseness; on near-degenerate controls BZ may finish slightly above Algorithm 4, and the smaller value is used. The LP-to-schedule gap still mixes integrality and method loss. BZ is skipped when the expanded graph exceeds the declared budget.'}{' '}
        <Cite id="munoz2017" />
      </p>
      <TwoBounds />
      <div className="pf-scroll-x">
        <table className="pf-table">
          <thead>
            <tr>
              <th>{es ? 'caso' : 'case'}</th><th>Algorithm 4</th><th>Bienstock-Zuckerberg</th>
              <th>{es ? 'Alg 4 menos BZ' : 'Alg 4 minus BZ'}</th><th>{es ? 'usada' : 'used'}</th>
              <th>{es ? 'nodos expandidos' : 'expanded nodes'}</th>
            </tr>
          </thead>
          <tbody>
            {manifests.map((m) => {
              const b = traces[m.case_id]?.bound;
              if (!b) return null;
              return (
                <tr key={m.case_id}>
                  <td>{m.case_id}</td>
                  <td>{b.algorithm4 ? fmtMoney(b.algorithm4) : '-'}</td>
                  <td>
                    {b.joint != null ? (
                      fmtMoney(b.joint)
                    ) : (
                      <span className="pf-muted">{es ? 'sobre presupuesto' : 'over budget'}</span>
                    )}
                  </td>
                  <td>{b.tightening_pct != null ? `${dec(b.tightening_pct, 3)}%` : '-'}</td>
                  <td>
                    <span className="pf-badge">
                      {b.used === 'bienstock-zuckerberg' ? 'BZ' : 'Alg 4'}
                    </span>
                  </td>
                  <td>{fmtInt(b.joint_nodes ?? 0, lang)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h2>{es ? 'El carril aprendido, medido fuera de muestra' : 'The learned lane, measured out of sample'}</h2>
      {(() => {
        const anyTrace = Object.values(traces).find((t) => Object.keys(t.learned?.expectedTime ?? {}).length);
        const et = anyTrace?.learned?.expectedTime as Record<string, number> | undefined;
        const bd = anyTrace?.learned?.bound as Record<string, number> | undefined;
        if (!et) {
          return (
            <p className="pf-cap pf-muted">
              {es ? 'No horneado con modelos aprendidos.' : 'Not baked with the learned models.'}
            </p>
          );
        }
        return (
          <>
            <div className="pf-kpis">
              <div className="pf-kpi"><b>{dec(et.holdout_spearman, 3)}</b><span>Spearman</span></div>
              <div className="pf-kpi"><b>{dec((100 * (et.holdout_npv_vs_exact_exts_median ?? 0)), 1)}%</b><span>{es ? 'NPV vs ExTS (mediana)' : 'NPV vs ExTS (median)'}</span></div>
              <div className="pf-kpi"><b>{dec((100 * (et.holdout_npv_vs_exact_exts_p10 ?? 0)), 1)}%</b><span>P10</span></div>
              <div className="pf-kpi"><b>{dec((100 * (et.holdout_npv_vs_exact_exts_min ?? 0)), 1)}%</b><span>{es ? 'peor caso' : 'worst case'}</span></div>
              <div className="pf-kpi"><b>{dec((100 * (et.holdout_beats_greedy_rate ?? 0)), 0)}%</b><span>{es ? 'gana al codicioso' : 'beats greedy'}</span></div>
              <div className="pf-kpi"><b>{dec((100 * (bd?.holdout_mean_rel_err ?? 0)), 2)}%</b><span>{es ? 'error de la cota' : 'bound surrogate err'}</span></div>
            </div>
            <p className="pf-cap pf-muted">
              {es
                ? 'El PEOR caso está en la tabla a propósito. Una media esconde exactamente el fallo que un usuario encontraría, y un sustituto cuyo peor plan retenido vale un tercio de la alternativa tiene una propiedad, no una nota al pie.'
                : 'The WORST case is in the table on purpose. A mean hides exactly the failure a user would hit, and a surrogate whose worst held-out plan is worth a third of the alternative has a property, not a footnote.'}
            </p>
          </>
        );
      })()}

      <h2>{es ? 'Todos los casos' : 'Every case'}</h2>
      <div className="pf-scroll-x">
        <table className="pf-table">
          <thead>
            <tr>
              <th>{es ? 'caso' : 'case'}</th><th>{es ? 'método' : 'method'}</th><th>{es ? 'peldaño' : 'rung'}</th>
              <th>NPV</th><th>{es ? 'cota' : 'bound'}</th><th>gap</th><th>{es ? 'controles' : 'controls'}</th>
            </tr>
          </thead>
          <tbody>
            {manifests.map((m) => {
              const best = m.scoreboard.filter((x) => x.rung !== 'beyond').reduce((a, b) => (a.npv >= b.npv ? a : b));
              return (
                <tr key={m.case_id}>
                  <td>{m.case_id}</td><td>{best.method}</td><td>{best.rung}</td>
                  <td>{fmtMoney(best.npv)}</td><td>{fmtMoney(best.bound)}</td><td>{dec(best.gap_pct, 2)}%</td>
                  <td><span className={`pf-badge ${m.controls.allPass ? 'pass' : 'fail'}`}>{m.controls.allPass ? 'PASS' : 'FAIL'}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Callout variant="honest" title={es ? 'Cuando la cota es floja, la brecha lo dice' : 'When the bound is loose, the gap says so'}>
        {es
          ? 'Con dos restricciones de recurso el Algoritmo 4 relaja una a la vez y se queda con la menor: sigue siendo certificada y es más floja que una cota conjunta. Ahí la brecha reportada mezcla dos cosas, cuánto pierde la heurística y cuánto pierde la cota. Bienstock-Zuckerberg las separa y la tabla de arriba muestra ambas por caso, con el ajuste entre ellas. Donde el grafo expandido en el tiempo supera el presupuesto de un max-flow en Python puro, BZ no corre y la tabla lo dice con palabras en vez de dejar el campo en blanco: una brecha grande se muestra tal cual.'
          : 'With two resource constraints Algorithm 4 relaxes one at a time and keeps the smaller: still certified, and looser than a joint bound. There the reported gap mixes two things, how much the heuristic loses and how much the bound loses. Bienstock-Zuckerberg separates them, and the table above shows both per case with the tightening between them. Where the time-expanded graph is over the budget for a pure-Python max-flow BZ does not run, and the table says so in words rather than leaving the field blank: a large gap is shown as it is.'}{' '}
        <Cite id="munoz2017" />
      </Callout>

      <Refs ids={['espinoza2013', 'minelibresults', 'jelvez2018', 'amplminelib', 'chicoisne2012', 'munoz2017', 'morales2015']} label="References" />
    </div>
  );
}
