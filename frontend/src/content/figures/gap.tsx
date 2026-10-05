/** The decomposition of a gap on the one instance where every term is known: newman1. */
import { Svg, tr, type Lang } from './kit.tsx';

const NAMES = [
  { en: 'Algorithm 4 bound', es: 'cota Algoritmo 4' },
  { en: 'joint CPIT LP', es: 'LP CPIT conjunta' },
  { en: 'integer optimum (external AMPL solve)', es: 'óptimo entero (resolución externa AMPL)' },
  { en: 'best plan here', es: 'mejor plan aquí' },
];

/**
 * Four value levels, top to bottom: the Algorithm 4 bound, the joint LP, the integer optimum and the
 * plan. The caller passes the committed values (`levels`) and the method of the plan; the figure draws
 * the three differences between consecutive levels and states the two shares in its note.
 */
export function GapLadderFigure({ lang, levels, planMethod }: { lang: Lang; levels: [number, number, number, number]; planMethod: string }) {
  const vb = '0 0 560 300';
  const label = tr(lang, 'Where a gap comes from, on newman1', 'De dónde viene una brecha, en newman1');
  const span = levels[0] - levels[3];
  const lo = levels[3] - 0.08 * span, hi = levels[0] + 0.04 * span;
  const y = (v: number) => 260 - ((v - lo) / (hi - lo)) * 220;
  const fmt = (v: number) => Math.round(v).toLocaleString(lang === 'es' ? 'es-CL' : 'en-US');
  const pct = (v: number) => (100 * v).toLocaleString(lang === 'es' ? 'es-CL' : 'en-US', { maximumFractionDigits: 2, minimumFractionDigits: 2 });
  const bands = [
    { a: 0, b: 1, en: 'bound slack', es: 'holgura de la cota', cls: 'dg-fill-warn' },
    { a: 1, b: 2, en: 'integrality', es: 'integralidad', cls: 'dg-fill-accent' },
    { a: 2, b: 3, en: 'method loss', es: 'pérdida del método', cls: 'dg-fill-warn' },
  ];
  // the two top levels are close on newman1; spread their labels so they never overlap
  const labelY = levels.map((v) => y(v) + 4);
  if (labelY[1] - labelY[0] < 14) { labelY[0] = labelY[1] - 14; }
  const gapLp = (levels[1] - levels[3]) / levels[1];
  const loss = (levels[2] - levels[3]) / levels[2];
  return (
    <Svg vb={vb} label={label}>
      <line x1={80} y1={30} x2={80} y2={270} className="dg-axis" />
      {bands.map((bd, i) => (
        <g key={i}>
          <rect x={84} y={y(levels[bd.a])} width={46} height={Math.max(2, y(levels[bd.b]) - y(levels[bd.a]))} className={bd.cls} />
          <text x={138} y={(y(levels[bd.a]) + y(levels[bd.b])) / 2 + 4} className="pfd-dg-small">
            {tr(lang, bd.en, bd.es)}: {fmt(levels[bd.a] - levels[bd.b])}
          </text>
        </g>
      ))}
      {levels.map((v, i) => (
        <g key={i}>
          <line x1={74} x2={318} y1={y(v)} y2={y(v)} className={i === 2 ? 'dg-marker' : 'dg-curve-faint'} />
          <text x={324} y={labelY[i]} className="pfd-dg-text">{i === 3 ? `${tr(lang, NAMES[i].en, NAMES[i].es)} (${planMethod})` : tr(lang, NAMES[i].en, NAMES[i].es)}</text>
          <text x={70} y={labelY[i]} textAnchor="end" className="dg-tick">{fmt(v)}</text>
        </g>
      ))}
      <text x={280} y={292} textAnchor="middle" className="dg-note">
        {tr(lang,
          `gap to the joint LP ${pct(gapLp)} percent; the plan is ${pct(loss)} percent below the integer optimum`,
          `brecha a la LP conjunta ${pct(gapLp)} por ciento; el plan queda ${pct(loss)} por ciento bajo el óptimo entero`)}
      </text>
    </Svg>
  );
}
