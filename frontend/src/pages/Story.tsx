import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { Callout, Scene3DFrame, SceneCallouts, StoryFrame, type StoryStep } from '@fasl-work/caos-app-shell';
import { dec, fmtInt, fmtMoney, fmtTonnes, resourceLabel } from '../lib/artifacts.ts';
import { stageLabel, useCase } from '../lib/useCase.ts';
import { ProductionChart } from '../viz/Charts.tsx';
import { ScheduleView3D } from '../viz/ScheduleView3D.tsx';
import { largestOverrun } from '../lib/feasibility.ts';
import { EngineText } from '../lib/EngineText.tsx';
import { resolveBenchLevel, resolveStorySelection, resolveStoryStep } from '../lib/storySelection.ts';

const StableProductionChart = memo(ProductionChart);
const StableScheduleView3D = memo(ScheduleView3D);

function anchorInDrawing(anchor: { x: number; y: number }, band: number, stageHeight: number) {
  if (!(stageHeight > 0) || !(band > 0) || band >= stageHeight) return anchor;
  return { x: anchor.x, y: (band + anchor.y * (stageHeight - band)) / stageHeight };
}

/** Keep the shared scene/chart, callouts and linked controls mounted across StoryFrame's keyed steps. */
function StoryStagePortal({ activeStep, children }: { activeStep: string; children: ReactNode }) {
  const parking = useRef<HTMLDivElement>(null);
  const [portalHost] = useState(() => {
    const host = document.createElement('div');
    host.className = 'pf-story-stage-portal';
    host.dataset.storyStageHost = '';
    return host;
  });
  useLayoutEffect(() => {
    const host = portalHost;
    const slot = document.querySelector<HTMLElement>('[data-story-stage-slot]');
    const destination = slot ?? parking.current;
    if (destination && host.parentElement !== destination) destination.appendChild(host);
  }, [activeStep, portalHost]);
  return <>
    <div ref={parking} className="pf-story-render-parking" />
    {createPortal(children, portalHost)}
  </>;
}

function PhaseFlowStoryStage({ items, className, children, overlay, onBand }: {
  items: Parameters<typeof SceneCallouts>[0]['items'];
  className: string;
  children: ReactNode;
  overlay?: (band: number, height: number) => ReactNode;
  onBand: (band: number) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [band, setBand] = useState(0);
  const [height, setHeight] = useState(0);
  useLayoutEffect(() => {
    const element = host.current;
    if (!element) return undefined;
    const measure = () => setHeight(element.clientHeight);
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const placed = useMemo(() => items.map((item) => ({
    ...item,
    anchor: anchorInDrawing(item.anchor, band, height),
  })), [items, band, height]);
  return <div ref={host} className={className}>
    <SceneCallouts items={placed} placement="header" onLayout={({ bandHeight }) => {
      setBand((previous) => previous === bandHeight ? previous : bandHeight);
      onBand(bandHeight);
    }} />
    {overlay?.(band, height)}
    <div className="pf-story-drawing" style={band > 0 ? { paddingTop: band } : undefined}>{children}</div>
  </div>;
}

export default function Story() {
  const { step } = useParams();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const caseParam = params.get('case') ?? undefined;
  // A directly opened story starts with the compact published case, so the showcase stays
  // responsive on machines without accelerated WebGL. Stories launched from the workbench keep
  // the reader's exact case, method and period in the URL.
  const st = useCase(caseParam ?? 'newman1-published');
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [selectedLinked, setSelectedLinked] = useState('blocks');
  const [storyBand, setStoryBand] = useState(0);

  useEffect(() => {
    if (caseParam && caseParam !== st.caseId) st.setCaseId(caseParam);
  }, [caseParam, st.caseId, st.setCaseId]);

  // A story URL is a complete, reproducible selection. Apply its method and period after the
  // trace arrives, while leaving defaults intact when a parameter is absent or invalid.
  useEffect(() => {
    if (!st.trace || (caseParam && st.trace.caseId !== caseParam)) return;
    const selection = resolveStorySelection(st.trace, params);
    if (selection.methodId && st.methodId !== selection.methodId) st.setMethodId(selection.methodId);
    if (selection.period != null && st.cursor !== selection.period) st.setCursor(selection.period);
  }, [st.trace, st.methodId, st.cursor, st.setMethodId, st.setCursor, caseParam, params]);

  const activeId = resolveStoryStep(step);
  // Every story step and its return link carry a reproducible workbench selection, including
  // when a reader opens a declared step directly without query parameters.
  const selectionParams = new URLSearchParams(params);
  if (st.caseId) selectionParams.set('case', st.caseId);
  if (st.methodId) selectionParams.set('method', st.methodId);
  selectionParams.set('period', String(st.cursor));
  const query = selectionParams.toString();
  const go = (id: string) => navigate(`/story/${resolveStoryStep(id)}?${query}`);
  const exit = () => navigate(`/app?${query}`);
  const setStoryCursor = (cursor: number) => {
    st.setCursor(cursor);
    const next = new URLSearchParams(params);
    next.set('period', String(cursor));
    setParams(next, { replace: true });
  };
  // uPlot rebuilds its canvas when its data identity changes. The chart cursor handler also
  // used to change identity on every story render, which needlessly rebuilt both production
  // plots while the reader changed linked selections or the scene callout band. Keep the
  // handler stable and route it through refs so it always reads the current period and URL state.
  const currentCursor = useRef(st.cursor);
  currentCursor.current = st.cursor;
  const currentSetStoryCursor = useRef(setStoryCursor);
  currentSetStoryCursor.current = setStoryCursor;
  const onStoryChartCursor = useCallback((index: number | null) => {
    if (index != null && index !== currentCursor.current) currentSetStoryCursor.current(index);
  }, []);

  const trace = st.trace;
  const manifest = st.manifest;
  const method = st.method;
  const period = method?.periods[st.cursor];
  const replayable = Boolean(trace?.blocks && method?.periodOfBlock);
  // ScheduleView3D owns a WebGL renderer whose setup effect depends on the dimensions tuple.
  // Keep the tuple referentially stable across step/cursor changes so the scene is updated in
  // place instead of disposing and rebuilding its renderer on every story render.
  const sceneDims = useMemo<[number, number, number]>(() => [
    trace?.instance.dims[0] ?? 1,
    trace?.instance.dims[1] ?? 1,
    trace?.instance.dims[2] ?? 1,
  ], [trace]);
  const levels = trace?.blocks ? [...new Set(trace.blocks.level)].sort((a, b) => a - b) : [];
  const chosenLevel = resolveBenchLevel(levels, selectedLevel);
  const bilingual = (en: string, es: string) => ({ en, es });

  const steps = useMemo<{ steps: StoryStep[]; stage: ReactNode | null }>(() => {
    if (!trace || !manifest || !method || !period) return { steps: [], stage: null };
    const es = st.lang === 'es';
    const benchBlocks = chosenLevel == null || !trace.blocks ? [] : trace.blocks.level.map((level, index) => ({ level, index })).filter((item) => item.level === chosenLevel).map((item) => item.index);
    const benchTonnage = trace.blocks?.tonnage ? benchBlocks.reduce((sum, index) => sum + trace.blocks!.tonnage[index], 0) : null;
    const benchGrade = benchBlocks.length && trace.blocks?.grade ? benchBlocks.reduce((sum, index) => sum + trace.blocks!.grade[index], 0) / benchBlocks.length : null;
    const benchScheduled = benchBlocks.filter((index) => (method.periodOfBlock?.[index] ?? -1) >= 0).length;
    const source = bilingual(`Case manifest ${manifest.case_id}`, `Manifiesto del caso ${manifest.case_id}`);
    const traceSource = bilingual(`Schedule trace ${trace.caseId}, period ${st.cursor + 1}`, `Traza de planificación ${trace.caseId}, período ${st.cursor + 1}`);
    const limits = period.resourceLimit.map((limit, index) => {
      const used = period.resourceUse[index] ?? 0;
      return { name: resourceLabel(trace.scenario.resources[index]?.name ?? `r${index + 1}`), limit, used, pct: limit > 0 ? 100 * used / limit : null };
    });
    const binding = [...limits].filter((item) => item.pct != null).sort((a, b) => (b.pct ?? 0) - (a.pct ?? 0))[0];
    const dataCallouts = [
      {
        id: 'blocks', eyebrow: bilingual(es ? 'Tamaño del caso' : 'Case size', es ? 'Tamaño del caso' : 'Tamaño del caso'),
        value: fmtInt(manifest.instance.n_blocks, st.lang), unit: bilingual('blocks', 'bloques'), state: 'normal' as const,
        anchor: { x: 0.24, y: 0.48 }, source,
      },
      {
        id: 'period-tonnes', eyebrow: bilingual(es ? 'Movimiento del período' : 'Period movement', es ? 'Movimiento del período' : 'Movimiento del período'),
        value: fmtTonnes(period.minedTonnes), unit: bilingual('tonnes', 'toneladas'), state: period.blocks ? 'selected' as const : 'inactive' as const,
        anchor: { x: 0.52, y: 0.34 }, source: traceSource,
      },
      {
        id: 'capacity', eyebrow: bilingual(es ? 'Uso de capacidad' : 'Capacity use', es ? 'Uso de capacidad' : 'Uso de capacidad'),
        value: binding?.pct == null ? (es ? 'no disponible' : 'not available') : `${dec(binding.pct, 1)}%`,
        unit: bilingual(binding ? `${binding.name} limit` : 'no reported limit', binding ? `límite ${binding.name}` : 'sin límite informado'),
        state: (binding?.pct != null && binding.pct > 100 ? 'warning' : 'normal') as 'warning' | 'normal',
        anchor: { x: 0.76, y: 0.58 }, source: traceSource,
      },
    ];
    const label = stageLabel(trace, method, st.cursor, st.lang);
    const linkedMarkers = [
      { id: 'blocks', label: bilingual('Case blocks', 'Bloques del caso'), x: 24, y: 48 },
      // Aggregate-only cases use an interactive production chart in the stage. Put this linked
      // target in the chart's clear right margin so it cannot intercept plot input or cover the
      // period legend; the scientific callout remains anchored to the plotted value above.
      { id: 'period-tonnes', label: bilingual('Period movement', 'Movimiento del período'), x: replayable ? 52 : 94, y: replayable ? 34 : 58 },
      { id: 'capacity', label: bilingual('Capacity use', 'Uso de capacidad'), x: 76, y: 58 },
    ];
    const linkMarkers = (band = 0, height = 0) => <div className="pf-story-links" aria-label={es ? 'Objetos vinculados de la escena' : 'Linked scene objects'}>
      {linkedMarkers.map((item, index) => <button
        key={item.id}
        type="button"
        className={`pf-story-link${selectedLinked === item.id ? ' is-selected' : ''}`}
        style={{ left: `${item.x}%`, top: `${anchorInDrawing({ x: item.x / 100, y: item.y / 100 }, band, height).y * 100}%` }}
        data-linked-view="scene"
        data-linked-id={item.id}
        data-linked-selected={selectedLinked === item.id ? 'true' : 'false'}
        aria-label={es ? item.label.es : item.label.en}
        aria-pressed={selectedLinked === item.id}
        onClick={() => setSelectedLinked(item.id)}
      >{index + 1}</button>)}
      <span className="pf-story-cursor" data-linked-cursor-marker data-linked-cursor-position={st.cursor} aria-hidden="true">
        {es ? `Período ${st.cursor + 1}` : `Period ${st.cursor + 1}`}
      </span>
    </div>;
    const stage = <Scene3DFrame
      label={es ? `Rajo programado, ${trace.title.es}, ${method.method}, período ${st.cursor + 1}` : `Scheduled pit, ${trace.title.en}, ${method.method}, period ${st.cursor + 1}`}
      legendLabel={es ? 'Evidencia del período' : 'Period evidence'}
      status={!replayable ? <span>{es ? 'Solo agregados publicados; la geometría por bloque no está disponible para redistribución.' : 'Published aggregates only; block geometry is unavailable for redistribution.'}</span> : undefined}
      legend={<span>{label.title}: {label.sub}{chosenLevel != null ? ` · ${es ? 'banco resaltado en ámbar' : 'amber highlight marks selected bench'}` : ''}</span>}
    >
      <PhaseFlowStoryStage items={dataCallouts} className={replayable ? 'pf-story-stage' : 'pf-story-aggregate'} overlay={linkMarkers} onBand={setStoryBand}>
        {replayable
          ? <StableScheduleView3D x={trace.blocks!.x} y={trace.blocks!.y} level={trace.blocks!.level} grade={trace.blocks!.grade}
            inPit={trace.blocks!.inPit} periodOfBlock={method.periodOfBlock!} dims={sceneDims}
            nPeriods={trace.scenario.periods} cursor={st.cursor} theme={st.theme} lang={st.lang} highlightLevel={chosenLevel} />
          : <>
            <StableProductionChart periods={method.periods} bound={method.bound} theme={st.theme} height={360} />
            <p className="pf-cap pf-muted">{manifest.instance.n_blocks.toLocaleString(st.lang)} {es ? 'bloques declarados; los datos por bloque no se redistribuyen.' : 'declared blocks; block-level data is not redistributed.'} {manifest.instance.n_blocks ? manifest.engine.oreblocks ?? manifest.engine.source ?? '' : ''}</p>
          </>}
      </PhaseFlowStoryStage>
    </Scene3DFrame>;

    const selectedLabel = linkedMarkers.find((item) => item.id === selectedLinked) ?? linkedMarkers[0];
    const selectedValue = selectedLinked === 'blocks'
      ? fmtInt(manifest.instance.n_blocks, st.lang)
      : selectedLinked === 'period-tonnes'
        ? fmtTonnes(period.minedTonnes)
        : binding?.pct == null ? (es ? 'no disponible' : 'not available') : `${dec(binding.pct, 1)}%`;
    const panel = (title: string, body: ReactNode) => <section className="pf-panel pf-story-panel"><h2>{title}</h2>
      <section className="pf-story-linked" aria-label={es ? 'Explorador de datos vinculados' : 'Linked data explorer'}>
        <h3>{es ? 'Explorar los datos de la escena' : 'Explore the scene data'}</h3>
        <div className="pf-story-linked-list">
          {linkedMarkers.map((item) => <button
            key={item.id}
            type="button"
            data-linked-view="panel"
            data-linked-id={item.id}
            data-linked-selected={selectedLinked === item.id ? 'true' : 'false'}
            aria-pressed={selectedLinked === item.id}
            onClick={() => setSelectedLinked(item.id)}
          >{es ? item.label.es : item.label.en}</button>)}
        </div>
        <p className="pf-story-linked-value"><strong>{es ? selectedLabel.label.es : selectedLabel.label.en}:</strong> {selectedValue}</p>
        <label className="pf-story-scrubber">
          <span>{es ? `Período ${st.cursor + 1} de ${method.periods.length}` : `Period ${st.cursor + 1} of ${method.periods.length}`}</span>
          <input type="range" min={0} max={Math.max(0, method.periods.length - 1)} step={1} value={st.cursor}
            aria-label={es ? 'Período de la escena y el gráfico' : 'Scene and chart period'} data-linked-cursor
            onChange={(event) => setStoryCursor(Number(event.target.value))} />
        </label>
      </section>
      {body}
      <div className="pf-story-chart">
        <StableProductionChart periods={method.periods} bound={method.bound} theme={st.theme} height={170}
          onCursor={onStoryChartCursor} />
        <span className="pf-story-chart-cursor" data-linked-cursor-marker data-linked-cursor-position={st.cursor}
          aria-hidden="true" style={{ left: `calc(10% + ${method.periods.length > 1 ? (st.cursor / (method.periods.length - 1)) * 80 : 0}%)` }} />
      </div>
    </section>;
    const dataHeadline = `${fmtInt(manifest.instance.n_blocks, st.lang)} ${es ? 'bloques' : 'blocks'} · ${fmtMoney(method.npv)}`;
    const methodHeadline = `${method.method} · ${fmtMoney(method.npv)}`;
    const capHeadline = binding?.pct == null
      ? (es ? 'Sin límite de recurso declarado' : 'No resource limit reported')
      : `${dec(binding.pct, 1)}% ${es ? 'de' : 'of'} ${binding.name}`;
    const compareRows = trace.methods.filter((candidate) => candidate.rung !== 'beyond' && !candidate.method.startsWith('destination-'));
    const best = compareRows.reduce((a, b) => b.npv > a.npv ? b : a, compareRows[0] ?? method);
    const steps: StoryStep[] = [
      {
        id: 'deposit', number: 1, verb: bilingual('Read the case', 'Leer el caso'), headline: bilingual(dataHeadline, `${fmtInt(manifest.instance.n_blocks, st.lang)} bloques · ${fmtMoney(method.npv)}`),
        summary: bilingual(`${trace.title.en}; ${fmtInt(method.minedBlocks, st.lang)} blocks scheduled. ${manifest.real_or_synthetic === 'synthetic' ? 'Redistributable synthetic geometry.' : 'Published aggregates only.'}`, `${trace.title.es}; ${fmtInt(method.minedBlocks, st.lang)} bloques programados. ${manifest.real_or_synthetic === 'synthetic' ? 'Geometría sintética redistribuible.' : 'Solo agregados publicados.'}`),
        href: `/story/deposit${query ? `?${query}` : ''}`, accent: 1, stage,
        panel: panel(es ? 'Contrato del caso y banco' : 'Case contract and bench', <><p>{es ? trace.role.es : trace.role.en}</p><dl><dt>{es ? 'Procedencia' : 'Provenance'}</dt><dd>{manifest.real_or_synthetic}</dd><dt>{es ? 'Bloques' : 'Blocks'}</dt><dd>{fmtInt(manifest.instance.n_blocks, st.lang)}</dd><dt>{es ? 'Arcos de precedencia' : 'Precedence arcs'}</dt><dd>{fmtInt(manifest.instance.n_precedence_arcs, st.lang)}</dd><dt>{es ? 'Licencia' : 'Licence'}</dt><dd>{trace.instance.licence}</dd></dl>{replayable && <label className="pf-ctl"><span>{es ? 'Banco' : 'Bench'}</span><select aria-label={es ? 'Banco seleccionado' : 'Selected bench'} value={chosenLevel ?? ''} onChange={(event) => setSelectedLevel(event.target.value === '' ? null : Number(event.target.value))}><option value="">{es ? 'Sin selección' : 'No selection'}</option>{levels.map((level) => <option key={level} value={level}>{es ? `Nivel ${level}` : `Level ${level}`}</option>)}</select></label>}{chosenLevel != null && <dl><dt>{es ? 'Cota del banco' : 'Bench level'}</dt><dd>{chosenLevel}</dd><dt>{es ? 'Bloques del banco' : 'Bench blocks'}</dt><dd>{benchBlocks.length}</dd><dt>{es ? 'Programados' : 'Scheduled'}</dt><dd>{benchScheduled}</dd><dt>{es ? 'Tonnage total' : 'Total tonnage'}</dt><dd>{benchTonnage == null ? (es ? 'no disponible' : 'not available') : fmtTonnes(benchTonnage)}</dd><dt>{es ? 'Ley media' : 'Mean grade'}</dt><dd>{benchGrade == null ? (es ? 'no disponible' : 'not available') : dec(benchGrade, 3)}</dd></dl>}<p>{es ? 'La precedencia exige retirar los bloques predecesores de cotas superiores antes de extraer este banco; el nivel seleccionado se resalta en la escena.' : 'Precedence requires removing predecessor blocks on higher levels before mining this bench; the selected level is highlighted in the scene.'}</p><Callout variant="note" title={es ? 'Alcance del dato' : 'Data scope'}>{es ? 'La escena utiliza únicamente geometría presente en el contrato redistribuible.' : 'The scene uses only geometry present in the redistributable contract.'}</Callout></>),
      },
      {
        id: 'method', number: 2, verb: bilingual('Follow the method', 'Seguir el método'), headline: bilingual(methodHeadline, `${method.method} · ${fmtMoney(method.npv)}`),
        summary: bilingual(`${method.method} reports ${fmtMoney(method.npv)}; measured runtime ${dec(method.runtimeMs / 1000, 2)} s.`, `${method.method} informa ${fmtMoney(method.npv)}; tiempo medido ${dec(method.runtimeMs / 1000, 2)} s.`),
        href: `/story/method${query ? `?${query}` : ''}`, accent: 2, stage,
        panel: panel(es ? 'Ejecución seleccionada' : 'Selected run', <><p>{es ? 'Método' : 'Method'}: <strong>{method.method}</strong></p><p>{es ? 'Valor presente neto' : 'Net present value'}: <strong>{fmtMoney(method.npv)}</strong></p><p>{es ? 'Tiempo medido' : 'Measured runtime'}: <strong>{dec(method.runtimeMs / 1000, 2)} s</strong></p><p>{es ? 'Notas del artefacto' : 'Artifact notes'}: <EngineText text={method.notes} lang={es ? 'es' : 'en'} /></p><p>{es ? 'Períodos con extracción' : 'Periods with mining'}: {method.periods.filter((row) => row.blocks > 0).length} / {method.periods.length}</p><Callout variant="note" title={es ? 'Resultado observado' : 'Observed result'}>{es ? 'Esta vista lee el plan y sus métricas desde la traza versionada del caso.' : 'This view reads the schedule and its metrics from the versioned case trace.'}</Callout></>),
      },
      {
        id: 'constraints', number: 3, verb: bilingual('Inspect constraints', 'Revisar restricciones'), headline: bilingual(capHeadline, capHeadline),
        summary: bilingual(`Period ${st.cursor + 1}: ${fmtTonnes(period.minedTonnes)}, ${period.blocks} blocks and ${period.components} connected components.`, `Período ${st.cursor + 1}: ${fmtTonnes(period.minedTonnes)}, ${period.blocks} bloques y ${period.components} componentes conexas.`),
        href: `/story/constraints${query ? `?${query}` : ''}`, accent: 3, stage,
        panel: panel(es ? `Período ${st.cursor + 1} · capacidades` : `Period ${st.cursor + 1} · capacities`, <><p>{es ? 'Toneladas movidas' : 'Tonnes moved'}: <strong>{fmtTonnes(period.minedTonnes)}</strong></p><p>{es ? 'Bloques' : 'Blocks'}: <strong>{period.blocks}</strong>; {es ? 'componentes conexas' : 'connected components'}: <strong>{period.components}</strong>.</p><ul>{limits.map((item) => <li key={item.name}>{item.name}: {fmtInt(item.used, st.lang)} / {fmtInt(item.limit, st.lang)} {es ? 'unidades de recurso' : 'resource units'} {item.pct == null ? (es ? '(sin dato)' : '(n/a)') : `(${dec(item.pct, 1)}%)`}</li>)}</ul><p>{es ? 'La serie de producción y el color de la escena usan el mismo cursor y la misma traza.' : 'The production series and scene colours use the same cursor and schedule trace.'}</p></>),
      },
      {
        id: 'compare', number: 4, verb: bilingual('Compare schedules', 'Comparar planes'), headline: bilingual(`${fmtMoney(best.npv)} · ${best.method}`, `${fmtMoney(best.npv)} · ${best.method}`),
        summary: bilingual(`${best.method} leads ${compareRows.length} schedules for this case at ${fmtMoney(best.npv)}.`, `${best.method} lidera ${compareRows.length} planes de este caso con ${fmtMoney(best.npv)}.`),
        href: `/story/compare${query ? `?${query}` : ''}`, accent: 4, stage,
        panel: panel(es ? 'Planes medidos en el mismo caso' : 'Schedules measured on the same case', <><table className="pf-story-table"><thead><tr><th>{es ? 'Método' : 'Method'}</th><th>NPV</th><th>{es ? 'Cota correspondiente' : 'Matching bound'}</th><th>{es ? 'Factibilidad' : 'Feasibility'}</th></tr></thead><tbody>{compareRows.map((candidate) => { const overrun = largestOverrun(candidate.periods); return <tr key={candidate.method} aria-current={candidate.method === method.method ? 'true' : undefined}><th>{candidate.method}</th><td>{fmtMoney(candidate.npv)}</td><td>{fmtMoney(candidate.bound)}</td><td>{overrun ? (es ? `Exceso ${dec(overrun.pct, 1)}%` : `${dec(overrun.pct, 1)}% over capacity`) : (es ? 'Factible' : 'Feasible')}</td></tr>; })}</tbody></table><p>{es ? 'Cada plan usa la cota registrada para su método; solo se comparan resultados del mismo problema y unidades.' : 'Each schedule uses the bound recorded for its method; only results from the same problem and units are compared.'}</p></>),
      },
    ];
    return { steps, stage };
  }, [trace, manifest, method, period, st.lang, st.cursor, st.setCursor, st.theme, query, selectedLevel, selectedLinked]);

  if (st.error) return <p role="alert">{st.error}</p>;
  if (st.loading || !trace || !manifest || !method || !steps.steps.length || !steps.stage) return <p role="status">{st.lang === 'es' ? 'Cargando el caso…' : 'Loading case…'}</p>;
  const storySteps = steps.steps.map((item) => ({ ...item, stage: <div className="pf-story-stage-slot" data-story-stage-slot="" /> }));
  return <>
    <StoryStagePortal activeStep={activeId}>{steps.stage}</StoryStagePortal>
    <StoryFrame steps={storySteps} activeId={activeId} mobileStageMinHeight={Math.min(900, Math.max(620, Math.round(storyBand + 490)))} onStepChange={go} onExit={exit}
      labels={{ steps: bilingual('Case story', 'Recorrido del caso'), previous: bilingual('Previous', 'Anterior'), next: bilingual('Next', 'Siguiente'), play: bilingual('Play', 'Reproducir'), pause: bilingual('Pause', 'Pausar'), exit: bilingual('Return to the workbench', 'Volver al espacio de trabajo') }} />
  </>;
}
