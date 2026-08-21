// The charts, all uPlot, all with a value readout at the cursor.
//
// The production chart is not a design choice. Morales, Jelvez, Nancel-Penard, Marinho and Guimaraes
// (APCOM 2015) define the standard numeric presentation of a schedule and pair every table with the
// same figure: production and waste tonnage per period as bars on the left axis, cumulative NPV as a
// line on the right. Their table columns are, verbatim, "Period, Prod, Waste, Grade, Disc. value".
// PhaseFlow ships exactly that, plus the certified bound as a reference line, because a cumulative
// NPV curve with no bound on it is a number with no scale.

import { useEffect, useRef, useState } from 'react';
import uPlot from 'uplot';
import { useShellLang } from '@fasl-work/caos-app-shell';
import 'uplot/dist/uPlot.min.css';
import type { TracePeriod } from '../lib/contract.types.ts';
import { periodCss } from './colormap.ts';

function cssVar(name: string, fallback: string): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

interface PlotProps {
  data: uPlot.AlignedData;
  build: (w: number, h: number) => uPlot.Options;
  height?: number;
  testId?: string;
  onCursor?: (idx: number | null) => void;
}


/**
 * Axis and series labels follow the APP's language.
 *
 * Every one of these was a bare English string inside the uPlot options, and uPlot renders them into
 * the axes AND into the live legend under the cursor, so a reader on the Spanish site got Spanish
 * prose around a chart labelled "period", "cum NPV (M)" and "% of limit".
 */
let LANG = 'en';

function L(en: string, es: string): string {
  return LANG === 'es' ? es : en;
}

function useChartLang(): void {
  // Called from UPlotChart itself, so the module global is refreshed before any `build` callback
  // runs. Exporting a hook nobody calls is how a translation ships that never takes effect.
  LANG = useShellLang();
}

export function UPlotChart({ data, build, height = 300, testId, onCursor }: PlotProps) {
  useChartLang();
  const host = useRef<HTMLDivElement>(null);
  const plot = useRef<uPlot | null>(null);
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const w = el.clientWidth || 480;
    const opts = build(w, height);
    if (onCursor) {
      opts.hooks = {
        ...(opts.hooks ?? {}),
        setCursor: [(u: uPlot) => onCursor(u.cursor.idx ?? null)],
      };
    }
    const p = new uPlot(opts, data, el);
    plot.current = p;
    // Observe the PARENT, never `el`. uPlot draws INTO `el`, so resizing the plot changes `el`'s own
    // content box, which re-fires an observer attached to `el`, which resizes again: the chart grows
    // without limit and takes the page with it. Measured on the Profile and Plan tabs. The parent's box
    // is set by the layout and does not move when the plot inside it changes, which breaks the cycle.
    // The no-change guard is belt and braces for sub-pixel jitter.
    let lastW = el.clientWidth || w;
    const ro = new ResizeObserver(() => {
      const host = el.parentElement ?? el;
      const w2 = host.clientWidth || lastW;
      if (Math.abs(w2 - lastW) < 1) return;
      lastW = w2;
      p.setSize({ width: w2, height });
    });
    ro.observe(el.parentElement ?? el);
    return () => { ro.disconnect(); p.destroy(); plot.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, height]);
    // Focusable and labelled: a chart nobody can reach with a keyboard is a chart half the
  // audience cannot use, and uPlot draws into a div that takes no focus by default.
  return (
    <div
      ref={host}
      className="pf-chart"
      data-testid={testId}
      tabIndex={0}
      role="img"
      aria-label={testId ? testId.replace(/-/g, ' ') : 'chart'}
    />
  );
}

const baseAxes = () => {
  const fg = cssVar('--color-fg-subtle', '#8b949e');
  const grid = cssVar('--color-border', '#30363d');
  return { stroke: fg, grid: { stroke: grid, width: 1 }, ticks: { stroke: grid } };
};

/** Ore and waste per period as stacked bars, cumulative NPV as a line, the bound as a reference. */
export function ProductionChart({ periods, bound, theme, onCursor }: {
  periods: TracePeriod[]; bound: number; theme: string; onCursor?: (i: number | null) => void;
}) {
  const t = periods.map((p) => p.t);
  const ore = periods.map((p) => p.oreTonnes / 1e6);
  const waste = periods.map((p) => (p.oreTonnes + p.wasteTonnes) / 1e6);
  const npv = periods.map((p) => p.cumNpv / 1e6);
  const bnd = periods.map(() => bound / 1e6);
  const data: uPlot.AlignedData = [t, waste, ore, npv, bnd];
  return (
    <UPlotChart
      key={`prod-${theme}`}
      testId="production-chart"
      data={data}
      onCursor={onCursor}
      build={(w, h) => ({
        width: w, height: h, cursor: { drag: { x: true, y: false, uni: 20 } },
        scales: { x: { time: false }, y: {}, npv: {} },
        axes: [
          { ...baseAxes(), label: L('period', 'periodo') },
          { ...baseAxes(), label: L('Mt', 'Mt'), scale: 'y' },
          { ...baseAxes(), label: L('cum NPV (M)', 'NPV acum (M)'), scale: 'npv', side: 1 },
        ],
        series: [
          { label: L('period', 'periodo') },
          { label: 'ore + waste (Mt)', scale: 'y', fill: cssVar('--color-fg-subtle', '#8b949e') + '55', stroke: cssVar('--color-fg-subtle', '#8b949e'), paths: uPlot.paths.bars!({ size: [0.82] }) },
          { label: 'ore (Mt)', scale: 'y', fill: periodCss(0.7 * (periods.length - 1), periods.length) + 'cc', stroke: 'transparent', paths: uPlot.paths.bars!({ size: [0.82] }) },
          { label: 'cumulative NPV', scale: 'npv', stroke: cssVar('--color-accent', '#58a6ff'), width: 2.2 },
          { label: 'certified bound', scale: 'npv', stroke: cssVar('--color-warn', '#d29922'), width: 1.4, dash: [5, 4] },
        ],
        legend: { live: true },
      })}
    />
  );
}

/** Capacity utilisation per resource, with the limit drawn as the ceiling it is. */
export function CapacityChart({ periods, names, theme }: { periods: TracePeriod[]; names: string[]; theme: string }) {
  const t = periods.map((p) => p.t);
  const series: number[][] = [];
  const nRes = periods[0]?.resourceUse.length ?? 0;
  for (let r = 0; r < nRes; r++) {
    series.push(periods.map((p) => (p.resourceLimit[r] > 0 ? (100 * p.resourceUse[r]) / p.resourceLimit[r] : 0)));
  }
  const data: uPlot.AlignedData = [t, ...series] as uPlot.AlignedData;
  const colors = [cssVar('--color-accent', '#58a6ff'), cssVar('--color-warn', '#d29922'), '#8957e5'];
  return (
    <UPlotChart
      key={`cap-${theme}`}
      testId="capacity-chart"
      data={data}
      build={(w, h) => ({
        width: w, height: h,
        scales: { x: { time: false }, y: { range: [0, 105] } },
        axes: [{ ...baseAxes(), label: L('period', 'periodo') }, { ...baseAxes(), label: L('% of limit', '% del limite') }],
        series: [
          { label: L('period', 'periodo') },
          ...names.slice(0, nRes).map((n, i) => ({ label: n, stroke: colors[i % colors.length], width: 2, points: { show: true, size: 5 } })),
        ],
        legend: { live: true },
      })}
    />
  );
}

/** Spatial coherence: how many disconnected fragments each period is, and how big the largest is. */
export function CoherenceChart({ periods, theme }: { periods: TracePeriod[]; theme: string }) {
  const t = periods.map((p) => p.t);
  const comps = periods.map((p) => p.components);
  const share = periods.map((p) => 100 * p.largestComponentShare);
  const data: uPlot.AlignedData = [t, comps, share];
  return (
    <UPlotChart
      key={`coh-${theme}`}
      testId="coherence-chart"
      data={data}
      build={(w, h) => ({
        width: w, height: h,
        scales: { x: { time: false }, y: {}, pct: { range: [0, 105] } },
        axes: [
          { ...baseAxes(), label: L('period', 'periodo') },
          { ...baseAxes(), label: L('components', 'componentes'), scale: 'y' },
          { ...baseAxes(), label: L('% in largest', '% en el mayor'), scale: 'pct', side: 1 },
        ],
        series: [
          { label: L('period', 'periodo') },
          { label: 'connected components', scale: 'y', stroke: cssVar('--color-bad', '#f85149'), width: 2, points: { show: true, size: 5 } },
          { label: 'largest component share', scale: 'pct', stroke: cssVar('--color-good', '#3fb950'), width: 2, dash: [4, 3] },
        ],
        legend: { live: true },
      })}
    />
  );
}

/** Head grade and strip ratio by period: does the schedule really pull high grade forward. */
export function GradeStripChart({ periods, theme }: { periods: TracePeriod[]; theme: string }) {
  const t = periods.map((p) => p.t);
  const g = periods.map((p) => p.headGrade * 100);
  const sr = periods.map((p) => p.stripRatio);
  const data: uPlot.AlignedData = [t, g, sr];
  return (
    <UPlotChart
      key={`gs-${theme}`}
      testId="grade-strip-chart"
      data={data}
      build={(w, h) => ({
        width: w, height: h,
        scales: { x: { time: false }, g: {}, sr: {} },
        axes: [
          { ...baseAxes(), label: L('period', 'periodo') },
          { ...baseAxes(), label: L('head grade (%)', 'ley de cabeza (%)'), scale: 'g' },
          { ...baseAxes(), label: L('strip ratio', 'razon esteril:mineral'), scale: 'sr', side: 1 },
        ],
        series: [
          { label: L('period', 'periodo') },
          { label: 'head grade %', scale: 'g', stroke: cssVar('--color-accent', '#58a6ff'), width: 2, points: { show: true, size: 5 } },
          { label: 'strip ratio (waste:ore)', scale: 'sr', stroke: cssVar('--color-warn', '#d29922'), width: 2, dash: [4, 3] },
        ],
        legend: { live: true },
      })}
    />
  );
}

/** Method comparison: the gap to the certified bound, sorted, with the rung shown. */
export function MethodBars({
  rows,
}: {
  rows: { method: string; rung: string; gapPct: number; npv: number; runtimeMs: number; comparable?: boolean }[];
}) {
  const [hover, setHover] = useState<number | null>(null);
  const es = useShellLang() === 'es';

  // WHY THE BAR IS NPV AND NOT THE GAP.
  //
  // This chart used to draw `gapPct / worstGap`, so the WORST method drew the LONGEST bar. On the hero
  // case that put bench-by-bench (a 50.27 percent gap) at a nearly full track and cpitD-local-search (5.20
  // percent, the best schedule in the ladder) at a stub, which reads as the exact opposite of the result.
  //
  // The fix is not to invert the number, it is to draw the quantity that has a meaning. Every method here
  // is scored against the SAME certified upper bound, and npv/bound is exactly 1 - gap/100, so the track
  // can BE the bound: the fill is the NPV the schedule actually captured, and the empty remainder IS the
  // gap, at the same scale, on every row. Longer is better, the shortfall is visible rather than stated,
  // and the comparison is honest by construction because the ceiling is shared.
  const rungColor: Record<string, string> = {
    classical: 'var(--color-fg-subtle)', sota: 'var(--color-accent)',
    learned: '#8957e5', beyond: 'var(--color-warn)',
  };
  const rungLabel: Record<string, string> = {
    classical: es ? 'clasico' : 'classical', sota: 'SOTA',
    learned: es ? 'aprendido' : 'learned', beyond: es ? 'mas alla' : 'beyond',
  };
  const seen: string[] = [];
  rows.forEach((r) => { if (!seen.includes(r.rung)) seen.push(r.rung); });

  return (
    <div className="pf-methodbars" data-testid="method-bars">
      <div className="pf-mb-scale" aria-hidden="true">
        <span className="pf-mb-name" />
        <span className="pf-mb-track pf-mb-ruler">
          <i style={{ left: '0%' }} data-l="0" />
          <i style={{ left: '50%' }} data-l="50%" />
          <i style={{ left: '100%' }} data-l={es ? 'cota certificada' : 'certified bound'} />
        </span>
        <span className="pf-mb-val" />
        <span className="pf-mb-sub" />
      </div>

      {rows.map((r, i) => {
        const captured = Math.max(0, Math.min(100, 100 - r.gapPct));
        const off = r.comparable === false;
        return (
          <div
            key={r.method}
            className={`pf-mb-row${hover === i ? ' on' : ''}`}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            title={`${r.method} - ${(r.npv / 1e6).toFixed(1)} M, ${captured.toFixed(2)}% ${
              es ? 'de la cota certificada' : 'of the certified bound'}, ${es ? 'brecha' : 'gap'} ${r.gapPct.toFixed(2)}%`}
          >
            <span className="pf-mb-name">
              {off ? <span title={es ? 'no comparable: otro problema o una vista de operabilidad' : 'not comparable: a different problem or an operability view'}>* </span> : null}
              {r.method}
            </span>
            <span className="pf-mb-track">
              <span
                className="pf-mb-fill"
                style={{
                  width: `${captured}%`,
                  background: rungColor[r.rung] ?? 'var(--color-fg-subtle)',
                  // a bar that is not in the comparison must not read like one that is
                  opacity: off ? 0.42 : 1,
                }}
              />
              {/* the remainder of the track IS the gap, at the same scale on every row */}
              <span className="pf-mb-gap" style={{ left: `${captured}%`, width: `${100 - captured}%` }} />
            </span>
            <span className="pf-mb-val">{(r.npv / 1e6).toFixed(1)} M</span>
            <span className="pf-mb-sub">
              <b className={off ? 'off' : ''}>{r.gapPct.toFixed(2)}%</b> {es ? 'brecha' : 'gap'} · {r.runtimeMs.toFixed(0)} ms
            </span>
          </div>
        );
      })}

      <div className="pf-mb-key">
        {seen.map((g) => (
          <span key={g}><i style={{ background: rungColor[g] ?? 'var(--color-fg-subtle)' }} />{rungLabel[g] ?? g}</span>
        ))}
        <span className="pf-mb-keygap"><i />{es ? 'brecha a la cota' : 'gap to the bound'}</span>
      </div>
    </div>
  );
}
