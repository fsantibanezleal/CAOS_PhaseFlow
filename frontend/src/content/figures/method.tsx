/** Figures for Methodology: one schematic per method family, drawn from the definitions in the sources. */
import { periodCss } from '../../viz/colormap.ts';
import { Arrow, Box, Svg, arrowId, tr, type Lang } from './kit.tsx';

/** The slope cone and the cumulative variable: the two facts the formulation rests on. */
export function ConeAndStep({ lang }: { lang: Lang }) {
  const vb = '0 0 560 300';
  const label = tr(lang, 'Precedence cone and cumulative variable', 'Cono de precedencia y variable acumulada');
  const s = 24, cx = 140, top = 40;
  const cells = [];
  for (let lvl = 0; lvl < 4; lvl++) {
    const n = 1 + lvl * 2;
    for (let i = 0; i < n; i++) {
      const x = cx - ((n - 1) / 2) * s + i * s - s / 2;
      const y = top + (3 - lvl) * s;
      cells.push(<rect key={`${lvl}-${i}`} x={x + 1} y={y + 1} width={s - 2} height={s - 2} rx={2}
                       className={lvl === 0 ? 'dg-fill-warn' : 'dg-fill-accent'} />);
    }
  }
  const ys = [0, 0, 0, 1, 1, 1];
  return (
    <Svg vb={vb} label={label}>
      <text x={cx} y={24} textAnchor="middle" className="pfd-dg-title">{tr(lang, 'the cone above block b', 'el cono sobre el bloque b')}</text>
      {cells}
      <text x={cx} y={top + 3 * s + 16} textAnchor="middle" className="dg-marker-label">b</text>
      <text x={cx} y={top + 4 * s + 22} textAnchor="middle" className="pfd-dg-small">{tr(lang, 'every block in it is mined in a period no later than b', 'todo bloque en él se extrae en un período no posterior a b')}</text>
      <text x={cx} y={top + 4 * s + 38} textAnchor="middle" className="pfd-dg-small">{tr(lang, 'in EVERY period, not only at the end', 'en CADA período, no solo al final')}</text>
      <text x={420} y={24} textAnchor="middle" className="pfd-dg-title">{tr(lang, 'x_bt is cumulative', 'x_bt es acumulada')}</text>
      <line x1={310} y1={190} x2={540} y2={190} className="dg-axis" />
      <line x1={310} y1={190} x2={310} y2={60} className="dg-axis" />
      {ys.map((v, t) => (
        <g key={t}>
          <rect x={318 + t * 36} y={v ? 90 : 186} width={28} height={v ? 100 : 4} className="dg-bar" style={{ opacity: v ? 0.85 : 0.35 }} />
          <text x={332 + t * 36} y={206} textAnchor="middle" className="dg-tick">{t + 1}</text>
        </g>
      ))}
      <text x={304} y={94} textAnchor="end" className="dg-tick">1</text>
      <text x={304} y={192} textAnchor="end" className="dg-tick">0</text>
      <text x={425} y={226} textAnchor="middle" className="dg-axis-label">{tr(lang, 'period t', 'período t')}</text>
      <text x={425} y={252} textAnchor="middle" className="pfd-dg-small">{tr(lang, 'mined in period 4: x_b3 = 0, x_b4 = 1', 'extraído en el período 4: x_b3 = 0, x_b4 = 1')}</text>
      <text x={425} y={270} textAnchor="middle" className="pfd-dg-small">{tr(lang, 'monotone: once mined, it stays mined', 'monótona: una vez extraído, sigue extraído')}</text>
    </Svg>
  );
}

/** CPIT is a restriction of PCPSP, so their relaxations are ordered. */
export function ProblemInclusion({ lang }: { lang: Lang }) {
  const vb = '0 0 560 290';
  const label = tr(lang, 'Feasible sets and bound ordering', 'Conjuntos factibles y orden de cotas');
  return (
    <Svg vb={vb} label={label}>
      <ellipse cx={170} cy={130} rx={150} ry={100} className="dg-fill-accent" />
      <ellipse cx={130} cy={140} rx={80} ry={56} className="dg-fill-warn" />
      <text x={230} y={70} textAnchor="middle" className="pfd-dg-title">PCPSP</text>
      <text x={230} y={86} textAnchor="middle" className="pfd-dg-small">{tr(lang, 'period and destination', 'período y destino')}</text>
      <text x={130} y={138} textAnchor="middle" className="pfd-dg-title">CPIT</text>
      <text x={130} y={154} textAnchor="middle" className="pfd-dg-small">{tr(lang, 'destination fixed', 'destino fijo')}</text>
      <line x1={360} y1={250} x2={360} y2={40} className="dg-axis" />
      {[
        [230, tr(lang, 'CPIT LP bound', 'cota LP CPIT')],
        [180, tr(lang, 'PCPSP LP bound', 'cota LP PCPSP')],
        [90, tr(lang, 'ultimate pit (no discounting)', 'pit final (sin descuento)')],
      ].map(([y, t], i) => (
        <g key={i}>
          <line x1={352} x2={368} y1={y as number} y2={y as number} className="dg-axis" />
          <text x={378} y={(y as number) + 4} className="pfd-dg-text">{t as string}</text>
        </g>
      ))}
      <text x={360} y={30} textAnchor="middle" className="dg-axis-label">{tr(lang, 'value', 'valor')}</text>
      <text x={280} y={278} textAnchor="middle" className="dg-note">{tr(lang, 'a larger feasible set can only raise its relaxation', 'un conjunto factible mayor solo puede subir su relajación')}</text>
    </Svg>
  );
}

/** Abel summation turns the period objective into positively weighted cumulative pit values. */
export function AbelSplit({ lang }: { lang: Lang }) {
  const vb = '0 0 560 280';
  const label = tr(lang, 'Abel weights and one problem per period', 'Pesos de Abel y un problema por período');
  const d = [1, 0.926, 0.857, 0.794, 0.735, 0.681];
  const g = d.map((v, i) => (i < d.length - 1 ? v - d[i + 1] : v));
  return (
    <Svg vb={vb} label={label}>
      <text x={130} y={22} textAnchor="middle" className="pfd-dg-title">{tr(lang, 'discount d_t and weight γ_t', 'descuento d_t y peso γ_t')}</text>
      <line x1={20} y1={200} x2={250} y2={200} className="dg-axis" />
      {d.map((v, i) => (
        <g key={i}>
          <rect x={28 + i * 37} y={200 - v * 150} width={14} height={v * 150} className="dg-bar" style={{ opacity: 0.45 }} />
          <rect x={43 + i * 37} y={200 - g[i] * 150} width={14} height={g[i] * 150} className="dg-bar-2" />
          <text x={43 + i * 37} y={216} textAnchor="middle" className="dg-tick">{i + 1}</text>
        </g>
      ))}
      <text x={135} y={240} textAnchor="middle" className="pfd-dg-small">{tr(lang, 'pale: d_t at 8 percent; solid: γ_t = d_t - d_t+1 > 0', 'claro: d_t al 8 por ciento; sólido: γ_t = d_t - d_t+1 > 0')}</text>
      <text x={410} y={22} textAnchor="middle" className="pfd-dg-title">{tr(lang, 'T separate problems', 'T problemas separados')}</text>
      {[0, 1, 2, 3].map((t) => (
        <g key={t}>
          <rect x={300} y={40 + t * 46} width={220} height={36} rx={6} className="dg-box" />
          <text x={410} y={63 + t * 46} textAnchor="middle" className="pfd-dg-mono">{`CP(U_${t + 1}),  U_${t + 1} = c_1 + ... + c_${t + 1}`}</text>
        </g>
      ))}
      <text x={410} y={238} textAnchor="middle" className="pfd-dg-small">{tr(lang, 'cumulative capacity decouples the periods', 'la capacidad acumulada desacopla los períodos')}</text>
      <text x={410} y={256} textAnchor="middle" className="pfd-dg-small">{tr(lang, 'their optima nest, so the LP solution is monotone', 'sus óptimos se anidan, y la solución LP es monótona')}</text>
    </Svg>
  );
}

/** The parametric family of nested pits and the convex combination that solves CP(U). */
export function ParametricPits({ lang }: { lang: Lang }) {
  const vb = '0 0 560 300';
  const label = tr(lang, 'Critical multiplier: nested pits bracket the capacity', 'Multiplicador crítico: pits anidados encajonan la capacidad');
  const steps = [[40, 240], [120, 240], [120, 190], [200, 190], [200, 140], [280, 140], [280, 105], [360, 105], [360, 80], [440, 80]];
  const path = steps.map((p, i) => `${i ? 'L' : 'M'}${p[0]} ${p[1]}`).join(' ');
  return (
    <Svg vb={vb} label={label}>
      <line x1={40} y1={250} x2={480} y2={250} className="dg-axis" />
      <line x1={40} y1={250} x2={40} y2={50} className="dg-axis" />
      <path d={path} className="dg-curve" />
      <line x1={40} y1={162} x2={480} y2={162} className="dg-marker" />
      <text x={478} y={156} textAnchor="end" className="dg-marker-label">{tr(lang, 'target U_t', 'objetivo U_t')}</text>
      <circle cx={200} cy={140} r={4} className="dg-node" />
      <circle cx={200} cy={190} r={4} className="dg-node" />
      <text x={192} y={124} textAnchor="end" className="pfd-dg-small">{tr(lang, 'pit x^u: uses b^u > U', 'pit x^u: usa b^u > U')}</text>
      <text x={192} y={208} textAnchor="end" className="pfd-dg-small">{tr(lang, 'pit x^l: uses b^l < U', 'pit x^l: usa b^l < U')}</text>
      <text x={200} y={268} textAnchor="middle" className="dg-tick">λ*</text>
      <line x1={200} y1={250} x2={200} y2={140} className="dg-curve-faint" />
      <text x={260} y={290} textAnchor="middle" className="dg-axis-label">{tr(lang, 'multiplier λ (decreasing to the right)', 'multiplicador λ (decrece hacia la derecha)')}</text>
      <text x={24} y={150} textAnchor="middle" className="dg-axis-label" transform="rotate(-90 24 150)">{tr(lang, 'capacity used by pit(λ)', 'capacidad usada por pit(λ)')}</text>
      <text x={300} y={225} className="pfd-dg-small">{tr(lang, 'each step: one maximum closure', 'cada escalón: un cierre máximo')}</text>
      <text x={300} y={240} className="pfd-dg-small">x = α x^l + (1 - α) x^u</text>
    </Svg>
  );
}

/** Algorithm 4: relax all resources but one, keep the smallest bound and the best plan. */
export function Algorithm4({ lang }: { lang: Lang }) {
  const vb = '0 0 560 260';
  const label = tr(lang, 'Algorithm 4 for two resources', 'Algoritmo 4 para dos recursos');
  const m = arrowId(vb, label);
  return (
    <Svg vb={vb} label={label}>
      <Box x={180} y={10} w={200} h={50} title={tr(lang, 'CPIT with R = 2', 'CPIT con R = 2')} sub={[tr(lang, 'mining and plant capacity', 'capacidad de mina y de planta')]} />
      <Box x={20} y={100} w={220} h={56} title={tr(lang, 'keep mining only', 'solo mina')} sub={[tr(lang, 'critical multiplier: Z_1 >= Z*', 'multiplicador crítico: Z_1 >= Z*')]} />
      <Box x={320} y={100} w={220} h={56} title={tr(lang, 'keep plant only', 'solo planta')} sub={[tr(lang, 'critical multiplier: Z_2 >= Z*', 'multiplicador crítico: Z_2 >= Z*')]} />
      <Box x={140} y={190} w={280} h={56} title={tr(lang, 'bound min(Z_1, Z_2)', 'cota min(Z_1, Z_2)')} sub={[tr(lang, 'best of the two ExTS plans', 'mejor de los dos planes ExTS')]} accent />
      <Arrow x1={250} y1={60} x2={140} y2={100} markerId={m} />
      <Arrow x1={310} y1={60} x2={420} y2={100} markerId={m} />
      <Arrow x1={130} y1={156} x2={230} y2={190} markerId={m} />
      <Arrow x1={430} y1={156} x2={330} y2={190} markerId={m} />
    </Svg>
  );
}

/** Bienstock-Zuckerberg as column generation: a contracted master and a max-closure pricing problem. */
export function BzLoop({ lang }: { lang: Lang }) {
  const vb = '0 0 560 270';
  const label = tr(lang, 'Bienstock-Zuckerberg column generation', 'Generación de columnas de Bienstock-Zuckerberg');
  const m = arrowId(vb, label);
  return (
    <Svg vb={vb} label={label}>
      <Box x={20} y={30} w={230} h={80} title={tr(lang, 'Restricted master LP', 'LP maestro restringido')} sub={[tr(lang, 'variables equated on a partition', 'variables igualadas en una partición'), tr(lang, 'side rows: capacity per period', 'filas laterales: capacidad por período')]} />
      <Box x={310} y={30} w={230} h={80} title={tr(lang, 'Pricing', 'Pricing')} sub={[tr(lang, 'max closure of c - μH', 'cierre máximo de c - μH'), tr(lang, 'one min cut', 'un corte mínimo')]} accent />
      <Arrow x1={250} y1={58} x2={308} y2={58} markerId={m} label={tr(lang, 'duals μ', 'duales μ')} />
      <Arrow x1={308} y1={88} x2={250} y2={88} markerId={m} label={tr(lang, 'new closure v', 'nuevo cierre v')} ly={104} />
      <Box x={150} y={150} w={260} h={64} title={tr(lang, 'Refine the partition', 'Refinar la partición')} sub={[tr(lang, 'parts AND v, parts MINUS v, v MINUS all', 'partes Y v, partes MENOS v, v MENOS todo')]} />
      <Arrow x1={425} y1={110} x2={380} y2={150} markerId={m} />
      <Arrow x1={180} y1={150} x2={130} y2={110} markerId={m} />
      <text x={280} y={244} textAnchor="middle" className="dg-note">{tr(lang, 'stops when no closure has positive reduced profit: Z_BZ = Z_LP', 'se detiene cuando ningún cierre tiene beneficio reducido positivo: Z_BZ = Z_LP')}</text>
    </Svg>
  );
}

/** TopoSort: a weighted topological order, then each block in the earliest period that fits. */
export function TopoSortWalk({ lang }: { lang: Lang }) {
  const vb = '0 0 560 290';
  const label = tr(lang, 'TopoSort: order, then earliest feasible period', 'TopoSort: orden, luego el período factible más temprano');
  const order = ['a', 'd', 'b', 'e', 'c', 'f', 'g'];
  const periods = [0, 0, 0, 1, 1, 1, 2];
  return (
    <Svg vb={vb} label={label}>
      <text x={280} y={20} textAnchor="middle" className="pfd-dg-title">{tr(lang, 'order by weight w (high first), never before a predecessor', 'orden por peso w (alto primero), nunca antes que un predecesor')}</text>
      {order.map((b, i) => (
        <g key={b}>
          <rect x={30 + i * 72} y={40} width={56} height={40} rx={6} className="dg-box" />
          <text x={58 + i * 72} y={65} textAnchor="middle" className="dg-node-label">{b}</text>
          {i < order.length - 1 && <text x={94 + i * 72} y={65} textAnchor="middle" className="dg-tick">,</text>}
        </g>
      ))}
      {[0, 1, 2].map((t) => (
        <g key={t}>
          <rect x={60 + t * 160} y={120} width={140} height={110} rx={8} className="dg-box" />
          <text x={130 + t * 160} y={140} textAnchor="middle" className="pfd-dg-small">{tr(lang, `period ${t + 1}`, `período ${t + 1}`)}</text>
          {order.filter((_, i) => periods[i] === t).map((b, k) => (
            <rect key={b} x={74 + t * 160 + k * 40} y={160} width={34} height={34} rx={4} style={{ fill: periodCss(t, 3) }} />
          ))}
          {order.filter((_, i) => periods[i] === t).map((b, k) => (
            <text key={`t${b}`} x={91 + t * 160 + k * 40} y={182} textAnchor="middle" style={{ fill: t === 2 ? '#1f2328' : '#fff', font: '600 12px var(--font-mono)' }}>{b}</text>
          ))}
          <text x={130 + t * 160} y={218} textAnchor="middle" className="dg-tick">{tr(lang, 'capacity used up', 'capacidad agotada')}</text>
        </g>
      ))}
      <text x={280} y={262} textAnchor="middle" className="dg-note">{tr(lang, 'feasible by construction; the weight is the whole algorithm', 'factible por construcción; el peso es todo el algoritmo')}</text>
      <text x={280} y={280} textAnchor="middle" className="dg-note">{tr(lang, 'greedy w = p_b; Gershon w = value of the successor set; ExTS w = -E_b', 'codicioso w = p_b; Gershon w = valor del conjunto sucesor; ExTS w = -E_b')}</text>
    </Svg>
  );
}

/** Gershon's weight is a SET sum; summing along paths counts a deep block once per path. */
export function GershonCone({ lang }: { lang: Lang }) {
  const vb = '0 0 560 280';
  const label = tr(lang, 'Successor set against successor paths', 'Conjunto sucesor contra caminos sucesores');
  const m = arrowId(vb, label);
  return (
    <Svg vb={vb} label={label}>
      <text x={140} y={22} textAnchor="middle" className="pfd-dg-title">{tr(lang, 'a diamond below b', 'un diamante bajo b')}</text>
      {[[140, 50, 'b'], [90, 120, 'c'], [190, 120, 'd'], [140, 190, 'e']].map(([x, y, t]) => (
        <g key={t as string}>
          <circle cx={x as number} cy={y as number} r={18} className="dg-node" />
          <text x={x as number} y={(y as number) + 4} textAnchor="middle" className="dg-node-label">{t as string}</text>
        </g>
      ))}
      <Arrow x1={128} y1={64} x2={102} y2={104} markerId={m} />
      <Arrow x1={152} y1={64} x2={178} y2={104} markerId={m} />
      <Arrow x1={102} y1={136} x2={128} y2={174} markerId={m} />
      <Arrow x1={178} y1={136} x2={152} y2={174} markerId={m} />
      <text x={140} y={236} textAnchor="middle" className="pfd-dg-small">{tr(lang, 'arrows: b must go before c and d; both before e', 'flechas: b antes que c y d; ambos antes que e')}</text>
      <text x={400} y={70} textAnchor="middle" className="pfd-dg-good">{tr(lang, 'set sum (Gershon): p_c + p_d + p_e', 'suma del conjunto (Gershon): p_c + p_d + p_e')}</text>
      <text x={400} y={110} textAnchor="middle" className="pfd-dg-bad">{tr(lang, 'path sum: p_c + p_d + 2 p_e', 'suma por caminos: p_c + p_d + 2 p_e')}</text>
      <line x1={300} y1={106} x2={500} y2={114} className="pfd-dg-strike" />
      <text x={400} y={160} textAnchor="middle" className="pfd-dg-small">{tr(lang, 'with nine arcs per block the number of paths', 'con nueve arcos por bloque el número de caminos')}</text>
      <text x={400} y={176} textAnchor="middle" className="pfd-dg-small">{tr(lang, 'to a block k levels down grows geometrically', 'hacia un bloque k niveles abajo crece geométricamente')}</text>
      <text x={400} y={216} textAnchor="middle" className="pfd-dg-small">{tr(lang, 'the set is built as a bitset: each block counts once', 'el conjunto se construye como bitset: cada bloque cuenta una vez')}</text>
    </Svg>
  );
}

/** The sliding time window: solve a window exactly with an aggregated tail, freeze one period, slide. */
export function SlidingWindow({ lang }: { lang: Lang }) {
  const vb = '0 0 980 230';
  const label = tr(lang, 'Sliding time window', 'Ventana de tiempo deslizante');
  const T = 8;
  return (
    <Svg vb={vb} label={label} wide>
      {[0, 1, 2].map((slide) => (
        <g key={slide}>
          <text x={18} y={46 + slide * 56} className="pfd-dg-small">{tr(lang, `slide ${slide + 1}`, `paso ${slide + 1}`)}</text>
          {Array.from({ length: T }, (_, t) => {
            const x = 100 + t * 105;
            const frozen = t < slide;
            const fix = t === slide;
            const inWin = t >= slide && t < slide + 3;
            const tail = t >= slide + 3;
            const cls = frozen ? undefined : fix ? 'dg-fill-warn' : inWin ? 'dg-fill-accent' : undefined;
            return (
              <g key={t}>
                <rect x={x} y={26 + slide * 56} width={96} height={34} rx={5} className={cls ?? 'dg-box'}
                      style={frozen ? { fill: periodCss(t, T), stroke: 'none', opacity: 0.85 } : tail ? { fill: 'var(--color-surface-2)', stroke: 'var(--color-border)', strokeDasharray: '4 3' } : undefined} />
                <text x={x + 48} y={47 + slide * 56} textAnchor="middle" className="pfd-dg-mono"
                      style={frozen ? { fill: t >= 5 ? '#1f2328' : '#fff' } : undefined}>
                  {frozen ? tr(lang, `fixed ${t + 1}`, `fijo ${t + 1}`) : fix ? tr(lang, `solve+fix ${t + 1}`, `resolver+fijar ${t + 1}`) : inWin ? tr(lang, `window ${t + 1}`, `ventana ${t + 1}`) : tr(lang, 'tail', 'cola')}
                </text>
              </g>
            );
          })}
        </g>
      ))}
      <text x={540} y={206} textAnchor="middle" className="dg-note">{tr(lang, 'the window (3 periods) is one MILP with the rest of the horizon aggregated into an optimistic tail; only its first period is kept',
        'la ventana (3 períodos) es un MILP con el resto del horizonte agregado en una cola optimista; solo se conserva su primer período')}</text>
      <text x={540} y={224} textAnchor="middle" className="dg-note">{tr(lang, 'candidates: the blocks the LP expects to mine soonest, sized by the window capacity',
        'candidatos: los bloques que la LP espera extraer primero, dimensionados por la capacidad de la ventana')}</text>
    </Svg>
  );
}

/** Local search: shift moves and the exact C-PIT[D] re-solve of a neighbourhood. */
export function LocalSearch({ lang }: { lang: Lang }) {
  const vb = '0 0 560 290';
  const label = tr(lang, 'Shift moves and the exact neighbourhood re-solve', 'Movimientos de desplazamiento y re-resolución exacta de un vecindario');
  const s = 22, cols = 11, rows = 5;
  const per = (c: number, r: number) => Math.min(4, Math.floor(Math.abs(c - 5) / 2) + r);
  const inPit = (c: number, r: number) => Math.abs(c - 5) <= 5 - r;
  const inD = (c: number, r: number) => c >= 6 && c <= 8 && r >= 1 && r <= 3 && inPit(c, r);
  const cells = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    if (!inPit(c, r)) continue;
    cells.push(<rect key={`${r}-${c}`} x={36 + c * s} y={40 + r * s} width={s - 2} height={s - 2} rx={2} style={{ fill: periodCss(per(c, r), 5), opacity: inD(c, r) ? 1 : 0.55 }} />);
    if (inD(c, r)) cells.push(<rect key={`d${r}-${c}`} x={36 + c * s - 1} y={40 + r * s - 1} width={s} height={s} rx={2} fill="none" className="dg-marker" style={{ strokeDasharray: 'none', strokeWidth: 2 }} />);
  }
  return (
    <Svg vb={vb} label={label}>
      <text x={156} y={24} textAnchor="middle" className="pfd-dg-title">{tr(lang, 'neighbourhood D, re-solved exactly', 'vecindario D, re-resuelto exacto')}</text>
      {cells}
      <text x={156} y={172} textAnchor="middle" className="pfd-dg-small">{tr(lang, 'blocks outside D keep their period and their capacity', 'los bloques fuera de D conservan período y capacidad')}</text>
      <text x={156} y={188} textAnchor="middle" className="pfd-dg-small">{tr(lang, 'fixed predecessors give a floor, fixed successors a ceiling', 'predecesores fijos dan un piso, sucesores fijos un techo')}</text>
      <text x={430} y={24} textAnchor="middle" className="pfd-dg-title">{tr(lang, 'shift moves', 'movimientos de desplazamiento')}</text>
      <Box x={330} y={44} w={200} h={52} title={tr(lang, 'pull forward', 'adelantar')} sub={[tr(lang, 'value > 0, predecessors earlier', 'valor > 0, predecesores antes')]} />
      <Box x={330} y={110} w={200} h={52} title={tr(lang, 'push back', 'atrasar')} sub={[tr(lang, 'value < 0, successors later', 'valor < 0, sucesores después')]} />
      <text x={430} y={186} textAnchor="middle" className="pfd-dg-small">{tr(lang, 'one block at a time: cannot move a cone', 'un bloque a la vez: no mueve un cono')}</text>
      <text x={280} y={240} textAnchor="middle" className="dg-note">{tr(lang, 'both never lose value: every accepted move is an improvement', 'ninguno pierde valor: todo movimiento aceptado es una mejora')}</text>
      <text x={280} y={258} textAnchor="middle" className="dg-note">{tr(lang, 'the exact re-solve moves a block together with what it needs', 'la re-resolución exacta mueve un bloque junto con lo que necesita')}</text>
    </Svg>
  );
}

/** Nested shells as the classical weight: inner shells first. */
export function ShellsAsWeights({ lang }: { lang: Lang }) {
  const vb = '0 0 560 260';
  const label = tr(lang, 'Revenue factors give nested shells', 'Factores de ingreso dan cáscaras anidadas');
  const rf = [1.0, 0.82, 0.65, 0.5, 0.35];
  return (
    <Svg vb={vb} label={label}>
      {rf.map((f, i) => {
        const w = 460 - i * 80;
        const h = 170 - i * 30;
        return (
          <g key={i}>
            <path d={`M${280 - w / 2} 40 L${280 + w / 2} 40 L${280 + w / 2 - h * 0.55} ${40 + h} L${280 - w / 2 + h * 0.55} ${40 + h} Z`}
                  style={{ fill: `color-mix(in oklab, var(--color-accent) ${12 + i * 12}%, transparent)`, stroke: 'var(--color-accent)', strokeWidth: 1 }} />
            <text x={280 + w / 2 - 6} y={56} textAnchor="end" className="pfd-dg-mono">{`RF ${f.toFixed(2)}`}</text>
          </g>
        );
      })}
      <text x={280} y={230} textAnchor="middle" className="dg-note">{tr(lang, 'a lower price can only shrink the optimal pit; shell k = blocks that enter at revenue factor k',
        'un precio menor solo puede achicar el pit óptimo; la cáscara k son los bloques que entran con el factor k')}</text>
      <text x={280} y={248} textAnchor="middle" className="dg-note">{tr(lang, 'PhaseFlow takes 12 factors from 1.0 to 0.35 and mines inner shells first', 'PhaseFlow toma 12 factores de 1,0 a 0,35 y extrae primero las cáscaras internas')}</text>
    </Svg>
  );
}

/** The learned rung: the same TopoSort walk, with the expensive weight predicted. */
export function SurrogatePath({ lang }: { lang: Lang }) {
  const vb = '0 0 560 270';
  const label = tr(lang, 'Exact and learned paths to an ordering', 'Caminos exacto y aprendido hacia un orden');
  const m = arrowId(vb, label);
  return (
    <Svg vb={vb} label={label}>
      <Box x={10} y={30} w={150} h={56} title={tr(lang, 'Instance', 'Instancia')} sub={[tr(lang, 'blocks + scenario', 'bloques + escenario')]} />
      <Box x={200} y={10} w={170} h={56} title={tr(lang, 'Critical multiplier', 'Multiplicador crítico')} sub={[tr(lang, 'tens of closures', 'decenas de cierres')]} />
      <Box x={200} y={90} w={170} h={56} title={tr(lang, 'Surrogate MLP', 'MLP sustituto')} sub={[tr(lang, '12 features, no LP', '12 rasgos, sin LP')]} accent />
      <Box x={410} y={50} w={140} h={56} title="TopoSort" sub={[tr(lang, 'w = -E_b', 'w = -E_b')]} />
      <Arrow x1={160} y1={52} x2={198} y2={40} markerId={m} />
      <Arrow x1={160} y1={64} x2={198} y2={112} markerId={m} />
      <Arrow x1={370} y1={38} x2={408} y2={70} markerId={m} label="E_b" />
      <Arrow x1={370} y1={118} x2={408} y2={92} markerId={m} label={tr(lang, 'Ê_b', 'Ê_b')} ly={124} />
      <text x={280} y={190} textAnchor="middle" className="pfd-dg-small">{tr(lang, 'same walk, same feasibility: only the weight differs', 'mismo recorrido, misma factibilidad: solo cambia el peso')}</text>
      <text x={280} y={210} textAnchor="middle" className="pfd-dg-small">{tr(lang, 'scored by the ratio of its plan to the exact ExTS plan', 'se juzga por la razón entre su plan y el plan ExTS exacto')}</text>
      <text x={280} y={244} textAnchor="middle" className="dg-note">{tr(lang, 'the bound still comes from the exact path; the surrogate certifies nothing', 'la cota sigue viniendo del camino exacto; el sustituto no certifica nada')}</text>
    </Svg>
  );
}

/** Leakage-safe evaluation: split by deposit, never by row (the anti-pattern is struck out). */
export function DepositSplit({ lang }: { lang: Lang }) {
  const vb = '0 0 560 300';
  const label = tr(lang, 'Split by deposit, never by row', 'Partición por depósito, nunca por fila');
  const seeds = (y: number, n: number, cls: string, title: string) => (
    <g>
      <text x={20} y={y + 16} className="pfd-dg-small">{title}</text>
      {Array.from({ length: n }, (_, i) => <rect key={i} x={170 + i * 30} y={y} width={24} height={24} rx={4} className={cls} />)}
    </g>
  );
  return (
    <Svg vb={vb} label={label}>
      <text x={280} y={22} textAnchor="middle" className="pfd-dg-title">{tr(lang, 'deposits are the unit of the split', 'los depósitos son la unidad de la partición')}</text>
      {seeds(40, 12, 'dg-fill-accent', tr(lang, 'training seeds', 'semillas de entrenamiento'))}
      {seeds(76, 6, 'dg-fill-warn', tr(lang, 'held-out seeds', 'semillas retenidas'))}
      {seeds(112, 6, 'dg-box', tr(lang, 'third split', 'tercera partición'))}
      <text x={280} y={160} textAnchor="middle" className="pfd-dg-small">{tr(lang, 'every scenario of a deposit stays with its deposit; the sets are asserted disjoint', 'todo escenario de un depósito queda con su depósito; los conjuntos se verifican disjuntos')}</text>
      <rect x={60} y={186} width={440} height={64} rx={8} className="dg-box" style={{ stroke: 'var(--color-bad)' }} />
      <text x={280} y={210} textAnchor="middle" className="pfd-dg-bad">{tr(lang, 'random split of block rows', 'partición aleatoria por filas de bloque')}</text>
      <text x={280} y={230} textAnchor="middle" className="pfd-dg-small">{tr(lang, 'two scenarios of one deposit share almost every feature', 'dos escenarios de un depósito comparten casi todos los rasgos')}</text>
      <line x1={70} y1={244} x2={490} y2={192} className="pfd-dg-strike" />
      <text x={280} y={278} textAnchor="middle" className="dg-note">{tr(lang, 'the struck-out design scores the model on a copy of what it memorised', 'el diseño tachado juzga al modelo sobre una copia de lo que memorizó')}</text>
    </Svg>
  );
}

/** Destinations: per destination the earliest period that fits, then the best discounted choice. */
/** The re-cut: which ore gets a binding plant, under a fixed cutoff and under the LP's destinations. */
export function DestinationRecut({ lang }: { lang: Lang }) {
  const vb = '0 0 560 340';
  const label = tr(lang, 'The re-cut on the PCPSP relaxation', 'El re-corte sobre la relajación PCPSP');
  const mk = arrowId(vb, label);
  const s = 34;
  const section = (ox: number, marginal: string, rich: string) => (
    <g>
      {[0, 1, 2].flatMap((r) => [0, 1, 2, 3, 4].map((c) => (
        <rect key={`${ox}-${r}-${c}`} x={ox + c * s} y={70 + r * s} width={s - 3} height={s - 3} rx={3}
              className={r === 0 ? undefined : r === 1 ? 'dg-fill-warn' : 'dg-fill-accent'}
              style={r === 0 ? { fill: 'var(--color-surface-2)' } : undefined} />
      )))}
      {[0, 1, 2, 3, 4].map((c) => (
        <g key={`${ox}-l-${c}`}>
          <text x={ox + c * s + (s - 3) / 2} y={70 + s + 20} textAnchor="middle" className="pfd-dg-mono">{marginal}</text>
          <text x={ox + c * s + (s - 3) / 2} y={70 + 2 * s + 20} textAnchor="middle" className="pfd-dg-mono">{rich}</text>
        </g>
      ))}
    </g>
  );
  const flow = [
    ['PCPSP LP', tr(lang, 'HiGHS or dual', 'HiGHS o dual')],
    [tr(lang, 're-cut', 're-corte'), tr(lang, 'its destinations', 'sus destinos')],
    ['CPIT', tr(lang, 'same values', 'mismos valores')],
    [tr(lang, 'schedule', 'programar'), tr(lang, 'ExTS · window', 'ExTS · ventana')],
    [tr(lang, 'search', 'búsqueda'), 'OPBSP-[D]'],
  ];
  return (
    <Svg vb={vb} label={label}>
      <text x={280} y={24} textAnchor="middle" className="pfd-dg-title">{tr(lang, 'which ore gets the plant when the plant binds', 'qué mineral recibe la planta cuando la planta limita')}</text>
      <text x={125} y={56} textAnchor="middle" className="pfd-dg-small">{tr(lang, 'fixed cutoff (CPIT)', 'corte fijo (CPIT)')}</text>
      <text x={435} y={56} textAnchor="middle" className="pfd-dg-small">{tr(lang, 're-cut on the relaxation', 're-corte sobre la relajación')}</text>
      {section(42, 'P', '3')}
      {section(352, 'D', '1')}
      <text x={125} y={192} textAnchor="middle" className="dg-note">{tr(lang, 'marginal ore takes plant tonnage;', 'el mineral marginal toma tonelaje de planta;')}</text>
      <text x={125} y={207} textAnchor="middle" className="dg-note">{tr(lang, 'the rich ore below waits (period 3)', 'el mineral rico de abajo espera (período 3)')}</text>
      <text x={435} y={192} textAnchor="middle" className="dg-note">{tr(lang, 'the LP dumps the marginal ore;', 'la LP bota el mineral marginal;')}</text>
      <text x={435} y={207} textAnchor="middle" className="dg-note">{tr(lang, 'the plant goes to the rich ore now', 'la planta va al mineral rico ahora')}</text>
      <text x={280} y={232} textAnchor="middle" className="pfd-dg-small">{tr(lang, 'rows: waste, marginal ore, rich ore; P plant, D dump, digits the period the rich ore is processed', 'filas: estéril, mineral marginal, mineral rico; P planta, D botadero, dígitos el período en que se procesa el mineral rico')}</text>
      {flow.map(([t, sub], i) => (
        <g key={t}>
          <Box x={14 + i * 108} y={250} w={96} h={44} title={t} sub={[sub]} accent={i === 1} />
          {i < flow.length - 1 && <Arrow x1={110 + i * 108} y1={272} x2={122 + i * 108} y2={272} markerId={mk} />}
        </g>
      ))}
      <text x={280} y={318} textAnchor="middle" className="dg-note">{tr(lang, 'every plan of the re-cut CPIT is a PCPSP plan at the same value; the search frees every destination again', 'todo plan del CPIT re-cortado es un plan PCPSP del mismo valor; la búsqueda libera de nuevo todo destino')}</text>
    </Svg>
  );
}

/** Operability: components per period and slivers absorbed into their neighbours' period. */
export function Operability({ lang }: { lang: Lang }) {
  const vb = '0 0 560 270';
  const label = tr(lang, 'Components and slivers on one bench', 'Componentes y astillas en un banco');
  const grid = (ox: number, map: string[]) => map.flatMap((row, r) => row.split('').map((ch, c) => (
    <rect key={`${ox}-${r}-${c}`} x={ox + c * 20} y={50 + r * 20} width={18} height={18} rx={2}
          style={{ fill: ch === '.' ? 'var(--color-surface-2)' : periodCss(+ch, 4) }} />
  )));
  const before = ['0001112222', '0001112222', '0101112.22', '0001113222', '.....33333'];
  const after = ['0001112222', '0001112222', '0001112222', '0001112222', '.....33333'];
  return (
    <Svg vb={vb} label={label}>
      <text x={120} y={30} textAnchor="middle" className="pfd-dg-title">{tr(lang, 'before', 'antes')}</text>
      <text x={420} y={30} textAnchor="middle" className="pfd-dg-title">{tr(lang, 'after min-width', 'después de ancho mínimo')}</text>
      {grid(20, before)}
      {grid(320, after)}
      <text x={120} y={170} textAnchor="middle" className="pfd-dg-small">{tr(lang, 'slivers one block wide; a stray block', 'astillas de un bloque; un bloque suelto')}</text>
      <text x={420} y={170} textAnchor="middle" className="pfd-dg-small">{tr(lang, 'absorbed into the majority neighbour', 'absorbidas por el vecino mayoritario')}</text>
      <text x={280} y={214} textAnchor="middle" className="dg-note">{tr(lang, 'a move is made only if precedence holds both ways and the receiving period has the capacity', 'un movimiento se hace solo si la precedencia se cumple en ambos sentidos y el período receptor tiene capacidad')}</text>
      <text x={280} y={232} textAnchor="middle" className="dg-note">{tr(lang, 'measured per period: components, share of the largest, narrowest run', 'medido por período: componentes, fracción de la mayor, tramo más estrecho')}</text>
    </Svg>
  );
}

/** The ensemble: plans evaluated across correlated realisations, read by their spread. */
export function EnsembleFan({ lang }: { lang: Lang }) {
  const vb = '0 0 560 270';
  const label = tr(lang, 'Plans across realisations', 'Planes a través de realizaciones');
  const plans = [
    [tr(lang, 'plan A', 'plan A'), 170, 40, 'var(--color-accent)'],
    [tr(lang, 'plan B', 'plan B'), 178, 70, 'var(--color-magenta)'],
  ] as const;
  return (
    <Svg vb={vb} label={label}>
      <line x1={40} y1={200} x2={520} y2={200} className="dg-axis" />
      <text x={280} y={226} textAnchor="middle" className="dg-axis-label">{tr(lang, 'NPV of a fixed plan across realisations', 'VAN de un plan fijo a través de realizaciones')}</text>
      {plans.map(([name, mean, spread, color], i) => {
        const cx = 120 + mean * 1.6;
        return (
          <g key={i}>
            <line x1={cx - spread} x2={cx + spread} y1={70 + i * 60} y2={70 + i * 60} style={{ stroke: color, strokeWidth: 3 }} />
            <circle cx={cx} cy={70 + i * 60} r={6} style={{ fill: color }} />
            <line x1={cx - spread * 0.8} x2={cx - spread * 0.8} y1={60 + i * 60} y2={80 + i * 60} style={{ stroke: color, strokeWidth: 2 }} />
            <text x={cx - spread * 0.8} y={54 + i * 60} textAnchor="middle" className="pfd-dg-mono">P10</text>
            <text x={60} y={74 + i * 60} className="pfd-dg-small">{name}</text>
          </g>
        );
      })}
      <text x={280} y={244} textAnchor="middle" className="dg-note">{tr(lang, 'B has the higher mean, A the higher P10: the robust choice is not the best on average', 'B tiene la media mayor, A el P10 mayor: la elección robusta no es la mejor en promedio')}</text>
      <text x={280} y={262} textAnchor="middle" className="dg-note">{tr(lang, 'a spatially correlated, mean-preserving perturbation; synthetic, and labelled so', 'una perturbación espacialmente correlacionada que preserva la media; sintética, y rotulada así')}</text>
    </Svg>
  );
}

/** Why a stockpile is not a third destination: the reclaimed grade is a ratio of decisions. */
export function StockpileBilinear({ lang }: { lang: Lang }) {
  const vb = '0 0 560 250';
  const label = tr(lang, 'A stockpile makes the model bilinear', 'Un acopio vuelve bilineal el modelo');
  return (
    <Svg vb={vb} label={label}>
      <path d="M120 170 L200 80 L280 170 Z" className="dg-fill-warn" />
      <text x={200} y={196} textAnchor="middle" className="pfd-dg-small">{tr(lang, 'pile: tonnes S_t, metal M_t', 'pila: toneladas S_t, metal M_t')}</text>
      <text x={400} y={90} textAnchor="middle" className="pfd-dg-mono">{tr(lang, 'reclaimed metal =', 'metal recuperado =')}</text>
      <text x={400} y={112} textAnchor="middle" className="pfd-dg-mono">R_t × (M_t / S_t)</text>
      <text x={400} y={140} textAnchor="middle" className="pfd-dg-small">{tr(lang, 'a product of decision variables', 'un producto de variables de decisión')}</text>
      <text x={280} y={226} textAnchor="middle" className="dg-note">{tr(lang, 'published linear models fix the pile grade as a parameter and search over it', 'los modelos lineales publicados fijan la ley de la pila como parámetro y buscan sobre ella')}</text>
      <text x={280} y={244} textAnchor="middle" className="dg-note">{tr(lang, 'at 10 percent yearly degradation a stockpile loses 69 percent of its value', 'con 10 por ciento de degradación anual un acopio pierde 69 por ciento de su valor')}</text>
    </Svg>
  );
}
