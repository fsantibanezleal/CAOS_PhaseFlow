// ADR-0058: the in-app "how it was built" panel. Hand-authored, theme-aware SVGs (every stroke and
// fill is currentColor or a CSS variable, so the diagram inverts with the theme instead of turning
// into a black rectangle on white), plus bilingual text at full depth.

import type { ArchitectureConfig } from '@fasl-work/caos-app-shell';

const S = (body: string, w = 760, h = 300) =>
  `<svg viewBox="0 0 ${w} ${h}" role="img" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">
   <style>
     .bx{fill:none;stroke:currentColor;stroke-width:1.4;opacity:.85}
     .fill{fill:currentColor;opacity:.07}
     .t{fill:currentColor;font:12px system-ui,sans-serif}
     .tb{fill:currentColor;font:600 12.5px system-ui,sans-serif}
     .ts{fill:currentColor;font:10.5px system-ui,sans-serif;opacity:.72}
     .ar{fill:none;stroke:currentColor;stroke-width:1.3;marker-end:url(#a);opacity:.8}
     .dash{stroke-dasharray:4 3}
   </style>
   <defs><marker id="a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
     <path d="M0 0 L10 5 L0 10 z" fill="currentColor"/></marker></defs>${body}</svg>`;

const box = (x: number, y: number, w: number, h: number, title: string, sub = '') =>
  `<rect class="fill" x="${x}" y="${y}" width="${w}" height="${h}" rx="7"/>
   <rect class="bx" x="${x}" y="${y}" width="${w}" height="${h}" rx="7"/>
   <text class="tb" x="${x + 11}" y="${y + 21}">${title}</text>
   ${sub ? `<text class="ts" x="${x + 11}" y="${y + 38}">${sub}</text>` : ''}`;

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
      svg: S(
        box(20, 30, 200, 66, 'Deposit', 'blocks, grades, slope precedence') +
        box(20, 120, 200, 66, 'Scenario', 'periods, rate, capacities') +
        `<path class="ar" d="M225 63 L300 63"/><path class="ar" d="M225 153 L300 120"/>` +
        box(305, 55, 190, 80, 'CPIT', 'when to mine each block') +
        `<path class="ar" d="M500 80 L575 60"/><path class="ar" d="M500 112 L575 140"/>` +
        box(580, 25, 160, 62, 'Certified bound', 'exact LP relaxation') +
        box(580, 110, 160, 62, 'Feasible plan', 'heuristic, with its gap') +
        `<path class="ar dash" d="M660 92 L660 106"/><text class="ts" x="586" y="196">the gap between them is the honest number</text>`,
        760, 230,
      ),
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
      svg: S(
        box(20, 25, 210, 74, 'data-pipeline/ (Python)', 'oreblocks, pinned from PyPI') +
        `<path class="ar" d="M235 62 L305 62"/>` +
        box(310, 25, 190, 74, 'data/derived/', 'trace + manifest, committed') +
        `<path class="ar" d="M505 62 L575 62"/>` +
        box(580, 25, 160, 74, 'frontend/public/', 'build-time overlay') +
        box(20, 140, 210, 74, 'src/engine/ (TypeScript)', 'the same algorithms, live') +
        `<path class="ar dash" d="M400 105 L235 172"/><text class="ts" x="250" y="196">block model, not the answer</text>` +
        `<path class="ar" d="M235 177 L575 177"/>` +
        box(580, 140, 160, 74, 'the stage', 'redraws per cursor'),
        760, 240,
      ),
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
      svg: S(
        box(20, 30, 165, 66, 'max closure', 'Picard, min-cut') +
        `<path class="ar" d="M190 63 L250 63"/>` +
        box(255, 30, 175, 66, 'nested pits', 'UPL(v - lambda a)') +
        `<path class="ar" d="M435 63 L495 63"/>` +
        box(500, 30, 240, 66, 'CP(U_t) = convex combination', 'exact LP optimum per period') +
        `<path class="ar" d="M620 100 L620 140"/>` +
        box(500, 145, 240, 66, 'certified bound', 'sum_t gamma_t z_t') +
        `<path class="ar dash" d="M500 178 L300 178"/>` +
        box(120, 145, 175, 66, 'expected times E_b', 'the rounding weight') +
        `<path class="ar" d="M120 178 L60 178 L60 105"/>`,
        760, 240,
      ),
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
      svg: S(
        `<text class="tb" x="24" y="24">A. mined solid</text>
         <path class="bx" d="M40 60 L120 60 L100 110 L60 110 z"/><text class="ts" x="30" y="132">not a pit</text>
         <text class="tb" x="264" y="24">B. carve away</text>
         <path class="bx" d="M250 45 L430 45 L430 130 L250 130 z"/>
         <path class="bx dash" d="M290 45 L330 110 L360 110 L400 45"/>
         <text class="ts" x="256" y="152">a pit with no schedule in it</text>
         <text class="tb" x="524" y="24">C. void boundary</text>
         <path class="bx" d="M510 45 L730 45 L730 130 L510 130 z"/>
         <path class="bx" style="stroke-width:3.2" d="M550 45 L590 110 L640 110 L690 45"/>
         <path class="bx" style="stroke-width:2.2;opacity:.55" d="M566 71 L682 71"/>
         <path class="bx" style="stroke-width:2.2;opacity:.4" d="M580 92 L664 92"/>
         <text class="ts" x="516" y="152">every pit wall carries its year</text>`,
        760, 175,
      ),
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
      svg: S(
        box(20, 28, 190, 70, 'raw instance', '.blocks .prec .upit .cpit') +
        `<path class="ar" d="M215 63 L275 63"/>` +
        box(280, 28, 180, 70, 'CONTRACT 1', 'accept / flag / reject') +
        `<path class="ar" d="M465 63 L525 63"/>` +
        box(530, 28, 210, 70, 'ladder + controls', 'bound, plans, gaps') +
        `<path class="ar" d="M635 103 L635 140"/>` +
        box(430, 145, 310, 70, 'CONTRACT 2', 'trace + manifest, TS-mirrored') +
        `<path class="ar" d="M430 180 L300 180"/>` +
        box(20, 145, 275, 70, 'validate', 're-read, assert, licence check'),
        760, 240,
      ),
    },
  ],
};
