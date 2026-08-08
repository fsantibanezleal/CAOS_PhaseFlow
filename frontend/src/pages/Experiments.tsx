import { useEffect, useState } from 'react';
import { Callout, Cite, Refs, Tabs, useShellLang, useThemeStore } from '@fasl-work/caos-app-shell';
import { fmtInt, loadIndex, loadManifest } from '../lib/artifacts.ts';
import type { CaseIndex, CaseManifest } from '../lib/contract.types.ts';
import { MethodBars } from '../viz/Charts.tsx';

export default function Experiments() {
  const lang = useShellLang();
  const es = lang === 'es';
  const theme = useThemeStore((s) => s.theme);
  const [index, setIndex] = useState<CaseIndex | null>(null);
  const [manifests, setManifests] = useState<CaseManifest[]>([]);

  useEffect(() => {
    loadIndex().then(async (idx) => {
      setIndex(idx);
      setManifests(await Promise.all(idx.cases.map((c) => loadManifest(c.case_id))));
    });
  }, []);

  if (!index) return <div className="page-body"><p className="pf-muted">Loading…</p></div>;

  const byCat = manifests.reduce<Record<string, CaseManifest[]>>((a, m) => {
    (a[m.category] ??= []).push(m); return a;
  }, {});

  const tabs = [
    {
      id: 'design',
      label: es ? 'Diseno' : 'Design',
      content: (
        <>
          <p>
            {es
              ? 'La matriz de casos no es una lista de ejemplos: cada caso tiene un ROL en el argumento, y un caso sin rol es un caso que nadie necesita.'
              : 'The case matrix is not a list of examples: each case has a ROLE in the argument, and a case with no role is a case nobody needs.'}
          </p>
          <table className="pf-table">
            <thead><tr><th>{es ? 'categoria' : 'category'}</th><th>{es ? 'que prueba' : 'what it proves'}</th><th>{es ? 'casos' : 'cases'}</th></tr></thead>
            <tbody>
              <tr><td>published</td><td>{es ? 'una instancia publicada resuelta tal como se publica, medida contra la brecha publicada' : 'a published instance solved as published, measured against the published gap'}</td><td>{(byCat.published ?? []).length}</td></tr>
              <tr><td>declared</td><td>{es ? 'un modelo de bloques real bajo un escenario que declaramos, porque el .cpit publicado no es alcanzable' : 'a real block model under a scenario we declare, because the published .cpit is not reachable'}</td><td>{(byCat.declared ?? []).length}</td></tr>
              <tr><td>deposit</td><td>{es ? 'los cuatro arquetipos sembrados: la forma del deposito cambia la forma del plan' : 'the four seeded archetypes: the shape of the deposit changes the shape of the plan'}</td><td>{(byCat.deposit ?? []).length}</td></tr>
              <tr><td>regime</td><td>{es ? 'el mismo deposito bajo escenarios que cambian que restriccion limita' : 'the same deposit under scenarios that change which constraint binds'}</td><td>{(byCat.regime ?? []).length}</td></tr>
              <tr><td>control</td><td>{es ? 'los controles degenerado y negativo: un producto que no puede fallar sus controles no esta siendo revisado' : 'the degenerate and negative controls: a product that cannot fail its controls is not being checked'}</td><td>{(byCat.control ?? []).length}</td></tr>
            </tbody>
          </table>
          <Callout variant="honest" title={es ? 'Brechas comparables y brechas que no lo son' : 'Comparable gaps, and gaps that are not'}>
            {es
              ? 'Solo el caso published se compara contra una cota publicada. Todo lo demas se mide contra NUESTRA cota sobre NUESTRO escenario, y por eso la etiqueta de escenario declarado esta en la App. Una brecha del 2 por ciento sobre un escenario propio no es lo mismo que una brecha del 2 por ciento contra el estado del arte publicado.'
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
                <th>{es ? 'periodos' : 'periods'}</th><th>{es ? 'tasa' : 'rate'}</th><th>lane</th><th>{es ? 'mejor gap' : 'best gap'}</th><th>{es ? 'controles' : 'controls'}</th>
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
                  <td>{(m.scenario.discount_rate * 100).toFixed(0)}%</td>
                  <td><span className={`pf-badge ${m.lane}`}>{m.lane}</span></td>
                  <td>{m.best ? `${m.best.gap_pct.toFixed(2)}%` : '-'}</td>
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
      label: es ? 'Escalera de metodos' : 'Method ladder',
      content: (
        <div className="pf-split">
          {manifests.map((m) => (
            <div className="pf-panel" key={m.case_id}>
              <h4>{m.case_id}</h4>
              <MethodBars rows={m.scoreboard.map((s) => ({ method: s.method, rung: s.rung, gapPct: s.gap_pct, npv: s.npv, runtimeMs: s.runtime_ms }))} />
            </div>
          ))}
        </div>
      ),
    },
    {
      id: 'regimes',
      label: es ? 'Regimenes' : 'Regimes',
      content: (
        <>
          <p>
            {es
              ? 'El mismo deposito, tres escenarios. Lo que cambia no es el color: cambia que restriccion limita, y con ella la forma del rajo temprano.'
              : 'The same deposit, three scenarios. What changes is not the colour: it is which constraint binds, and with it the shape of the early pit.'}
          </p>
          <div className="pf-scroll-x">
            <table className="pf-table">
              <thead>
                <tr><th>{es ? 'regimen' : 'regime'}</th><th>{es ? 'periodos' : 'periods'}</th><th>{es ? 'tasa' : 'rate'}</th><th>{es ? 'mejor NPV' : 'best NPV'}</th><th>{es ? 'cota' : 'bound'}</th><th>gap</th></tr>
              </thead>
              <tbody>
                {(byCat.regime ?? []).concat(byCat.control ?? []).map((m) => {
                  const best = m.scoreboard.reduce((a, b) => (a.npv >= b.npv ? a : b));
                  return (
                    <tr key={m.case_id}>
                      <td>{m.case_id}</td><td>{m.scenario.periods}</td><td>{(m.scenario.discount_rate * 100).toFixed(0)}%</td>
                      <td>{(best.npv / 1e6).toFixed(1)} M</td><td>{(best.bound / 1e6).toFixed(1)} M</td><td>{best.gap_pct.toFixed(2)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Callout variant="note" title={es ? 'El control negativo' : 'The negative control'}>
            {es
              ? 'ctrl-abundant afloja la capacidad hasta que casi no limita. Ahi todos los metodos deben encontrar casi el mismo plan y la dispersion entre ellos debe colapsar. Un producto que aqui sigue mostrando dispersion grande esta midiendo su propio ruido.'
              : 'ctrl-abundant loosens capacity until it barely binds. There every method should find nearly the same plan and the spread between them should collapse. A product that still shows a large spread here is measuring its own noise.'}
          </Callout>
          <p className="pf-cap pf-muted">
            {es
              ? 'La diferencia entre planificacion clasica y directa esta medida en la literatura y es modesta en NPV y grande en esfuerzo: para McLaughlin, dos motores directos tomaron entre 1,0 y 1,5 horas en una sola corrida de optimizacion, mientras que el plan con Whittle requirio unas 15 horas de un planificador calificado, con NPV que difieren en cerca de un uno por ciento y geometrias que difieren mucho en los primeros periodos.'
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
      <p className="pf-cap pf-muted">theme: {theme}</p>
    </div>
  );
}
