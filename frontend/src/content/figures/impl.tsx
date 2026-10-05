/** Figures for Implementation: how each method is computed here. */
import { Arrow, Box, Svg, arrowId, tr, type Lang } from './kit.tsx';

/** Picard's reduction: the maximum closure is the source side of a minimum cut. */
export function ClosureNetwork({ lang }: { lang: Lang }) {
  const vb = '0 0 560 290';
  const label = tr(lang, 'Maximum closure as a minimum cut', 'Cierre máximo como corte mínimo');
  const m = arrowId(vb, label);
  const blocks: Array<[number, number, string, number]> = [
    [170, 70, 'a', -3], [280, 70, 'b', -2], [390, 70, 'c', -4], [225, 170, 'd', 9], [335, 170, 'e', 6],
  ];
  return (
    <Svg vb={vb} label={label}>
      <circle cx={40} cy={145} r={20} className="dg-node" />
      <text x={40} y={150} textAnchor="middle" className="dg-node-label">s</text>
      <circle cx={520} cy={145} r={20} className="dg-node" />
      <text x={520} y={150} textAnchor="middle" className="dg-node-label">t</text>
      {blocks.map(([x, y, n, v]) => (
        <g key={n}>
          <circle cx={x} cy={y} r={20} className="dg-node" style={v > 0 ? { stroke: 'var(--color-good)' } : { stroke: 'var(--color-warn)' }} />
          <text x={x} y={y + 4} textAnchor="middle" className="dg-node-label">{`${n} ${v > 0 ? '+' : ''}${v}`}</text>
        </g>
      ))}
      <Arrow x1={60} y1={150} x2={204} y2={168} markerId={m} label="9" />
      <Arrow x1={60} y1={155} x2={314} y2={172} markerId={m} label="6" ly={182} />
      <Arrow x1={190} y1={70} x2={498} y2={138} markerId={m} dashed />
      <Arrow x1={300} y1={70} x2={498} y2={140} markerId={m} dashed />
      <Arrow x1={410} y1={72} x2={500} y2={138} markerId={m} dashed />
      <Arrow x1={215} y1={152} x2={180} y2={90} markerId={m} />
      <Arrow x1={235} y1={152} x2={270} y2={90} markerId={m} />
      <Arrow x1={330} y1={152} x2={290} y2={90} markerId={m} />
      <Arrow x1={345} y1={152} x2={380} y2={90} markerId={m} />
      <text x={280} y={230} textAnchor="middle" className="pfd-dg-small">{tr(lang, 's to positive blocks (their value); negative blocks to t (minus their value)', 's a bloques positivos (su valor); bloques negativos a t (menos su valor)')}</text>
      <text x={280} y={248} textAnchor="middle" className="pfd-dg-small">{tr(lang, 'block to predecessor: infinite capacity, so a cut never separates a block from what it needs', 'bloque a predecesor: capacidad infinita, un corte nunca separa a un bloque de lo que necesita')}</text>
      <text x={280} y={274} textAnchor="middle" className="dg-note">{tr(lang, 'pit = source side of the minimum cut; its value = sum of positive values minus the max flow', 'pit = lado fuente del corte mínimo; su valor = suma de valores positivos menos el flujo máximo')}</text>
    </Svg>
  );
}

/** CPIT time-expanded for Bienstock-Zuckerberg: a node per (block, period). */
export function TimeExpanded({ lang }: { lang: Lang }) {
  const vb = '0 0 560 270';
  const label = tr(lang, 'The time-expanded graph', 'El grafo expandido en el tiempo');
  const m = arrowId(vb, label);
  const cols = [0, 1, 2];
  return (
    <Svg vb={vb} label={label}>
      {cols.map((t) => (
        <g key={t}>
          <text x={130 + t * 150} y={26} textAnchor="middle" className="pfd-dg-small">{tr(lang, `period ${t + 1}`, `período ${t + 1}`)}</text>
          <circle cx={130 + t * 150} cy={70} r={18} className="dg-node" />
          <text x={130 + t * 150} y={75} textAnchor="middle" className="dg-node-label">{`a,${t + 1}`}</text>
          <circle cx={130 + t * 150} cy={170} r={18} className="dg-node" />
          <text x={130 + t * 150} y={175} textAnchor="middle" className="dg-node-label">{`b,${t + 1}`}</text>
          <Arrow x1={130 + t * 150} y1={152} x2={130 + t * 150} y2={90} markerId={m} />
          {t < 2 && <Arrow x1={148 + t * 150} y1={70} x2={262 + t * 150} y2={70} markerId={m} dashed />}
          {t < 2 && <Arrow x1={148 + t * 150} y1={170} x2={262 + t * 150} y2={170} markerId={m} dashed />}
        </g>
      ))}
      <text x={60} y={124} className="pfd-dg-small">{tr(lang, 'precedence', 'precedencia')}</text>
      <text x={205} y={60} textAnchor="middle" className="pfd-dg-small">{tr(lang, 'monotone', 'monótona')}</text>
      <text x={280} y={226} textAnchor="middle" className="pfd-dg-small">{tr(lang, 'capacity rows: +a on (b, t), -a on (b, t - 1), per resource and period', 'filas de capacidad: +a en (b, t), -a en (b, t - 1), por recurso y período')}</text>
      <text x={280} y={252} textAnchor="middle" className="dg-note">{tr(lang, 'n T nodes; arcs T + n (T - 1) edges: a 10,976-block twin over 10 periods is 109,760 nodes', 'n T nodos; arcos T + n (T - 1) aristas: un gemelo de 10.976 bloques en 10 períodos son 109.760 nodos')}</text>
    </Svg>
  );
}

/** The four seeded archetypes, in section: what the trend functions draw. */
export function Archetypes({ lang }: { lang: Lang }) {
  const vb = '0 0 980 210';
  const label = tr(lang, 'The four seeded archetypes, in section', 'Los cuatro arquetipos sembrados, en sección');
  const nx = 24, nz = 12, s = 9;
  const trend = (arch: string, fx: number, fd: number) => {
    const cx = fx - 0.5;
    if (arch === 'porphyry') { const r = Math.sqrt(cx * cx + (fd - 0.45) ** 2); return Math.max(0, 1 - Math.abs(r - 0.22) / 0.28); }
    if (arch === 'vein') { const plane = cx * 0.8 + (fd - 0.5) * 0.6; return Math.max(0, 1 - Math.abs(plane) / 0.12); }
    if (arch === 'layered') return 0.5 + 0.5 * Math.cos(fd * Math.PI * 4);
    const r = Math.sqrt(cx * cx + (fd - 0.5) ** 2); return Math.max(0, 1 - r / 0.45) ** 1.6;
  };
  const archs: Array<[string, string, string]> = [
    ['porphyry', tr(lang, 'porphyry: a grade shell around a core', 'pórfido: una cáscara de ley en torno a un núcleo'), ''],
    ['vein', tr(lang, 'vein: a narrow dipping plane', 'veta: un plano estrecho e inclinado'), ''],
    ['layered', tr(lang, 'layered: alternating strata', 'estratificado: estratos alternados'), ''],
    ['core_halo', tr(lang, 'core-halo: a rich core in a poor halo', 'núcleo-halo: un núcleo rico en un halo pobre'), ''],
  ];
  return (
    <Svg vb={vb} label={label} wide>
      {archs.map(([a, title], k) => {
        const ox = 14 + k * 245;
        const cells = [];
        for (let z = 0; z < nz; z++) for (let x = 0; x < nx; x++) {
          const fd = z / (nz - 1);
          const v = trend(a, x / (nx - 1), fd);
          cells.push(<rect key={`${z}-${x}`} x={ox + x * s} y={30 + z * s} width={s - 0.6} height={s - 0.6}
                           style={{ fill: `color-mix(in oklab, var(--color-accent) ${Math.round(8 + 85 * v)}%, var(--color-surface-2))` }} />);
        }
        return (
          <g key={a}>
            {cells}
            <text x={ox + (nx * s) / 2} y={30 + nz * s + 18} textAnchor="middle" className="pfd-dg-small">{title}</text>
          </g>
        );
      })}
      <text x={490} y={196} textAnchor="middle" className="dg-note">{tr(lang, 'grade = background + (peak - background) max(0, trend + 0.35 correlated noise); surface at the top',
        'ley = fondo + (pico - fondo) max(0, tendencia + 0,35 ruido correlacionado); superficie arriba')}</text>
    </Svg>
  );
}

/** What the browser recomputes, and what it replays. */
export function LaneFidelity({ lang }: { lang: Lang }) {
  const vb = '0 0 560 300';
  const label = tr(lang, 'Recomputed in the browser, and replayed', 'Recalculado en el navegador, y reproducido');
  return (
    <Svg vb={vb} label={label}>
      <Box x={10} y={20} w={260} h={250} title={tr(lang, 'Recomputed live (twins)', 'Recalculado en vivo (gemelos)')} sub={[]} accent />
      {[
        tr(lang, 'slope precedence from the angle', 'precedencia de talud desde el ángulo'),
        tr(lang, 'ultimate pit (Dinic)', 'pit final (Dinic)'),
        tr(lang, 'critical multiplier per resource', 'multiplicador crítico por recurso'),
        tr(lang, 'Algorithm 4 bound', 'cota del Algoritmo 4'),
        tr(lang, 'greedy, Gershon, ExTS + shift', 'codicioso, Gershon, ExTS + desplazamiento'),
        tr(lang, 'learned plan (no LP)', 'plan aprendido (sin LP)'),
        tr(lang, 'coherence per period', 'coherencia por período'),
      ].map((t, i) => <text key={i} x={30} y={70 + i * 26} className="pfd-dg-small">{t}</text>)}
      <Box x={290} y={20} w={260} h={250} title={tr(lang, 'Replayed from the bake', 'Reproducido desde el horneado')} sub={[]} />
      {[
        tr(lang, 'joint Bienstock-Zuckerberg bound', 'cota conjunta Bienstock-Zuckerberg'),
        tr(lang, 'PCPSP LP (HiGHS or dual)', 'LP PCPSP (HiGHS o dual)'),
        tr(lang, 'sliding window, C-PIT[D]', 'ventana deslizante, C-PIT[D]'),
        tr(lang, 'destination methods', 'métodos con destino'),
        tr(lang, 'min-width, ensemble', 'ancho mínimo, ensamble'),
        tr(lang, 'every MineLib case', 'todo caso MineLib'),
      ].map((t, i) => <text key={i} x={310} y={70 + i * 26} className="pfd-dg-small">{t}</text>)}
      <text x={280} y={292} textAnchor="middle" className="dg-note">{tr(lang, 'parity: the live pit matches block for block and the live bound to 1e-6', 'paridad: el pit en vivo coincide bloque a bloque y la cota en vivo a 1e-6')}</text>
    </Svg>
  );
}
