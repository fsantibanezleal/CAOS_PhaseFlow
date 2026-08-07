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

export function UPlotChart({ data, build, height = 220, testId, onCursor }: PlotProps) {
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
    const ro = new ResizeObserver(() => p.setSize({ width: el.clientWidth || w, height }));
    ro.observe(el);
    return () => { ro.disconnect(); p.destroy(); plot.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, height]);
  return <div ref={host} className="pf-chart" data-testid={testId} />;
}

const baseAxes = () => {
  const fg = cssVar('--color-fg-muted', '#8b949e');
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
        width: w, height: h, cursor: { drag: { x: false, y: false } },
        scales: { x: { time: false }, y: {}, npv: {} },
        axes: [
          { ...baseAxes(), label: 'period' },
          { ...baseAxes(), label: 'Mt', scale: 'y' },
          { ...baseAxes(), label: 'cum NPV (M)', scale: 'npv', side: 1 },
        ],
        series: [
          { label: 'period' },
          { label: 'ore + waste (Mt)', scale: 'y', fill: cssVar('--color-fg-muted', '#8b949e') + '55', stroke: cssVar('--color-fg-muted', '#8b949e'), paths: uPlot.paths.bars!({ size: [0.82] }) },
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
        axes: [{ ...baseAxes(), label: 'period' }, { ...baseAxes(), label: '% of limit' }],
        series: [
          { label: 'period' },
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
          { ...baseAxes(), label: 'period' },
          { ...baseAxes(), label: 'components', scale: 'y' },
          { ...baseAxes(), label: '% in largest', scale: 'pct', side: 1 },
        ],
        series: [
          { label: 'period' },
          { label: 'connected components', scale: 'y', stroke: cssVar('--color-danger', '#f85149'), width: 2, points: { show: true, size: 5 } },
          { label: 'largest component share', scale: 'pct', stroke: cssVar('--color-ok', '#3fb950'), width: 2, dash: [4, 3] },
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
          { ...baseAxes(), label: 'period' },
          { ...baseAxes(), label: 'head grade (%)', scale: 'g' },
          { ...baseAxes(), label: 'strip ratio', scale: 'sr', side: 1 },
        ],
        series: [
          { label: 'period' },
          { label: 'head grade %', scale: 'g', stroke: cssVar('--color-accent', '#58a6ff'), width: 2, points: { show: true, size: 5 } },
          { label: 'strip ratio (waste:ore)', scale: 'sr', stroke: cssVar('--color-warn', '#d29922'), width: 2, dash: [4, 3] },
        ],
        legend: { live: true },
      })}
    />
  );
}

/** Method comparison: the gap to the certified bound, sorted, with the rung shown. */
export function MethodBars({ rows }: { rows: { method: string; rung: string; gapPct: number; npv: number; runtimeMs: number }[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const worst = Math.max(1e-9, ...rows.map((r) => r.gapPct));
  const rungColor: Record<string, string> = {
    classical: 'var(--color-fg-muted)', sota: 'var(--color-accent)',
    learned: '#8957e5', beyond: 'var(--color-warn)',
  };
  return (
    <div className="pf-methodbars" data-testid="method-bars">
      {rows.map((r, i) => (
        <div
          key={r.method}
          className={`pf-mb-row${hover === i ? ' on' : ''}`}
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(null)}
        >
          <span className="pf-mb-name">{r.method}</span>
          <span className="pf-mb-track">
            <span
              className="pf-mb-fill"
              style={{ width: `${(100 * r.gapPct) / worst}%`, background: rungColor[r.rung] ?? 'var(--color-fg-muted)' }}
            />
          </span>
          <span className="pf-mb-val">{r.gapPct.toFixed(2)}%</span>
          <span className="pf-mb-sub">{(r.npv / 1e6).toFixed(1)} M · {r.runtimeMs.toFixed(0)} ms</span>
        </div>
      ))}
    </div>
  );
}
