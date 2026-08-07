// The two drawings a mine planner actually reads, both on canvas so they redraw at cursor speed.
//
// 1. PIT PROFILE. Elevation against easting at one northing, with the topography, the current
//    period's pit surface, and the earlier surfaces ghosted behind it. Morales, Jelvez,
//    Nancel-Penard, Marinho and Guimaraes (APCOM 2015, pp. 1040-1051) devote nine figures to exactly
//    this: "Marvin pit profile, Period 1 / Period 7 / Period 14", constructed by following "the
//    deepest block centers". It is the view that makes two schedules comparable, because two
//    surfaces on the same axes is a comparison and two 3D scenes side by side is not.
//
// 2. BENCH PLAN. One bench from above, coloured by period, with the connected components outlined.
//    Bai, Marcotte, Gamache, Gregory and Lapworth (doi:10.17159/2411-9717/2018/v118n5a8) present
//    pushbacks as plan views per bench colour-coded by phase, and use them to show the geometric
//    constraints hold: no narrow benches, no disconnected components. This is where the spatial
//    coherence number becomes a thing you can see rather than a statistic.

import { useEffect, useRef } from 'react';
import { periodCss } from './colormap.ts';

interface Common {
  x: number[];
  y: number[];
  level: number[];
  periodOfBlock: number[] | Int32Array;
  dims: [number, number, number];
  nPeriods: number;
  cursor: number;
  theme: string;
}

function useCanvas(draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void, deps: unknown[]) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const parent = c.parentElement!;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = parent.clientWidth || 480;
    const h = parent.clientHeight || 260;
    c.width = Math.round(w * dpr);
    c.height = Math.round(h * dpr);
    c.style.width = `${w}px`;
    c.style.height = `${h}px`;
    const ctx = c.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    draw(ctx, w, h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return ref;
}

function cssVar(name: string, fallback: string): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

/** Elevation against easting at a chosen northing: the pit surface per period. */
export function PitProfile({ x, y, level, periodOfBlock, dims, nPeriods, cursor, theme, northing }: Common & { northing: number }) {
  const [nx, , nz] = dims;
  const ref = useCanvas((ctx, w, h) => {
    const fg = cssVar('--color-fg', '#c9d1d9');
    const muted = cssVar('--color-fg-muted', '#8b949e');
    const pad = { l: 34, r: 8, t: 10, b: 24 };
    const iw = w - pad.l - pad.r, ih = h - pad.t - pad.b;
    const sx = (i: number) => pad.l + (i / Math.max(1, nx - 1)) * iw;
    const sy = (lv: number) => pad.t + ih - (lv / Math.max(1, nz - 1)) * ih;

    // topography = the highest existing block per column at this northing
    const top = new Int32Array(nx).fill(-1);
    const surface: Int32Array[] = [];
    for (let t = 0; t <= cursor; t++) surface.push(new Int32Array(nx).fill(-1));
    for (let b = 0; b < x.length; b++) {
      if (y[b] !== northing) continue;
      if (level[b] > top[x[b]]) top[x[b]] = level[b];
      const p = periodOfBlock[b];
      if (p < 0) continue;
      for (let t = Math.max(0, p); t <= cursor; t++) {
        // by period t the block is gone, so the surface at that column is at most level-1
        if (surface[t][x[b]] === -1 || level[b] - 1 < surface[t][x[b]]) surface[t][x[b]] = level[b] - 1;
      }
    }

    ctx.lineWidth = 1;
    ctx.strokeStyle = muted;
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    for (let i = 0; i < nx; i++) {
      const yv = sy(top[i] < 0 ? 0 : top[i]);
      if (i === 0) ctx.moveTo(sx(i), yv); else ctx.lineTo(sx(i), yv);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;

    for (let t = 0; t <= cursor; t++) {
      const isNow = t === cursor;
      ctx.strokeStyle = periodCss(t, nPeriods);
      ctx.lineWidth = isNow ? 2.2 : 1;
      ctx.globalAlpha = isNow ? 1 : 0.42;
      ctx.beginPath();
      let started = false;
      for (let i = 0; i < nx; i++) {
        const lv = surface[t][i] < 0 ? (top[i] < 0 ? 0 : top[i]) : surface[t][i];
        const yv = sy(Math.max(0, lv));
        if (!started) { ctx.moveTo(sx(i), yv); started = true; } else ctx.lineTo(sx(i), yv);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    ctx.strokeStyle = muted;
    ctx.fillStyle = muted;
    ctx.font = '10px system-ui, sans-serif';
    ctx.beginPath();
    ctx.moveTo(pad.l, pad.t); ctx.lineTo(pad.l, pad.t + ih); ctx.lineTo(pad.l + iw, pad.t + ih);
    ctx.stroke();
    ctx.fillStyle = fg;
    ctx.fillText('bench', 2, pad.t + 9);
    ctx.fillText('easting', pad.l + iw - 42, h - 6);
  }, [x, y, level, periodOfBlock, cursor, northing, nPeriods, theme]);
  return <div className="pf-canvas-host"><canvas ref={ref} data-testid="pit-profile" /></div>;
}

/** One bench from above, coloured by period. Unmined ground is drawn faint, not omitted. */
export function BenchPlan({ x, y, level, periodOfBlock, dims, nPeriods, cursor, theme, bench }: Common & { bench: number }) {
  const [nx, ny] = dims;
  const ref = useCanvas((ctx, w, h) => {
    const muted = cssVar('--color-fg-muted', '#8b949e');
    const pad = 8;
    const cell = Math.max(2, Math.floor(Math.min((w - 2 * pad) / nx, (h - 2 * pad) / ny)));
    const ox = Math.floor((w - cell * nx) / 2);
    const oy = Math.floor((h - cell * ny) / 2);
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = muted;
    ctx.fillRect(ox, oy, cell * nx, cell * ny);
    ctx.globalAlpha = 1;
    for (let b = 0; b < x.length; b++) {
      if (level[b] !== bench) continue;
      const p = periodOfBlock[b];
      if (p < 0 || p > cursor) continue;
      ctx.fillStyle = periodCss(p, nPeriods);
      ctx.fillRect(ox + x[b] * cell, oy + y[b] * cell, cell, cell);
    }
    ctx.strokeStyle = muted;
    ctx.globalAlpha = 0.5;
    ctx.strokeRect(ox + 0.5, oy + 0.5, cell * nx, cell * ny);
    ctx.globalAlpha = 1;
  }, [x, y, level, periodOfBlock, cursor, bench, nPeriods, theme]);
  return <div className="pf-canvas-host"><canvas ref={ref} data-testid="bench-plan" /></div>;
}
