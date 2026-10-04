// The App route: land on the tool. One selected case, the stage, the drawings a planner reads, and
// the numbers that say how far this plan is from the certified bound.

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Maximize2 } from 'lucide-react';
import { Callout, Cite, Tabs } from '@fasl-work/caos-app-shell';
import { fmtInt, fmtMoney, fmtTonnes, dec, exp, overrunText, resourceLabel } from '../lib/artifacts.ts';
import { largestOverrun } from '../lib/feasibility.ts';
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
import { EngineText } from '../lib/EngineText.tsx';

export default function Tool() {
  const st = useCase();
  const [mode, setMode] = useState<StageMode>('schedule');
  // null means "not chosen yet", so the defaults can come from the DATA once it lands. Starting both
  // at zero put the profile on the outermost slice and the bench plan on the deepest bench, which is
  // entirely outside the pit: the panel drew a correct and completely empty rectangle.
  const [northing, setNorthing] = useState<number | null>(null);
  const [bench, setBench] = useState<number | null>(null);
  // Static scenario facts begin folded in the viewport-locked workbench, so all actions can fit
  // without rail scrolling. They begin open in the vertically scrolling phone/tablet layout.
  const [scenarioOpen, setScenarioOpen] = useState(() => window.matchMedia('(max-width: 900px)').matches);
  useEffect(() => {
    const stacked = window.matchMedia('(max-width: 900px)');
    const resize = () => setScenarioOpen(stacked.matches);
    stacked.addEventListener('change', resize);
    return () => stacked.removeEventListener('change', resize);
  }, []);
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
  // The baked controls in older releases included the PCPSP and operability
  // rows in this envelope. Derive the displayed range from comparable CPIT
  // schedules so a stale artifact cannot repeat that misleading comparison.
  const comparableGaps = trace.methods.filter((m) => m.rung !== 'beyond').map((m) => m.gapPct);
  const bestGap = comparableGaps.length ? Math.min(...comparableGaps) : null;
  const worstGap = comparableGaps.length ? Math.max(...comparableGaps) : null;
  const northingAt = northing ?? defaultNorthing;
  const benchAt = bench ?? defaultBench;
  const T = trace.scenario.periods;
  const p = method.periods[st.cursor];
  const label = stageLabel(trace, method, st.cursor, st.lang);
  const hasBlocks = Boolean(trace.blocks);
  const lastMining = [...method.periods].reverse().find((r) => r.blocks > 0)?.t ?? 0;
  // A plan that runs over a capacity has no gap: the bound prices feasible plans only. Read from the
  // record, so the label follows the data rather than the method's name (see lib/feasibility.ts).
  const resources = trace.scenario.resources;
  const overrun = largestOverrun(method.periods);
  const optionSuffix = (m: typeof method): string => {
    const over = largestOverrun(m.periods);
    if (over) return ` (${overrunText(over, resources, true)})`;
    return m.rung === 'beyond' ? '' : ` (${dec(m.gapPct, 2)}%)`;
  };

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
          <div className="pf-hud-row"><span className="pf-hud-val">{method.rung === 'beyond' ? '-' : fmtMoney(method.bound)}</span><span className="pf-hud-key">{es ? 'cota' : 'bound'}</span></div>
          {overrun ? (
            <div className="pf-hud-row pf-warn" data-testid="hud-infeasible"><span className="pf-hud-val">+{dec(overrun.pct, 1)}%</span><span className="pf-hud-key">{es ? 'sobre capacidad' : 'over capacity'}</span></div>
          ) : (
            <div className="pf-hud-row"><span className="pf-hud-val">{method.rung === 'beyond' ? '-' : `${dec(method.gapPct, 2)}%`}</span><span className="pf-hud-key">{es ? 'brecha' : 'gap'}</span></div>
          )}
          <div className="pf-hud-row"><span className="pf-hud-val">{p?.components ?? 0}</span><span className="pf-hud-key">{es ? 'fragmentos' : 'components'}</span></div>
        </div>
      </div>
    </div>
  ) : (
    <Callout variant="note" title={es ? 'Sin replay 3D para esta instancia' : 'No 3D replay for this instance'}>
      {es
        ? 'MineLib concede descarga académica y no redistribución, así que ningún plan por bloque de una instancia publicada entra en este repositorio. Este caso muestra números y gráficos reales, no un depósito distinto disfrazado.'
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
                {m === 'schedule' ? (es ? 'paredes por año' : 'walls by year') : m === 'grade' ? (es ? 'ley' : 'grade') : (es ? 'material extraído' : 'mined material')}
              </button>
            ))}
            <span className="pf-cap pf-muted">
              {mode === 'schedule'
                ? (es ? 'Cada bloque en pie junto a uno ya extraído toma el período del vecino que lo expuso.' : 'Each standing block next to an already mined one takes the period of the neighbour that exposed it.')
                : mode === 'grade'
                  ? (es ? 'El remanente sin extraer, coloreado por ley.' : 'The unmined remainder, coloured by grade.')
                  : (es ? 'El sólido extraído. Es la vista honesta del volumen, y no es un rajo.' : 'The extracted solid. An honest view of the volume, and not a pit.')}
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
              {es ? 'Elevación contra este, con la topografía y la superficie del rajo por período. Es el dibujo que la disciplina lee' : 'Elevation against easting, with the topography and the pit surface per period. This is the drawing the discipline reads'} <Cite id="morales2015" />.
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
              {es ? 'Un banco desde arriba, por período. Aquí se ve si un año es un volumen operable o fragmentos sueltos' : 'One bench from above, by period. This is where a year is visibly one workable volume or loose fragments'} <Cite id="bai2018" />.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'production',
      label: es ? 'Producción y NPV' : 'Production and NPV',
      content: (
        <div className="pf-split pf-split--wide">
          <div className="pf-panel">
            <h4>{es ? 'Producción y NPV acumulado' : 'Production and cumulative NPV'}</h4>
            <ProductionChart periods={method.periods} bound={method.bound} theme={st.theme} />
            <p className="pf-cap pf-muted">
              {es ? 'Barras de mineral y lastre por período, NPV acumulado en el eje derecho, y la cota certificada como referencia' : 'Ore and waste bars per period, cumulative NPV on the right axis, and the certified bound as the reference'} <Cite id="morales2015" />.
            </p>
          </div>
          <div className="pf-panel">
            <h4>{es ? 'Uso de capacidad' : 'Capacity utilisation'}</h4>
            <CapacityChart periods={method.periods} names={trace.scenario.resources.map((r) => resourceLabel(r.name))} theme={st.theme} />
            <p className="pf-cap pf-muted">
              {es ? 'Qué restricción limita en cada año. Una capacidad que nunca llega a 100% no está limitando nada.' : 'Which constraint binds in each year. A capacity that never reaches 100 percent is not limiting anything.'}
            </p>
          </div>
          <div className="pf-panel">
            <h4>{trace.instance.gradeSource
              ? (es ? 'Ley de cabeza y razón lastre-mineral' : 'Head grade and strip ratio')
              : (es ? 'Razón lastre-mineral' : 'Strip ratio')}</h4>
            <GradeStripChart periods={method.periods} theme={st.theme} gradeAvailable={Boolean(trace.instance.gradeSource)} />
            <p className="pf-cap pf-muted">
              {trace.instance.gradeSource
                ? (es ? 'La ley procede del modelo de bloques o de la semilla sintética. El descuento puede adelantar mineral de mayor ley; la curva permite verificarlo.' : `Source grade: ${trace.instance.gradeSource}. Discounting can pull higher grade forward; the curve lets you check.`)
                : (es ? 'La fuente MineLib no proporciona ley por bloque para este caso. Se muestra solo la razón lastre-mineral.' : 'The MineLib source has no block grade for this case. Only strip ratio is shown.')}
            </p>
          </div>
          <div className="pf-panel">
            <h4>{es ? 'Coherencia espacial' : 'Spatial coherence'}</h4>
            <CoherenceChart periods={method.periods} theme={st.theme} />
            <p className="pf-cap pf-muted">
              {es ? 'Componentes conexas por período y la fracción en la mayor. Chicoisne et al. predicen que un plan por bloque se dispersa; esto lo mide en vez de suponerlo' : 'Connected components per period and the share in the largest. Chicoisne et al. predict a block-level schedule scatters; this measures it instead of assuming'} <Cite id="chicoisne2012" />.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'methods',
      label: es ? 'Métodos' : 'Methods',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <MethodBars rows={trace.methods.filter((m) => m.rung !== 'beyond').map((m) => ({ method: m.method, rung: m.rung, gapPct: m.gapPct, npv: m.npv, runtimeMs: m.runtimeMs }))} />
          <Callout variant="note" title={es ? 'Como leer esto' : 'How to read this'}>
            {es
              ? 'La pista es la cota certificada CPIT usada para este caso y el relleno es el NPV capturado por cada plan CPIT. Lo rayado muestra la brecha a la misma escala. La cota no es un plan: BZ aproxima el óptimo LP dentro de su tolerancia cuando converge; en otros casos puede usarse la cota más holgada del Algoritmo 4. Los resultados BEYOND aparecen en la tabla porque min-width no vuelve a imponer capacidad y destination-toposort resuelve PCPSP.'
              : 'The track is the certified CPIT bound for this case; the fill is the NPV captured by each CPIT plan, and hatching shows its gap on the same scale. The bound is not a plan: BZ approximates the LP optimum within tolerance when it converges; otherwise the looser Algorithm 4 bound may be used. BEYOND results are in the table because min-width does not re-impose capacity and destination-toposort solves PCPSP.'}{' '}
            <Cite id="chicoisne2012" /> <Cite id="munoz2017" />
          </Callout>
          <div className="pf-scroll-x">
            <table className="pf-table">
              <thead>
                <tr>
                  <th>{es ? 'método' : 'method'}</th><th>{es ? 'peldaño' : 'rung'}</th><th>NPV</th><th>{es ? 'cota' : 'bound'}</th>
                  <th>{es ? 'brecha' : 'gap'}</th><th>ms</th><th>{es ? 'bloques' : 'blocks'}</th><th>{es ? 'notas' : 'notes'}</th>
                </tr>
              </thead>
              <tbody>
                {trace.methods.map((m) => {
                  const over = largestOverrun(m.periods);
                  return (
                    <tr key={m.method} data-infeasible={over ? 'true' : undefined}>
                      <td>{m.method}</td><td>{m.rung}</td><td>{fmtMoney(m.npv)}</td><td>{m.rung === 'beyond' ? '-' : fmtMoney(m.bound)}</td>
                      <td className={over ? 'pf-warn' : undefined}>{over ? overrunText(over, resources, true) : m.rung === 'beyond' ? '-' : `${dec(m.gapPct, 2)}%`}</td><td>{dec(m.runtimeMs, 0)}</td><td>{m.minedBlocks}</td>
                      <td style={{ textAlign: 'left' }} className="pf-cap pf-muted"><EngineText text={m.notes} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ),
    },
    {
      id: 'analysis',
      label: es ? 'Análisis' : 'Analysis',
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
            <h4>{es ? 'Peldaños' : 'Rungs'}</h4>
            {Object.entries(trace.bound?.skipped_methods ?? {}).map(([name, why]) => (
              <p className="pf-cap pf-warn" key={name}>
                <strong>{name}</strong>{' '}
                {es ? 'no corrió en este caso: ' : 'did not run on this case: '}
                <EngineText text={String(why)} />
              </p>
            ))}
            {(['classical', 'sota', 'learned', 'beyond'] as const).map((rung) => {
              const rows = trace.methods.filter((m) => m.rung === rung);
              if (!rows.length) return null;
              const best = rows.reduce((a, b) => (a.npv >= b.npv ? a : b));
              return (
                <p className="pf-cap" key={rung}>
                  <b>{rung}</b>: {rows.length} {es ? 'métodos' : 'methods'}, {es ? 'mejor' : 'best'}{' '}
                  {rung === 'beyond'
                    ? <span>{es ? 'resultados con objetivos diferentes' : 'results with different objectives'}</span>
                    : <><code>{best.method}</code> {es ? 'con brecha' : 'at a gap of'} {dec(best.gapPct, 2)}%</>}
                </p>
              );
            })}
            <p className="pf-cap pf-muted">
              {es
                ? 'Los peldaños beyond no son comparables con los demás por NPV: destination-toposort resuelve otro problema (PCPSP, con el destino como decisión) y min-width es una vista de operabilidad que no re-impone la capacidad.'
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
                  <th className="wrap">{es ? 'qué afirma' : 'what it asserts'}</th>
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
                  <td className="wrap">{es ? 'diferencia simétrica de conjuntos' : 'symmetric set difference'}:{' '}
                    <b>{trace.controls.dualitySetMatches ? '0' : '\u2260 0'}</b> {es ? 'bloques' : 'blocks'}</td>
                  <td><span className={'pf-badge ' + (trace.controls.dualitySetMatches ? 'pass' : 'fail')}>{trace.controls.dualitySetMatches ? 'PASS' : 'FAIL'}</span></td>
                </tr>
                <tr>
                  <td><code>duality-value</code></td>
                  <td className="wrap">{es
                    ? 'en ese mismo límite la cota certificada iguala el valor del pit final'
                    : 'in that same limit the certified bound equals the value of the ultimate pit'}</td>
                  <td className="wrap">{es ? 'error relativo' : 'relative error'}: <b>{exp(trace.controls.dualityBoundError, 1)}</b></td>
                  <td><span className={'pf-badge ' + (trace.controls.dualityBoundError < 1e-6 ? 'pass' : 'fail')}>{trace.controls.dualityBoundError < 1e-6 ? 'PASS' : 'FAIL'}</span></td>
                </tr>
                <tr>
                  <td><code>bound-dominates</code></td>
                  <td className="wrap">{es
                    ? 'ningún plan factible supera la cota. Un plan que la supera no es un plan mejor: es una cota rota o un plan infactible'
                    : 'no feasible schedule beats the bound. A schedule that beats it is not a better schedule: it is a broken bound or an infeasible plan'}</td>
                  <td className="wrap">{es ? 'mejor brecha' : 'best gap'}: <b>{dec(trace.controls.bestGapPct, 3) ?? '-'}%</b> ({es ? 'debe ser no negativa' : 'must be non-negative'})</td>
                  <td><span className={'pf-badge ' + (trace.controls.boundGeqFeasible ? 'pass' : 'fail')}>{trace.controls.boundGeqFeasible ? 'PASS' : 'FAIL'}</span></td>
                </tr>
                <tr>
                  <td><code>order-invariance</code></td>
                  <td className="wrap">{es
                    ? 'permutar el orden de entrada de los bloques no cambia el resultado. Si lo cambiara, el motor estaría leyendo el orden del archivo como si fuera información'
                    : 'permuting the input order of the blocks does not change the result. If it did, the engine would be reading file order as though it were information'}</td>
                  <td className="wrap">{es ? 'deriva de NPV bajo permutación' : 'NPV drift under permutation'}: <b>{exp(trace.controls.orderInvarianceError ?? 0, 1)}</b></td>
                  <td><span className={'pf-badge ' + (trace.controls.orderInvariant ? 'pass' : 'fail')}>{trace.controls.orderInvariant ? 'PASS' : 'FAIL'}</span></td>
                </tr>
              </tbody>
            </table>
          </div>

          <DegeneracyCollapse />

          <div className="pf-split pf-split--wide">
            <div className="pf-panel">
              <h4>{es ? 'Brechas CPIT comparables en este caso' : 'Comparable CPIT gaps on this case'}</h4>
              <p className="pf-cap">
                {es ? 'mejor' : 'best'} <b>{dec(bestGap, 2) ?? '-'}%</b> {' · '}
                {es ? 'peor' : 'worst'} <b>{dec(worstGap, 2) ?? '-'}%</b> {' · '}
                {es ? 'dispersión' : 'spread'}{' '}
                <b>{worstGap != null && bestGap != null
                  ? dec((worstGap - bestGap), 2)
                  : '-'}%</b>
              </p>
              <p className="pf-cap pf-muted">
                {trace.caseId === 'ctrl-abundant'
                  ? (es
                    ? 'La capacidad holgada no elimina las diferencias de período con descuento positivo. Los métodos clásicos siguen por detrás del mejor plan. ctrl-degenerate, con tasa cero y un período, es el control donde las brechas sí colapsan.'
                    : 'Loose capacity does not erase timing differences with positive discounting. Classical methods still trail the best schedule. The zero-rate, one-period ctrl-degenerate case is the control whose gaps collapse.')
                  : (es
                    ? 'Solo se incluyen planes CPIT comparables. Los métodos más allá resuelven otro problema o relajan la factibilidad y quedan fuera de este rango.'
                    : 'Only comparable CPIT plans enter this range. Beyond methods solve another problem or relax feasibility and are excluded.')}
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
                  ? 'Un modelo de bloques se vuelve instancia solo si pasa el contrato de ingesta. Estos son los números con los que pasó, no los que se esperaban.'
                  : 'A block model becomes an instance only if it passes the ingestion contract. These are the numbers it passed with, not the ones that were expected.'}
              </p>
            </div>
          </div>

          {trace.contract.flags.length > 0 && (
            <div className="pf-panel">
              <h4>{es ? 'Marcas del contrato de datos' : 'Data-contract flags'}</h4>
              <p className="pf-cap pf-muted">
                {es
                  ? 'Legales pero notables: el caso se acepta y la condición viaja hasta la pantalla en vez de quedarse en un log.'
                  : 'Legal but notable: the case is accepted and the condition rides all the way to the screen instead of staying in a log.'}
              </p>
              <ul className="pf-cap">
                {trace.contract.flags.map((f) => <li key={f.code}><code>{f.code}</code>: <EngineText text={f.detail} /></li>)}
              </ul>
            </div>
          )}

          <div className="pf-panel">
            <h4>{es ? 'Carril' : 'Lane'}</h4>
            <p className="pf-cap">
              <span className={'pf-badge ' + manifest.lane}>{manifest.lane}</span>{' '}
              {fmtInt(manifest.gate.n_blocks, st.lang)} {es ? 'bloques' : 'blocks'} {' · '}
              {fmtInt(manifest.gate.n_arcs, st.lang)} {es ? 'arcos' : 'arcs'} {' · '}
              {dec((manifest.gate.trace_bytes / 1024), 0)} kB {' · '}
              {dec((manifest.gate.offline_ms / 1000), 1)} s {es ? 'offline' : 'offline'}
            </p>
            {manifest.gate.reasons.length > 0 && (
              <ul className="pf-cap pf-muted">{manifest.gate.reasons.map((r) => <li key={r}><EngineText text={r} /></li>)}</ul>
            )}
          </div>

          <Callout variant="note" title={es ? 'Por qué estos y no una suite de tests' : 'Why these and not a test suite'}>
            {es
              ? 'Un test afirma que el código hace lo que su autor creyó. Estos controles afirman algo que se sabe con independencia del código: en el límite degenerado la respuesta es el pit final, calculado por otro algoritmo. Es la única clase de verificación que sobrevive a que el autor se equivoque en los dos lados a la vez.'
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
          <h4>{es ? 'Reloj de períodos' : 'Period clock'}</h4>
          <label className="pf-ctl">
            <span>{es ? 'período' : 'period'} <b>{st.cursor + 1} / {T}</b></span>
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
            {es ? `Vida efectiva: ${lastMining} de ${T} períodos con extracción.` : `Effective life: ${lastMining} of ${T} periods actually mine.`}
          </p>
        </div>

        <div className="pf-group">
          <h4>{es ? 'Método' : 'Method'}</h4>
          <select value={st.methodId} onChange={(e) => st.setMethodId(e.target.value)} aria-label={es ? 'Método' : 'Method'}>
            {trace.methods.map((m) => (
              <option key={m.method} value={m.method}>
                {m.unreliable ? '! ' : ''}{m.method}{optionSuffix(m)}
              </option>
            ))}
          </select>
          {overrun && (
            <p className="pf-cap pf-warn" data-testid="method-infeasible">
              <strong>{overrunText(overrun, resources)}.</strong>{' '}
              {es
                ? 'Este plan no respeta la capacidad, así que no se puede ejecutar tal como se dibuja y su NPV no se compara con la cota certificada.'
                : 'This plan does not respect capacity, so it cannot be run as drawn and its NPV is not compared with the certified bound.'}
            </p>
          )}
          {/* The warning belongs WHERE THE METHOD IS CHOSEN. A worst case written on a methodology
              page is a caveat; the same fact next to the selector is a guard. And where the exact
              plan is in the same bake, the number shown is a MEASUREMENT of this case rather than a
              prediction about cases like it. */}
          {method.measuredVsExact != null && (
            <p className={`pf-cap ${method.unreliable ? 'pf-warn' : 'pf-muted'}`}>
              {method.unreliable && (
                <strong>{es ? 'Poco fiable en este caso. ' : 'Unreliable on this case. '}</strong>
              )}
              {es ? 'Medido aquí: ' : 'Measured here: '}
              <b>{dec((100 * method.measuredVsExact), 1)}%</b>{' '}
              {es
                ? 'del plan exacto que aproxima. No es una predicción: ambos peldaños están en este mismo horneado, contra la misma cota.'
                : 'of the exact plan it approximates. Not a prediction: both rungs are in this same bake, against the same bound.'}
              {method.flaggedByRule && (
                <>
                  {' '}
                  {es
                    ? 'La regla de escenario también lo marcaría (tasa de descuento alta).'
                    : 'The scenario rule would flag it too (high discount rate).'}
                </>
              )}
            </p>
          )}
          {method.measuredVsExact == null && method.unreliable && (
            <p className="pf-cap pf-warn">
              <strong>{es ? 'Poco fiable en este caso.' : 'Unreliable on this case.'}</strong>{' '}
              {es
                ? 'Sin el plan exacto en este horneado no hay guarda: la regla medida es sobre el cuerpo mineralizado y necesita una etiqueta de arquetipo que un depósito real no trae.'
                : 'Without the exact plan in this bake there is no guard: the measured rule is about the orebody and needs an archetype label a real deposit does not carry.'}
            </p>
          )}
          <div className="pf-kpis">
            <div className="pf-kpi"><b>{fmtMoney(method.npv)}</b><span>NPV</span></div>
            {overrun ? (
              <div className="pf-kpi pf-warn"><b>+{dec(overrun.pct, 1)}%</b><span>{es ? 'sobre capacidad' : 'over capacity'}</span></div>
            ) : (
              <div className="pf-kpi"><b>{method.rung === 'beyond' ? '-' : `${dec(method.gapPct, 2)}%`}</b><span>{es ? 'brecha' : 'gap'}</span></div>
            )}
            <div className="pf-kpi"><b>{fmtTonnes(p?.minedTonnes ?? 0)}</b><span>{es ? 'período' : 'this period'}</span></div>
            <div className="pf-kpi"><b>{dec((100 * (p?.largestComponentShare ?? 0)), 0)}%</b><span>{es ? 'en el mayor' : 'in largest'}</span></div>
          </div>
        </div>

        <details className="pf-group pf-scenario" open={scenarioOpen}
          onToggle={(event) => setScenarioOpen(event.currentTarget.open)}>
          <summary>{es ? 'Escenario' : 'Scenario'}</summary>
          {/* A label/value list, not a stack of paragraphs. Each of these facts used to be its own <p>
              with its own margin, which turned four short facts into 183px of rail. They are static
              context for the case, so they should read as a compact reference block and take the space
              of one. */}
          <dl className="pf-kv">
            <div><dt>{es ? 'períodos' : 'periods'}</dt><dd>{T}</dd></div>
            <div><dt>{es ? 'tasa' : 'rate'}</dt><dd>{dec((trace.scenario.discountRate * 100), 0)}%</dd></div>
            {trace.scenario.resources.map((r) => (
              <div key={r.id}>
                <dt>{r.name}</dt>
                <dd>{fmtTonnes(r.limitPerPeriod[0])}<i>/{es ? 'per' : 'per'}</i></dd>
              </div>
            ))}
            {trace.published.best_known_gap_pct != null && (
              <div>
                <dt>{es ? 'brecha publicada' : 'published gap'}</dt>
                <dd>{dec(trace.published.best_known_gap_pct, 2)}%</dd>
              </div>
            )}
          </dl>
          {trace.scenario.declared && (
            <p className="pf-cap pf-muted pf-declared">
              <span className="pf-badge">{es ? 'escenario declarado' : 'declared scenario'}</span>
            </p>
          )}
        </details>
      </aside>

      <section className="pf-main">
        <Tabs tabs={tabs} ariaLabel={es ? 'Vistas' : 'Views'} />
      </section>
    </div>
  );
}
