// ADR-0058: the in-app "how it was built" panel. Hand-authored, theme-aware SVGs (every stroke and
// fill is currentColor or a CSS variable, so the diagram inverts with the theme instead of turning
// into a black rectangle on white), plus bilingual text at full depth.
//
// WHY THERE IS A LAYOUT ENGINE HERE INSTEAD OF COORDINATES.
//
// The first version placed every box by hand: a literal x, y and width per node, with the label poured
// in afterwards and never measured against the box that had to hold it. That survives exactly as long
// as no string changes length. It did not: on the "What it is" tab the closing caption started at
// x=586 and needed about 224px inside a 760-unit canvas, so it shipped as "the gap between them is the
// honest r", cut mid-word. Several other labels sat within a few pixels of their own box edge, which is
// the same defect standing one translation away from firing.
//
// So nodes size themselves from their content, rows distribute what is left as equal gaps, and captions
// are centred rather than positioned. A label can now change, or be translated into a longer language,
// without silently running off the edge of the drawing.

import type { ArchitectureConfig } from '@fasl-work/caos-app-shell';

const W = 760;      // canvas width, matches the viewBox
const M = 18;       // canvas margin

// Advance width per character for the two type sizes actually used below. These are estimates, not
// metrics - the browser does the real shaping - so every box adds padding on top and the row distributor
// keeps a minimum gap, which together absorb the error. Deliberately erring wide.
const TW = 7.15;    // 12.5px 600 system-ui
const SW = 5.7;     // 10.5px system-ui

interface N { t: string; s: string; w: number; h: number; x: number; y: number }

/** A node sized by its own content, so the label can never be wider than the box drawn around it. */
function node(t: string, s = ''): N {
  return { t, s, w: Math.max(t.length * TW, s.length * SW) + 26, h: s ? 52 : 34, x: 0, y: 0 };
}

/** Lay nodes across a horizontal band, giving the leftover width away as equal gaps. */
function row(ns: N[], y: number, left = M, right = W - M): N[] {
  const total = ns.reduce((a, k) => a + k.w, 0);
  const gap = ns.length > 1 ? Math.max(24, (right - left - total) / (ns.length - 1)) : 0;
  let x = left;
  for (const k of ns) { k.x = x; k.y = y; x += k.w + gap; }
  return ns;
}

/** Stack nodes vertically at a fixed left edge. */
function col(ns: N[], x: number, top: number, gap = 24): N[] {
  let y = top;
  for (const k of ns) { k.x = x; k.y = y; y += k.h + gap; }
  return ns;
}

const widest = (ns: N[]) => Math.max(...ns.map((k) => k.w));
const R = (k: N) => ({ x: k.x + k.w, y: k.y + k.h / 2 });
const L = (k: N) => ({ x: k.x, y: k.y + k.h / 2 });
const TP = (k: N) => ({ x: k.x + k.w / 2, y: k.y });
const BT = (k: N) => ({ x: k.x + k.w / 2, y: k.y + k.h });

const bx = (k: N) =>
  `<rect class="fill" x="${k.x}" y="${k.y}" width="${k.w}" height="${k.h}" rx="7"/>` +
  `<rect class="bx" x="${k.x}" y="${k.y}" width="${k.w}" height="${k.h}" rx="7"/>` +
  `<text class="tb" x="${k.x + 13}" y="${k.y + (k.s ? 21 : 22)}">${k.t}</text>` +
  (k.s ? `<text class="ts" x="${k.x + 13}" y="${k.y + 39}">${k.s}</text>` : '');

const boxes = (...ks: N[]) => ks.map(bx).join('');

type Pt = { x: number; y: number };
const ar = (a: Pt, b: Pt, dash = false) => `<path class="ar${dash ? ' dash' : ''}" d="M${a.x} ${a.y} L${b.x} ${b.y}"/>`;
/** Right angle: out horizontally, then vertically to the target. */
const elbowHV = (a: Pt, b: Pt, dash = false) =>
  `<path class="ar${dash ? ' dash' : ''}" d="M${a.x} ${a.y} L${b.x} ${a.y} L${b.x} ${b.y}"/>`;

/** Centred, so a caption cannot run off either edge no matter how long it or its translation is. */
const cap = (s: string, y: number) => `<text class="ts" x="${W / 2}" y="${y}" text-anchor="middle">${s}</text>`;
const lbl = (s: string, x: number, y: number) => `<text class="ts" x="${x}" y="${y}" text-anchor="middle">${s}</text>`;

const S = (body: string, h = 240) =>
  `<svg viewBox="0 0 ${W} ${h}" role="img" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">
   <style>
     .bx{fill:none;stroke:currentColor;stroke-width:1.4;opacity:.85}
     .fill{fill:currentColor;opacity:.07}
     .t{fill:currentColor;font:12px system-ui,sans-serif}
     .tb{fill:currentColor;font:600 12.5px system-ui,sans-serif}
     .ts{fill:currentColor;font:10.5px system-ui,sans-serif;opacity:.72}
     .ar{fill:none;stroke:currentColor;stroke-width:1.3;marker-end:url(#a);opacity:.8}
     .dash{stroke-dasharray:4 3}
     .hl{stroke:var(--color-accent,currentColor);stroke-width:2.4;fill:none}
   </style>
   <defs><marker id="a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
     <path d="M0 0 L10 5 L0 10 z" fill="currentColor"/></marker></defs>${body}</svg>`;

/* ---------------------------------------------------------------- diagram 1: what it is */
function svgWhat(): string {
  const dep = node('Deposit', 'blocks, grades, slope precedence');
  const sce = node('Scenario', 'periods, rate, capacities');
  const cpit = node('CPIT', 'when to mine each block');
  const bnd = node('Certified bound', 'exact LP relaxation');
  const pln = node('Feasible plan', 'heuristic, with its gap');

  col([dep, sce], M, 26);
  const rx = W - M - widest([bnd, pln]);
  col([bnd, pln], rx, 26);
  const leftEdge = M + widest([dep, sce]);
  cpit.x = leftEdge + (rx - leftEdge - cpit.w) / 2;
  cpit.y = 26 + (dep.h + 24 + sce.h) / 2 - cpit.h / 2;

  return S(
    boxes(dep, sce, cpit, bnd, pln) +
    ar(R(dep), L(cpit)) + ar(R(sce), L(cpit)) +
    ar(R(cpit), L(bnd)) + ar(R(cpit), L(pln)) +
    ar(BT(bnd), TP(pln), true) +
    cap('the gap between them is the honest number', 186),
    200,
  );
}

/* ---------------------------------------------------------------- diagram 2: the lanes */
function svgLanes(): string {
  const orb = node('oreblocks (PyPI)', 'the engine, pinned');
  const pipe = node('data-pipeline/', 'ladder + controls, Python');
  const der = node('data/derived/', 'trace + manifest, committed');
  const eng = node('src/engine/', 'the same algorithms, TypeScript');
  const stg = node('the stage', 'redraws per period cursor');

  row([orb, pipe, der], 30);
  row([eng, stg], 152, M, W - M - 60);

  // The handoff runs from the artifact on the top row to the live lane on the bottom row. Routed as a
  // simple down-then-left elbow it travelled along the bottom row's centre line and passed straight
  // THROUGH the stage box before reaching src/engine. It now drops into the empty band between the two
  // rows, crosses there, and enters src/engine from ABOVE, so it never runs over another node.
  const band = (der.y + der.h + eng.y) / 2;
  const handoff =
    `<path class="ar dash" d="M${BT(der).x} ${BT(der).y} L${BT(der).x} ${band} ` +
    `L${TP(eng).x} ${band} L${TP(eng).x} ${TP(eng).y}"/>`;

  return S(
    boxes(orb, pipe, der, eng, stg) +
    ar(R(orb), L(pipe)) + ar(R(pipe), L(der)) +
    handoff +
    lbl('the block model, not the answer', (BT(der).x + TP(eng).x) / 2, band - 7) +
    ar(R(eng), L(stg)) +
    cap('the browser never re-runs the ladder: it reads the trace and re-solves the case', 224),
    238,
  );
}

/* ---------------------------------------------------------------- diagram 3: the science */
function svgScience(): string {
  const mc = node('max closure', 'Picard reduction, min-cut');
  const np = node('nested pits', 'UPL(v - lambda a)');
  const cp = node('CP(U_t)', 'convex combination of two pits');
  const cb = node('certified bound', 'sum_t gamma_t z_t');
  const et = node('expected times E_b', 'the rounding weight');

  row([mc, np, cp], 30);
  cb.x = W - M - cb.w; cb.y = 150;
  et.x = M + 46; et.y = 150;

  return S(
    boxes(mc, np, cp, cb, et) +
    ar(R(mc), L(np)) + ar(R(np), L(cp)) +
    ar(BT(cp), TP(cb)) +
    ar(L(cb), R(et), true) +
    elbowHV({ x: L(et).x, y: L(et).y }, { x: M + 14, y: BT(mc).y + 6 }, false) +
    `<path class="ar" d="M${M + 14} ${BT(mc).y + 6} L${M + 14} ${BT(mc).y} L${BT(mc).x} ${BT(mc).y}"/>` +
    cap('the bound is not only the ceiling, it is the seed of the plan', 224),
    238,
  );
}

/* ---------------------------------------------------------------- diagram 4: the rendering rule */
function svgRender(): string {
  // Three panels of equal width, each drawn inside its own bounds, with the title above and the verdict
  // below both centred on the panel. Nothing here is positioned against the canvas edge.
  const gap = 26;
  const pw = (W - 2 * M - 2 * gap) / 3;
  const px = (i: number) => M + i * (pw + gap);
  const top = 40, ph = 96;
  const panel = (i: number, title: string, inner: string, verdict: string) =>
    `<text class="tb" x="${px(i) + pw / 2}" y="24" text-anchor="middle">${title}</text>` +
    inner +
    `<text class="ts" x="${px(i) + pw / 2}" y="${top + ph + 26}" text-anchor="middle">${verdict}</text>`;

  const frame = (i: number) => `<rect class="bx" x="${px(i)}" y="${top}" width="${pw}" height="${ph}" rx="5"/>`;
  // the void profile, in panel-local coordinates
  const vprof = (i: number, cls: string) => {
    const x0 = px(i) + pw * 0.16, x1 = px(i) + pw * 0.38, x2 = px(i) + pw * 0.62, x3 = px(i) + pw * 0.84;
    return `<path class="${cls}" d="M${x0} ${top} L${x1} ${top + ph * 0.74} L${x2} ${top + ph * 0.74} L${x3} ${top}"/>`;
  };

  return S(
    panel(0, 'A. the mined solid',
      `<path class="bx fill" d="M${px(0) + pw * 0.24} ${top + 16} L${px(0) + pw * 0.76} ${top + 16} L${px(0) + pw * 0.62} ${top + ph - 12} L${px(0) + pw * 0.38} ${top + ph - 12} z"/>`,
      'a growing solid, not a pit') +
    panel(1, 'B. carve it away',
      frame(1) + vprof(1, 'bx dash'),
      'a pit with no schedule in it') +
    panel(2, 'C. colour the void boundary',
      frame(2) + vprof(2, 'hl') +
      `<path class="bx" style="stroke-width:2.2;opacity:.55" d="M${px(2) + pw * 0.26} ${top + ph * 0.3} L${px(2) + pw * 0.74} ${top + ph * 0.3}"/>` +
      `<path class="bx" style="stroke-width:2.2;opacity:.4" d="M${px(2) + pw * 0.33} ${top + ph * 0.52} L${px(2) + pw * 0.67} ${top + ph * 0.52}"/>`,
      'every pit wall carries its year') +
    cap('measured on the shipping case at the FINAL frame: 100 percent of the pit wall carries period colour, against 0 percent for B', 198),
    212,
  );
}

/* ---------------------------------------------------------------- diagram 5: the contracts */
function svgContracts(): string {
  const raw = node('raw instance', '.blocks .prec .upit .cpit');
  const c1 = node('CONTRACT 1', 'accept / flag / reject');
  const lad = node('ladder + controls', 'bound, plans, gaps');
  const c2 = node('CONTRACT 2', 'trace + manifest, TS-mirrored');
  const val = node('validate', 're-read, assert, licence check');

  row([raw, c1, lad], 30);
  c2.x = W - M - c2.w; c2.y = 150;
  val.x = M; val.y = 150;

  return S(
    boxes(raw, c1, lad, c2, val) +
    ar(R(raw), L(c1)) + ar(R(c1), L(lad)) +
    ar(BT(lad), TP(c2)) +
    ar(L(c2), R(val)) +
    cap('a non-redistributable instance can never carry per-block data, and the re-read is where that is enforced', 224),
    238,
  );
}

export const architecture: ArchitectureConfig = {
  title_en: 'Architecture: how PhaseFlow is built',
  title_es: 'Arquitectura: como esta construido PhaseFlow',
  tabs: [
    {
      id: 'what',
      en: 'What it is',
      es: 'Que es',
      body_en:
        'PhaseFlow solves an open-pit PRODUCTION SCHEDULE and then animates it. The ultimate pit answers which blocks are worth mining; this answers when, subject to slope precedence in every period and per-period mining and processing capacity, maximising discounted NPV.\n\n' +
        'The problem is the constrained pit limit problem (CPIT). It is NP-hard, so what ships is a CERTIFIED UPPER BOUND plus FEASIBLE HEURISTIC schedules, with the gap between them reported on every screen. A schedule shown without its gap is a number with no scale.\n\n' +
        'The trust anchor is a published MineLib instance solved as published: newman1, its own six periods, its own eight percent rate, its own two capacities. Everything else is measured against our own bound; that one is measured against somebody else\'s.',
      body_es:
        'PhaseFlow resuelve un PLAN DE PRODUCCION de rajo abierto y luego lo anima. El pit final responde que bloques vale la pena extraer; esto responde cuando, sujeto a precedencia de talud en cada periodo y a capacidad de mina y planta por periodo, maximizando el NPV descontado.\n\n' +
        'El problema es el pit limite restringido (CPIT). Es NP-duro, asi que lo que se entrega es una COTA SUPERIOR CERTIFICADA mas planes HEURISTICOS FACTIBLES, con la brecha entre ambos reportada en cada pantalla. Un plan sin su brecha es un numero sin escala.\n\n' +
        'El ancla de confianza es una instancia publicada de MineLib resuelta tal como se publica: newman1, sus seis periodos, su tasa de ocho por ciento, sus dos capacidades. Todo lo demas se mide contra nuestra propia cota; esa se mide contra la de otros.',
      svg: svgWhat(),
    },
    {
      id: 'lanes',
      en: 'The lanes',
      es: 'Los carriles',
      body_en:
        'OFFLINE (Python): the pipeline builds each instance, runs the whole method ladder, runs the three controls, and writes a committed trace plus a manifest. The solver is oreblocks, a published PyPI package, consumed as a pinned dependency; PhaseFlow declares no package of its own.\n\n' +
        'LIVE (TypeScript): the same algorithms, ported, running in the browser on the block model the trace carries. This is what makes the focus view honest: moving the discount rate re-solves the problem rather than fetching a different baked answer, and the HUD shows the measured solve time.\n\n' +
        'A case is LIVE only when the browser can genuinely re-solve it inside an interaction budget, and REPLAY otherwise. A MineLib case is always replay, because its per-block data may not be redistributed and therefore never reaches the browser at all.',
      body_es:
        'OFFLINE (Python): el pipeline construye cada instancia, corre toda la escalera de metodos, corre los tres controles y escribe una traza comprometida mas un manifiesto. El solver es oreblocks, un paquete publicado en PyPI, consumido como dependencia fijada; PhaseFlow no declara paquete propio.\n\n' +
        'EN VIVO (TypeScript): los mismos algoritmos, portados, corriendo en el navegador sobre el modelo de bloques que trae la traza. Eso es lo que hace honesta la vista enfocada: mover la tasa vuelve a resolver el problema en vez de traer otra respuesta horneada, y el HUD muestra el tiempo medido.\n\n' +
        'Un caso es EN VIVO solo cuando el navegador puede resolverlo de verdad dentro de un presupuesto de interaccion, y REPLAY en caso contrario. Un caso MineLib es siempre replay, porque sus datos por bloque no pueden redistribuirse y nunca llegan al navegador.',
      svg: svgLanes(),
    },
    {
      id: 'science',
      en: 'The science',
      es: 'La ciencia',
      body_en:
        'The certified bound needs no LP solver. Chicoisne et al. 2012, Theorem 3.1: for one resource constraint per period, the CPIT LP relaxation is solved exactly in O(mn log n). Abel summation turns the by-period objective into a positively weighted sum over cumulative pit values; the cumulative capacity decouples the periods; and each subproblem is a convex combination of two consecutive nested pits, which are maximum closures, which are minimum cuts.\n\n' +
        'The bound is also the seed of the plan. The LP\'s expected extraction time per block is the weight that drives the best published rounding heuristic. On the authors\' own instances, greedy weights reached 0.138 of the bound where expected-time weights reached 0.972, using the same scheduling code.\n\n' +
        'Bienstock-Zuckerberg is a speed result, not a tighter bound: Z_BZ equals Z_LP, proven, because the precedence system is totally unimodular. It is cited and not claimed.',
      body_es:
        'La cota certificada no necesita solver LP. Chicoisne et al. 2012, Teorema 3.1: con una restriccion de recurso por periodo, la relajacion LP de CPIT se resuelve exactamente en O(mn log n). La suma de Abel convierte el objetivo por periodo en una suma de pesos positivos sobre valores de pit acumulados; la capacidad acumulada desacopla los periodos; y cada subproblema es una combinacion convexa de dos pits anidados consecutivos, que son cierres maximos, que son cortes minimos.\n\n' +
        'La cota es ademas la semilla del plan. El tiempo esperado de extraccion por bloque que da el LP es el peso que impulsa la mejor heuristica de redondeo publicada. En las instancias de los propios autores, los pesos codiciosos llegaron a 0,138 de la cota donde los pesos de tiempo esperado llegaron a 0,972, con el mismo codigo de planificacion.\n\n' +
        'Bienstock-Zuckerberg es un resultado de velocidad, no una cota mas ajustada: Z_BZ es igual a Z_LP, demostrado, porque el sistema de precedencia es totalmente unimodular. Se cita y no se reclama.',
      svg: svgScience(),
    },
    {
      id: 'render',
      en: 'The rendering rule',
      es: 'La regla de dibujo',
      body_en:
        'There are three things you can draw from a block-level schedule and only one is honest.\n\n' +
        'Draw the MINED blocks and you get a growing solid, not a pit. Carve them away and colour what is left by grade and you get a pit with no schedule in it: measured on a real engine, about 25 percent of the model is ever visible, 65 percent of that surface carries no period colour mid-animation, and the FINAL frame carries none at all.\n\n' +
        'So PhaseFlow colours the VOID BOUNDARY: each standing block adjacent to an already-mined one takes the period of the neighbour that exposed it. Every block touching the excavated void then carries period colour BY CONSTRUCTION, and the object stays a pit. Measured on the shipping case at the FINAL frame: the pit wall is 100 percent period-coloured, and it is 33 percent of everything visible from outside (the rest is the model box, which is not the pit) against 0 percent for the carve-away rendering at that same frame. This is not an invention. Chicoisne et al. 2012 Figure 1(d) is a pit cross-section with the period numbers written into bands climbing the wall, and Morales et al. 2015 present nine pit profiles per period. The discipline draws the void boundary; this is that drawing in three dimensions.',
      body_es:
        'Hay tres cosas que se pueden dibujar de un plan por bloque y solo una es honesta.\n\n' +
        'Dibuja los bloques EXTRAIDOS y obtienes un solido que crece, no un rajo. Quitalos y colorea lo que queda por ley y obtienes un rajo sin plan adentro: medido sobre un motor real, cerca del 25 por ciento del modelo es visible alguna vez, el 65 por ciento de esa superficie no lleva color de periodo a mitad de animacion, y el cuadro FINAL no lleva ninguno.\n\n' +
        'Por eso PhaseFlow colorea la FRONTERA DEL VACIO: cada bloque en pie junto a uno ya extraido toma el periodo del vecino que lo expuso. Todo bloque que toca el vacio excavado lleva entonces color de periodo POR CONSTRUCCION, y el objeto sigue siendo un rajo. Medido sobre el caso que se publica, en el cuadro FINAL: la pared del rajo esta 100 por ciento coloreada por periodo, y es el 33 por ciento de todo lo visible desde afuera (el resto es la caja del modelo, que no es el rajo), contra 0 por ciento del dibujo por remocion en ese mismo cuadro. No es un invento. La Figura 1(d) de Chicoisne et al. 2012 es una seccion de rajo con los numeros de periodo escritos en bandas que suben la pared, y Morales et al. 2015 presentan nueve perfiles de rajo por periodo. La disciplina dibuja la frontera del vacio; esto es ese dibujo en tres dimensiones.',
      svg: svgRender(),
    },
    {
      id: 'contracts',
      en: 'The contracts',
      es: 'Los contratos',
      body_en:
        'CONTRACT 1, ingestion. A block model becomes an instance only after it passes: dense block ids, precedence arcs that exist and point UPWARD (levels increase upward and predecessors sit above), non-negative resource coefficients with a strictly positive extraction tonnage on every block, no NaN in the objective, and an answerable scenario. Legal but notable conditions are FLAGGED rather than rejected, and the flags ride into the manifest and onto the screen: a capacity that can never exhaust the pit is a real scenario and a common mistake, so the app says so.\n\n' +
        'CONTRACT 2, artifact. The trace and manifest schemas are mirrored in frontend/src/lib/contract.types.ts, so a drift fails the build, and the pipeline re-reads what it wrote and checks it before finishing. One assertion in that re-read is a licence assertion: a non-redistributable instance must never carry per-block data.',
      body_es:
        'CONTRATO 1, ingesta. Un modelo de bloques se vuelve instancia solo si pasa: identificadores densos, arcos de precedencia que existen y apuntan HACIA ARRIBA (los niveles crecen hacia arriba y los predecesores estan encima), coeficientes de recurso no negativos con tonelaje de extraccion estrictamente positivo en cada bloque, sin NaN en el objetivo, y un escenario respondible. Las condiciones legales pero notables se MARCAN en vez de rechazarse, y las marcas viajan al manifiesto y a la pantalla: una capacidad que nunca puede agotar el pit es un escenario real y un error comun, asi que la aplicacion lo dice.\n\n' +
        'CONTRATO 2, artefacto. Los esquemas de traza y manifiesto estan espejados en frontend/src/lib/contract.types.ts, asi que una divergencia rompe el build, y el pipeline vuelve a leer lo que escribio y lo verifica antes de terminar. Una de esas verificaciones es de licencia: una instancia no redistribuible nunca debe llevar datos por bloque.',
      svg: svgContracts(),
    },
  ],
};
