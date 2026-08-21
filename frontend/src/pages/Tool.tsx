// The App route: land on the tool. One selected case, the stage, the drawings a planner reads, and
// the numbers that say how far this plan is from the certified bound.

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Maximize2 } from 'lucide-react';
import { Callout, Cite, Tabs } from '@fasl-work/caos-app-shell';
import { fmtInt, fmtMoney, fmtTonnes } from '../lib/artifacts.ts';
import type { CaseIndexEntry } from '../lib/contract.types.ts';
import { stageLabel, useCase } from '../lib/useCase.ts';
import { ScheduleView3D, type StageMode } from '../viz/ScheduleView3D.tsx';
import { BenchPlan, PitProfile } from '../viz/SectionViews.tsx';
import { CapacityChart, CoherenceChart, GradeStripChart, MethodBars, ProductionChart } from '../viz/Charts.tsx';
import { periodCss } from '../viz/colormap.ts';
import { BoundPanel, LearnedPanel, RiskPanel } from '../viz/Ladder.tsx';
import { DegeneracyCollapse } from '../viz/Diagrams.tsx';
import { Absent, PanelBoundary } from '../viz/PanelBoundary.tsx';
import { SensitivitySurface } from '../viz/Sensitivity.tsx';

export default function Tool() {
  const st = useCase();
  const [mode, setMode] = useState<StageMode>('schedule');
  // null means "not chosen yet", so the defaults can come from the DATA once it lands. Starting both
  // at zero put the profile on the outermost slice and the bench plan on the deepest bench, which is
  // entirely outside the pit: the panel drew a correct and completely empty rectangle.
  const [northing, setNorthing] = useState<number | null>(null);
  const [bench, setBench] = useState<number | null>(null);
  const es = st.lang === 'es';

  const dims = useMemo<[number, number, number]>(
    () => (st.trace ? [st.trace.instance.dims[0], st.trace.instance.dims[1], st.trace.instance.dims[2]] : [1, 1, 1]),
    [st.trace],
  );

  // the slice through the middle of the model, and the bench where the most rock is actually moved
  const defaultNorthing = Math.floor(dims[1] / 2);
  const defaultBench = useMemo(() => {
    const pob = st.method?.periodOfBlock;
    const lv = st.trace?.blocks?.level;
    if (!pob || !lv) return Math.max(0, dims[2] - 1);
    const perLevel = new Array<number>(dims[2]).fill(0);
    for (let b = 0; b < lv.length; b++) if (pob[b] >= 0) perLevel[lv[b]]++;
    let best = 0;
    for (let i = 1; i < perLevel.length; i++) if (perLevel[i] > perLevel[best]) best = i;
    return best;
  }, [st.method, st.trace, dims]);

  if (st.error) return <Callout variant="honest" title="Data">{st.error}</Callout>;
  if (!st.trace || !st.manifest || !st.method) return <p className="pf-muted">{es ? 'Cargando...' : 'Loading...'}</p>;

  const { trace, manifest, method } = st;
  const northingAt = northing ?? defaultNorthing;
  const benchAt = bench ?? defaultBench;
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
        lang={st.lang}
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
              <span>{es ? 'norte' : 'northing'} <b>{northingAt}</b></span>
              <input type="range" min={0} max={dims[1] - 1} value={northingAt} onChange={(e) => setNorthing(+e.target.value)} />
            </label>
            <div style={{ flex: '1 1 auto', minHeight: 220 }}>
              <PitProfile {...trace.blocks!} periodOfBlock={method.periodOfBlock!} dims={dims} nPeriods={T} cursor={st.cursor} theme={st.theme} northing={northingAt} />
            </div>
            <p className="pf-cap pf-muted">
              {es ? 'Elevacion contra este, con la topografia y la superficie del rajo por periodo. Es el dibujo que la disciplina lee' : 'Elevation against easting, with the topography and the pit surface per period. This is the drawing the discipline reads'} <Cite id="morales2015" />.
            </p>
          </div>
          <div className="pf-panel">
            <h4>{es ? 'Planta del banco' : 'Bench plan'}</h4>
            <label className="pf-ctl">
              <span>{es ? 'banco' : 'bench'} <b>{benchAt}</b></span>
              <input type="range" min={0} max={dims[2] - 1} value={benchAt} onChange={(e) => setBench(+e.target.value)} />
            </label>
            <div style={{ flex: '1 1 auto', minHeight: 220 }}>
              <BenchPlan {...trace.blocks!} periodOfBlock={method.periodOfBlock!} dims={dims} nPeriods={T} cursor={st.cursor} theme={st.theme} bench={benchAt} />
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
        <div className="pf-split pf-split--wide">
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
          <MethodBars rows={trace.methods.map((m) => ({ method: m.method, rung: m.rung, gapPct: m.gapPct, npv: m.npv, runtimeMs: m.runtimeMs, comparable: m.rung !== 'beyond' }))} />
          <Callout variant="note" title={es ? 'Como leer esto' : 'How to read this'}>
            {es
              ? 'La pista ES la cota certificada, la misma para todos los metodos de este caso, y el relleno es el NPV que el plan realmente captura. Lo rayado a la derecha es la brecha, a la misma escala en cada fila: no es un numero aparte, es lo que quedo sobre la mesa. La cota no es un plan, es el optimo exacto de la relajacion LP, y ningun plan CPIT puede superarla. Los dos peldanos BEYOND van atenuados y marcados porque no entran en esa comparacion: min-width no vuelve a imponer capacidad y destination-toposort resuelve un problema mas rico, asi que sus barras responden otra pregunta.'
              : 'The track IS the certified bound, the same one for every method on this case, and the fill is the NPV the schedule actually captured. The hatching on the right is the gap, at the same scale on every row: it is not a separate number, it is what was left on the table. The bound is not a schedule, it is the exact optimum of the LP relaxation, and no CPIT schedule can beat it. The two BEYOND rungs are drawn faded and marked, because they are not in that comparison: min-width does not re-impose capacity and destination-toposort solves a richer problem, so their bars answer a different question.'}{' '}
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
      id: 'analysis',
      label: es ? 'Analisis' : 'Analysis',
      content: (
        <div className="pf-split pf-split--wide">
          <PanelBoundary title={es ? 'Las dos cotas' : 'The two bounds'}>
            {trace.bound
              ? <BoundPanel bound={trace.bound} best={trace.methods.filter((m) => m.rung !== 'beyond').reduce((a, b) => (a.npv >= b.npv ? a : b))} es={es} />
              : <Absent title={es ? 'Las dos cotas' : 'The two bounds'} what={es ? 'la cota conjunta' : 'the joint bound'} es={es} />}
          </PanelBoundary>
          <PanelBoundary title={es ? 'El carril aprendido' : 'The learned lane'}>
            {trace.learned
              ? <LearnedPanel learned={trace.learned} methods={trace.methods} es={es} />
              : <Absent title={es ? 'El carril aprendido' : 'The learned lane'} what={es ? 'el carril aprendido' : 'the learned lane'} es={es} />}
          </PanelBoundary>
          <PanelBoundary title={es ? 'Superficie de sensibilidad' : 'Sensitivity surface'}>
            <SensitivitySurface trace={trace} theme={st.theme} es={es} />
          </PanelBoundary>
          <PanelBoundary title={es ? 'Riesgo' : 'Risk'}>
            {trace.ensemble
              ? <RiskPanel ensemble={trace.ensemble} es={es} />
              : <Absent title={es ? 'Riesgo' : 'Risk'} what={es ? 'el ensemble de incertidumbre' : 'the uncertainty ensemble'} es={es} />}
          </PanelBoundary>
          <div className="pf-panel">
            <h4>{es ? 'Peldanos' : 'Rungs'}</h4>
            {Object.entries(trace.bound?.skipped_methods ?? {}).map(([name, why]) => (
              <p className="pf-cap pf-warn" key={name}>
                <strong>{name}</strong>{' '}
                {es ? 'no corrio en este caso: ' : 'did not run on this case: '}
                {why}
              </p>
            ))}
            {(['classical', 'sota', 'learned', 'beyond'] as const).map((rung) => {
              const rows = trace.methods.filter((m) => m.rung === rung);
              if (!rows.length) return null;
              const best = rows.reduce((a, b) => (a.npv >= b.npv ? a : b));
              return (
                <p className="pf-cap" key={rung}>
                  <b>{rung}</b>: {rows.length} {es ? 'metodos' : 'methods'}, {es ? 'mejor' : 'best'}{' '}
                  <code>{best.method}</code> {es ? 'con brecha' : 'at a gap of'} {best.gapPct.toFixed(2)}%
                </p>
              );
            })}
            <p className="pf-cap pf-muted">
              {es
                ? 'Los peldanos beyond no son comparables con los demas por NPV: destination-toposort resuelve otro problema (PCPSP, con el destino como decision) y min-width es una vista de operabilidad que no re-impone la capacidad.'
                : 'The beyond rungs are not NPV-comparable with the rest: destination-toposort solves a different problem (PCPSP, with the destination as a decision) and min-width is an operability view that does not re-impose capacity.'}
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'evidence',
      label: es ? 'Controles' : 'Controls',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* A row of PASS chips is a CLAIM. This tab has to be where the claim is backed, so each
              control now states what it asserts, what was actually measured on THIS case, and only then
              the verdict. The four chips read PASS, 0.0e+0, PASS, PASS, with nothing tying the number to
              the assertion it belonged to and no way to tell what had been compared with what. */}
          <div className="pf-scroll-x">
            <table className="pf-table pf-ctrl-table">
              <thead>
                <tr>
                  <th>{es ? 'control' : 'control'}</th>
                  <th className="wrap">{es ? 'que afirma' : 'what it asserts'}</th>
                  <th className="wrap">{es ? 'medido en este caso' : 'measured on this case'}</th>
                  <th>{es ? 'veredicto' : 'verdict'}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><code>duality-set</code></td>
                  <td className="wrap">{es
                    ? 'con tasa cero y capacidad ilimitada, el conjunto que CPIT extrae es exactamente el pit final de Lerchs-Grossmann'
                    : 'at rate zero with unlimited capacity, the set CPIT mines is exactly the Lerchs-Grossmann ultimate pit'}</td>
                  <td className="wrap">{es ? 'diferencia simetrica de conjuntos' : 'symmetric set difference'}:{' '}
                    <b>{trace.controls.dualitySetMatches ? '0' : '\u2260 0'}</b> {es ? 'bloques' : 'blocks'}</td>
                  <td><span className={'pf-badge ' + (trace.controls.dualitySetMatches ? 'pass' : 'fail')}>{trace.controls.dualitySetMatches ? 'PASS' : 'FAIL'}</span></td>
                </tr>
                <tr>
                  <td><code>duality-value</code></td>
                  <td className="wrap">{es
                    ? 'en ese mismo limite la cota certificada iguala el valor del pit final'
                    : 'in that same limit the certified bound equals the value of the ultimate pit'}</td>
                  <td className="wrap">{es ? 'error relativo' : 'relative error'}: <b>{trace.controls.dualityBoundError.toExponential(1)}</b></td>
                  <td><span className={'pf-badge ' + (trace.controls.dualityBoundError < 1e-6 ? 'pass' : 'fail')}>{trace.controls.dualityBoundError < 1e-6 ? 'PASS' : 'FAIL'}</span></td>
                </tr>
                <tr>
                  <td><code>bound-dominates</code></td>
                  <td className="wrap">{es
                    ? 'ningun plan factible supera la cota. Un plan que la supera no es un plan mejor: es una cota rota o un plan infactible'
                    : 'no feasible schedule beats the bound. A schedule that beats it is not a better schedule: it is a broken bound or an infeasible plan'}</td>
                  <td className="wrap">{es ? 'mejor brecha' : 'best gap'}: <b>{trace.controls.bestGapPct?.toFixed(3) ?? '-'}%</b> ({es ? 'debe ser no negativa' : 'must be non-negative'})</td>
                  <td><span className={'pf-badge ' + (trace.controls.boundGeqFeasible ? 'pass' : 'fail')}>{trace.controls.boundGeqFeasible ? 'PASS' : 'FAIL'}</span></td>
                </tr>
                <tr>
                  <td><code>order-invariance</code></td>
                  <td className="wrap">{es
                    ? 'permutar el orden de entrada de los bloques no cambia el resultado. Si lo cambiara, el motor estaria leyendo el orden del archivo como si fuera informacion'
                    : 'permuting the input order of the blocks does not change the result. If it did, the engine would be reading file order as though it were information'}</td>
                  <td className="wrap">{es ? 'deriva de NPV bajo permutacion' : 'NPV drift under permutation'}: <b>{(trace.controls.orderInvarianceError ?? 0).toExponential(1)}</b></td>
                  <td><span className={'pf-badge ' + (trace.controls.orderInvariant ? 'pass' : 'fail')}>{trace.controls.orderInvariant ? 'PASS' : 'FAIL'}</span></td>
                </tr>
              </tbody>
            </table>
          </div>

          <DegeneracyCollapse />

          <div className="pf-split pf-split--wide">
            <div className="pf-panel">
              <h4>{es ? 'Envolvente de brechas en este caso' : 'Gap envelope on this case'}</h4>
              <p className="pf-cap">
                {es ? 'mejor' : 'best'} <b>{trace.controls.bestGapPct?.toFixed(2) ?? '-'}%</b> {' · '}
                {es ? 'peor' : 'worst'} <b>{trace.controls.worstGapPct?.toFixed(2) ?? '-'}%</b> {' · '}
                {es ? 'dispersion' : 'spread'}{' '}
                <b>{trace.controls.worstGapPct != null && trace.controls.bestGapPct != null
                  ? (trace.controls.worstGapPct - trace.controls.bestGapPct).toFixed(2)
                  : '-'}%</b>
              </p>
              <p className="pf-cap pf-muted">
                {es
                  ? 'La dispersion es un control por si misma. En ctrl-abundant la capacidad casi no limita, todos los metodos deberian encontrar casi el mismo plan y la dispersion deberia colapsar. Si no colapsa, la escalera esta midiendo su propio ruido en vez de una diferencia entre metodos.'
                  : 'The spread is a control in its own right. On ctrl-abundant capacity barely binds, every method should find nearly the same schedule and the spread should collapse. If it does not collapse, the ladder is measuring its own noise rather than a difference between methods.'}
              </p>
            </div>

            <div className="pf-panel">
              <h4>{es ? 'Hechos del contrato de datos' : 'Data-contract facts'}</h4>
              <table className="pf-table pf-facts">
                <tbody>
                  {Object.entries(trace.contract.facts ?? {}).map(([k, v]) => (
                    <tr key={k}><td><code>{k}</code></td><td>{fmtInt(Number(v), st.lang)}</td></tr>
                  ))}
                </tbody>
              </table>
              <p className="pf-cap pf-muted">
                {es
                  ? 'Un modelo de bloques se vuelve instancia solo si pasa el contrato de ingesta. Estos son los numeros con los que paso, no los que se esperaban.'
                  : 'A block model becomes an instance only if it passes the ingestion contract. These are the numbers it passed with, not the ones that were expected.'}
              </p>
            </div>
          </div>

          {trace.contract.flags.length > 0 && (
            <div className="pf-panel">
              <h4>{es ? 'Marcas del contrato de datos' : 'Data-contract flags'}</h4>
              <p className="pf-cap pf-muted">
                {es
                  ? 'Legales pero notables: el caso se acepta y la condicion viaja hasta la pantalla en vez de quedarse en un log.'
                  : 'Legal but notable: the case is accepted and the condition rides all the way to the screen instead of staying in a log.'}
              </p>
              <ul className="pf-cap">
                {trace.contract.flags.map((f) => <li key={f.code}><code>{f.code}</code>: {f.detail}</li>)}
              </ul>
            </div>
          )}

          <div className="pf-panel">
            <h4>{es ? 'Carril' : 'Lane'}</h4>
            <p className="pf-cap">
              <span className={'pf-badge ' + manifest.lane}>{manifest.lane}</span>{' '}
              {fmtInt(manifest.gate.n_blocks, st.lang)} {es ? 'bloques' : 'blocks'} {' · '}
              {fmtInt(manifest.gate.n_arcs, st.lang)} {es ? 'arcos' : 'arcs'} {' · '}
              {(manifest.gate.trace_bytes / 1024).toFixed(0)} kB {' · '}
              {(manifest.gate.offline_ms / 1000).toFixed(1)} s {es ? 'offline' : 'offline'}
            </p>
            {manifest.gate.reasons.length > 0 && (
              <ul className="pf-cap pf-muted">{manifest.gate.reasons.map((r) => <li key={r}>{r}</li>)}</ul>
            )}
          </div>

          <Callout variant="note" title={es ? 'Por que estos y no una suite de tests' : 'Why these and not a test suite'}>
            {es
              ? 'Un test afirma que el codigo hace lo que su autor creyo. Estos controles afirman algo que se sabe con independencia del codigo: en el limite degenerado la respuesta es el pit final, calculado por otro algoritmo. Es la unica clase de verificacion que sobrevive a que el autor se equivoque en los dos lados a la vez.'
              : 'A test asserts that the code does what its author believed. These controls assert something known independently of the code: in the degenerate limit the answer is the ultimate pit, computed by a different algorithm. That is the only class of check that survives the author being wrong on both sides at once.'}{' '}
            <Cite id="lerchs1965" />
          </Callout>
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
            {trace.methods.map((m) => (
              <option key={m.method} value={m.method}>
                {m.unreliable ? '! ' : ''}{m.method} ({m.gapPct.toFixed(2)}%)
              </option>
            ))}
          </select>
          {/* The warning belongs WHERE THE METHOD IS CHOSEN. A worst case written on a methodology
              page is a caveat; the same fact next to the selector is a guard. And where the exact
              plan is in the same bake, the number shown is a MEASUREMENT of this case rather than a
              prediction about cases like it. */}
          {method.measuredVsExact != null && (
            <p className={`pf-cap ${method.unreliable ? 'pf-warn' : 'pf-muted'}`}>
              {method.unreliable && (
                <strong>{es ? 'Poco fiable en este caso. ' : 'Unreliable on this case. '}</strong>
              )}
              {es ? 'Medido aqui: ' : 'Measured here: '}
              <b>{(100 * method.measuredVsExact).toFixed(1)}%</b>{' '}
              {es
                ? 'del plan exacto que aproxima. No es una prediccion: ambos peldanos estan en este mismo horneado, contra la misma cota.'
                : 'of the exact plan it approximates. Not a prediction: both rungs are in this same bake, against the same bound.'}
              {method.flaggedByRule && (
                <>
                  {' '}
                  {es
                    ? 'La regla de escenario tambien lo marcaria (tasa de descuento alta).'
                    : 'The scenario rule would flag it too (high discount rate).'}
                </>
              )}
            </p>
          )}
          {method.measuredVsExact == null && method.unreliable && (
            <p className="pf-cap pf-warn">
              <strong>{es ? 'Poco fiable en este caso.' : 'Unreliable on this case.'}</strong>{' '}
              {es
                ? 'Sin el plan exacto en este horneado no hay guarda: la regla medida es sobre el cuerpo mineralizado y necesita una etiqueta de arquetipo que un deposito real no trae.'
                : 'Without the exact plan in this bake there is no guard: the measured rule is about the orebody and needs an archetype label a real deposit does not carry.'}
            </p>
          )}
          <div className="pf-kpis">
            <div className="pf-kpi"><b>{fmtMoney(method.npv)}</b><span>NPV</span></div>
            <div className="pf-kpi"><b>{method.gapPct.toFixed(2)}%</b><span>gap</span></div>
            <div className="pf-kpi"><b>{fmtTonnes(p?.minedTonnes ?? 0)}</b><span>{es ? 'periodo' : 'this period'}</span></div>
            <div className="pf-kpi"><b>{(100 * (p?.largestComponentShare ?? 0)).toFixed(0)}%</b><span>{es ? 'en el mayor' : 'in largest'}</span></div>
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
