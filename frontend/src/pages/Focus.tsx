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

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Minimize2 } from 'lucide-react';
import { LanguageToggle, ThemeToggle } from '@fasl-work/caos-app-shell';
import { fmtMoney } from '../lib/artifacts.ts';
import { stageLabel, useCase } from '../lib/useCase.ts';
import { ScheduleView3D, type StageMode } from '../viz/ScheduleView3D.tsx';
import { periodCss } from '../viz/colormap.ts';
import { buildLiveInstance, buildPrecedence, toLiveModel } from '../engine/instance.ts';
import { solveCpit } from '../engine/cpit.ts';
import { solveUltimatePit } from '../engine/maxflow.ts';
import { scheduleCoherence } from '../engine/coherence.ts';

interface LiveOut {
  periodOfBlock: Int32Array;
  npv: number;
  bound: number;
  gapPct: number;
  ms: number;
  boundMs: number;
  solves: number;
  components: number[];
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
  const [busy, setBusy] = useState(false);
  const debounce = useRef<number | null>(null);

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
    const oreT = t.blocks ? t.blocks.tonnage.reduce((s, v, i) => s + (t.blocks!.inPit[i] && t.blocks!.value[i] > 0 ? v : 0), 0) : 0;
    setCapMill(oreT > 0 ? (perMill * t.scenario.periods) / oreT : 1);
    setLive(null);
  }, [st.trace]);

  const model = useMemo(() => (st.trace?.blocks ? toLiveModel(st.trace.blocks, st.trace.instance.dims) : null), [st.trace]);

  const resolve = useCallback(() => {
    if (!model || rate == null || capMine == null || capMill == null || periods == null) return;
    setBusy(true);
    // yield a frame so the button paint lands before a synchronous solve
    window.setTimeout(() => {
      try {
        const t0 = performance.now();
        const prec = buildPrecedence(dims[0], dims[1], dims[2], slope);
        const upl = solveUltimatePit(model.value, prec.pstart, prec.plist);
        const inst = buildLiveInstance(
          model,
          { periods, discountRate: rate, capacityFraction: [capMine, capMill], slopeDeg: slope, periodOneUndiscounted: true },
          prec,
          upl.inPit,
        );
        const out = solveCpit(inst);
        const best = out.results.reduce((a, b) => (a.npv >= b.npv ? a : b));
        const coh = scheduleCoherence(best.periodOfBlock, model.blocks.x, model.blocks.y, model.blocks.level, dims, periods);
        setLive({
          periodOfBlock: best.periodOfBlock,
          npv: best.npv,
          bound: out.bound,
          gapPct: best.gapPct,
          ms: performance.now() - t0,
          boundMs: out.boundMs,
          solves: out.relaxations.reduce((s, r) => s + r.closureSolves, 0),
          components: coh.map((c) => c.components),
        });
        if (st.cursor >= periods) st.setCursor(periods - 1);
      } finally {
        setBusy(false);
      }
    }, 0);
  }, [model, rate, capMine, capMill, periods, slope, dims, st]);

  // re-solve on a debounce, so dragging a slider does not queue a hundred solves
  useEffect(() => {
    if (!model) return;
    if (debounce.current) window.clearTimeout(debounce.current);
    debounce.current = window.setTimeout(resolve, 260);
    return () => { if (debounce.current) window.clearTimeout(debounce.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rate, capMine, capMill, periods, slope, model]);

  if (st.error) return <div className="pf-focus"><p style={{ padding: 20 }}>{st.error}</p></div>;
  if (!st.trace || !st.method) return <div className="pf-focus"><p style={{ padding: 20 }}>Loading…</p></div>;

  const { trace, method } = st;
  const T = live && periods ? periods : trace.scenario.periods;
  const periodOfBlock = live ? live.periodOfBlock : method.periodOfBlock;
  const label = stageLabel(trace, method, Math.min(st.cursor, method.periods.length - 1), st.lang);
  const npv = live ? live.npv : method.npv;
  const bound = live ? live.bound : method.bound;
  const gap = live ? live.gapPct : method.gapPct;

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
            <p>{es ? 'Esta instancia no es redistribuible, asi que no hay modelo de bloques que resolver en el navegador.' : 'This instance is not redistributable, so there is no block model to solve in the browser.'}</p>
            <p className="pf-muted pf-cap">{trace.instance.licence}</p>
          </div>
        )}

        <div className="pf-hud">
          <div className="pf-hud-label">
            <div className="pf-hud-title">{es ? trace.title.es : trace.title.en} · {label.title}</div>
            <div className="pf-hud-sub">{label.sub}</div>
          </div>
          <div className="pf-hud-grid">
            <div className="pf-hud-row"><span className="pf-hud-val">{fmtMoney(npv)}</span><span className="pf-hud-key">NPV</span></div>
            <div className="pf-hud-row"><span className="pf-hud-val">{fmtMoney(bound)}</span><span className="pf-hud-key">{es ? 'cota certificada' : 'certified bound'}</span></div>
            <div className="pf-hud-row"><span className="pf-hud-val">{gap.toFixed(2)}%</span><span className="pf-hud-key">gap</span></div>
            <div className="pf-hud-row">
              <span className="pf-hud-val">{live ? `${live.ms.toFixed(0)} ms` : (es ? 'horneado' : 'baked')}</span>
              <span className="pf-hud-key">{es ? 'resuelto' : 'solved'}</span>
            </div>
            {live && (
              <div className="pf-hud-row"><span className="pf-hud-val">{live.solves}</span><span className="pf-hud-key">{es ? 'cierres' : 'closures'}</span></div>
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
          <button className={`pf-chip${advanced ? '' : ' on'}`} onClick={() => setAdvanced(false)}>{es ? 'basico' : 'basic'}</button>
          <button className={`pf-chip${advanced ? ' on' : ''}`} onClick={() => setAdvanced(true)}>{es ? 'avanzado' : 'advanced'}</button>
          {busy && <span className="pf-cap pf-muted">{es ? 'resolviendo…' : 'solving…'}</span>}
        </div>

        <div className="pf-group">
          <h4>{es ? 'Reloj' : 'Clock'}</h4>
          <label className="pf-ctl">
            <span>{es ? 'periodo' : 'period'} <b>{Math.min(st.cursor, T - 1) + 1} / {T}</b></span>
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
          <h4>{es ? 'Economia' : 'Economics'}</h4>
          <label className="pf-ctl">
            <span>{es ? 'tasa de descuento' : 'discount rate'} <b>{((rate ?? 0) * 100).toFixed(0)}%</b></span>
            <input type="range" min={0} max={0.3} step={0.01} value={rate ?? 0} onChange={(e) => setRate(+e.target.value)} data-testid="rate" />
          </label>
          <label className="pf-ctl">
            <span>{es ? 'capacidad mina' : 'mining capacity'} <b>{((capMine ?? 1) * 100).toFixed(0)}%</b></span>
            <input type="range" min={0.3} max={2.5} step={0.05} value={capMine ?? 1} onChange={(e) => setCapMine(+e.target.value)} data-testid="cap-mine" />
          </label>
          <label className="pf-ctl">
            <span>{es ? 'capacidad planta' : 'plant capacity'} <b>{((capMill ?? 1) * 100).toFixed(0)}%</b></span>
            <input type="range" min={0.2} max={2.5} step={0.05} value={capMill ?? 1} onChange={(e) => setCapMill(+e.target.value)} />
          </label>
          {advanced && (
            <>
              <label className="pf-ctl">
                <span>{es ? 'angulo de talud' : 'slope angle'} <b>{slope}°</b></span>
                <input type="range" min={30} max={70} step={1} value={slope} onChange={(e) => setSlope(+e.target.value)} data-testid="slope" />
              </label>
              <label className="pf-ctl">
                <span>{es ? 'periodos' : 'periods'} <b>{periods ?? 0}</b></span>
                <input type="range" min={3} max={16} step={1} value={periods ?? 8} onChange={(e) => setPeriods(+e.target.value)} />
              </label>
            </>
          )}
          <p className="pf-cap pf-muted">
            {es
              ? 'Cada control vuelve a resolver el problema completo: la cota certificada por multiplicador critico y el redondeo TopoSort, sobre el mismo modelo de bloques. El angulo de talud cambia el grafo de precedencia, asi que cambia la forma del rajo, no solo su color.'
              : 'Every control re-solves the whole problem: the critical multiplier bound and the TopoSort rounding, on the same block model. The slope angle changes the precedence graph, so it changes the shape of the pit rather than only its colour.'}
          </p>
        </div>

        <div className="pf-group">
          <h4>{es ? 'Vista' : 'View'}</h4>
          <div className="pf-chips">
            {(['schedule', 'grade', 'mined'] as StageMode[]).map((m) => (
              <button key={m} className={`pf-chip${mode === m ? ' on' : ''}`} onClick={() => setMode(m)}>
                {m === 'schedule' ? (es ? 'paredes' : 'walls') : m === 'grade' ? (es ? 'ley' : 'grade') : (es ? 'extraido' : 'mined')}
              </button>
            ))}
          </div>
        </div>

        {live && (
          <div className="pf-group">
            <h4>{es ? 'Coherencia por periodo' : 'Coherence per period'}</h4>
            <p className="pf-cap pf-muted">
              {es ? 'componentes conexas' : 'connected components'}: {live.components.join(' · ')}
            </p>
          </div>
        )}

        <div className="pf-group">
          <h4>{es ? 'Procedencia' : 'Provenance'}</h4>
          <p className="pf-cap pf-muted">
            {es
              ? 'Motor: oreblocks (PyPI, MIT) offline y su puerto TypeScript en vivo. Cota: relajacion LP exacta por multiplicador critico (Chicoisne et al. 2012). Plan: heuristica TopoSort mas busqueda local por desplazamiento. La cota nunca la produce una heuristica.'
              : 'Engine: oreblocks (PyPI, MIT) offline and its TypeScript port live. Bound: exact LP relaxation by the critical multiplier algorithm (Chicoisne et al. 2012). Schedule: TopoSort heuristic plus a shift local search. The bound is never produced by a heuristic.'}
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
