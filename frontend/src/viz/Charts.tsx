// The charts, all uPlot, all with a value readout at the cursor.
//
// The production chart is not a design choice. Morales, Jelvez, Nancel-Penard, Marinho and Guimaraes
// (APCOM 2015) define the standard numeric presentation of a schedule and pair every table with the
// same figure: production and waste tonnage per period as bars on the left axis, cumulative NPV as a
// line on the right. Their table columns are, verbatim, "Period, Prod, Waste, Grade, Disc. value".
// PhaseFlow ships exactly that, plus the certified bound as a reference line, because a cumulative
// NPV curve with no bound on it is a number with no scale.

import { useEffect, useRef } from 'react';
import uPlot from 'uplot';
import { useShellLang } from '@fasl-work/caos-app-shell';
import 'uplot/dist/uPlot.min.css';
import type { TracePeriod } from '../lib/contract.types.ts';
import { periodCss } from './colormap.ts';
import { dec, fmtDuration, rungLabel } from '../lib/artifacts.ts';

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

export function UPlotChart({ data, build, height = 400, testId, onCursor }: PlotProps) {
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
      // The parent is observed to break the self-resizing loop, but it may include panel padding.
      // Size the plot to its own constrained host, or it can exceed the two-column panel by that
      // padding on every responsive width.
      const w2 = el.clientWidth || lastW;
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
  // Tick numbers follow the app's language too: uPlot writes 1.4, a Spanish page must read 1,4.
  const values = (_u: uPlot, splits: number[]) =>
    splits.map((v) => (v == null ? '' : LANG === 'es' ? String(+v.toFixed(6)).replace('.', ',') : String(+v.toFixed(6))));
  return { stroke: fg, grid: { stroke: grid, width: 1 }, ticks: { stroke: grid }, values };
};

/** Ore and waste per period as stacked bars, cumulative NPV as a line, the bound as a reference. */
export function ProductionChart({ periods, bound, theme, height = 400, onCursor }: {
  periods: TracePeriod[]; bound: number; theme: string; height?: number; onCursor?: (i: number | null) => void;
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
      height={height}
      onCursor={onCursor}
      build={(w, h) => ({
        width: w, height: h, cursor: { drag: { x: true, y: false, uni: 20 } },
        // Bars are lengths, so their axis starts at zero: a 0.6 floor made a 0.68 Mt year look like a
        // tenth of a 1.4 Mt year when it is half of it. The ore fill is rgba, not `rgb(...)` + 'cc':
        // that string is not a colour, and the ore bars drew as blank outlines under the waste.
        scales: { x: { time: false }, y: { range: (_u: uPlot, _min: number, max: number) => [0, max * 1.06] }, npv: { range: (_u: uPlot, _min: number, max: number) => [0, max * 1.06] } },
        axes: [
          { ...baseAxes(), label: L('period', 'período') },
          { ...baseAxes(), label: L('Mt', 'Mt'), scale: 'y' },
          { ...baseAxes(), label: L('cum NPV (M)', 'NPV acum (M)'), scale: 'npv', side: 1 },
        ],
        series: [
          { label: L('period', 'período') },
          { label: L('ore + waste (Mt)', 'mineral + lastre (Mt)'), scale: 'y', fill: cssVar('--color-fg-subtle', '#8b949e') + '55', stroke: cssVar('--color-fg-subtle', '#8b949e'), paths: uPlot.paths.bars!({ size: [0.82] }) },
          { label: L('ore (Mt)', 'mineral (Mt)'), scale: 'y', fill: periodCss(0.7 * (periods.length - 1), periods.length).replace('rgb(', 'rgba(').replace(')', ',0.8)'), stroke: 'transparent', paths: uPlot.paths.bars!({ size: [0.82] }) },
          { label: L('cumulative NPV', 'NPV acumulado'), scale: 'npv', stroke: cssVar('--color-accent', '#58a6ff'), width: 2.2 },
          { label: L('certified bound', 'cota certificada'), scale: 'npv', stroke: cssVar('--color-warn', '#d29922'), width: 1.4, dash: [5, 4] },
        ],
        legend: { live: true },
      })}
    />
  );
}

/** Capacity utilisation per resource, with the limit drawn as the ceiling it is. */
export function CapacityChart({ periods, names, theme, height = 400 }: { periods: TracePeriod[]; names: string[]; theme: string; height?: number }) {
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
      height={height}
      build={(w, h) => ({
        width: w, height: h,
        scales: { x: { time: false }, y: { range: [0, 105] } },
        axes: [{ ...baseAxes(), label: L('period', 'período') }, { ...baseAxes(), label: L('% of limit', '% del límite') }],
        series: [
          { label: L('period', 'período') },
          ...names.slice(0, nRes).map((n, i) => ({ label: n, stroke: colors[i % colors.length], width: 2, points: { show: true, size: 5 } })),
        ],
        legend: { live: true },
      })}
    />
  );
}

/** Spatial coherence: how many disconnected fragments each period is, and how big the largest is. */
export function CoherenceChart({ periods, theme, height = 400 }: { periods: TracePeriod[]; theme: string; height?: number }) {
  const t = periods.map((p) => p.t);
  const comps = periods.map((p) => p.components);
  const share = periods.map((p) => 100 * p.largestComponentShare);
  const data: uPlot.AlignedData = [t, comps, share];
  return (
    <UPlotChart
      key={`coh-${theme}`}
      testId="coherence-chart"
      data={data}
      height={height}
      build={(w, h) => ({
        width: w, height: h,
        scales: { x: { time: false }, y: {}, pct: { range: [0, 105] } },
        axes: [
          { ...baseAxes(), label: L('period', 'período') },
          { ...baseAxes(), label: L('components', 'componentes'), scale: 'y' },
          { ...baseAxes(), label: L('% in largest', '% en el mayor'), scale: 'pct', side: 1 },
        ],
        series: [
          { label: L('period', 'período') },
          { label: L('connected components', 'componentes conexos'), scale: 'y', stroke: cssVar('--color-bad', '#f85149'), width: 2, points: { show: true, size: 5 } },
          { label: L('largest component share', 'fracción en el mayor'), scale: 'pct', stroke: cssVar('--color-good', '#3fb950'), width: 2, dash: [4, 3] },
        ],
        legend: { live: true },
      })}
    />
  );
}

/** Head grade and strip ratio by period: does the schedule really pull high grade forward. */
export function GradeStripChart({ periods, theme, gradeAvailable = true, height = 400 }: { periods: TracePeriod[]; theme: string; gradeAvailable?: boolean; height?: number }) {
  const t = periods.map((p) => p.t);
  const g = periods.map((p) => p.headGrade * 100);
  const sr = periods.map((p) => p.stripRatio);
  const data: uPlot.AlignedData = gradeAvailable ? [t, g, sr] : [t, sr];
  return (
    <UPlotChart
      key={`gs-${theme}-${gradeAvailable}`}
      testId="grade-strip-chart"
      data={data}
      height={height}
      build={(w, h) => ({
        width: w, height: h,
        scales: { x: { time: false }, ...(gradeAvailable ? { g: {} } : {}), sr: {} },
        axes: [
          { ...baseAxes(), label: L('period', 'período') },
          ...(gradeAvailable ? [{ ...baseAxes(), label: L('head grade (%)', 'ley de cabeza (%)'), scale: 'g' }] : []),
          { ...baseAxes(), label: L('strip ratio', 'razón lastre:mineral'), scale: 'sr', side: 1 },
        ],
        series: [
          { label: L('period', 'período') },
          ...(gradeAvailable ? [{ label: L('head grade %', 'ley de cabeza %'), scale: 'g', stroke: cssVar('--color-accent', '#58a6ff'), width: 2, points: { show: true, size: 5 } }] : []),
          { label: L('strip ratio (waste:ore)', 'razón lastre:mineral'), scale: 'sr', stroke: cssVar('--color-warn', '#d29922'), width: 2, dash: [4, 3] },
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
  const es = useShellLang() === 'es';

  // WHY THE BAR IS NPV AND NOT THE GAP.
  //
  // This chart used to draw `gapPct / worstGap`, so the WORST method drew the LONGEST bar. On the hero
  // case that put a poor bench-by-bench schedule at a nearly full track and the strongest local
  // search schedule at a stub, which reads as the opposite of the result.
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
  const seen = [...new Set(rows.map((r) => r.rung))];
  const rowTop = 104;
  const rowHeight = 46;
  const barX = 258;
  const barWidth = 520;
  const fmtMillions = (value: number) => `${dec(value / 1e6, 1)} M`;

  return (
    <div className="pf-methodbars" data-testid="method-bars">
      <svg className="pf-method-chart" viewBox={`0 0 1000 ${Math.max(760, rowTop + rows.length * rowHeight + 92)}`} role="img"
        aria-label={es ? 'Valor neto presente capturado por método frente a la cota CPIT certificada' : 'Net present value captured by method against the certified CPIT bound'}>
        <title>{es ? 'Comparación de métodos contra una cota común' : 'Method comparison against a common bound'}</title>
        <desc>{es ? 'Cada barra muestra la fracción de la cota CPIT común alcanzada por un plan factible. El tramo rayado es la brecha; las etiquetas indican el NPV, la brecha y el tiempo.' : 'Each bar shows the share of the common CPIT bound reached by a feasible schedule. The hatched remainder is the gap; labels give NPV, gap, and runtime.'}</desc>
        <defs>
          <pattern id="pf-gap-hatch" width="7" height="7" patternTransform="rotate(35)" patternUnits="userSpaceOnUse">
            <rect width="7" height="7" fill="var(--color-surface-2)" />
            <line x1="0" y1="0" x2="0" y2="7" stroke="var(--color-fg-subtle)" strokeOpacity="0.5" strokeWidth="2" />
          </pattern>
        </defs>
        <text x="24" y="38" className="pf-mc-axis">{es ? 'MÉTODO' : 'METHOD'}</text>
        <text x={barX} y="38" className="pf-mc-axis">{es ? 'NPV COMO FRACCIÓN DE LA COTA CERTIFICADA' : 'NPV AS A SHARE OF THE CERTIFIED BOUND'}</text>
        <text x="790" y="38" className="pf-mc-axis">NPV</text>
        <text x="850" y="38" className="pf-mc-axis">{es ? 'BRECHA · TIEMPO' : 'GAP · TIME'}</text>
        {[0, 50, 100].map((pct) => {
          const x = barX + (barWidth * pct) / 100;
          return <g key={pct}><line x1={x} x2={x} y1="64" y2={rowTop + rows.length * rowHeight - 10} className="pf-mc-grid" /><text x={x} y="59" textAnchor={pct === 0 ? 'start' : pct === 100 ? 'end' : 'middle'} className="pf-mc-tick">{pct === 100 ? (es ? 'cota' : 'bound') : `${pct}%`}</text></g>;
        })}
        {rows.map((r, i) => {
          const off = r.comparable === false;
          const captured = off ? 0 : Math.max(0, Math.min(100, 100 - r.gapPct));
          const y = rowTop + i * rowHeight;
          return <g key={r.method} className="pf-mc-row">
            <title>{off ? `${r.method}: ${fmtMillions(r.npv)}, ${es ? 'no comparable con la cota CPIT' : 'not comparable with the CPIT bound'}` : `${r.method}: ${fmtMillions(r.npv)}, ${dec(r.gapPct, 2)}% ${es ? 'de brecha' : 'gap'}, ${fmtDuration(r.runtimeMs)}`}</title>
            <text x="24" y={y + 5} className="pf-mc-method">{r.method}</text>
            <rect x={barX} y={y - 12} width={barWidth} height="22" rx="5" className="pf-mc-track" />
            {!off && <>
              <rect x={barX} y={y - 12} width={barWidth * captured / 100} height="22" rx="5" fill={rungColor[r.rung] ?? 'var(--color-fg-subtle)'} />
              {captured < 100 && <rect x={barX + barWidth * captured / 100} y={y - 12} width={barWidth * (100 - captured) / 100} height="22" fill="url(#pf-gap-hatch)" />}
            </>}
            <text x="790" y={y + 5} className="pf-mc-value">{fmtMillions(r.npv)}</text>
            <text x="850" y={y + 5} className="pf-mc-value">{off ? (es ? 'no comparable' : 'not comparable') : `${dec(r.gapPct, 2)}% · ${fmtDuration(r.runtimeMs)}`}</text>
          </g>;
        })}
        {seen.map((g, i) => <g key={g} transform={`translate(${24 + i * 175} 728)`}><rect width="13" height="13" rx="3" fill={rungColor[g] ?? 'var(--color-fg-subtle)'} /><text x="20" y="11" className="pf-mc-legend">{rungLabel(g)}</text></g>)}
        <g transform={`translate(${24 + seen.length * 175} 728)`}><rect width="13" height="13" fill="url(#pf-gap-hatch)" stroke="var(--color-border)" /><text x="20" y="11" className="pf-mc-legend">{es ? 'brecha a la cota' : 'gap to the bound'}</text></g>
      </svg>
    </div>
  );
}
