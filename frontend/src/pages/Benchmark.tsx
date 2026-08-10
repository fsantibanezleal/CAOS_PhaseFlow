import { useEffect, useState } from 'react';
import { Callout, Cite, Refs, useShellLang } from '@fasl-work/caos-app-shell';
import { fmtInt, fmtMoney, loadIndex, loadManifest, loadTrace } from '../lib/artifacts.ts';
import type { CaseManifest, ScheduleTrace } from '../lib/contract.types.ts';

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

  return (
    <div className="page-body">
      <h1>Benchmark</h1>

      <p>
        {es
          ? 'Una sola pregunta importa aqui: cuando este producto resuelve una instancia PUBLICADA tal como se publica, que tan lejos queda del mejor resultado publicado. Todo lo demas del sitio se mide contra nuestra propia cota; esta tabla se mide contra la de otros.'
          : 'One question matters here: when this product solves a PUBLISHED instance as published, how far does it land from the best published result. Everything else on the site is measured against our own bound; this table is measured against somebody else’s.'}{' '}
        <Cite id="espinoza2013" /> <Cite id="jelvez2018" />
      </p>

      {published && (
        <>
          <h2>{es ? 'La instancia publicada' : 'The published instance'}</h2>
          <div className="pf-scroll-x">
            <table className="pf-table">
              <thead>
                <tr><th>{es ? 'cantidad' : 'quantity'}</th><th>{es ? 'este producto' : 'this product'}</th><th>{es ? 'publicado' : 'published'}</th><th>{es ? 'diferencia' : 'difference'}</th></tr>
              </thead>
              <tbody>
                <tr>
                  <td>{es ? 'optimo del pit final' : 'ultimate pit optimum'}</td>
                  <td>{fmtMoney(published.instance.upit_value)}</td>
                  <td>{published.published.upit_optimum ? fmtMoney(published.published.upit_optimum) : '-'}</td>
                  <td>
                    {published.published.upit_optimum
                      ? `${(100 * Math.abs(published.instance.upit_value - published.published.upit_optimum) / published.published.upit_optimum).toExponential(1)}%`
                      : '-'}
                  </td>
                </tr>
                <tr>
                  <td>{es ? 'cota LP certificada' : 'certified LP bound'}</td>
                  <td>{fmtMoney(published.scoreboard[0]?.bound ?? 0)}</td>
                  <td>{published.published.lp_bound ? fmtMoney(published.published.lp_bound) : '-'}</td>
                  <td>
                    {published.published.lp_bound
                      ? `${(100 * Math.abs((published.scoreboard[0]?.bound ?? 0) - published.published.lp_bound) / published.published.lp_bound).toExponential(1)}%`
                      : '-'}
                  </td>
                </tr>
                <tr>
                  <td>{es ? 'mejor plan factible' : 'best feasible schedule'}</td>
                  <td>{fmtMoney(published.scoreboard.reduce((a, b) => (a.npv >= b.npv ? a : b)).npv)}</td>
                  <td>{published.published.best_known ? fmtMoney(published.published.best_known) : '-'}</td>
                  <td>
                    {published.published.best_known
                      ? `${(100 * (published.published.best_known - published.scoreboard.reduce((a, b) => (a.npv >= b.npv ? a : b)).npv) / published.published.best_known).toFixed(2)}% ${es ? 'por debajo' : 'below'}`
                      : '-'}
                  </td>
                </tr>
                <tr>
                  <td>{es ? 'brecha de optimalidad' : 'optimality gap'}</td>
                  <td>{published.best ? `${published.best.gap_pct.toFixed(2)}%` : '-'}</td>
                  <td>{published.published.best_known_gap_pct != null ? `${published.published.best_known_gap_pct}%` : '-'}</td>
                  <td>-</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="pf-cap pf-muted">
            {es ? 'Escenario: ' : 'Scenario: '}
            {published.scenario.periods} {es ? 'periodos' : 'periods'}, {es ? 'tasa' : 'rate'} {(published.scenario.discount_rate * 100).toFixed(0)}%,{' '}
            {published.scenario.n_resources} {es ? 'restricciones de recurso, todas leidas del archivo publicado' : 'resource constraints, all read from the published file'}.{' '}
            {es ? 'Fuente de los valores publicados' : 'Source of the published values'}: {published.published.source}
          </p>

          <Callout variant="note" title={es ? 'Que dice y que no dice esta tabla' : 'What this table says and does not say'}>
            {es
              ? 'Dice que el pit final se reproduce exactamente y que la cota certificada cae a una distancia relativa minuscula POR DEBAJO de la publicada, que es la direccion que la valida: la cifra publicada es una cota LP de PCPSP y esta es una cota LP de CPIT, y CPIT es el problema menor, asi que su cota tiene que quedar mas abajo. Dice tambien que el mejor plan de este producto queda por debajo del mejor conocido, 2,49 por ciento contra 1,26. El vecindario exacto C-PIT[D] SI esta implementado y es justamente el peldano que produce ese 2,49; la distancia que queda es la separacion entre un re-resolver restringido y las horas de branch and bound que hay detras del mejor conocido publicado. No dice que este producto sea el estado del arte en planes factibles.'
              : 'It says the ultimate pit is reproduced exactly, and that the certified bound lands a tiny relative distance BELOW the published one, which is the direction that validates it: the published figure is a PCPSP LP bound and this is a CPIT LP bound, and CPIT is the smaller problem, so its bound must sit lower. It also says this product’s best schedule sits below the best known, 2.49 percent against 1.26. The exact C-PIT[D] neighbourhood IS implemented and is precisely the rung that produces that 2.49; the distance that remains is the one between a restricted re-solve and the hours of branch and bound behind the published best known. It does not say this product is state of the art at producing feasible schedules.'}
          </Callout>
        </>
      )}

      <h2>{es ? 'Instancias reales bajo escenario declarado' : 'Real instances under a declared scenario'}</h2>
      <p className="pf-cap pf-muted">
        {es
          ? 'Para estas el .cpit publicado no es alcanzable, asi que el escenario lo declaramos nosotros y la brecha es contra NUESTRA cota. El optimo del pit final si es comparable, porque no depende del escenario.'
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
                    ? (Math.abs(m.instance.upit_value - m.published.upit_optimum) / m.published.upit_optimum).toExponential(1)
                    : '-'}
                </td>
                <td>{m.best ? `${m.best.gap_pct.toFixed(2)}%` : '-'}{m.scenario.declared ? ` (${es ? 'declarado' : 'declared'})` : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>{es ? 'De quien es la brecha' : 'Whose looseness is the gap'}</h2>
      <p className="pf-cap pf-muted">
        {es
          ? 'Con dos capacidades por periodo hay dos cotas. El Algoritmo 4 relaja los recursos de a uno y se queda con la menor: certificada y mas floja. Bienstock-Zuckerberg calcula la cota CONJUNTA. La diferencia entre ambas es la parte de una brecha que pertenece a la COTA y no al plan, y esta tabla la separa caso por caso. BZ no corre donde el grafo expandido en el tiempo supera el presupuesto de un max-flow en Python puro, y ahi la tabla lo dice.'
          : 'With two capacities per period there are two bounds. Algorithm 4 relaxes the resources one at a time and keeps the smaller: certified, and looser. Bienstock-Zuckerberg computes the JOINT bound. The difference between them is the part of a gap that belongs to the BOUND rather than the plan, and this table separates them case by case. BZ does not run where the time-expanded graph exceeds the budget for a pure-Python max-flow, and the table says so there.'}{' '}
        <Cite id="munoz2017" />
      </p>
      <div className="pf-scroll-x">
        <table className="pf-table">
          <thead>
            <tr>
              <th>{es ? 'caso' : 'case'}</th><th>Algorithm 4</th><th>Bienstock-Zuckerberg</th>
              <th>{es ? 'mas ajustada' : 'tighter by'}</th><th>{es ? 'usada' : 'used'}</th>
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
                  <td>{b.tightening_pct != null ? `${b.tightening_pct.toFixed(3)}%` : '-'}</td>
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
              <div className="pf-kpi"><b>{et.holdout_spearman?.toFixed(3)}</b><span>Spearman</span></div>
              <div className="pf-kpi"><b>{(100 * (et.holdout_npv_vs_exact_exts_median ?? 0)).toFixed(1)}%</b><span>{es ? 'NPV vs ExTS (mediana)' : 'NPV vs ExTS (median)'}</span></div>
              <div className="pf-kpi"><b>{(100 * (et.holdout_npv_vs_exact_exts_p10 ?? 0)).toFixed(1)}%</b><span>P10</span></div>
              <div className="pf-kpi"><b>{(100 * (et.holdout_npv_vs_exact_exts_min ?? 0)).toFixed(1)}%</b><span>{es ? 'peor caso' : 'worst case'}</span></div>
              <div className="pf-kpi"><b>{(100 * (et.holdout_beats_greedy_rate ?? 0)).toFixed(0)}%</b><span>{es ? 'gana al codicioso' : 'beats greedy'}</span></div>
              <div className="pf-kpi"><b>{(100 * (bd?.holdout_mean_rel_err ?? 0)).toFixed(2)}%</b><span>{es ? 'error de la cota' : 'bound surrogate err'}</span></div>
            </div>
            <p className="pf-cap pf-muted">
              {es
                ? 'El PEOR caso esta en la tabla a proposito. Una media esconde exactamente el fallo que un usuario encontraria, y un sustituto cuyo peor plan retenido vale un tercio de la alternativa tiene una propiedad, no una nota al pie.'
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
              <th>{es ? 'caso' : 'case'}</th><th>{es ? 'metodo' : 'method'}</th><th>{es ? 'peldano' : 'rung'}</th>
              <th>NPV</th><th>{es ? 'cota' : 'bound'}</th><th>gap</th><th>{es ? 'controles' : 'controls'}</th>
            </tr>
          </thead>
          <tbody>
            {manifests.map((m) => {
              const best = m.scoreboard.filter((x) => x.rung !== 'beyond').reduce((a, b) => (a.npv >= b.npv ? a : b));
              return (
                <tr key={m.case_id}>
                  <td>{m.case_id}</td><td>{best.method}</td><td>{best.rung}</td>
                  <td>{fmtMoney(best.npv)}</td><td>{fmtMoney(best.bound)}</td><td>{best.gap_pct.toFixed(2)}%</td>
                  <td><span className={`pf-badge ${m.controls.allPass ? 'pass' : 'fail'}`}>{m.controls.allPass ? 'PASS' : 'FAIL'}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Callout variant="honest" title={es ? 'Cuando la cota es floja, la brecha lo dice' : 'When the bound is loose, the gap says so'}>
        {es
          ? 'Con dos restricciones de recurso el Algoritmo 4 relaja una a la vez y se queda con la menor: sigue siendo certificada y es mas floja que una cota conjunta. Ahi la brecha reportada mezcla dos cosas, cuanto pierde la heuristica y cuanto pierde la cota. Bienstock-Zuckerberg las separa y la tabla de arriba muestra ambas por caso, con el ajuste entre ellas. Donde el grafo expandido en el tiempo supera el presupuesto de un max-flow en Python puro, BZ no corre y la tabla lo dice con palabras en vez de dejar el campo en blanco: una brecha grande se muestra tal cual.'
          : 'With two resource constraints Algorithm 4 relaxes one at a time and keeps the smaller: still certified, and looser than a joint bound. There the reported gap mixes two things, how much the heuristic loses and how much the bound loses. Bienstock-Zuckerberg separates them, and the table above shows both per case with the tightening between them. Where the time-expanded graph is over the budget for a pure-Python max-flow BZ does not run, and the table says so in words rather than leaving the field blank: a large gap is shown as it is.'}{' '}
        <Cite id="munoz2017" />
      </Callout>

      <Refs ids={['espinoza2013', 'jelvez2018', 'chicoisne2012', 'munoz2017', 'morales2015']} label="References" />
    </div>
  );
}
