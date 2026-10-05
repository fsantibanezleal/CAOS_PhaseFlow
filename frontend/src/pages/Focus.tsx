// ADR-0070 focus view: one selected schedule, full viewport, and controls that genuinely re-solve.
//
// Clause 6 is the hard one: "a parameter that cannot respond live must not be presented as a live
// control; if the product's lane is a pre-baked replay, that constraint is a product defect to fix,
// not a UI detail to hide." On a scheduling product that means the discount rate, the capacities and
// the wall angle must move the ANSWER, not switch between baked chips. They do: the TypeScript
// engine in src/engine/ re-runs the critical multiplier bound and the TopoSort rounding on the block
// model the trace carries, and the HUD shows the measured solve time so the claim is checkable.
//
// Clause 8 is the one most easily faked, so: the entry control lives in the App next to the case
// selector, the return control is on the stage, both preserve the case, and the browser gate clicks
// them rather than requesting the URL.

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Minimize2 } from 'lucide-react';
import { LanguageToggle, ThemeToggle } from '@fasl-work/caos-app-shell';
import { APP_VERSION, fmtMoney, dec } from '../lib/artifacts.ts';
import { stageLabel, useCase } from '../lib/useCase.ts';
import { ScheduleView3D, type StageMode } from '../viz/ScheduleView3D.tsx';
import { periodCss } from '../viz/colormap.ts';
import { buildLiveInstance, buildPrecedence, toLiveModel } from '../engine/instance.ts';
import { solveUltimatePit } from '../engine/maxflow.ts';
import { learnedSchedule, loadExpectedTimeSurrogate, type MlpModel } from '../engine/learned.ts';
import type { LiveScenario } from '../engine/instance.ts';
import type { SolverResponse } from '../engine/solver.worker.ts';

type LiveOut = SolverResponse;

/** The learned plan for one setting: drawn at once, scored when the exact plan for the same setting lands. */
interface PreviewOut {
  id: number;
  periodOfBlock: Int32Array;
  npv: number;
  ms: number;
}

export default function Focus() {
  const { caseId } = useParams();
  const nav = useNavigate();
  const st = useCase(caseId);
  const es = st.lang === 'es';
  const [mode, setMode] = useState<StageMode>('schedule');
  const [advanced, setAdvanced] = useState(false);

  const [rate, setRate] = useState<number | null>(null);
  const [capMine, setCapMine] = useState<number | null>(null);
  const [capMill, setCapMill] = useState<number | null>(null);
  const [slope, setSlope] = useState(45);
  const [periods, setPeriods] = useState<number | null>(null);
  const [live, setLive] = useState<LiveOut | null>(null);
  const [preview, setPreview] = useState<PreviewOut | null>(null);
  const [etModel, setEtModel] = useState<MlpModel | null>(null);
  const [busy, setBusy] = useState(false);
  const debounce = useRef<number | null>(null);
  const frame = useRef<number | null>(null);
  const worker = useRef<Worker | null>(null);
  const latest = useRef(0);

  const dims = useMemo<[number, number, number]>(
    () => (st.trace ? [st.trace.instance.dims[0], st.trace.instance.dims[1], st.trace.instance.dims[2]] : [1, 1, 1]),
    [st.trace],
  );

  // seed the controls from the baked scenario, so the first live solve reproduces the baked answer
  useEffect(() => {
    if (!st.trace) return;
    setRate(st.trace.scenario.discountRate);
    setPeriods(st.trace.scenario.periods);
    const t = st.trace;
    const mined = t.blocks ? t.blocks.tonnage.reduce((s, v, i) => s + (t.blocks!.inPit[i] ? v : 0), 0) : 0;
    const perMine = t.scenario.resources[0]?.limitPerPeriod[0] ?? 0;
    const perMill = t.scenario.resources[1]?.limitPerPeriod[0] ?? 0;
    setCapMine(mined > 0 ? (perMine * t.scenario.periods) / mined : 1);
    const oreT = t.blocks ? t.blocks.processTonnage.reduce((s, v, i) => s + (t.blocks!.inPit[i] ? v : 0), 0) : 0;
    setCapMill(oreT > 0 ? (perMill * t.scenario.periods) / oreT : 1);
    setLive(null);
    setPreview(null);
  }, [st.trace]);

  const model = useMemo(() => (st.trace?.blocks ? toLiveModel(st.trace.blocks, st.trace.instance.dims) : null), [st.trace]);

  useEffect(() => {
    loadExpectedTimeSurrogate(APP_VERSION).then(setEtModel).catch(() => setEtModel(null));
  }, []);

  // the exact solver lives in a worker; it holds the block model of the current case
  useEffect(() => {
    if (!st.trace?.blocks) return;
    const w = new Worker(new URL('../engine/solver.worker.ts', import.meta.url), { type: 'module' });
    w.onmessage = (ev: MessageEvent<LiveOut>) => {
      if (ev.data.id !== latest.current) return;  // a newer setting is already on its way
      setLive(ev.data);
      setBusy(false);
    };
    w.postMessage({ type: 'load', blocks: st.trace.blocks, dims: st.trace.instance.dims });
    worker.current = w;
    return () => { w.terminate(); worker.current = null; };
  }, [st.trace]);

  // Every control change: the learned plan on the next frame (coalesced, so a drag does not queue
  // work), and the exact plan from the worker once the control has settled.
  useEffect(() => {
    if (!model || rate == null || capMine == null || capMill == null || periods == null) return;
    const id = ++latest.current;
    const scenario: LiveScenario = {
      periods, discountRate: rate, capacityFraction: [capMine, capMill], slopeDeg: slope, periodOneUndiscounted: true,
    };
    setBusy(true);
    if (frame.current) cancelAnimationFrame(frame.current);
    if (etModel) {
      frame.current = requestAnimationFrame(() => {
        const t0 = performance.now();
        const prec = buildPrecedence(dims[0], dims[1], dims[2], slope);
        const upl = solveUltimatePit(model.value, prec.pstart, prec.plist);
        const inst = buildLiveInstance(model, scenario, prec, upl.inPit);
        const { result } = learnedSchedule(inst, etModel, model.blocks, dims, scenario, upl.inPit);
        setPreview({ id, periodOfBlock: result.periodOfBlock, npv: result.npv, ms: performance.now() - t0 });
      });
    }
    if (debounce.current) window.clearTimeout(debounce.current);
    debounce.current = window.setTimeout(() => {
      worker.current?.postMessage({ type: 'solve', id, scenario });
    }, 220);
    if (st.cursor >= periods) st.setCursor(periods - 1);
    return () => { if (debounce.current) window.clearTimeout(debounce.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rate, capMine, capMill, periods, slope, model, etModel]);

  if (st.error) return <div className="pf-focus"><p style={{ padding: 20 }}>{st.error}</p></div>;
  // Per-period rows for the LIVE plan, ABOVE the early return because a hook after one is a hook
  // that is sometimes not called: React counts them per render and this route rendered "more hooks
  // than during the previous render" the moment the trace was still loading.
  //
  // The live solve replaces the plan on screen, so the sentence under the stage has to come from the
  // live plan too, its own period rows and its own horizon. Handing it the baked method left the
  // tonnage and the binding resource frozen while the NPV directly above them moved.
  const exactNow = live && live.id === latest.current ? live : null;
  const previewNow = !exactNow && preview && preview.id === latest.current ? preview : null;
  const onScreen: { periodOfBlock: Int32Array; resourceLimit?: number[][] } | null =
    exactNow ?? (previewNow ? { periodOfBlock: previewNow.periodOfBlock, resourceLimit: live?.resourceLimit } : live);
  const livePeriods = useMemo(() => {
    const tr = st.trace;
    const md = st.method;
    if (!onScreen || !tr?.blocks || !md) return null;
    const horizon = live && periods ? periods : tr.scenario.periods;
    const nRes = tr.scenario.resources.length;
    const rows = Array.from({ length: horizon }, (_, t) => ({
      t: t + 1,
      minedTonnes: 0,
      resourceUse: new Array(nRes).fill(0) as number[],
      resourceLimit: tr.scenario.resources.map((_, r) => onScreen.resourceLimit?.[r]?.[t] ?? 0),
    }));
    const ton = tr.blocks.tonnage;
    const process = tr.blocks.processTonnage;
    for (let b = 0; b < onScreen.periodOfBlock.length; b++) {
      const t = onScreen.periodOfBlock[b];
      if (t < 0 || t >= horizon) continue;
      rows[t].minedTonnes += ton[b];
      rows[t].resourceUse[0] += ton[b];
      if (nRes > 1) rows[t].resourceUse[1] += process[b];
    }
    return rows as unknown as typeof md.periods;
  }, [onScreen, periods, st.trace, st.method]);

  if (!st.trace || !st.method) return <div className="pf-focus"><p style={{ padding: 20 }}>{st.lang === 'es' ? 'Cargando...' : 'Loading...'}</p></div>;

  const { trace, method } = st;
  const T = onScreen && periods ? periods : trace.scenario.periods;
  const periodOfBlock = onScreen ? onScreen.periodOfBlock : method.periodOfBlock;
  const npv = exactNow ? exactNow.npv : previewNow ? previewNow.npv : live ? live.npv : method.npv;
  const shown = livePeriods ? ({ ...method, periods: livePeriods, npv } as typeof method) : method;
  const label = stageLabel(trace, shown, Math.min(st.cursor, shown.periods.length - 1), st.lang, T);
  const bound = exactNow ? exactNow.bound : previewNow ? Number.NaN : live ? live.bound : method.bound;
  const gap = exactNow ? exactNow.gapPct : previewNow ? Number.NaN : live ? live.gapPct : method.gapPct;
  // the learned plan scored against the exact ExTS plan of the SAME setting, and how much sooner it came
  const scored = exactNow && preview && preview.id === exactNow.id && Number.isFinite(exactNow.extsNpv) && exactNow.extsNpv > 0
    ? { share: preview.npv / exactNow.extsNpv, gap: (100 * (exactNow.bound - preview.npv)) / exactNow.bound, speedup: exactNow.ms / Math.max(1, preview.ms), ms: preview.ms }
    : null;

  return (
    <div className="pf-focus">
      <div className="pf-focus-stage">
        {trace.blocks && periodOfBlock ? (
          <ScheduleView3D
            x={trace.blocks.x}
            y={trace.blocks.y}
            level={trace.blocks.level}
            grade={trace.blocks.grade}
            inPit={trace.blocks.inPit}
            periodOfBlock={periodOfBlock}
            dims={dims}
            nPeriods={T}
            cursor={Math.min(st.cursor, T - 1)}
            mode={mode}
            theme={st.theme}
        lang={st.lang}
          />
        ) : (
          <div style={{ padding: 24 }}>
            <p>{es ? 'Esta instancia no es redistribuible, así que no hay modelo de bloques que resolver en el navegador.' : 'This instance is not redistributable, so there is no block model to solve in the browser.'}</p>
            <p className="pf-muted pf-cap">{trace.instance.licence}</p>
          </div>
        )}

        <div className="pf-hud">
          <div className="pf-hud-label">
            <div className="pf-hud-title">{es ? trace.title.es : trace.title.en} · {label.title}</div>
            <div className="pf-hud-sub">{label.sub}</div>
          </div>
          <div className="pf-hud-grid">
            <div className="pf-hud-row"><span className="pf-hud-val">{fmtMoney(npv)}</span><span className="pf-hud-key">{previewNow ? (es ? 'NPV, plan aprendido' : 'NPV, learned plan') : 'NPV'}</span></div>
            <div className="pf-hud-row"><span className="pf-hud-val">{Number.isFinite(bound) ? fmtMoney(bound) : (es ? 'calculando' : 'computing')}</span><span className="pf-hud-key">{es ? 'cota certificada' : 'certified bound'}</span></div>
            <div className="pf-hud-row"><span className="pf-hud-val">{Number.isFinite(gap) ? `${dec(gap, 2)}%` : '...'}</span><span className="pf-hud-key">{es ? 'brecha' : 'gap'}</span></div>
            <div className="pf-hud-row" data-testid="focus-solved">
              <span className="pf-hud-val">{exactNow ? `${dec(exactNow.ms, 0)} ms` : previewNow ? `${dec(previewNow.ms, 0)} ms` : (es ? 'horneado' : 'baked')}</span>
              <span className="pf-hud-key">{exactNow ? (es ? 'exacto, en paralelo' : 'exact, in a worker') : previewNow ? (es ? 'aprendido, sin LP' : 'learned, no LP') : (es ? 'resuelto' : 'solved')}</span>
            </div>
            {exactNow && (
              <div className="pf-hud-row"><span className="pf-hud-val">{exactNow.solves}</span><span className="pf-hud-key">{es ? 'cierres' : 'closures'}</span></div>
            )}
            {scored && (
              <div className="pf-hud-row" data-testid="focus-learned-score">
                <span className="pf-hud-val">{dec(100 * scored.share, 1)}%</span>
                <span className="pf-hud-key">{es ? `aprendido / ExTS, ${dec(scored.speedup, 0)}x antes` : `learned / ExTS, ${dec(scored.speedup, 0)}x sooner`}</span>
              </div>
            )}
          </div>
        </div>

        <div className="pf-focus-exit pf-row">
          <ThemeToggle />
          <LanguageToggle />
          <button className="pf-chip" data-testid="focus-return" onClick={() => nav('/')}>
            <Minimize2 size={13} style={{ verticalAlign: -2, marginRight: 4 }} />
            {es ? 'volver a la App' : 'back to the App'}
          </button>
        </div>
      </div>

      <aside className="pf-focus-rail">
        <div>
          <strong>{es ? trace.title.es : trace.title.en}</strong>
          <div className="pf-cap pf-muted">{trace.caseId}</div>
        </div>

        <div className="pf-row">
          <button className={`pf-chip${advanced ? '' : ' on'}`} onClick={() => setAdvanced(false)}>{es ? 'básico' : 'basic'}</button>
          <button className={`pf-chip${advanced ? ' on' : ''}`} onClick={() => setAdvanced(true)}>{es ? 'avanzado' : 'advanced'}</button>
          {busy && <span className="pf-cap pf-muted">{es ? 'resolviendo…' : 'solving…'}</span>}
        </div>

        <div className="pf-group">
          <h4>{es ? 'Reloj' : 'Clock'}</h4>
          <label className="pf-ctl">
            <span>{es ? 'período' : 'period'} <b>{Math.min(st.cursor, T - 1) + 1} / {T}</b></span>
            <input type="range" min={0} max={T - 1} value={Math.min(st.cursor, T - 1)} onChange={(e) => { st.setPlaying(false); st.setCursor(+e.target.value); }} data-testid="focus-cursor" />
          </label>
          <div className="pf-row">
            <button className="pf-chip" onClick={() => st.setPlaying(!st.playing)}>{st.playing ? (es ? 'pausa' : 'pause') : (es ? 'reproducir' : 'play')}</button>
            <button className="pf-chip" onClick={() => { st.setPlaying(false); st.setCursor(T - 1); }}>{es ? 'final' : 'end'}</button>
          </div>
          <div className="pf-legend">
            {Array.from({ length: T }, (_, k) => <span key={k}><i style={{ background: periodCss(k, T) }} />{k + 1}</span>)}
          </div>
        </div>

        <div className="pf-group">
          <h4>{es ? 'Economía' : 'Economics'}</h4>
          <label className="pf-ctl">
            <span>{es ? 'tasa de descuento' : 'discount rate'} <b>{dec(((rate ?? 0) * 100), 0)}%</b></span>
            <input type="range" min={0} max={0.3} step={0.01} value={rate ?? 0} onChange={(e) => setRate(+e.target.value)} data-testid="rate" />
          </label>
          <label className="pf-ctl">
            <span>{es ? 'capacidad mina' : 'mining capacity'} <b>{dec(((capMine ?? 1) * 100), 0)}%</b></span>
            <input type="range" min={0.3} max={2.5} step={0.05} value={capMine ?? 1} onChange={(e) => setCapMine(+e.target.value)} data-testid="cap-mine" />
          </label>
          {trace.scenario.resources.length > 1 && <label className="pf-ctl">
            <span>{es ? 'capacidad planta' : 'plant capacity'} <b>{dec(((capMill ?? 1) * 100), 0)}%</b></span>
            <input type="range" min={0.2} max={2.5} step={0.05} value={capMill ?? 1} onChange={(e) => setCapMill(+e.target.value)} />
          </label>}
          {advanced && (
            <>
              <label className="pf-ctl">
                <span>{es ? 'ángulo de talud' : 'slope angle'} <b>{slope}°</b></span>
                <input type="range" min={30} max={70} step={1} value={slope} onChange={(e) => setSlope(+e.target.value)} data-testid="slope" />
              </label>
              <label className="pf-ctl">
                <span>{es ? 'períodos' : 'periods'} <b>{periods ?? 0}</b></span>
                <input type="range" min={3} max={16} step={1} value={periods ?? 8} onChange={(e) => setPeriods(+e.target.value)} />
              </label>
            </>
          )}
          <p className="pf-cap pf-muted">
            {es
              ? 'Cada control vuelve a resolver el problema completo sobre el mismo modelo de bloques. El plan aprendido (tiempos esperados predichos, sin LP) aparece de inmediato; la cota certificada por multiplicador crítico y los planes TopoSort se calculan en paralelo y lo reemplazan, y el aprendido queda medido contra el plan ExTS exacto. El ángulo de talud cambia el grafo de precedencia, así que cambia la forma del rajo.'
              : 'Every control re-solves the whole problem on the same block model. The learned plan (predicted expected times, no LP) appears at once; the critical multiplier bound and the TopoSort plans are computed in parallel and replace it, and the learned plan is scored against the exact ExTS plan. The slope angle changes the precedence graph, so it changes the shape of the pit.'}
          </p>
        </div>

        <div className="pf-group">
          <h4>{es ? 'Vista' : 'View'}</h4>
          <div className="pf-chips">
            {(['schedule', 'grade', 'mined'] as StageMode[]).map((m) => (
              <button key={m} className={`pf-chip${mode === m ? ' on' : ''}`} onClick={() => setMode(m)}>
                {m === 'schedule' ? (es ? 'paredes' : 'walls') : m === 'grade' ? (es ? 'ley' : 'grade') : (es ? 'extraído' : 'mined')}
              </button>
            ))}
          </div>
        </div>

        {exactNow && (
          <div className="pf-group">
            <h4>{es ? 'Coherencia por período' : 'Coherence per period'}</h4>
            <p className="pf-cap pf-muted">
              {es ? 'componentes conexas' : 'connected components'}: {exactNow.components.join(' · ')}
            </p>
          </div>
        )}

        <div className="pf-group">
          <h4>{es ? 'Procedencia' : 'Provenance'}</h4>
          <p className="pf-cap pf-muted">
            {es
              ? 'Cota: relajación certificada por multiplicador crítico (Chicoisne et al. 2012), un recurso a la vez; con dos recursos puede ser más holgada que el óptimo LP conjunto. Plan exacto: el mejor de TopoSort codicioso, Gershon y de tiempo esperado, más búsqueda local por desplazamiento. Plan aprendido: TopoSort sobre tiempos esperados predichos, sin LP.'
              : 'Bound: certified critical-multiplier relaxation (Chicoisne et al. 2012), one resource at a time; with two resources it may be looser than the joint LP optimum. Exact plan: the best of greedy, Gershon and expected-time TopoSort, plus shift local search. Learned plan: TopoSort on predicted expected times, no LP.'}
          </p>
        </div>

        <div className="pf-group">
          <h4>{es ? 'Otros casos' : 'Other cases'}</h4>
          <div className="pf-chips">
            {(st.index?.cases ?? []).filter((c) => c.lane === 'live').map((c) => (
              <Link key={c.case_id} to={`/focus/${c.case_id}`} className={`pf-chip${c.case_id === st.caseId ? ' on' : ''}`}>
                {c.case_id}
              </Link>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
