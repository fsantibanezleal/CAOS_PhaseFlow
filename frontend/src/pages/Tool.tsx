// The App route: land on the tool. One selected case, the stage, the drawings a planner reads, and
// the numbers that say how far this plan is from the certified bound.

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Maximize2 } from 'lucide-react';
import { Callout, Cite, Tabs } from '@fasl-work/caos-app-shell';
import { fmtMoney, fmtTonnes } from '../lib/artifacts.ts';
import type { CaseIndexEntry } from '../lib/contract.types.ts';
import { stageLabel, useCase } from '../lib/useCase.ts';
import { ScheduleView3D, type StageMode } from '../viz/ScheduleView3D.tsx';
import { BenchPlan, PitProfile } from '../viz/SectionViews.tsx';
import { CapacityChart, CoherenceChart, GradeStripChart, MethodBars, ProductionChart } from '../viz/Charts.tsx';
import { periodCss } from '../viz/colormap.ts';

export default function Tool() {
  const st = useCase();
  const [mode, setMode] = useState<StageMode>('schedule');
  const [northing, setNorthing] = useState(0);
  const [bench, setBench] = useState(0);
  const es = st.lang === 'es';

  const dims = useMemo<[number, number, number]>(
    () => (st.trace ? [st.trace.instance.dims[0], st.trace.instance.dims[1], st.trace.instance.dims[2]] : [1, 1, 1]),
    [st.trace],
  );

  if (st.error) return <Callout variant="honest" title="Data">{st.error}</Callout>;
  if (!st.trace || !st.manifest || !st.method) return <p className="pf-muted">Loading…</p>;

  const { trace, manifest, method } = st;
  const T = trace.scenario.periods;
  const p = method.periods[st.cursor];
  const label = stageLabel(trace, method, st.cursor, st.lang);
  const hasBlocks = Boolean(trace.blocks);
  const lastMining = [...method.periods].reverse().find((r) => r.blocks > 0)?.t ?? 0;

  const stage = hasBlocks ? (
    <div className="pf-stagewrap">
      <ScheduleView3D
        x={trace.blocks!.x}
        y={trace.blocks!.y}
        level={trace.blocks!.level}
        grade={trace.blocks!.grade}
        inPit={trace.blocks!.inPit}
        periodOfBlock={method.periodOfBlock!}
        dims={dims}
        nPeriods={T}
        cursor={st.cursor}
        mode={mode}
        theme={st.theme}
      />
      <div className="pf-hud">
        <div className="pf-hud-label">
          <div className="pf-hud-title">{label.title}</div>
          <div className="pf-hud-sub">{label.sub}</div>
        </div>
        <div className="pf-hud-grid">
          <div className="pf-hud-row"><span className="pf-hud-val">{fmtMoney(p?.cumNpv ?? 0)}</span><span className="pf-hud-key">{es ? 'NPV acum' : 'cum NPV'}</span></div>
          <div className="pf-hud-row"><span className="pf-hud-val">{fmtMoney(method.bound)}</span><span className="pf-hud-key">{es ? 'cota' : 'bound'}</span></div>
          <div className="pf-hud-row"><span className="pf-hud-val">{method.gapPct.toFixed(2)}%</span><span className="pf-hud-key">gap</span></div>
          <div className="pf-hud-row"><span className="pf-hud-val">{p?.components ?? 0}</span><span className="pf-hud-key">{es ? 'fragmentos' : 'components'}</span></div>
        </div>
      </div>
    </div>
  ) : (
    <Callout variant="note" title={es ? 'Sin replay 3D para esta instancia' : 'No 3D replay for this instance'}>
      {es
        ? 'MineLib concede descarga academica y no redistribucion, asi que ningun plan por bloque de una instancia publicada entra en este repositorio. Este caso muestra numeros y graficos reales, no un deposito distinto disfrazado.'
        : 'MineLib grants an academic download and not redistribution, so no per-block schedule of a published instance enters this repository. This case shows real numbers and charts, not a different deposit dressed up as this one.'}
      <div style={{ marginTop: 6 }}>{trace.instance.licence}</div>
    </Callout>
  );

  const tabs = [
    {
      id: 'stage',
      label: es ? 'Rajo 3D' : '3D pit',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, height: '100%', minHeight: 0 }}>
          <div className="pf-row">
            {(['schedule', 'grade', 'mined'] as StageMode[]).map((m) => (
              <button key={m} className={`pf-chip${mode === m ? ' on' : ''}`} onClick={() => setMode(m)}>
                {m === 'schedule' ? (es ? 'paredes por ano' : 'walls by year') : m === 'grade' ? (es ? 'ley' : 'grade') : (es ? 'material extraido' : 'mined material')}
              </button>
            ))}
            <span className="pf-cap pf-muted">
              {mode === 'schedule'
                ? (es ? 'Cada bloque en pie junto a uno ya extraido toma el periodo del vecino que lo expuso.' : 'Each standing block next to an already mined one takes the period of the neighbour that exposed it.')
                : mode === 'grade'
                  ? (es ? 'El remanente sin extraer, coloreado por ley.' : 'The unmined remainder, coloured by grade.')
                  : (es ? 'El solido extraido. Es la vista honesta del volumen, y no es un rajo.' : 'The extracted solid. An honest view of the volume, and not a pit.')}
            </span>
          </div>
          {stage}
        </div>
      ),
    },
    {
      id: 'sections',
      label: es ? 'Perfil y planta' : 'Profile and plan',
      content: !hasBlocks ? stage : (
        <div className="pf-split" style={{ height: '100%' }}>
          <div className="pf-panel">
            <h4>{es ? 'Perfil del rajo' : 'Pit profile'}</h4>
            <label className="pf-ctl">
              <span>{es ? 'norte' : 'northing'} <b>{northing}</b></span>
              <input type="range" min={0} max={dims[1] - 1} value={northing} onChange={(e) => setNorthing(+e.target.value)} />
            </label>
            <div style={{ flex: '1 1 auto', minHeight: 220 }}>
              <PitProfile {...trace.blocks!} periodOfBlock={method.periodOfBlock!} dims={dims} nPeriods={T} cursor={st.cursor} theme={st.theme} northing={northing} />
            </div>
            <p className="pf-cap pf-muted">
              {es ? 'Elevacion contra este, con la topografia y la superficie del rajo por periodo. Es el dibujo que la disciplina lee' : 'Elevation against easting, with the topography and the pit surface per period. This is the drawing the discipline reads'} <Cite id="morales2015" />.
            </p>
          </div>
          <div className="pf-panel">
            <h4>{es ? 'Planta del banco' : 'Bench plan'}</h4>
            <label className="pf-ctl">
              <span>{es ? 'banco' : 'bench'} <b>{bench}</b></span>
              <input type="range" min={0} max={dims[2] - 1} value={bench} onChange={(e) => setBench(+e.target.value)} />
            </label>
            <div style={{ flex: '1 1 auto', minHeight: 220 }}>
              <BenchPlan {...trace.blocks!} periodOfBlock={method.periodOfBlock!} dims={dims} nPeriods={T} cursor={st.cursor} theme={st.theme} bench={bench} />
            </div>
            <p className="pf-cap pf-muted">
              {es ? 'Un banco desde arriba, por periodo. Aqui se ve si un ano es un volumen operable o fragmentos sueltos' : 'One bench from above, by period. This is where a year is visibly one workable volume or loose fragments'} <Cite id="bai2018" />.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'production',
      label: es ? 'Produccion y NPV' : 'Production and NPV',
      content: (
        <div className="pf-split">
          <div className="pf-panel">
            <h4>{es ? 'Produccion y NPV acumulado' : 'Production and cumulative NPV'}</h4>
            <ProductionChart periods={method.periods} bound={method.bound} theme={st.theme} />
            <p className="pf-cap pf-muted">
              {es ? 'Barras de mineral y lastre por periodo, NPV acumulado en el eje derecho, y la cota certificada como referencia' : 'Ore and waste bars per period, cumulative NPV on the right axis, and the certified bound as the reference'} <Cite id="morales2015" />.
            </p>
          </div>
          <div className="pf-panel">
            <h4>{es ? 'Uso de capacidad' : 'Capacity utilisation'}</h4>
            <CapacityChart periods={method.periods} names={trace.scenario.resources.map((r) => r.name)} theme={st.theme} />
            <p className="pf-cap pf-muted">
              {es ? 'Cual restriccion limita en cada ano. Una capacidad que nunca llega a 100% no esta limitando nada.' : 'Which constraint binds in each year. A capacity that never reaches 100 percent is not limiting anything.'}
            </p>
          </div>
          <div className="pf-panel">
            <h4>{es ? 'Ley de cabeza y razon lastre-mineral' : 'Head grade and strip ratio'}</h4>
            <GradeStripChart periods={method.periods} theme={st.theme} />
            <p className="pf-cap pf-muted">
              {es ? 'El descuento deberia adelantar la alta ley. Si la ley de cabeza no baja con los anos, el plan no esta haciendo eso.' : 'Discounting should pull high grade forward. If head grade does not decline over the years, the plan is not doing that.'}
            </p>
          </div>
          <div className="pf-panel">
            <h4>{es ? 'Coherencia espacial' : 'Spatial coherence'}</h4>
            <CoherenceChart periods={method.periods} theme={st.theme} />
            <p className="pf-cap pf-muted">
              {es ? 'Componentes conexas por periodo y la fraccion en la mayor. Chicoisne et al. predicen que un plan por bloque se dispersa; esto lo mide en vez de suponerlo' : 'Connected components per period and the share in the largest. Chicoisne et al. predict a block-level schedule scatters; this measures it instead of assuming'} <Cite id="chicoisne2012" />.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'methods',
      label: es ? 'Metodos' : 'Methods',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <MethodBars rows={trace.methods.map((m) => ({ method: m.method, rung: m.rung, gapPct: m.gapPct, npv: m.npv, runtimeMs: m.runtimeMs }))} />
          <Callout variant="note" title={es ? 'Como leer esto' : 'How to read this'}>
            {es
              ? 'La barra es la brecha a la MISMA cota certificada, asi que los metodos son comparables. La cota no es un plan: es el optimo exacto de la relajacion LP, y ningun plan puede superarla.'
              : 'The bar is the gap to the SAME certified bound, so the methods are comparable. The bound is not a schedule: it is the exact optimum of the LP relaxation, and no schedule can beat it.'}{' '}
            <Cite id="chicoisne2012" /> <Cite id="munoz2017" />
          </Callout>
          <div className="pf-scroll-x">
            <table className="pf-table">
              <thead>
                <tr>
                  <th>{es ? 'metodo' : 'method'}</th><th>{es ? 'peldano' : 'rung'}</th><th>NPV</th><th>{es ? 'cota' : 'bound'}</th>
                  <th>gap</th><th>ms</th><th>{es ? 'bloques' : 'blocks'}</th><th>{es ? 'notas' : 'notes'}</th>
                </tr>
              </thead>
              <tbody>
                {trace.methods.map((m) => (
                  <tr key={m.method}>
                    <td>{m.method}</td><td>{m.rung}</td><td>{fmtMoney(m.npv)}</td><td>{fmtMoney(m.bound)}</td>
                    <td>{m.gapPct.toFixed(2)}%</td><td>{m.runtimeMs.toFixed(0)}</td><td>{m.minedBlocks}</td>
                    <td style={{ textAlign: 'left' }} className="pf-cap pf-muted">{m.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ),
    },
    {
      id: 'evidence',
      label: es ? 'Controles' : 'Controls',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="pf-kpis">
            <div className="pf-kpi"><b>{trace.controls.dualitySetMatches ? 'PASS' : 'FAIL'}</b><span>{es ? 'dualidad' : 'duality'}</span></div>
            <div className="pf-kpi"><b>{trace.controls.dualityBoundError.toExponential(1)}</b><span>{es ? 'error de cota' : 'bound error'}</span></div>
            <div className="pf-kpi"><b>{trace.controls.boundGeqFeasible ? 'PASS' : 'FAIL'}</b><span>{es ? 'cota >= factible' : 'bound >= feasible'}</span></div>
            <div className="pf-kpi"><b>{trace.controls.orderInvariant ? 'PASS' : 'FAIL'}</b><span>{es ? 'invariante al orden' : 'order invariant'}</span></div>
          </div>
          <Callout variant="note" title={es ? 'Que prueban' : 'What they prove'}>
            {es
              ? 'A tasa cero con capacidad ilimitada, CPIT colapsa al pit final. El conjunto extraido debe igualar al pit exacto bloque a bloque, la cota debe igualar su valor, y ningun orden puede cambiar el resultado. Fallar aqui es un error, no un resultado.'
              : 'At rate zero with unlimited capacity, CPIT collapses to the ultimate pit. The mined set must equal the exact pit block for block, the bound must equal its value, and no ordering can change the result. A failure here is a bug, not a result.'}{' '}
            <Cite id="lerchs1965" />
          </Callout>
          {trace.contract.flags.length > 0 && (
            <div className="pf-panel">
              <h4>{es ? 'Marcas del contrato de datos' : 'Data-contract flags'}</h4>
              <ul className="pf-cap">
                {trace.contract.flags.map((f) => <li key={f.code}><code>{f.code}</code>: {f.detail}</li>)}
              </ul>
            </div>
          )}
          <div className="pf-panel">
            <h4>{es ? 'Carril' : 'Lane'}</h4>
            <p className="pf-cap">
              <span className={`pf-badge ${manifest.lane}`}>{manifest.lane}</span>{' '}
              {manifest.gate.n_blocks.toLocaleString()} {es ? 'bloques' : 'blocks'} ·{' '}
              {manifest.gate.n_arcs.toLocaleString()} {es ? 'arcos' : 'arcs'} ·{' '}
              {(manifest.gate.trace_bytes / 1024).toFixed(0)} kB ·{' '}
              {(manifest.gate.offline_ms / 1000).toFixed(1)} s {es ? 'offline' : 'offline'}
            </p>
            {manifest.gate.reasons.length > 0 && (
              <ul className="pf-cap pf-muted">{manifest.gate.reasons.map((r) => <li key={r}>{r}</li>)}</ul>
            )}
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="page-body pf-layout">
      <aside className="pf-rail">
        <div className="pf-group">
          <h4>{es ? 'Caso' : 'Case'}</h4>
          <select value={st.caseId} onChange={(e) => st.setCaseId(e.target.value)} aria-label={es ? 'Caso' : 'Case'}>
            {Object.entries(
              (st.index?.cases ?? []).reduce<Record<string, CaseIndexEntry[]>>((acc, c) => {
                (acc[c.category] ??= []).push(c); return acc;
              }, {}),
            ).map(([cat, items]) => (
              <optgroup key={cat} label={cat}>
                {items.map((c) => <option key={c.case_id} value={c.case_id}>{es ? c.title.es : c.title.en}</option>)}
              </optgroup>
            ))}
          </select>
          <p className="pf-cap pf-muted">{es ? trace.role.es : trace.role.en}</p>
          <Link to={`/focus/${st.caseId}`} className="pf-chip" data-testid="focus-entry">
            <Maximize2 size={13} style={{ verticalAlign: -2, marginRight: 4 }} />
            {es ? 'Abrir en vista enfocada' : 'Open in focus view'}
          </Link>
        </div>

        <div className="pf-group">
          <h4>{es ? 'Reloj de periodos' : 'Period clock'}</h4>
          <label className="pf-ctl">
            <span>{es ? 'periodo' : 'period'} <b>{st.cursor + 1} / {T}</b></span>
            <input type="range" min={0} max={T - 1} value={st.cursor} onChange={(e) => { st.setPlaying(false); st.setCursor(+e.target.value); }} data-testid="cursor" />
          </label>
          <div className="pf-row">
            <button className="pf-chip" onClick={() => st.setPlaying(!st.playing)} data-testid="play">
              {st.playing ? (es ? 'pausa' : 'pause') : (es ? 'reproducir' : 'play')}
            </button>
            <button className="pf-chip" onClick={() => { st.setPlaying(false); st.setCursor(0); }}>{es ? 'inicio' : 'start'}</button>
            <button className="pf-chip" onClick={() => { st.setPlaying(false); st.setCursor(T - 1); }}>{es ? 'final' : 'end'}</button>
          </div>
          <div className="pf-legend">
            {Array.from({ length: T }, (_, k) => (
              <span key={k}><i style={{ background: periodCss(k, T) }} />{k + 1}</span>
            ))}
          </div>
          <p className="pf-cap pf-muted">
            {es ? `Vida efectiva: ${lastMining} de ${T} periodos con extraccion.` : `Effective life: ${lastMining} of ${T} periods actually mine.`}
          </p>
        </div>

        <div className="pf-group">
          <h4>{es ? 'Metodo' : 'Method'}</h4>
          <select value={st.methodId} onChange={(e) => st.setMethodId(e.target.value)} aria-label={es ? 'Metodo' : 'Method'}>
            {trace.methods.map((m) => <option key={m.method} value={m.method}>{m.method} ({m.gapPct.toFixed(2)}%)</option>)}
          </select>
          <div className="pf-kpis">
            <div className="pf-kpi"><b>{fmtMoney(method.npv)}</b><span>NPV</span></div>
            <div className="pf-kpi"><b>{method.gapPct.toFixed(2)}%</b><span>gap</span></div>
            <div className="pf-kpi"><b>{fmtTonnes(p?.minedTonnes ?? 0)}</b><span>{es ? 'periodo' : 'this period'}</span></div>
            <div className="pf-kpi"><b>{(p?.largestComponentShare ?? 0 * 100).toFixed(0)}%</b><span>{es ? 'en el mayor' : 'in largest'}</span></div>
          </div>
        </div>

        <div className="pf-group">
          <h4>{es ? 'Escenario' : 'Scenario'}</h4>
          <p className="pf-cap">
            {T} {es ? 'periodos' : 'periods'} · {es ? 'tasa' : 'rate'} {(trace.scenario.discountRate * 100).toFixed(0)}%
            {trace.scenario.declared && <> · <span className="pf-badge">{es ? 'escenario declarado' : 'declared scenario'}</span></>}
          </p>
          {trace.scenario.resources.map((r) => (
            <p key={r.id} className="pf-cap pf-muted">{r.name}: {fmtTonnes(r.limitPerPeriod[0])} / {es ? 'periodo' : 'period'}</p>
          ))}
          {trace.published.best_known_gap_pct != null && (
            <p className="pf-cap">
              {es ? 'Brecha publicada mejor conocida' : 'Published best-known gap'}: <b>{trace.published.best_known_gap_pct}%</b>
            </p>
          )}
        </div>
      </aside>

      <section className="pf-main">
        <Tabs tabs={tabs} ariaLabel={es ? 'Vistas' : 'Views'} />
      </section>
    </div>
  );
}
