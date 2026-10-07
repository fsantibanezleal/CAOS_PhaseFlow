/**
 * Primitives for the hand-authored figures on the reading pages. Every colour is a shell token through
 * the dg-* classes (or currentColor), so a figure repaints with the theme; every label is passed in
 * already translated. Sizes come from the viewBox, so a figure scales with its column and never pushes
 * it wider.
 */
import type { ReactNode } from 'react';

export type Lang = 'en' | 'es';
export const tr = (lang: Lang, en: string, es: string) => (lang === 'es' ? es : en);

export function Svg({ vb, label, children, wide }: { vb: string; label: string; children: ReactNode; wide?: boolean }) {
  const id = `pfa-${label.length}-${vb.replace(/\s+/g, '')}`;
  return (
    <svg className={wide ? 'fig-svg wide' : 'fig-svg'} viewBox={vb} role="img" aria-label={label}
         xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: 'auto' }}>
      <defs>
        <marker id={id} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" className="dg-arrowhead" />
        </marker>
      </defs>
      <g data-arrow={id}>{children}</g>
    </svg>
  );
}

/** An arrow from (x1, y1) to (x2, y2). The marker is looked up from the enclosing Svg by its id. */
export function Arrow({ x1, y1, x2, y2, dashed, label, lx, ly, markerId }: {
  x1: number; y1: number; x2: number; y2: number; dashed?: boolean; label?: string; lx?: number; ly?: number;
  markerId: string;
}) {
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} className="dg-edge" strokeDasharray={dashed ? '4 3' : undefined}
            markerEnd={`url(#${markerId})`} />
      {label && <text x={lx ?? (x1 + x2) / 2} y={ly ?? (y1 + y2) / 2 - 5} textAnchor="middle" className="dg-edge-label">{label}</text>}
    </g>
  );
}

/** A labelled box: a title and up to three sub-lines. */
export function Box({ x, y, w, h, title, sub, accent, good, titleSize }: {
  x: number; y: number; w: number; h: number; title: string; sub?: string[]; accent?: boolean; good?: boolean;
  titleSize?: number;
}) {
  const lines = sub ?? [];
  const top = y + h / 2 - (lines.length * 13) / 2 + (lines.length ? -1 : 4);
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={8} className={`dg-box${accent ? ' accent' : ''}${good ? ' good' : ''}`} />
      <text x={x + w / 2} y={top} textAnchor="middle" className={`dg-box-title${accent ? ' accent' : ''}`}
            style={titleSize ? { fontSize: titleSize } : undefined}>{title}</text>
      {lines.map((l, i) => (
        <text key={i} x={x + w / 2} y={top + 15 + i * 13} textAnchor="middle" className="dg-box-sub">{l}</text>
      ))}
    </g>
  );
}

/** Marker id helper for figures: the Svg wrapper derives it from the label and the viewBox. */
export function arrowId(vb: string, label: string): string {
  return `pfa-${label.length}-${vb.replace(/\s+/g, '')}`;
}

/** A row of unit cells: the building block of the section sketches. */
export function Cell({ x, y, s, cls, label }: { x: number; y: number; s: number; cls: string; label?: string }) {
  return (
    <g>
      <rect x={x} y={y} width={s} height={s} className={cls} />
      {label && <text x={x + s / 2} y={y + s / 2 + 4} textAnchor="middle" className="pfd-dg-mono">{label}</text>}
    </g>
  );
}
