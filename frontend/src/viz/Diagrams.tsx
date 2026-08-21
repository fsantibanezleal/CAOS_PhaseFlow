// Hand-authored, theme-aware diagrams for the content pages.
//
// WHY THIS FILE EXISTS. Measured on the deployed site: methodology 470 words / 0 diagrams,
// implementation 726 / 0, experiments 204 / 0, benchmark 851 / 0. Every content page was text, equations
// and DOIs with nothing drawn. The equations state the constraints correctly and still do not SHOW what a
// precedence cone is, what monotonicity forbids, or what the gap between a bound and a feasible schedule
// means. Those are geometric facts, and a reader meeting them for the first time needs to see them.
//
// THEME. Every stroke and fill is `currentColor` or a CSS variable, never a literal colour, so a diagram
// inherits the page's text colour and inverts with the theme instead of becoming a black drawing on a
// black background. Hierarchy is carried by opacity rather than hue, which also keeps it readable for
// someone who cannot separate the accent from the foreground.
//
// SIZING. `viewBox` plus width 100% / height auto, so a diagram scales with its container and can never
// force its parent wider. That is the failure mode that made the Profile charts grow without limit.

import type { ReactNode } from 'react';
import { useShellLang } from '@fasl-work/caos-app-shell';

const SHARED = (
  <>
    <style>{`
      .dg-b  { fill: none; stroke: currentColor; stroke-width: 1.4; opacity: .85 }
      .dg-f  { fill: currentColor; opacity: .07 }
      .dg-t  { fill: currentColor; font: 12px system-ui, sans-serif }
      .dg-tb { fill: currentColor; font: 600 12.5px system-ui, sans-serif }
      .dg-ts { fill: currentColor; font: 10.5px system-ui, sans-serif; opacity: .72 }
      .dg-a  { fill: none; stroke: currentColor; stroke-width: 1.3; opacity: .8; marker-end: url(#dgA) }
      .dg-d  { stroke-dasharray: 4 3 }
      .dg-ok { fill: currentColor; opacity: .13 }
      .dg-hl { stroke: var(--color-accent, currentColor); stroke-width: 2.2; fill: none }
    `}</style>
    <defs>
      <marker id="dgA" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
        <path d="M0 0 L10 5 L0 10 z" fill="currentColor" />
      </marker>
    </defs>
  </>
);

function Fig({ vb, caption, children }: { vb: string; caption: string; children: ReactNode }) {
  return (
    <figure className="pf-fig">
      <svg viewBox={vb} role="img" aria-label={caption} xmlns="http://www.w3.org/2000/svg"
           style={{ width: '100%', height: 'auto', display: 'block' }}>
        {SHARED}
        {children}
      </svg>
      <figcaption className="pf-figcap">{caption}</figcaption>
    </figure>
  );
}

/** The slope precedence cone: why a block cannot be mined before the rock above it. This is the single
 *  geometric fact the whole formulation rests on, and the algebra for it shows the inequality without
 *  showing the shape. */
export function PrecedenceCone() {
  const es = useShellLang() === 'es';
  const cell = 32, cx = 250, top = 34;
  const cells: ReactNode[] = [];
  for (let lvl = 0; lvl < 5; lvl++) {
    const n = 1 + lvl * 2;
    for (let i = 0; i < n; i++) {
      const x = cx - ((n - 1) / 2) * cell + i * cell;
      const y = top + (4 - lvl) * cell;
      const target = lvl === 0;
      cells.push(
        <g key={lvl + '-' + i}>
          <rect className={target ? 'dg-f' : 'dg-ok'} x={x - cell / 2 + 2} y={y + 2}
                width={cell - 4} height={cell - 4} rx={3} />
          <rect className={target ? 'dg-hl' : 'dg-b'} x={x - cell / 2 + 2} y={y + 2}
                width={cell - 4} height={cell - 4} rx={3} />
        </g>,
      );
    }
  }
  const baseY = top + 4 * cell;
  return (
    <Fig vb="0 0 620 220"
         caption={es
           ? 'Cono de precedencia: para extraer el bloque marcado hay que haber extraido antes todo el cono sobre el. El angulo del cono es el angulo de talud. La restriccion se impone en CADA periodo, y por eso es una restriccion de planificacion y no de conjunto.'
           : 'Precedence cone: to mine the highlighted block, the entire cone above it must already have been mined. The cone angle IS the slope angle. The constraint is imposed in EVERY period, which is what makes it a scheduling constraint rather than a set constraint.'}>
      {cells}
      {/* The slope lines must trace the OUTER EDGE of the cone, not cut through it. The top level spans
          4 cells either side of centre, the bottom level is a single cell, so the edge runs from
          (cx - 4.5*cell) at the top to (cx - 0.5*cell) at the base. Drawing it any shorter puts the
          "slope angle" annotation on a line that is not the slope. */}
      <path className="dg-b dg-d"
            d={'M' + (cx - 4.5 * cell + 2) + ' ' + (top + 2) + ' L' + (cx - cell / 2 + 2) + ' ' + (baseY + cell - 2)} />
      <path className="dg-b dg-d"
            d={'M' + (cx + 4.5 * cell - 2) + ' ' + (top + 2) + ' L' + (cx + cell / 2 - 2) + ' ' + (baseY + cell - 2)} />
      <text className="dg-tb" x="18" y="30">{es ? 'superficie' : 'surface'}</text>
      <text className="dg-ts" x="18" y="48">{es ? 'se mina primero' : 'mined first'}</text>
      <text className="dg-ts" x="404" y="46">{es ? 'angulo de talud' : 'slope angle'}</text>
      <text className="dg-tb" x="404" y={baseY + 16}>{es ? 'bloque objetivo' : 'target block'}</text>
      <text className="dg-ts" x="404" y={baseY + 34}>{es ? 'ultimo del cono' : 'last of the cone'}</text>
    </Fig>
  );
}

/** Cumulative variables and monotonicity: what x(b,t) means, and what dropping monotonicity silently
 *  permits. Omitting that constraint is a real bug, not a modelling nicety. */
export function CumulativeStep() {
  const es = useShellLang() === 'es';
  const bx = 74, by = 150, w = 420, T = 6, h = 70;
  const step = w / T;
  const ok = [0, 0, 1, 1, 1, 1];
  const bad = [0, 1, 1, 0, 1, 1];
  const path = (a: number[]) =>
    a.map((v, i) =>
      (i === 0 ? 'M' : 'L') + (bx + i * step) + ' ' + (by - v * h) +
      ' L' + (bx + (i + 1) * step) + ' ' + (by - v * h)).join(' ');
  return (
    <Fig vb="0 0 620 215"
         caption={es
           ? 'Variables acumuladas: x(b,t)=1 significa extraido AL FINAL del periodo t. La monotonia es una restriccion de verdad. Sin ella el modelo puede des-extraer un bloque, y el plan que sale no es fisico.'
           : 'Cumulative variables: x(b,t)=1 means mined BY THE END of period t. Monotonicity is a real constraint. Without it the model can un-mine a block, and the schedule that comes out is not physical.'}>
      <path className="dg-b" d={'M' + bx + ' ' + by + ' L' + (bx + w) + ' ' + by} />
      <path className="dg-b" d={'M' + bx + ' ' + by + ' L' + bx + ' ' + (by - h - 22)} />
      {Array.from({ length: T + 1 }, (_, i) => (
        <text key={i} className="dg-ts" x={bx + i * step - 3} y={by + 18}>{i}</text>
      ))}
      <text className="dg-ts" x={bx + w / 2 - 26} y={by + 38}>{es ? 'periodo t' : 'period t'}</text>
      <text className="dg-ts" x={bx - 22} y={by - h + 4}>1</text>
      <text className="dg-ts" x={bx - 22} y={by + 4}>0</text>
      <path className="dg-hl" d={path(ok)} />
      <path className="dg-b dg-d" d={path(bad)} />
      <text className="dg-tb" x={bx + w + 14} y={by - h - 2}>{es ? 'valido' : 'valid'}</text>
      <text className="dg-ts" x={bx + w + 14} y={by - h + 16}>{es ? 'sube una vez' : 'rises once'}</text>
      <text className="dg-tb" x={bx + w + 14} y={by - 18}>{es ? 'prohibido' : 'forbidden'}</text>
      <text className="dg-ts" x={bx + w + 14} y={by}>{es ? 'baja: des-extrae' : 'falls: un-mines'}</text>
    </Fig>
  );
}

/** Bound, true optimum, feasible schedule, and the gap between what ships and what is certified. */
export function BoundGap() {
  const es = useShellLang() === 'es';
  return (
    <Fig vb="0 0 620 230"
         caption={es
           ? 'La cota LP se alcanza solo con los enteros relajados, asi que el optimo real esta por debajo de ella, y un plan factible esta por debajo del optimo. Lo unico medible es la brecha entre el plan y la cota: acota el arrepentimiento en vez de nombrarlo.'
           : 'The LP bound is attainable only with the integers relaxed, so the true optimum sits below it, and a feasible schedule sits below the optimum. The only measurable quantity is the gap between schedule and bound: it bounds the regret rather than naming it.'}>
      <path className="dg-b" d="M92 32 L92 196" />
      <text className="dg-ts" x="30" y="30">NPV</text>
      <rect className="dg-f" x="196" y="56" width="118" height="106" />
      <path className="dg-hl" d="M110 56 L500 56" />
      <text className="dg-tb" x="510" y="54">{es ? 'cota LP' : 'LP bound'}</text>
      <text className="dg-ts" x="510" y="70">{es ? 'certificada' : 'certified'}</text>
      <path className="dg-b dg-d" d="M110 104 L500 104" />
      <text className="dg-tb" x="510" y="102">{es ? 'optimo real' : 'true optimum'}</text>
      <text className="dg-ts" x="510" y="118">{es ? 'desconocido' : 'unknown'}</text>
      <path className="dg-b" d="M110 162 L500 162" />
      <text className="dg-tb" x="510" y="160">{es ? 'plan factible' : 'feasible plan'}</text>
      <text className="dg-ts" x="510" y="176">{es ? 'lo que se entrega' : 'what ships'}</text>
      <path className="dg-a" d="M255 160 L255 62" />
      <path className="dg-a" d="M255 58 L255 156" />
      <text className="dg-tb" x="268" y="104">{es ? 'brecha reportada' : 'reported gap'}</text>
      <text className="dg-ts" x="268" y="122">{es ? 'cota superior del arrepentimiento' : 'an upper bound on regret'}</text>
    </Fig>
  );
}

/** The two lanes: what is computed offline and committed, versus what is recomputed live. */
export function TwoLanes() {
  const es = useShellLang() === 'es';
  const B = (x: number, y: number, w: number, h: number, t: string, s: string) => (
    <>
      <rect className="dg-f" x={x} y={y} width={w} height={h} rx={7} />
      <rect className="dg-b" x={x} y={y} width={w} height={h} rx={7} />
      <text className="dg-tb" x={x + 11} y={y + 21}>{t}</text>
      <text className="dg-ts" x={x + 11} y={y + 38}>{s}</text>
    </>
  );
  return (
    <Fig vb="0 0 760 250"
         caption={es
           ? 'Dos carriles. Offline en Python: construye la instancia, corre la escalera completa y los controles, y escribe una traza commiteada con su manifiesto. En vivo en TypeScript: re-resuelve cuando se mueve un control, sobre el mismo motor. El navegador nunca re-corre la escalera.'
           : 'Two lanes. Offline in Python: builds the instance, runs the whole ladder and the controls, writes a committed trace with its manifest. Live in TypeScript: re-solves when a control moves, on the same engine. The browser never re-runs the ladder.'}>
      {B(18, 26, 178, 60, 'oreblocks (PyPI)', es ? 'motor, dependencia fijada' : 'engine, pinned dependency')}
      {B(18, 112, 178, 60, es ? 'Instancia' : 'Instance', es ? 'MineLib o sintetica' : 'MineLib or synthetic')}
      <path className="dg-a" d="M200 56 L276 70" />
      <path className="dg-a" d="M200 142 L276 104" />
      {B(281, 50, 176, 74, es ? 'Pipeline offline' : 'Offline pipeline', es ? 'escalera + controles' : 'ladder + controls')}
      <path className="dg-a" d="M462 87 L536 87" />
      {B(541, 56, 190, 60, es ? 'Traza + manifiesto' : 'Trace + manifest', es ? 'commiteados, verificables' : 'committed, checkable')}
      <path className="dg-a dg-d" d="M636 120 L636 160" />
      {B(541, 164, 190, 60, es ? 'App en vivo (TS)' : 'Live app (TS)', es ? 're-resuelve al mover' : 're-solves on change')}
      <text className="dg-ts" x="281" y="196">{es ? 'el navegador nunca re-corre la escalera' : 'the browser never re-runs the ladder'}</text>
      <text className="dg-ts" x="281" y="214">{es ? 'lee la traza y re-resuelve el caso' : 'it reads the trace and re-solves the case'}</text>
    </Fig>
  );
}

/** What the degeneracy control actually proves. The Controls tab used to say PASS with no picture of
 *  what was compared, which is a claim rather than evidence. */
export function DegeneracyCollapse() {
  const es = useShellLang() === 'es';
  const cell = 20;
  // The two shared diagram classes are dg-ok at 13 percent and dg-f at 7 percent opacity, which on a
  // 20px cell is no contrast at all: the first version drew both grids as a uniform grey rectangle and
  // the cone that IS the point of the figure was invisible. In-set cells are drawn in the accent with a
  // real border; out-of-set cells stay faint. The distinction has to survive a glance.
  const grid = (ox: number, oy: number, fillFn: (c: number, r: number) => boolean) => {
    const out: ReactNode[] = [];
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 9; c++) {
        const inSet = fillFn(c, r);
        out.push(
          <rect key={`${r}-${c}`}
                x={ox + c * cell} y={oy + r * cell} width={cell - 2} height={cell - 2} rx={2}
                fill={inSet ? 'var(--color-accent, #58a6ff)' : 'currentColor'}
                fillOpacity={inSet ? 0.34 : 0.05}
                stroke={inSet ? 'var(--color-accent, #58a6ff)' : 'currentColor'}
                strokeWidth={inSet ? 1.3 : 0.6}
                strokeOpacity={inSet ? 0.95 : 0.18} />,
        );
      }
    }
    return out;
  };
  // the same cone-shaped set on both sides: that IS the assertion
  const pit = (c: number, r: number) => Math.abs(c - 4) <= 4 - r;
  return (
    <Fig vb="0 0 620 230"
         caption={es
           ? 'El control de degeneracion: con tasa cero y capacidad ilimitada, el descuento y las capacidades desaparecen del objetivo y CPIT se reduce al pit final. Los dos conjuntos deben coincidir bloque a bloque y los dos valores a precision de maquina. Es la unica parte del producto con una respuesta conocida de antemano, y por eso fallar aqui es un error y no un resultado.'
           : 'The degeneracy control: at rate zero with unlimited capacity, the discounting and the capacities drop out of the objective and CPIT reduces to the ultimate pit. The two sets must agree block for block and the two values to machine precision. It is the only part of the product with a known answer in advance, which is why a failure here is a bug and not a result.'}>
      <text className="dg-tb" x="52" y="24">CPIT</text>
      <text className="dg-ts" x="52" y="41">{es ? 'tasa 0, capacidad infinita' : 'rate 0, unlimited capacity'}</text>
      {grid(52, 54, pit)}

      <text className="dg-tb" x="392" y="24">{es ? 'Pit final' : 'Ultimate pit'}</text>
      <text className="dg-ts" x="392" y="41">{es ? 'Lerchs-Grossmann exacto' : 'exact Lerchs-Grossmann'}</text>
      {grid(392, 54, pit)}

      <text className="dg-tb" x="312" y="140" textAnchor="middle" style={{ fontSize: 22 }}>=</text>
      <text className="dg-ts" x="312" y="162" textAnchor="middle">{es ? 'bloque' : 'block'}</text>
      <text className="dg-ts" x="312" y="176" textAnchor="middle">{es ? 'a bloque' : 'for block'}</text>
    </Fig>
  );
}

/** Two bounds over the SAME schedule, and why the reported gap shrinks without the plan improving.
 *
 *  This is deliberately NOT [[BoundGap]] again. That one separates bound / true optimum / feasible
 *  plan on one axis. This one holds the plan FIXED and moves the ceiling: with two capacities per
 *  period there are two certified bounds, Algorithm 4's one-resource-at-a-time relaxation and the
 *  Bienstock-Zuckerberg joint bound, and the same schedule reports a different gap against each. The
 *  difference between the two gaps is looseness in the BOUND, not shortfall in the plan, and a product
 *  that quotes the smaller number without saying which ceiling it came from is quoting a better result
 *  than it has. */
export function TwoBounds() {
  const es = useShellLang() === 'es';
  const L = 118, R = 452;
  const yA4 = 44, yBZ = 84, yOpt = 118, yPlan = 172;
  return (
    <Fig vb="0 0 620 250"
         caption={es
           ? 'La misma programacion medida contra dos techos. El Algoritmo 4 relaja un recurso a la vez y se queda con la menor de las dos cotas: certificada y mas floja. Bienstock-Zuckerberg calcula la cota conjunta sobre ambos recursos a la vez, y queda mas abajo. La brecha reportada se achica al cambiar de techo sin que el plan haya mejorado en un solo bloque, y por eso cada caso dice cual cota uso.'
           : 'The same schedule measured against two ceilings. Algorithm 4 relaxes one resource at a time and keeps the smaller of the two bounds: certified, and looser. Bienstock-Zuckerberg computes the joint bound over both resources at once, and it sits lower. The reported gap shrinks when you change ceiling without the schedule improving by a single block, which is why every case states which bound it used.'}>
      <path className="dg-b" d="M96 28 L96 200" />
      <text className="dg-ts" x="34" y="26">NPV</text>

      <path className="dg-b dg-d" d={`M${L - 8} ${yA4} L${R} ${yA4}`} />
      <text className="dg-tb" x={R + 12} y={yA4 - 2}>{es ? 'cota Algoritmo 4' : 'Algorithm 4 bound'}</text>
      <text className="dg-ts" x={R + 12} y={yA4 + 14}>{es ? 'un recurso a la vez' : 'one resource at a time'}</text>

      <path className="dg-hl" d={`M${L - 8} ${yBZ} L${R} ${yBZ}`} />
      <text className="dg-tb" x={R + 12} y={yBZ - 2}>{es ? 'cota conjunta BZ' : 'joint BZ bound'}</text>
      <text className="dg-ts" x={R + 12} y={yBZ + 14}>{es ? 'ambos a la vez, mas ajustada' : 'both at once, tighter'}</text>

      <path className="dg-b dg-d" d={`M${L - 8} ${yOpt} L${R} ${yOpt}`} />
      <text className="dg-ts" x={R + 12} y={yOpt + 4}>{es ? 'optimo real (desconocido)' : 'true optimum (unknown)'}</text>

      <path className="dg-b" d={`M${L - 8} ${yPlan} L${R} ${yPlan}`} />
      <text className="dg-tb" x={R + 12} y={yPlan + 4}>{es ? 'el MISMO plan' : 'the SAME schedule'}</text>

      {/* the two reported gaps, drawn against the same fixed plan line */}
      <path className="dg-a" d={`M${L + 34} ${yPlan - 4} L${L + 34} ${yA4 + 4}`} />
      <text className="dg-ts" x={L + 42} y={yA4 + 32}>{es ? 'brecha contra Alg 4' : 'gap vs Alg 4'}</text>

      <path className="dg-a" d={`M${L + 176} ${yPlan - 4} L${L + 176} ${yBZ + 4}`} />
      <text className="dg-ts" x={L + 184} y={yBZ + 30}>{es ? 'brecha contra BZ' : 'gap vs BZ'}</text>

      {/* the band between the ceilings IS the part of a gap that belongs to the bound */}
      <rect className="dg-f" x={L - 8} y={yA4} width={R - L + 8} height={yBZ - yA4} />
      <text className="dg-ts" x={L + 6} y={yA4 - 8}>
        {es ? 'esta banda es flojedad de la cota, no del plan' : 'this band is looseness in the bound, not in the plan'}
      </text>
    </Fig>
  );
}

/** The three pressures a schedule balances. The Introduction states them in a sentence - discounting
 *  wants everything now, precedence says the rock on top comes off first, capacity says how much fits
 *  in a year - and that sentence is the whole reason the geometry moves when a control moves. It is a
 *  picture of forces, so it should be drawn as one. */
export function ThreePressures() {
  const es = useShellLang() === 'es';
  const cx = 310, cy = 128;
  return (
    <Fig vb="0 0 620 250"
         caption={es
           ? 'Un plan es el punto donde se equilibran tres presiones que tiran en direcciones distintas. Mover un control mueve una de las tres, el equilibrio se desplaza y la forma del hoyo cambia con el: la geometria ES el resultado del calculo, no una ilustracion de el.'
           : 'A schedule is the point where three pressures pulling in different directions balance. Moving a control moves one of the three, the balance shifts and the shape of the hole moves with it: the geometry IS the computed result, not an illustration of it.'}>
      <circle cx={cx} cy={cy} r={62} fill="var(--color-accent, #58a6ff)" fillOpacity={0.12}
              stroke="var(--color-accent, #58a6ff)" strokeWidth={1.8} />
      <text className="dg-tb" x={cx} y={cy - 4} textAnchor="middle">{es ? 'el plan' : 'the schedule'}</text>
      <text className="dg-ts" x={cx} y={cy + 14} textAnchor="middle">{es ? 'donde se equilibran' : 'where they balance'}</text>

      <text className="dg-tb" x="24" y="46">{es ? 'Descuento' : 'Discounting'}</text>
      <text className="dg-ts" x="24" y="63">{es ? 'lo quiere todo ahora' : 'wants everything now'}</text>
      <path className="dg-a" d={`M134 78 L${cx - 52} ${cy - 34}`} />

      <text className="dg-tb" x="452" y="46">{es ? 'Precedencia' : 'Precedence'}</text>
      <text className="dg-ts" x="452" y="63">{es ? 'primero lo de encima' : 'the rock on top first'}</text>
      {/* starts BELOW the label block: at y=60 it ran straight through the words it belongs to */}
      <path className="dg-a" d={`M486 78 L${cx + 52} ${cy - 34}`} />

      <text className="dg-tb" x={cx} y="238" textAnchor="middle">{es ? 'Capacidad' : 'Capacity'}</text>
      <text className="dg-ts" x={cx} y="222" textAnchor="middle">{es ? 'cuanto cabe por ano' : 'how much fits in a year'}</text>
      <path className="dg-a" d={`M${cx} 208 L${cx} ${cy + 68}`} />
    </Fig>
  );
}

/** Why the case matrix has five categories rather than a list of examples. Each row buys a different
 *  kind of confidence, and the two that can FAIL are the reason the other three mean anything. */
export function CaseRoles() {
  const es = useShellLang() === 'es';
  const rows: [string, string, string][] = es
    ? [['published', 'una instancia publicada, resuelta tal como se publica', 'se compara contra una cota PUBLICADA'],
       ['declared', 'un modelo de bloques real bajo un escenario que declaramos', 'realismo de datos sin fingir comparabilidad'],
       ['deposit', 'cuatro arquetipos sembrados', 'la forma del deposito cambia la forma del plan'],
       ['regime', 'el mismo deposito, distintos escenarios', 'cambia CUAL restriccion limita'],
       ['control', 'degenerado y abundante', 'tiene respuesta conocida: PUEDE fallar']]
    : [['published', 'a published instance, solved as published', 'measured against a PUBLISHED bound'],
       ['declared', 'a real block model under a scenario we declare', 'data realism without faking comparability'],
       ['deposit', 'four seeded archetypes', 'deposit shape changes schedule shape'],
       ['regime', 'the same deposit, different scenarios', 'changes WHICH constraint binds'],
       ['control', 'degenerate and abundant', 'has a known answer: it CAN fail']];
  const RH = 34, top = 30;
  return (
    <Fig vb={`0 0 620 ${top + rows.length * RH + 44}`}
         caption={es
           ? 'Cada categoria compra una clase distinta de confianza, y solo una se mide contra el estado del arte publicado. Las dos ultimas filas son las que pueden fallar: un producto cuyos controles no pueden fallar no esta siendo revisado, solo esta siendo mostrado.'
           : 'Each category buys a different kind of confidence, and only one is measured against the published state of the art. The last row is the one that can fail: a product whose controls cannot fail is not being checked, it is only being shown.'}>
      {rows.map(([id, what, proves], i) => {
        const y = top + i * RH;
        const isCtrl = id === 'control';
        const isPub = id === 'published';
        return (
          <g key={id}>
            <rect x={10} y={y} width={600} height={RH - 5} rx={4}
                  fill={isCtrl || isPub ? 'var(--color-accent, #58a6ff)' : 'currentColor'}
                  fillOpacity={isCtrl || isPub ? 0.1 : 0.04}
                  stroke={isCtrl || isPub ? 'var(--color-accent, #58a6ff)' : 'currentColor'}
                  strokeWidth={isCtrl || isPub ? 1.2 : 0.6}
                  strokeOpacity={isCtrl || isPub ? 0.8 : 0.2} />
            <text className="dg-tb" x={22} y={y + 19}>{id}</text>
            <text className="dg-ts" x={116} y={y + 19}>{what}</text>
            <text className="dg-ts" x={368} y={y + 19}>{proves}</text>
          </g>
        );
      })}
    </Fig>
  );
}
