/** Figures for the Introduction: where scheduling sits, what it adds to a pit, and what PhaseFlow does. */
import { periodCss } from '../../viz/colormap.ts';
import { Arrow, Box, Svg, arrowId, tr, type Lang } from './kit.tsx';

/** The long-term planning chain, with the step this product answers. */
export function PlanningChain({ lang }: { lang: Lang }) {
  const vb = '0 0 980 210';
  const label = tr(lang, 'The open-pit planning chain', 'La cadena de planificación de rajo abierto');
  const m = arrowId(vb, label);
  const steps: Array<[string, string, string[], boolean?]> = [
    [tr(lang, 'Block model', 'Modelo de bloques'), '', [tr(lang, 'grade, tonnes, rock', 'ley, toneladas, roca'), tr(lang, 'kriged or simulated', 'krigeado o simulado')]],
    [tr(lang, 'Block economics', 'Economía por bloque'), '', [tr(lang, 'value per destination', 'valor por destino'), tr(lang, 'price, costs, recovery', 'precio, costos, recuperación')]],
    [tr(lang, 'Ultimate pit', 'Pit final'), '', [tr(lang, 'WHICH blocks', 'QUÉ bloques'), tr(lang, 'max closure, exact', 'cierre máximo, exacto')]],
    [tr(lang, 'Production schedule', 'Plan de producción'), '', [tr(lang, 'WHEN each block', 'CUÁNDO cada bloque'), tr(lang, 'NP-hard, years', 'NP-duro, años')], true],
    [tr(lang, 'Short-term plans', 'Planes de corto plazo'), '', [tr(lang, 'months, fleet, blend', 'meses, flota, mezcla'), tr(lang, 'dispatch', 'despacho')]],
  ];
  const w = 168, gap = 30, y = 46, h = 84;
  return (
    <Svg vb={vb} label={label} wide>
      {steps.map(([title, , sub, hl], i) => {
        const x = 10 + i * (w + gap);
        return (
          <g key={i}>
            <Box x={x} y={y} w={w} h={h} title={title} sub={sub} accent={hl} />
            {i < steps.length - 1 && <Arrow x1={x + w + 2} y1={y + h / 2} x2={x + w + gap - 3} y2={y + h / 2} markerId={m} />}
          </g>
        );
      })}
      <text x={10 + 3 * (w + gap) + w / 2} y={y - 14} textAnchor="middle" className="dg-marker-label">PhaseFlow</text>
      <text x={490} y={170} textAnchor="middle" className="dg-note">
        {tr(lang,
          'Each step fixes the input of the next. The schedule decides the cash profile: the same pit mined in a different order is worth a different NPV.',
          'Cada paso fija la entrada del siguiente. El plan decide el perfil de caja: el mismo pit extraído en otro orden vale otro VAN.')}
      </text>
      <text x={490} y={190} textAnchor="middle" className="dg-note">
        {tr(lang, 'Pushback design and bench-phases sit between the pit and the schedule in industrial practice.',
          'En la práctica industrial, el diseño de expansiones y fases-banco se ubica entre el pit y el plan.')}
      </text>
    </Svg>
  );
}

/** Which blocks (a set) against when (a set per period): the same section, read twice. */
export function WhichWhen({ lang }: { lang: Lang }) {
  const vb = '0 0 760 250';
  const label = tr(lang, 'Ultimate pit versus schedule on one section', 'Pit final versus plan en una sección');
  const s = 22;
  // a pit section 13 cells wide and 6 deep; the pit is a trapezoid that narrows by one cell per level
  const cols = 13, rows = 6;
  const inPit = (c: number, r: number) => c >= r && c < cols - r && r < 5;
  // period of each pit cell: a schedule that opens in the middle and widens, deeper later
  const period = (c: number, r: number) => Math.min(5, Math.floor(Math.abs(c - 6) / 2) + r);
  const draw = (ox: number, scheduled: boolean) => {
    const cells = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = ox + c * s, y = 52 + r * s;
        const pit = inPit(c, r);
        cells.push(
          <rect key={`${r}-${c}`} x={x} y={y} width={s - 1.5} height={s - 1.5} rx={2}
                className={pit ? (scheduled ? undefined : 'dg-fill-accent') : 'pfd-dg-band'}
                style={pit && scheduled ? { fill: periodCss(period(c, r), 6), stroke: 'none' }
                  : pit ? undefined : { fill: 'var(--color-surface-2)' }} />,
        );
        if (pit && scheduled) {
          cells.push(<text key={`t${r}-${c}`} x={x + s / 2 - 0.7} y={y + s / 2 + 3.5} textAnchor="middle"
                           style={{ fill: period(c, r) >= 3 ? '#1f2328' : '#ffffff', font: '600 10px var(--font-mono)' }}>{period(c, r) + 1}</text>);
        }
      }
    }
    return cells;
  };
  return (
    <Svg vb={vb} label={label} wide>
      <text x={20 + (cols * s) / 2} y={30} textAnchor="middle" className="pfd-dg-title">{tr(lang, 'UPIT: which blocks', 'UPIT: qué bloques')}</text>
      <text x={400 + (cols * s) / 2} y={30} textAnchor="middle" className="pfd-dg-title">{tr(lang, 'CPIT: in which period', 'CPIT: en qué período')}</text>
      {draw(20, false)}
      {draw(400, true)}
      <text x={20 + (cols * s) / 2} y={208} textAnchor="middle" className="pfd-dg-small">{tr(lang, 'one set, maximum undiscounted value, polynomial', 'un conjunto, máximo valor sin descontar, polinomial')}</text>
      <text x={400 + (cols * s) / 2} y={208} textAnchor="middle" className="pfd-dg-small">{tr(lang, 'a period per block, discounted, capacity per period, NP-hard', 'un período por bloque, descontado, capacidad por período, NP-duro')}</text>
      <text x={400 + (cols * s) / 2} y={228} textAnchor="middle" className="dg-note">{tr(lang, 'numbers: extraction period; a block is never mined before the rock above it', 'números: período de extracción; un bloque nunca se extrae antes que la roca sobre él')}</text>
    </Svg>
  );
}

/** Discounting, precedence and capacity pulling on one schedule. */
export function ThreePressures({ lang }: { lang: Lang }) {
  const vb = '0 0 640 300';
  const label = tr(lang, 'Three pressures on a schedule', 'Tres presiones sobre un plan');
  const m = arrowId(vb, label);
  return (
    <Svg vb={vb} label={label}>
      <Box x={230} y={118} w={180} h={64} title={tr(lang, 'The schedule', 'El plan')} sub={[tr(lang, 'x_bt for every block, period', 'x_bt por bloque y período')]} accent />
      <Box x={20} y={20} w={190} h={70} title={tr(lang, 'Discounting', 'Descuento')} sub={[tr(lang, 'value now > value later', 'valor hoy > valor después'), 'd_t = (1+η)^-(t-1)']} />
      <Box x={430} y={20} w={190} h={70} title={tr(lang, 'Precedence', 'Precedencia')} sub={[tr(lang, 'rock above comes first', 'la roca de arriba va primero'), tr(lang, 'slope angle, every period', 'ángulo de talud, cada período')]} />
      <Box x={225} y={214} w={190} h={70} title={tr(lang, 'Capacity', 'Capacidad')} sub={[tr(lang, 'fleet and plant per year', 'flota y planta por año'), 'Σ a_rb ≤ c_rt']} />
      <Arrow x1={210} y1={70} x2={262} y2={118} markerId={m} label={tr(lang, 'mine ore early', 'extraer mineral temprano')} lx={175} ly={112} />
      <Arrow x1={430} y1={70} x2={378} y2={118} markerId={m} label={tr(lang, 'strip waste first', 'remover estéril antes')} lx={470} ly={112} />
      <Arrow x1={320} y1={214} x2={320} y2={184} markerId={m} />
      <text x={320} y={296} textAnchor="middle" className="dg-note">{tr(lang, 'the plan is where the three balance; move one and the pit changes shape', 'el plan es donde las tres se equilibran; mueve una y el rajo cambia de forma')}</text>
    </Svg>
  );
}

/** The four-step industrial chain, drawn as Chicoisne et al. Figure 1 does: one section, four readings. */
export function FourStepChain({ lang }: { lang: Lang }) {
  const vb = '0 0 980 220';
  const label = tr(lang, 'Nested pits, pushbacks, bench-phases, periods', 'Pits anidados, expansiones, fases-banco, períodos');
  const s = 14, cols = 13, rows = 6;
  // nested shells on a trapezoidal section: shell 0 is the inner pit, each outer shell widens it
  const shell = (c: number, r: number) => {
    const d = Math.abs(c - 6);
    if (r >= 5 || d > 5 - r) return -1;
    return d <= 1 ? 0 : d <= 3 ? 1 : 2;
  };
  const panels = [
    tr(lang, '1. nested pits by revenue factor', '1. pits anidados por factor de ingreso'),
    tr(lang, '2. pushbacks: chosen by a planner', '2. expansiones: elegidas por un planificador'),
    tr(lang, '3. bench-phases', '3. fases-banco'),
    tr(lang, '4. a period per bench-phase', '4. un período por fase-banco'),
  ];
  return (
    <Svg vb={vb} label={label} wide>
      {panels.map((title, p) => {
        const ox = 14 + p * 242;
        const cells = [];
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const k = shell(c, r);
            const x = ox + c * s, y = 46 + r * s;
            if (k < 0) {
              cells.push(<rect key={`${r}-${c}`} x={x} y={y} width={s - 1} height={s - 1} className="pfd-dg-band" style={{ fill: 'var(--color-surface-2)' }} />);
              continue;
            }
            let fill = 'var(--color-accent-soft)';
            if (p === 0) fill = `color-mix(in oklab, var(--color-accent) ${70 - k * 18}%, transparent)`;
            if (p === 1) fill = k === 0 ? 'color-mix(in oklab, var(--color-accent) 60%, transparent)' : k <= 1 ? 'color-mix(in oklab, var(--color-magenta) 45%, transparent)' : 'color-mix(in oklab, var(--color-warn) 40%, transparent)';
            if (p >= 2) fill = k === 0 ? 'color-mix(in oklab, var(--color-accent) 60%, transparent)' : k <= 1 ? 'color-mix(in oklab, var(--color-magenta) 45%, transparent)' : 'color-mix(in oklab, var(--color-warn) 40%, transparent)';
            const per = Math.min(5, (k === 0 ? 0 : k <= 1 ? 2 : 4) + Math.floor(r / 3));
            if (p === 3) fill = periodCss(per, 6);
            cells.push(<rect key={`${r}-${c}`} x={x} y={y} width={s - 1} height={s - 1} style={{ fill }} />);
            if (p === 3) cells.push(<text key={`t${r}-${c}`} x={x + s / 2 - 0.5} y={y + s / 2 + 3} textAnchor="middle" style={{ fill: per >= 3 ? '#1f2328' : '#fff', font: '600 8px var(--font-mono)' }}>{per + 1}</text>);
          }
          if (p === 2) cells.push(<line key={`b${r}`} x1={ox} x2={ox + cols * s} y1={46 + r * s - 0.5} y2={46 + r * s - 0.5} className="dg-axis" />);
        }
        return (
          <g key={p}>
            <text x={ox + (cols * s) / 2} y={32} textAnchor="middle" className="pfd-dg-small">{title}</text>
            {cells}
          </g>
        );
      })}
      <text x={490} y={160} textAnchor="middle" className="dg-note">
        {tr(lang, 'Only steps 1 and 3 are algorithms; the pushback choice is a planner\'s, and so is meeting the capacities (Morales et al. 2015).',
          'Solo los pasos 1 y 3 son algoritmos; la elección de expansiones es del planificador, y también cumplir las capacidades (Morales et al. 2015).')}
      </text>
      <text x={490} y={180} textAnchor="middle" className="dg-note">
        {tr(lang, 'Direct block scheduling replaces the chain with one model whose constraints hold by construction.',
          'La programación directa por bloques reemplaza la cadena por un modelo cuyas restricciones se cumplen por construcción.')}
      </text>
    </Svg>
  );
}

/** What PhaseFlow runs, from a block model to the screen. */
export function PipelineOverview({ lang }: { lang: Lang }) {
  const vb = '0 0 1000 250';
  const label = tr(lang, 'From a block model to a judged schedule', 'De un modelo de bloques a un plan juzgado');
  const m = arrowId(vb, label);
  const boxes: Array<[number, number, string, string[], boolean?]> = [
    [10, 30, tr(lang, 'Instance', 'Instancia'), [tr(lang, 'MineLib file or seeded twin', 'archivo MineLib o gemelo'), tr(lang, 'contract-checked', 'validada por contrato')]],
    [210, 30, tr(lang, 'Certified bounds', 'Cotas certificadas'), [tr(lang, 'critical multiplier, Alg. 4', 'multiplicador crítico, Alg. 4'), tr(lang, 'joint BZ, PCPSP LP', 'BZ conjunta, LP PCPSP')], true],
    [410, 30, tr(lang, 'Method ladder', 'Escalera de métodos'), [tr(lang, 'classical, SOTA, learned', 'clásicos, SOTA, aprendido'), tr(lang, 'feasible by construction', 'factibles por construcción')]],
    [610, 30, tr(lang, 'Judgement', 'Juicio'), [tr(lang, 'gap to its own bound', 'brecha a su propia cota'), tr(lang, 'controls, coherence', 'controles, coherencia')]],
    [810, 30, tr(lang, 'Evidence', 'Evidencia'), [tr(lang, 'trace + manifest', 'traza + manifiesto'), tr(lang, 'committed, checked', 'versionada, verificada')]],
    [210, 150, tr(lang, 'Beyond CPIT', 'Más allá de CPIT'), [tr(lang, 'destinations, operability', 'destinos, operabilidad'), tr(lang, 'uncertainty', 'incertidumbre')]],
    [610, 150, tr(lang, 'This app', 'Esta app'), [tr(lang, 'replays the evidence', 'reproduce la evidencia'), tr(lang, 're-solves twins live', 're-resuelve gemelos en vivo')], true],
  ];
  return (
    <Svg vb={vb} label={label} wide>
      {boxes.map(([x, y, t, sub, acc], i) => <Box key={i} x={x} y={y} w={180} h={74} title={t} sub={sub} accent={acc} />)}
      <Arrow x1={190} y1={67} x2={208} y2={67} markerId={m} />
      <Arrow x1={390} y1={67} x2={408} y2={67} markerId={m} />
      <Arrow x1={590} y1={67} x2={608} y2={67} markerId={m} />
      <Arrow x1={790} y1={67} x2={808} y2={67} markerId={m} />
      <Arrow x1={500} y1={104} x2={390} y2={150} markerId={m} dashed />
      <Arrow x1={390} y1={187} x2={608} y2={187} markerId={m} dashed label={tr(lang, 'own bound, own gap', 'cota propia, brecha propia')} />
      <Arrow x1={900} y1={104} x2={790} y2={170} markerId={m} />
      <text x={500} y={244} textAnchor="middle" className="dg-note">{tr(lang, 'no number reaches the screen without the bound it is judged against', 'ningún número llega a la pantalla sin la cota contra la que se juzga')}</text>
    </Svg>
  );
}

/** What is exact, what is heuristic, what is illustrative and what is out. */
export function ScopeMap({ lang }: { lang: Lang }) {
  const vb = '0 0 640 270';
  const label = tr(lang, 'What each number is', 'Qué es cada número');
  const cols: Array<[string, string[], string]> = [
    [tr(lang, 'Exact', 'Exacto'), [tr(lang, 'ultimate pit', 'pit final'), tr(lang, 'CPIT LP bound', 'cota LP CPIT'), tr(lang, 'PCPSP LP bound', 'cota LP PCPSP'), tr(lang, 'controls', 'controles')], 'good'],
    [tr(lang, 'Heuristic', 'Heurístico'), [tr(lang, 'every schedule', 'todo plan'), tr(lang, 'with its gap', 'con su brecha'), tr(lang, 'learned rung', 'peldaño aprendido')], 'accent'],
    [tr(lang, 'Illustrative', 'Ilustrativo'), [tr(lang, 'seeded twins', 'gemelos sembrados'), tr(lang, 'synthetic ensemble', 'ensamble sintético'), tr(lang, 'declared scenarios', 'escenarios declarados')], 'warn'],
    [tr(lang, 'Out of scope', 'Fuera de alcance'), [tr(lang, 'stockpiles', 'acopios'), tr(lang, 'blending', 'mezcla'), tr(lang, 'stochastic SIP', 'SIP estocástico'), tr(lang, 'haulage', 'transporte')], 'bad'],
  ];
  return (
    <Svg vb={vb} label={label}>
      {cols.map(([t, items, tone], i) => {
        const x = 10 + i * 157;
        return (
          <g key={i}>
            <rect x={x} y={20} width={147} height={220} rx={8} className="dg-box"
                  style={{ stroke: `var(--color-${tone})` }} />
            <text x={x + 73} y={44} textAnchor="middle" className="dg-box-title" style={{ fill: `var(--color-${tone})` }}>{t}</text>
            {items.map((it, k) => <text key={k} x={x + 73} y={74 + k * 26} textAnchor="middle" className="pfd-dg-small">{it}</text>)}
          </g>
        );
      })}
      <text x={320} y={262} textAnchor="middle" className="dg-note">{tr(lang, 'the label travels with the number on every surface', 'la etiqueta acompaña al número en toda superficie')}</text>
    </Svg>
  );
}
