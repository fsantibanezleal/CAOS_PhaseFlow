/** Figures for Experiments: the questions, the case families that answer them, and the metrics. */
import { periodCss } from '../../viz/colormap.ts';
import { Arrow, Box, Svg, arrowId, tr, type Lang } from './kit.tsx';

/** Each experimental question, and the family of cases built to answer it. */
export function QuestionsMap({ lang }: { lang: Lang }) {
  const vb = '0 0 980 300';
  const label = tr(lang, 'Questions and the cases that answer them', 'Preguntas y los casos que las responden');
  const m = arrowId(vb, label);
  const qs: Array<[string, string]> = [
    ['Q1', tr(lang, 'Is the bound right?', '¿La cota es correcta?')],
    ['Q2', tr(lang, 'What does seeding by the bound buy?', '¿Qué aporta sembrar con la cota?')],
    ['Q3', tr(lang, 'What do look-ahead and exact search add?', '¿Qué agregan anticipación y búsqueda exacta?')],
    ['Q4', tr(lang, 'Which capacity binds, and when?', '¿Qué capacidad limita, y cuándo?')],
    ['Q5', tr(lang, 'What does the orebody change?', '¿Qué cambia el cuerpo mineralizado?')],
    ['Q6', tr(lang, 'Does the learned plan hold up?', '¿Se sostiene el plan aprendido?')],
    ['Q7', tr(lang, 'What do destinations, width and risk cost?', '¿Cuánto cuestan destinos, ancho y riesgo?')],
  ];
  const fams: Array<[string, string, number]> = [
    [tr(lang, 'published', 'publicado'), 'newman1', 0],
    [tr(lang, 'declared', 'declarado'), 'kd, zuck_small', 1],
    [tr(lang, 'deposit', 'depósito'), tr(lang, '5 twins, 4 archetypes', '5 gemelos, 4 arquetipos'), 2],
    [tr(lang, 'regime', 'régimen'), tr(lang, 'mill, fleet, impatient', 'planta, flota, impaciente'), 3],
    [tr(lang, 'control', 'control'), tr(lang, 'degenerate, abundant', 'degenerado, holgado'), 4],
  ];
  const links: Array<[number, number]> = [[0, 0], [0, 4], [1, 2], [1, 3], [1, 1], [2, 0], [2, 2], [2, 1], [3, 3], [4, 2], [5, 2], [5, 3], [6, 0], [6, 2]];
  return (
    <Svg vb={vb} label={label} wide>
      {qs.map(([q, t], i) => <Box key={q} x={10} y={8 + i * 41} w={360} h={34} title={`${q}  ${t}`} sub={[]} titleSize={12} />)}
      {fams.map(([f, d, k]) => <Box key={f} x={640} y={20 + k * 56} w={330} h={44} title={f} sub={[d]} accent={k === 0} />)}
      {links.map(([q, f], i) => <Arrow key={i} x1={372} y1={25 + q * 41} x2={638} y2={42 + f * 56} markerId={m} dashed={f !== 0} />)}
    </Svg>
  );
}

/** The metrics on one plan: captured share of the bound, the gap, and coherence per period. */
export function MetricsFigure({ lang }: { lang: Lang }) {
  const vb = '0 0 560 270';
  const label = tr(lang, 'The metrics on one plan', 'Las métricas sobre un plan');
  return (
    <Svg vb={vb} label={label}>
      <text x={20} y={26} className="pfd-dg-title">{tr(lang, 'value against its bound', 'valor contra su cota')}</text>
      <rect x={20} y={40} width={500} height={26} rx={4} className="dg-box" />
      <rect x={20} y={40} width={430} height={26} rx={4} className="dg-fill-accent" />
      <text x={235} y={58} textAnchor="middle" className="pfd-dg-text">{tr(lang, 'NPV of the plan', 'VAN del plan')}</text>
      <text x={485} y={58} textAnchor="middle" className="pfd-dg-bad">{tr(lang, 'gap', 'brecha')}</text>
      <text x={520} y={84} textAnchor="end" className="dg-tick">{tr(lang, 'bound of its own problem', 'cota de su propio problema')}</text>
      <text x={20} y={124} className="pfd-dg-title">{tr(lang, 'coherence of one period', 'coherencia de un período')}</text>
      {[[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1], [5, 0], [6, 0], [8, 1]].map(([x, y], i) => (
        <rect key={i} x={20 + x * 26} y={136 + y * 26} width={24} height={24} rx={3} style={{ fill: periodCss(1, 4) }} />
      ))}
      <text x={20} y={210} className="pfd-dg-small">{tr(lang, '3 components; the largest holds 6 of 9 blocks (67 percent); narrowest run 1', '3 componentes; la mayor tiene 6 de 9 bloques (67 por ciento); tramo más estrecho 1')}</text>
      <text x={280} y={250} textAnchor="middle" className="dg-note">{tr(lang, 'every number is read from a committed trace or manifest', 'todo número se lee de una traza o manifiesto versionado')}</text>
    </Svg>
  );
}
