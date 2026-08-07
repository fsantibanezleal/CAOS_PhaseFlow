import { useEffect, useState } from 'react';
import { Callout, Cite, Refs, useShellLang } from '@fasl-work/caos-app-shell';
import { fmtMoney, loadIndex, loadManifest } from '../lib/artifacts.ts';
import type { CaseManifest } from '../lib/contract.types.ts';

export default function Benchmark() {
  const es = useShellLang() === 'es';
  const [manifests, setManifests] = useState<CaseManifest[]>([]);

  useEffect(() => {
    loadIndex().then(async (idx) => {
      setManifests(await Promise.all(idx.cases.map((c) => loadManifest(c.case_id))));
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
              ? 'Dice que el pit final se reproduce exactamente y que la cota certificada cae a una distancia relativa minuscula de la cota publicada, con el residuo en la direccion esperada porque la relajacion de un solo recurso es mas floja que la cota conjunta. Dice tambien que el mejor plan de este producto queda por debajo del mejor conocido: es una heuristica sin busqueda local exacta, y esa distancia es el precio de no implementar el vecindario C-PIT[D]. No dice que este producto sea el estado del arte en planes factibles.'
              : 'It says the ultimate pit is reproduced exactly, and that the certified bound lands a tiny relative distance from the published bound, with the residual in the expected direction because a single-resource relaxation is looser than the joint bound. It also says this product’s best schedule sits below the best known: it is a heuristic with no exact local search, and that distance is the price of not implementing the C-PIT[D] neighbourhood. It does not say this product is state of the art at producing feasible schedules.'}
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
                <td>{m.instance.n_blocks.toLocaleString()}</td>
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
              const best = m.scoreboard.reduce((a, b) => (a.npv >= b.npv ? a : b));
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
          ? 'Con dos restricciones de recurso la cota se construye relajando una a la vez y quedandose con la menor, que sigue siendo certificada pero es mas floja que una cota conjunta. En los casos con dos capacidades apretadas la brecha reportada mezcla dos cosas: cuanto pierde la heuristica y cuanto pierde la cota. Separarlas requiere Bienstock-Zuckerberg, que no esta implementado, y por eso la brecha grande se muestra tal cual en vez de maquillarse.'
          : 'With two resource constraints the bound is built by relaxing one at a time and keeping the smaller, which is still certified but looser than a joint bound. On cases with two tight capacities the reported gap mixes two things: how much the heuristic loses and how much the bound loses. Separating them needs Bienstock-Zuckerberg, which is not implemented, and that is why a large gap is shown as it is rather than dressed up.'}{' '}
        <Cite id="munoz2017" />
      </Callout>

      <Refs ids={['espinoza2013', 'jelvez2018', 'chicoisne2012', 'munoz2017', 'morales2015']} label="References" />
    </div>
  );
}
