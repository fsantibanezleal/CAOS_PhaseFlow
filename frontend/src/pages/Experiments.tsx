import { useEffect, useState } from 'react';
import { Callout, Cite, Refs, Tabs, useShellLang } from '@fasl-work/caos-app-shell';
import { fmtInt, loadIndex, loadManifest, dec } from '../lib/artifacts.ts';
import type { CaseIndex, CaseManifest } from '../lib/contract.types.ts';
import { MethodBars } from '../viz/Charts.tsx';
import { CaseRoles } from '../viz/Diagrams.tsx';

export default function Experiments() {
  const lang = useShellLang();
  const es = lang === 'es';
  const [index, setIndex] = useState<CaseIndex | null>(null);
  const [manifests, setManifests] = useState<CaseManifest[]>([]);

  useEffect(() => {
    loadIndex().then(async (idx) => {
      setIndex(idx);
      setManifests(await Promise.all(idx.cases.map((c) => loadManifest(c.case_id))));
    });
  }, []);

  if (!index) return <div className="page-body"><p className="pf-muted">{es ? 'Cargando...' : 'Loading...'}</p></div>;

  const byCat = manifests.reduce<Record<string, CaseManifest[]>>((a, m) => {
    (a[m.category] ??= []).push(m); return a;
  }, {});

  const tabs = [
    {
      id: 'design',
      label: es ? 'Diseño' : 'Design',
      content: (
        <>
          <p>
            {es
              ? 'La matriz de casos no es una lista de ejemplos: cada caso tiene un ROL en el argumento, y un caso sin rol es un caso que nadie necesita.'
              : 'The case matrix is not a list of examples: each case has a ROLE in the argument, and a case with no role is a case nobody needs.'}
          </p>
          <CaseRoles />
          <table className="pf-table">
            <thead><tr><th>{es ? 'categoría' : 'category'}</th><th>{es ? 'qué prueba' : 'what it proves'}</th><th>{es ? 'casos' : 'cases'}</th></tr></thead>
            <tbody>
              <tr><td>published</td><td>{es ? 'una instancia publicada resuelta tal como se publica, medida contra la brecha publicada' : 'a published instance solved as published, measured against the published gap'}</td><td>{(byCat.published ?? []).length}</td></tr>
              <tr><td>declared</td><td>{es ? 'un modelo de bloques real bajo un escenario que declaramos, porque el .cpit publicado no es alcanzable' : 'a real block model under a scenario we declare, because the published .cpit is not reachable'}</td><td>{(byCat.declared ?? []).length}</td></tr>
              <tr><td>deposit</td><td>{es ? 'los cuatro arquetipos sembrados: la forma del depósito cambia la forma del plan' : 'the four seeded archetypes: the shape of the deposit changes the shape of the plan'}</td><td>{(byCat.deposit ?? []).length}</td></tr>
              <tr><td>regime</td><td>{es ? 'el mismo depósito bajo escenarios que cambian qué restricción limita' : 'the same deposit under scenarios that change which constraint binds'}</td><td>{(byCat.regime ?? []).length}</td></tr>
              <tr><td>control</td><td>{es ? 'una identidad exacta con tasa cero y un diagnóstico de sensibilidad con capacidad holgada' : 'an exact zero-rate identity and a loose-capacity sensitivity diagnostic'}</td><td>{(byCat.control ?? []).length}</td></tr>
            </tbody>
          </table>
          <Callout variant="honest" title={es ? 'Brechas comparables y brechas que no lo son' : 'Comparable gaps, and gaps that are not'}>
            {es
              ? 'Solo el caso published se compara contra una cota publicada. Todo lo demás se mide contra NUESTRA cota sobre NUESTRO escenario, y por eso la etiqueta de escenario declarado está en la App. Una brecha del 2 por ciento sobre un escenario propio no es lo mismo que una brecha del 2 por ciento contra el estado del arte publicado.'
              : 'Only the published case is compared against a published bound. Everything else is measured against OUR bound on OUR scenario, which is why the declared-scenario label is in the App. A 2 percent gap on your own scenario is not the same thing as a 2 percent gap against the published state of the art.'}
          </Callout>
        </>
      ),
    },
    {
      id: 'coverage',
      label: es ? 'Cobertura' : 'Coverage',
      content: (
        <div className="pf-scroll-x">
          <table className="pf-table">
            <thead>
              <tr>
                <th>{es ? 'caso' : 'case'}</th><th>{es ? 'cat' : 'cat'}</th><th>{es ? 'bloques' : 'blocks'}</th><th>{es ? 'arcos' : 'arcs'}</th>
                <th>{es ? 'períodos' : 'periods'}</th><th>{es ? 'tasa' : 'rate'}</th><th>{es ? 'carril' : 'lane'}</th><th>{es ? 'mejor brecha' : 'best gap'}</th><th>{es ? 'controles' : 'controls'}</th>
              </tr>
            </thead>
            <tbody>
              {manifests.map((m) => (
                <tr key={m.case_id}>
                  <td>{m.case_id}</td>
                  <td>{m.category}</td>
                  <td>{fmtInt(m.instance.n_blocks, lang)}</td>
                  <td>{fmtInt(m.instance.n_precedence_arcs, lang)}</td>
                  <td>{m.scenario.periods}</td>
                  <td>{dec((m.scenario.discount_rate * 100), 0)}%</td>
                  <td><span className={`pf-badge ${m.lane}`}>{m.lane}</span></td>
                  <td>{m.best ? `${dec(m.best.gap_pct, 2)}%` : '-'}</td>
                  <td><span className={`pf-badge ${m.controls.allPass ? 'pass' : 'fail'}`}>{m.controls.allPass ? 'PASS' : 'FAIL'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ),
    },
    {
      id: 'ladder',
      label: es ? 'Escalera de métodos' : 'Method ladder',
      content: (
        <div className="pf-split pf-split--wide" data-testid="ladder-grid">
          {manifests.map((m) => (
            <div className="pf-panel" key={m.case_id}>
              <h4>{m.case_id}</h4>
              <MethodBars rows={m.scoreboard.map((s) => ({ method: s.method, rung: s.rung, gapPct: s.gap_pct, npv: s.npv, runtimeMs: s.runtime_ms, comparable: s.rung !== 'beyond' }))} />
            </div>
          ))}
        </div>
      ),
    },
    {
      id: 'regimes',
      label: es ? 'Regímenes' : 'Regimes',
      content: (
        <>
          <p>
            {es
              ? 'El mismo depósito, tres escenarios. Lo que cambia no es el color: cambia qué restricción limita, y con ella la forma del rajo temprano.'
              : 'The same deposit, three scenarios. What changes is not the colour: it is which constraint binds, and with it the shape of the early pit.'}
          </p>
          <div className="pf-scroll-x">
            <table className="pf-table">
              <thead>
                <tr><th>{es ? 'régimen' : 'regime'}</th><th>{es ? 'períodos' : 'periods'}</th><th>{es ? 'tasa' : 'rate'}</th><th>{es ? 'mejor NPV' : 'best NPV'}</th><th>{es ? 'cota' : 'bound'}</th><th>gap</th></tr>
              </thead>
              <tbody>
                {(byCat.regime ?? []).concat(byCat.control ?? []).map((m) => {
                  const best = m.scoreboard.find((row) => row.method === m.best?.method);
                  return (
                    <tr key={m.case_id}>
                      <td>{m.case_id}</td><td>{m.scenario.periods}</td><td>{dec((m.scenario.discount_rate * 100), 0)}%</td>
                      <td>{best ? `${dec((best.npv / 1e6), 1)} M` : '-'}</td>
                      <td>{best ? `${dec((best.bound / 1e6), 1)} M` : '-'}</td>
                      <td>{best ? `${dec(best.gap_pct, 2)}%` : '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Callout variant="note" title={es ? 'Lectura de los controles' : 'Reading the controls'}>
            {es
              ? 'ctrl-degenerate tiene un período, tasa cero y capacidad ilimitada: allí las brechas colapsan exactamente. ctrl-abundant mantiene ocho períodos y descuento positivo; aunque la capacidad es holgada, los métodos clásicos siguen perdiendo valor por sus decisiones de secuencia. Los métodos más allá quedan fuera de esa comparación.'
              : 'ctrl-degenerate has one period, zero discount and unlimited capacity: its gaps collapse exactly. ctrl-abundant keeps eight periods and positive discounting; even with loose capacity, classical methods lose value through their sequencing choices. Beyond methods are outside that comparison.'}
          </Callout>
          <p className="pf-cap pf-muted">
            {es
              ? 'La diferencia entre planificación clásica y directa está medida en la literatura y es modesta en NPV y grande en esfuerzo: para McLaughlin, dos motores directos tomaron entre 1,0 y 1,5 horas en una sola corrida de optimización, mientras que el plan con Whittle requirió unas 15 horas de un planificador calificado, con NPV que difieren en cerca de un uno por ciento y geometrias que difieren mucho en los primeros períodos.'
              : 'The difference between classical and direct scheduling is measured in the literature and it is modest in NPV and large in effort: for McLaughlin, two direct engines took between 1.0 and 1.5 hours in a single optimisation run while the Whittle schedule required about 15 hours of a qualified planner, with NPVs about one percent apart and geometries that differ considerably in the early periods.'}{' '}
            <Cite id="morales2015" />
          </p>
        </>
      ),
    },
  ];

  return (
    <div className="page-body">
      <h1>{es ? 'Experimentos' : 'Experiments'}</h1>
      <Tabs tabs={tabs} ariaLabel={es ? 'Experimentos' : 'Experiments'} />
      <Refs ids={['espinoza2013', 'jelvez2018', 'morales2015', 'chicoisne2012', 'meagher2014']} label="References" />
      
    </div>
  );
}
