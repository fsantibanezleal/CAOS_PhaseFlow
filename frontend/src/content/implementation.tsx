/**
 * Implementation: how each method is computed in this product. Steps, constants, numerical choices,
 * approximations and measured cost, method by method. Transcribed from the engine (oreblocks 0.6.6),
 * the pipeline and the browser engine, and from the research dossiers for the published parts.
 */
import type { TopicGroup } from './doc.tsx';
import { Archetypes, ClosureNetwork, LaneFidelity, TimeExpanded } from './figures/impl.tsx';
import { GershonCone, LocalSearch, Operability, ParametricPits, SlidingWindow, SurrogatePath, DestinationRecut, DepositSplit } from './figures/method.tsx';
import { BoundSummaryPanel, MethodCasesPanel } from './panels.tsx';
import { PreviewTimingTable } from './static-tables.tsx';

export const IMPLEMENTATION: TopicGroup[] = [
  {
    id: 'instances',
    label: { en: 'Instances', es: 'Instancias' },
    topics: [
      {
        id: 'twins',
        title: { en: 'Seeded deposit twins', es: 'Gemelos de depósito sembrados' },
        paragraphs: [
          {
            en: 'The synthetic cases are block models generated from a seed, so every case is reproducible from its parameters and can be shipped block by block to the browser. A grid of 10 m blocks (levels increase upward, the MineLib convention) carries a grade field built from a deterministic trend, the geological shape of the archetype, plus spatially correlated noise: white noise smoothed by three passes of a 3 x 3 x 3 box filter, scaled by 0.35. Grades run from a background of 0.001 to a peak of 0.02 as mass fractions, and every block weighs 2,700 t (density 2.7).',
            es: 'Los casos sintéticos son modelos de bloques generados desde una semilla, de modo que cada caso es reproducible desde sus parámetros y puede enviarse bloque a bloque al navegador. Una grilla de bloques de 10 m (los niveles crecen hacia arriba, la convención de MineLib) lleva un campo de leyes construido a partir de una tendencia determinista, la forma geológica del arquetipo, más ruido espacialmente correlacionado: ruido blanco suavizado con tres pasadas de un filtro de caja de 3 x 3 x 3, escalado por 0,35. Las leyes van de un fondo de 0,001 a un pico de 0,02 como fracciones de masa, y cada bloque pesa 2.700 t (densidad 2,7).',
          },
          {
            en: 'Four archetypes stress different parts of the scheduling problem: a porphyry grade shell around a barren core, where the pit has to be staged through low grade; a narrow dipping vein, where the ore is long and thin; a layered deposit of alternating strata, where every bench has a similar mix; and a core-halo body, a thin rich core inside a poor halo, where the order of extraction is delicate. Each block\'s value at the two destinations follows the economics below, the CPIT value is the better of the two, and the slope precedence is a box one level up whose half-width is round(dz / (dx tan theta)), the reduced template whose transitive closure is the full cone (nine arcs per block at 45 degrees).',
            es: 'Cuatro arquetipos ponen a prueba partes distintas del problema de programación: una cáscara de ley de pórfido en torno a un núcleo estéril, donde el rajo debe escalonarse por ley baja; una veta estrecha e inclinada, donde el mineral es largo y delgado; un depósito estratificado de estratos alternados, donde cada banco tiene una mezcla parecida; y un cuerpo núcleo-halo, un núcleo delgado y rico dentro de un halo pobre, donde el orden de extracción es delicado. El valor de cada bloque en los dos destinos sigue la economía de abajo, el valor CPIT es el mejor de los dos, y la precedencia de talud es una caja un nivel arriba cuyo semiancho es round(dz / (dx tan theta)), la plantilla reducida cuya clausura transitiva es el cono completo (nueve arcos por bloque a 45 grados).',
          },
          {
            en: 'Capacities are declared per case as fractions of what the ultimate pit needs per period: a fraction of 1.0 on mining means just enough to mine the whole pit in the horizon, below 1.0 the pit outlives the horizon. The processing resource counts only blocks the plant beats the dump on, even when both values are negative. Two flags travel with each instance into the manifest and onto the screen: capacity that cannot exhaust the pit within the horizon, and capacity so loose that precedence alone drives the plan.',
            es: 'Las capacidades se declaran por caso como fracciones de lo que necesita el pit final por período: una fracción de 1,0 en mina significa justo lo necesario para extraer todo el pit en el horizonte, bajo 1,0 el pit sobrevive al horizonte. El recurso de proceso cuenta solo los bloques en que la planta supera al botadero, aun cuando ambos valores sean negativos. Dos marcas viajan con cada instancia hasta el manifiesto y la pantalla: capacidad que no alcanza a agotar el pit en el horizonte, y capacidad tan holgada que solo la precedencia conduce el plan.',
          },
        ],
        steps: {
          title: { en: 'Building a twin instance', es: 'Construir una instancia gemela' },
          items: [
            { en: 'Seeded white noise on the grid, three 3 x 3 x 3 box-blur passes, edge-corrected.', es: 'Ruido blanco sembrado en la grilla, tres pasadas de difuminado de caja de 3 x 3 x 3, corregidas en los bordes.' },
            { en: 'Grade = background + (peak - background) max(0, trend + 0.35 noise), clipped to [0, 1].', es: 'Ley = fondo + (pico - fondo) max(0, tendencia + 0,35 ruido), recortada a [0, 1].' },
            { en: 'Values at the dump and the plant from price 9,000 per tonne of metal, recovery 0.88, mining 2.5 and processing 9.0 per tonne.', es: 'Valores en botadero y planta con precio 9.000 por tonelada de metal, recuperación 0,88, mina 2,5 y proceso 9,0 por tonelada.' },
            { en: 'Slope precedence at 45 degrees; the ultimate pit by maximum closure.', es: 'Precedencia de talud a 45 grados; el pit final por cierre máximo.' },
            { en: 'Per-period limits = capacity fraction x pit resource total / periods; the destination model built from the same values, and checked to reduce to the CPIT values.', es: 'Límites por período = fracción de capacidad x total del recurso en el pit / períodos; el modelo con destinos se construye con los mismos valores, y se verifica que se reduce a los valores CPIT.' },
          ],
        },
        equations: [
          { tex: String.raw`g_b=g_0+(g_{\max}-g_0)\,\max\bigl(0,\ \phi_{\text{arch}}(x_b,y_b,z_b)+0.35\,\varepsilon_b\bigr)`, caption: { en: 'Grade field: archetype trend plus correlated noise', es: 'Campo de leyes: tendencia del arquetipo más ruido correlacionado' } },
          { tex: String.raw`r_x=\max\Bigl(1,\ \mathrm{round}\frac{d_z}{d_x\tan\theta}\Bigr),\qquad c_{rt}=f_r\,\frac{\sum_{b\in P}a_{rb}}{T}`, caption: { en: 'Precedence template half-width; per-period limit from the declared capacity fraction f_r', es: 'Semiancho de la plantilla de precedencia; límite por período desde la fracción de capacidad declarada f_r' } },
        ],
        facts: [
          { k: { en: 'Grids', es: 'Grillas' }, v: { en: '24 x 24 x 12 (6,912 blocks) to 30 x 30 x 16 (14,400)', es: '24 x 24 x 12 (6.912 bloques) a 30 x 30 x 16 (14.400)' } },
          { k: { en: 'Block', es: 'Bloque' }, v: { en: '10 m cube, 2,700 t', es: 'cubo de 10 m, 2.700 t' } },
          { k: { en: 'Economics', es: 'Economía' }, v: { en: 'price 9,000, recovery 0.88, mining 2.5, processing 9.0', es: 'precio 9.000, recuperación 0,88, mina 2,5, proceso 9,0' } },
          { k: { en: 'Cutoff implied', es: 'Ley de corte implícita' }, v: { en: '9.0 / (0.88 x 9,000) = 0.00114', es: '9,0 / (0,88 x 9.000) = 0,00114' } },
        ],
        figure: { caption: { en: 'The four archetype trends, drawn from the generator\'s own functions.', es: 'Las cuatro tendencias de arquetipo, dibujadas con las funciones del propio generador.' }, render: (lang) => <Archetypes lang={lang} />, wide: true },
        limits: [
          { en: 'Twins are not conditional simulations from drillholes; they are labelled synthetic wherever they appear.', es: 'Los gemelos no son simulaciones condicionales desde sondajes; se rotulan como sintéticos dondequiera que aparecen.' },
          { en: 'One grade, one metal, one recovery: no multi-element economics.', es: 'Una ley, un metal, una recuperación: sin economía multielemento.' },
        ],
        table: {
          head: [{ en: 'Design field', es: 'Campo de diseño' }, { en: 'Twin configuration', es: 'Configuración gemela' }],
          rows: [
            [{ en: 'Archetypes', es: 'Arquetipos' }, { en: 'porphyry shell, dipping vein, alternating layers, core-halo', es: 'cáscara de pórfido, veta inclinada, estratos alternados, núcleo-halo' }],
            [{ en: 'Grid and density', es: 'Grilla y densidad' }, { en: '10 m blocks; 2,700 t per block', es: 'bloques de 10 m; 2.700 t por bloque' }],
            [{ en: 'Randomness', es: 'Aleatoriedad' }, { en: 'seeded noise with three edge-corrected blur passes', es: 'ruido sembrado con tres pasadas de difuminado corregido en bordes' }],
          ],
        },
        refs: ['espinoza2013', 'lerchs1965', 'oreblocks'],
      },
      {
        id: 'minelib',
        title: { en: 'MineLib instances, read as published', es: 'Instancias MineLib, leídas tal como se publican' },
        paragraphs: [
          {
            en: 'MineLib publishes each instance as a block file, a precedence file and one file per problem class; only newman1 is reachable from a script with its scheduling files (.cpit and .pcpsp), through a public mirror, and kd and zuck_small carry ultimate-pit data only. The files are an academic download that does not include redistribution, so per-block data never leaves the machine: these cases are solved offline, only aggregates are recorded, and the browser replays them.',
            es: 'MineLib publica cada instancia como un archivo de bloques, uno de precedencias y uno por clase de problema; solo newman1 es alcanzable desde un script con sus archivos de programación (.cpit y .pcpsp), por un espejo público, y kd y zuck_small traen solo datos de pit final. Los archivos son una descarga académica que no incluye redistribución, de modo que los datos por bloque nunca salen de la máquina: estos casos se resuelven offline, solo se registran agregados, y el navegador los reproduce.',
          },
          {
            en: 'Three properties of the published format are measured on the real files, and each breaks a naive reader. The resource coefficients are sparse: on newman1 resource 0 has a row for all 1,060 blocks and resource 1 for 572, because waste consumes no plant capacity. A forbidden destination is written as a large negative sentinel (the last block carries -5.36e19 for destination 1), which must be read as forbidden, not as a cost. And the block file\'s free columns are per instance: newman1 carries a rock-type code (FRWS, FROR, OXOR) in one of them.',
            es: 'Tres propiedades del formato publicado se miden sobre los archivos reales, y cada una rompe a un lector ingenuo. Los coeficientes de recurso son dispersos: en newman1 el recurso 0 tiene una fila para los 1.060 bloques y el recurso 1 para 572, porque el estéril no consume planta. Un destino prohibido se escribe como un centinela negativo grande (el último bloque lleva -5,36e19 para el destino 1), que debe leerse como prohibido, no como un costo. Y las columnas libres del archivo de bloques dependen de la instancia: newman1 lleva un código de tipo de roca (FRWS, FROR, OXOR) en una de ellas.',
          },
          {
            en: 'The tonnage column is resolved per instance and never guessed: newman1 by its own header order, kd because its file carries a header row naming the tonnage column, and zuck_small by internal consistency (the only strictly positive column, which dominates the ore column on every row). For kd and zuck_small the scenario (periods, rate, capacities) is declared by this product and labelled declared; their ultimate pit is still comparable with the published optimum because it does not depend on the scenario. Zuck_small publishes no grade, so methods that need grade (the learned method, the effective cutoff) skip it rather than invent one.',
            es: 'La columna de tonelaje se resuelve por instancia y nunca se adivina: newman1 por el orden de su propio encabezado, kd porque su archivo trae una fila de encabezados que nombra la columna de tonelaje, y zuck_small por consistencia interna (la única columna estrictamente positiva, que domina a la columna de mineral en cada fila). Para kd y zuck_small el escenario (períodos, tasa, capacidades) lo declara este producto y se rotula como declarado; su pit final igual es comparable con el óptimo publicado porque no depende del escenario. Zuck_small no publica ley, así que los métodos que la necesitan (el método aprendido, la ley de corte efectiva) lo omiten en vez de inventar una.',
          },
        ],
        steps: {
          title: { en: 'The ingestion checks, before any method runs', es: 'Los controles de ingesta, antes de que corra cualquier método' },
          items: [
            { en: 'Block ids dense from 0; every precedence arc points to an existing block one level up.', es: 'Ids de bloque densos desde 0; todo arco de precedencia apunta a un bloque existente un nivel arriba.' },
            { en: 'Resource coefficients non-negative; extraction tonnage strictly positive on every block.', es: 'Coeficientes de recurso no negativos; tonelaje de extracción estrictamente positivo en todo bloque.' },
            { en: 'Objective free of NaN; forbidden destinations recognised by the sentinel.', es: 'Objetivo sin NaN; destinos prohibidos reconocidos por el centinela.' },
            { en: 'A scenario that can be answered: periods, rate and one limit per resource and period.', es: 'Un escenario que se pueda responder: períodos, tasa y un límite por recurso y período.' },
            { en: 'Legal but notable conditions flagged, not rejected, and carried to the screen.', es: 'Condiciones legales pero notables marcadas, no rechazadas, y llevadas a la pantalla.' },
          ],
        },
        equations: [
          { tex: String.raw`p_{bd}<-10^{18}\ \Rightarrow\ d\ \text{forbidden for}\ b,\qquad p_b=\max_{d\ \text{allowed}}p_{bd}`, caption: { en: 'The forbidden-destination sentinel, and the CPIT reduction of the destination values', es: 'El centinela de destino prohibido, y la reducción CPIT de los valores por destino' } },
        ],
        facts: [
          { k: { en: 'newman1', es: 'newman1' }, v: { en: '1,060 blocks, 3,922 arcs, as published', es: '1.060 bloques, 3.922 arcos, tal como se publica' } },
          { k: { en: 'kd', es: 'kd' }, v: { en: '14,153 blocks, declared scenario', es: '14.153 bloques, escenario declarado' } },
          { k: { en: 'zuck_small', es: 'zuck_small' }, v: { en: '9,400 blocks, declared scenario, no grade', es: '9.400 bloques, escenario declarado, sin ley' } },
          { k: { en: 'Redistribution', es: 'Redistribución' }, v: { en: 'none; aggregates only, replay in the browser', es: 'ninguna; solo agregados, reproducción en el navegador' } },
        ],
        limits: [
          { en: 'Only one MineLib instance has reachable scheduling files; the other two carry scenarios declared here.', es: 'Solo una instancia MineLib tiene archivos de programación alcanzables; las otras dos llevan escenarios declarados aquí.' },
        ],
        table: {
          head: [{ en: 'Instance', es: 'Instancia' }, { en: 'Role', es: 'Rol' }, { en: 'Block-level data', es: 'Datos por bloque' }],
          rows: [
            [{ en: 'newman1', es: 'newman1' }, { en: 'published six-period CPIT reference', es: 'referencia CPIT publicada de seis períodos' }, { en: 'not redistributed; aggregate replay', es: 'no redistribuidos; reproducción agregada' }],
            [{ en: 'kd', es: 'kd' }, { en: 'declared scenario on a real block model', es: 'escenario declarado sobre modelo de bloques real' }, { en: 'not redistributed; aggregate replay', es: 'no redistribuidos; reproducción agregada' }],
            [{ en: 'zuck_small', es: 'zuck_small' }, { en: 'declared scenario; source has no grade', es: 'escenario declarado; la fuente no tiene ley' }, { en: 'not redistributed; aggregate replay', es: 'no redistribuidos; reproducción agregada' }],
          ],
        },
        refs: ['espinoza2013', 'minelibresults', 'amplminelib'],
      },
    ],
  },
  {
    id: 'bounds',
    label: { en: 'Bounds, as computed', es: 'Cotas, como se calculan' },
    topics: [
      {
        id: 'closure',
        title: { en: 'Maximum closure, the workhorse', es: 'Cierre máximo, el caballo de batalla' },
        paragraphs: [
          {
            en: 'Every exact number in this product reduces to maximum closures: the ultimate pit, each break-point of the critical multiplier algorithm, the nested shells, and each pricing problem of Bienstock-Zuckerberg. Picard\'s reduction turns a closure into a minimum cut: a source arc to every positive block with its value as capacity, an arc from every negative block to the sink with minus its value, and an infinite arc from every block to each of its predecessors, so no finite cut can keep a block and drop what it needs. After the maximum flow, the blocks still reachable from the source in the residual graph are the optimal pit.',
            es: 'Todo número exacto de este producto se reduce a cierres máximos: el pit final, cada quiebre del algoritmo del multiplicador crítico, las cáscaras anidadas, y cada problema de pricing de Bienstock-Zuckerberg. La reducción de Picard convierte un cierre en un corte mínimo: un arco desde la fuente a cada bloque positivo con su valor como capacidad, un arco desde cada bloque negativo al sumidero con menos su valor, y un arco infinito desde cada bloque a cada uno de sus predecesores, de modo que ningún corte finito puede conservar un bloque y dejar lo que necesita. Tras el flujo máximo, los bloques que siguen alcanzables desde la fuente en el grafo residual son el pit óptimo.',
          },
          {
            en: 'Two solvers implement it. Dinic\'s algorithm on adjacency lists, exact on floating capacities with a 1e-7 guard on residuals, handles block models (newman1 in milliseconds, kd in seconds) and runs the same way in Python offline and in TypeScript in the browser. For the time-expanded graphs of Bienstock-Zuckerberg, with hundreds of thousands of nodes, a compiled max-flow on integer capacities is used, with the values rounded UP at a scale the solver allows: rounding up can only over-estimate a closure\'s value, which keeps every bound computed from it a valid upper bound, and the slack (about 1e-5 relative) is recorded and printed next to the bound.',
            es: 'Dos solvers lo implementan. El algoritmo de Dinic sobre listas de adyacencia, exacto en capacidades de punto flotante con una guarda de 1e-7 en los residuales, maneja modelos de bloques (newman1 en milisegundos, kd en segundos) y corre igual en Python offline y en TypeScript en el navegador. Para los grafos expandidos en el tiempo de Bienstock-Zuckerberg, con cientos de miles de nodos, se usa un flujo máximo compilado con capacidades enteras, con los valores redondeados HACIA ARRIBA a la escala que permite el solver: redondear hacia arriba solo puede sobrestimar el valor de un cierre, lo que mantiene toda cota calculada con él como una cota superior válida, y la holgura (cerca de 1e-5 relativo) se registra y se imprime junto a la cota.',
          },
          {
            en: 'Every closure solve checks itself: the returned set must be closed under precedence, and its value must equal the sum of the positive values minus the maximum flow. A restricted variant solves the closure inside a candidate set, which is how nested families are computed without starting over: a pit at a larger multiplier, or at a smaller revenue factor, is contained in the previous one.',
            es: 'Cada resolución de cierre se verifica a sí misma: el conjunto devuelto debe ser cerrado bajo precedencia, y su valor debe ser igual a la suma de los valores positivos menos el flujo máximo. Una variante restringida resuelve el cierre dentro de un conjunto de candidatos, que es como se calculan las familias anidadas sin empezar de cero: un pit con un multiplicador mayor, o con un factor de ingreso menor, está contenido en el anterior.',
          },
        ],
        equations: [
          { tex: String.raw`\max_{C\ \text{closed}}\sum_{b\in C}w_b=\sum_{b:\,w_b>0}w_b-\text{maxflow}(s,t)`, caption: { en: 'Picard 1976: the closure value from the maximum flow, asserted on every solve', es: 'Picard 1976: el valor del cierre desde el flujo máximo, verificado en cada resolución' } },
          { tex: String.raw`w'_b=\frac{\lceil s\,w_b\rceil}{s}\ \ge\ w_b\ \Rightarrow\ \max_C w'(C)\ \ge\ \max_C w(C),\qquad \max_C w'(C)-\max_C w(C)\le\frac{n}{s}`, caption: { en: 'Directional rounding for the compiled solver: an over-estimate keeps a bound a bound', es: 'Redondeo direccional para el solver compilado: una sobrestimación mantiene una cota como cota' } },
        ],
        facts: [
          { k: { en: 'Exact solver', es: 'Solver exacto' }, v: { en: 'Dinic, floating capacities, residual guard 1e-7', es: 'Dinic, capacidades flotantes, guarda residual 1e-7' } },
          { k: { en: 'Compiled solver', es: 'Solver compilado' }, v: { en: 'integer capacities, values rounded up, slack recorded', es: 'capacidades enteras, valores redondeados hacia arriba, holgura registrada' } },
          { k: { en: 'Self-checks', es: 'Autoverificación' }, v: { en: 'closedness and the value identity, every solve', es: 'clausura y la identidad de valor, en cada resolución' } },
        ],
        figure: { caption: { en: 'Picard\'s network on five blocks: the pit is the source side of the minimum cut.', es: 'La red de Picard sobre cinco bloques: el pit es el lado fuente del corte mínimo.' }, render: (lang) => <ClosureNetwork lang={lang} /> },
        limits: [
          { en: 'The pure Python and TypeScript Dinic suit up to about 1e5 blocks; time-expanded graphs need the compiled path.', es: 'El Dinic en Python puro y TypeScript sirve hasta cerca de 1e5 bloques; los grafos expandidos necesitan el camino compilado.' },
        ],
        refs: ['picard1976', 'lerchs1965'],
      },
      {
        id: 'cma-built',
        title: { en: 'The critical multiplier, as computed', es: 'El multiplicador crítico, como se calcula' },
        paragraphs: [
          {
            en: 'The relaxation is solved period by period from the LAST, because the cumulative capacity grows with t and the pits nest, so each period works inside what the later period found. If the whole ultimate pit fits a period\'s cumulative capacity, that period\'s solution is the pit itself and no search is needed. Otherwise the family of pits at multipliers lambda is extended until some pit uses at most the target, starting from the largest value-to-resource ratio of any block (beyond it every block is priced negative) and multiplying by four.',
            es: 'La relajación se resuelve período a período desde el ÚLTIMO, porque la capacidad acumulada crece con t y los pits se anidan, de modo que cada período trabaja dentro de lo que encontró el período posterior. Si todo el pit final cabe en la capacidad acumulada de un período, la solución de ese período es el pit mismo y no hace falta buscar. Si no, la familia de pits en los multiplicadores lambda se extiende hasta que algún pit use a lo más el objetivo, partiendo de la mayor razón valor-recurso de cualquier bloque (más allá, todo bloque tiene precio negativo) y multiplicando por cuatro.',
          },
          {
            en: 'The bracketing pits are then refined by bisection on lambda, each new pit solved as a closure restricted to the smallest known pit that must contain it, and every pit kept in a cache shared by all periods, since the break-points do not depend on the period. The search stops on the duality certificate: the primal estimate of the convex combination and the dual expression at the lower pit agree within a relative 1e-9; a run that reaches 80 refinements, or whose interval collapses below 1e-13, returns its current combination. A final assertion re-checks primal and dual within 1e-5 and the monotonicity of the stacked solution.',
            es: 'Los pits que encajonan se refinan luego por bisección sobre lambda, cada nuevo pit resuelto como un cierre restringido al menor pit conocido que debe contenerlo, y cada pit guardado en un caché compartido por todos los períodos, ya que los quiebres no dependen del período. La búsqueda se detiene sobre el certificado de dualidad: la estimación primal de la combinación convexa y la expresión dual en el pit inferior coinciden dentro de un relativo 1e-9; una corrida que llega a 80 refinamientos, o cuyo intervalo colapsa bajo 1e-13, devuelve su combinación actual. Una verificación final revisa de nuevo primal y dual dentro de 1e-5 y la monotonía de la solución apilada.',
          },
          {
            en: 'The cost is a handful of closures per period rather than a full family each time. On the published newman1 the two single-resource relaxations take 34 and 45 closures and about 1.3 seconds offline; on a 6,912-block twin with two resources, 129 and 73. In the browser the same algorithm runs in 0.9 to 3.6 seconds on the live cases, which is why it runs in a worker there.',
            es: 'El costo son unos pocos cierres por período en vez de una familia completa cada vez. En el newman1 publicado las dos relajaciones de un recurso toman 34 y 45 cierres y cerca de 1,3 segundos offline; en un gemelo de 6.912 bloques con dos recursos, 129 y 73. En el navegador el mismo algoritmo corre en 0,9 a 3,6 segundos en los casos en vivo, y por eso ahí corre en un worker.',
          },
        ],
        steps: {
          title: { en: 'Per period t, from T down to 1', es: 'Por período t, de T a 1' },
          items: [
            { en: 'If the resource of the whole pit fits U_t, take the pit and continue.', es: 'Si el recurso de todo el pit cabe en U_t, tomar el pit y seguir.' },
            { en: 'Extend the family: solve pits at lambda = hint, 4 hint, 16 hint ... until one uses at most U_t.', es: 'Extender la familia: resolver pits en lambda = guía, 4 guía, 16 guía ... hasta que uno use a lo más U_t.' },
            { en: 'Bracket U_t between the cached pits x^u and x^l; form alpha and the convex combination.', es: 'Encajonar U_t entre los pits en caché x^u y x^l; formar alfa y la combinación convexa.' },
            { en: 'Stop if primal and dual agree within 1e-9; else solve the pit at the midpoint multiplier, restricted, and repeat.', es: 'Detenerse si primal y dual coinciden dentro de 1e-9; si no, resolver el pit en el multiplicador medio, restringido, y repetir.' },
            { en: 'Record the period\'s solution; at the end assert monotonicity and sum gamma_t z_t into the bound.', es: 'Registrar la solución del período; al final verificar la monotonía y sumar gamma_t z_t en la cota.' },
          ],
        },
        equations: [
          { tex: String.raw`\Bigl|\ \alpha z^{l}+(1-\alpha)z^{u}\ -\ \bigl[(p-\lambda^{l}a)\cdot x^{l}+\lambda^{l}U\bigr]\ \Bigr|\ \le\ 10^{-9}\max(1,|z|)`, caption: { en: 'The stopping test: primal and dual agree, so the two pits are consecutive break-points', es: 'La prueba de parada: primal y dual coinciden, así que los dos pits son quiebres consecutivos' } },
        ],
        facts: [
          { k: { en: 'Order', es: 'Orden' }, v: { en: 'last period first; one shared cache of pits', es: 'último período primero; un caché compartido de pits' } },
          { k: { en: 'Tolerances', es: 'Tolerancias' }, v: { en: 'certificate 1e-9; final check 1e-5; at most 80 refinements', es: 'certificado 1e-9; verificación final 1e-5; a lo más 80 refinamientos' } },
          { k: { en: 'newman1', es: 'newman1' }, v: { en: '34 + 45 closures, about 1.3 s', es: '34 + 45 cierres, cerca de 1,3 s' } },
        ],
        figure: { caption: { en: 'The cached family of nested pits; the target falls between two of them.', es: 'La familia en caché de pits anidados; el objetivo cae entre dos de ellos.' }, render: (lang) => <ParametricPits lang={lang} /> },
        limits: [
          { en: 'One resource per relaxation; with two the bound is Algorithm 4\'s.', es: 'Un recurso por relajación; con dos, la cota es la del Algoritmo 4.' },
        ],
        refs: ['chicoisne2012'],
      },
      {
        id: 'bz-built',
        title: { en: 'The joint bound, as computed', es: 'La cota conjunta, como se calcula' },
        paragraphs: [
          {
            en: 'The joint bound runs on the time-expanded graph: a node per (block, period), precedence arcs repeated in every period, a monotonicity arc from each (block, t) to (block, t + 1), and one side row per resource and period with +a on period t and -a on period t - 1. Column generation alternates a restricted master LP over the current partition (solved with HiGHS) and a pricing closure of the dual-adjusted values (solved with the compiled max-flow), refines the partition with the new closure, and stops on a relative tolerance of 1e-7 or after 120 iterations.',
            es: 'La cota conjunta corre sobre el grafo expandido en el tiempo: un nodo por (bloque, período), arcos de precedencia repetidos en cada período, un arco de monotonía desde cada (bloque, t) a (bloque, t + 1), y una fila lateral por recurso y período con +a en el período t y -a en el período t - 1. La generación de columnas alterna un LP maestro restringido sobre la partición actual (resuelto con HiGHS) y un cierre de pricing de los valores ajustados por los duales (resuelto con el flujo máximo compilado), refina la partición con el nuevo cierre, y se detiene en una tolerancia relativa de 1e-7 o tras 120 iteraciones.',
          },
          {
            en: 'The number is reported only once it is certified: at the best dual vector the Lagrangian bound is re-derived with one EXACT closure (the floating-point Dinic), so the rounding slack of the compiled pricing does not enter the reported value. That certification solve is what limits the size: a 10,976-block twin over 10 periods (109,760 nodes, 972,904 edges) certifies in about a second, while a 14,153-block instance over 12 periods did not finish in fifteen minutes. The budget is therefore 130,000 nodes, 1.4 million edges and 240 seconds, measured on the certification and not guessed; above it, a case keeps the Algorithm 4 bound and records why.',
            es: 'El número se reporta solo una vez certificado: en el mejor vector dual la cota lagrangiana se vuelve a derivar con un cierre EXACTO (el Dinic de punto flotante), de modo que la holgura de redondeo del pricing compilado no entra en el valor reportado. Esa resolución de certificación es la que limita el tamaño: un gemelo de 10.976 bloques en 10 períodos (109.760 nodos, 972.904 aristas) se certifica en cerca de un segundo, mientras que una instancia de 14.153 bloques en 12 períodos no terminó en quince minutos. El presupuesto es por lo tanto 130.000 nodos, 1,4 millones de aristas y 240 segundos, medido sobre la certificación y no adivinado; sobre él, un caso conserva la cota del Algoritmo 4 y registra por qué.',
          },
          {
            en: 'When the joint bound is no tighter than Algorithm 4, column generation settles a few parts in ten million above it, which is its stopping tolerance and not a difference between the bounds; the smaller certified value is used for every gap on the case and the note says so. The table below is the bound report of every case.',
            es: 'Cuando la cota conjunta no es más ajustada que el Algoritmo 4, la generación de columnas se asienta unas pocas partes en diez millones sobre ella, que es su tolerancia de parada y no una diferencia entre las cotas; el valor certificado menor se usa para toda brecha del caso y la nota lo dice. La tabla de abajo es el reporte de cotas de cada caso.',
          },
        ],
        equations: [
          { tex: String.raw`L(\mu)=\max_{z\ \text{closed}}\ (c-\mu^{\top}H)\,z+\mu^{\top}h\ \ \ge\ \ Z^{\mathrm{LP}}\quad\forall\,\mu\ge 0`, caption: { en: 'Every dual vector gives a valid bound; the reported one is re-derived with an exact closure', es: 'Todo vector dual da una cota válida; la reportada se vuelve a derivar con un cierre exacto' } },
        ],
        facts: [
          { k: { en: 'Budget', es: 'Presupuesto' }, v: { en: '130,000 nodes, 1.4 M edges, 240 s', es: '130.000 nodos, 1,4 M aristas, 240 s' } },
          { k: { en: 'Stop', es: 'Parada' }, v: { en: 'relative 1e-7 or 120 iterations', es: 'relativo 1e-7 o 120 iteraciones' } },
          { k: { en: 'Master', es: 'Maestro' }, v: { en: 'HiGHS LP over the partition', es: 'LP HiGHS sobre la partición' } },
        ],
        figure: { caption: { en: 'The time-expanded graph the joint bound prices.', es: 'El grafo expandido en el tiempo sobre el que la cota conjunta hace pricing.' }, render: (lang) => <TimeExpanded lang={lang} /> },
        data: (lang) => <BoundSummaryPanel lang={lang} />,
        limits: [
          { en: 'Above the budget the gap uses Algorithm 4 and therefore includes bound slack.', es: 'Sobre el presupuesto la brecha usa el Algoritmo 4 y por lo tanto incluye holgura de la cota.' },
        ],
        refs: ['bienstock2010', 'munoz2017', 'huangfu2018'],
      },
      {
        id: 'pcpsp-built',
        title: { en: 'The PCPSP bound, as computed', es: 'La cota de PCPSP, como se calcula' },
        paragraphs: [
          {
            en: 'The destination problem\'s relaxation is assembled as one sparse LP and solved by HiGHS. Its variables are the cumulative extraction x_bt and the destination fractions y_bdt of every block, with no ultimate-pit reduction: that reduction is proven for CPIT, and assuming it for PCPSP would risk a bound that is not one. Its rows are monotonicity, precedence in every period, the linking equality sum_d y_bdt = x_bt - x_b,t-1, and one resource row per resource and period over the destination fractions; forbidden destinations are fixed at zero.',
            es: 'La relajación del problema con destinos se arma como una sola LP dispersa y se resuelve con HiGHS. Sus variables son la extracción acumulada x_bt y las fracciones de destino y_bdt de cada bloque, sin reducción al pit final: esa reducción está demostrada para CPIT, y suponerla para PCPSP arriesgaría una cota que no lo es. Sus filas son monotonía, precedencia en cada período, la igualdad de enlace sum_d y_bdt = x_bt - x_b,t-1, y una fila de recurso por recurso y período sobre las fracciones de destino; los destinos prohibidos se fijan en cero.',
          },
          {
            en: 'The model has n T (1 + D) variables and about n (T - 1) + m T + n T + R T rows: on newman1, 19,080 variables and 35,204 rows, solved in about two seconds. HiGHS solves it directly up to 1.1 million rows, a budget measured on the bake and not guessed: the large porphyry twin, at 1,082,684 rows, solved in 2.65 hours in the release bake, while two of the 14,400-block twins, at 1,435,220 rows, had not finished after six and a half hours, and the interior-point method was slower than the simplex on the case where both were run. The value is a bound to the solver\'s optimality tolerances and is reported with its status. On newman1 it gives 24,486,549.02, the published PCPSP LP bound to the unit; where the joint CPIT LP exists for the same case, the PCPSP bound must sit above it, and the artifact check fails otherwise.',
            es: 'El modelo tiene n T (1 + D) variables y cerca de n (T - 1) + m T + n T + R T filas: en newman1, 19.080 variables y 35.204 filas, resueltas en cerca de dos segundos. HiGHS lo resuelve directamente hasta 1,1 millones de filas, un presupuesto medido en el horneado y no adivinado: el gemelo pórfido grande, con 1.082.684 filas, se resolvió en 2,65 horas en el horneado de la versión, mientras que dos de los gemelos de 14.400 bloques, con 1.435.220 filas, no habían terminado tras seis horas y media, y el método de punto interior fue más lento que el símplex en el caso en que se corrieron ambos. El valor es una cota a las tolerancias de optimalidad del solver y se reporta con su estado. En newman1 da 24.486.549,02, la cota LP de PCPSP publicada a la unidad; donde existe la LP conjunta de CPIT para el mismo caso, la cota de PCPSP debe quedar sobre ella, y la verificación de artefactos falla en caso contrario.',
          },
          {
            en: 'Above the budget the same bound comes from the LP\'s Lagrangian dual. Dualising the R T resource rows with multipliers mu_rt >= 0 leaves only precedence coupling the blocks: each block in each period takes its best destination, g_bt = max_d (gamma_t v_bd - sum_r mu_rt q_rbd), and by Abel summation the extraction is a maximum closure on the time-expanded graph with weights g_bt - g_b,t+1, solved by the compiled max-flow. Every multiplier vector gives a valid bound, and because that closure problem has integral optimal solutions, the best multipliers give exactly the LP value. The compiled max-flow rounds the weights up, which keeps every value a bound and adds a small slack that is recorded with it. The multipliers are driven by a cutting-plane method whose master is a small HiGHS LP inside a box trust region; it stops on a relative tolerance of 1e-6, after 40 iterations without improvement, or at 400 iterations, and the status, the iteration count and the master\'s gap estimate are recorded too. Where both run it meets HiGHS: within 2e-6 of the LP on the small test instances, and 316,476,932 against 316,475,407 on twin-porphyry-s, in 166 seconds instead of about 18 minutes.',
            es: 'Sobre el presupuesto la misma cota sale del dual lagrangiano de la LP. Dualizar las R T filas de recurso con multiplicadores mu_rt >= 0 deja solo la precedencia acoplando los bloques: cada bloque en cada período toma su mejor destino, g_bt = max_d (gamma_t v_bd - sum_r mu_rt q_rbd), y por la suma de Abel la extracción es un cierre máximo sobre el grafo expandido en el tiempo con pesos g_bt - g_b,t+1, resuelto con el flujo máximo compilado. Todo vector de multiplicadores da una cota válida, y como ese problema de cierre tiene soluciones óptimas enteras, los mejores multiplicadores dan exactamente el valor de la LP. El flujo máximo compilado redondea los pesos hacia arriba, lo que mantiene cada valor como cota y agrega una holgura pequeña que se registra con ella. Los multiplicadores se mueven con un método de planos cortantes cuyo maestro es una LP pequeña de HiGHS dentro de una región de confianza en caja; se detiene en una tolerancia relativa de 1e-6, tras 40 iteraciones sin mejora, o en 400 iteraciones, y también se registran el estado, el número de iteraciones y la estimación de brecha del maestro. Donde corren ambos coincide con HiGHS: dentro de 2e-6 de la LP en las instancias pequeñas de prueba, y 316.476.932 contra 316.475.407 en twin-porphyry-s, en 166 segundos en vez de cerca de 18 minutos.',
          },
          {
            en: 'The solution is read as well as the value. From the destination fractions the pipeline takes, for each block the LP mines, the destination it sends most of the block to; a block the LP leaves unmined keeps every destination. Above the budget the relaxed solution at the best multipliers plays the same role: it mines each block whole and sends it to one destination. Those destinations are what the re-cut fixes. The LP\'s expected extraction times are also returned, and they are not used for ordering: measured on a 1,008-block twin, a walk on them reached 26.41 M where the re-cut scheduled by the sliding window reached 34.31 M, because this relaxation mines deep cones fractionally from the first period.',
            es: 'Se lee la solución además del valor. De las fracciones de destino el pipeline toma, para cada bloque que la LP extrae, el destino al que envía la mayor parte del bloque; un bloque que la LP deja sin extraer conserva todos sus destinos. Sobre el presupuesto la solución relajada en los mejores multiplicadores cumple el mismo papel: extrae cada bloque entero y lo envía a un solo destino. Esos destinos son los que fija el re-corte. También se devuelven los tiempos esperados de extracción de la LP, y no se usan para ordenar: medido en un gemelo de 1.008 bloques, un recorrido sobre ellos llegó a 26,41 M donde el re-corte programado con la ventana deslizante llegó a 34,31 M, porque esta relajación extrae conos profundos de manera fraccionaria desde el primer período.',
          },
        ],
        equations: [
          { tex: String.raw`\sum_{d}y_{bdt}=x_{bt}-x_{b,t-1},\qquad \sum_{b,d}q_{rbd}\,y_{bdt}\le c_{rt},\qquad x_{bt}\le x_{at},\ \ x_{bt}\le x_{b,t+1},\ \ 0\le x,y\le 1`, caption: { en: 'The PCPSP relaxation as assembled: linking, resources, precedence, monotonicity', es: 'La relajación PCPSP tal como se arma: enlace, recursos, precedencia, monotonía' } },
          { tex: String.raw`L(\mu)=\sum_{r,t}\mu_{rt}c_{rt}+\max_{x\ \text{closed}}\ \sum_{b,t}\bigl(g_{bt}-g_{b,t+1}\bigr)x_{bt},\qquad g_{bt}=\max_{d}\Bigl(\gamma_t v_{bd}-\sum_{r}\mu_{rt}q_{rbd}\Bigr)`, caption: { en: 'Above the row budget: the Lagrangian dual, a bound for every mu >= 0 and the LP value at the best one', es: 'Sobre el presupuesto de filas: el dual lagrangiano, una cota para todo mu >= 0 y el valor de la LP en el mejor' } },
        ],
        facts: [
          { k: { en: 'Solver', es: 'Solver' }, v: { en: 'HiGHS (linprog), presolve on, up to 1.1 million rows', es: 'HiGHS (linprog), presolve activo, hasta 1,1 millones de filas' } },
          { k: { en: 'Above it', es: 'Sobre eso' }, v: { en: 'Lagrangian dual by maximum closures; stop at 1e-6, 40 without improvement or 400 iterations', es: 'dual lagrangiano por cierres máximos; parada en 1e-6, 40 sin mejora o 400 iteraciones' } },
          { k: { en: 'newman1', es: 'newman1' }, v: { en: '19,080 variables, 35,204 rows, 24,486,549.02', es: '19.080 variables, 35.204 filas, 24.486.549,02' } },
        ],
        figure: { caption: { en: 'The relaxation\'s destinations fixed, then scheduled as a CPIT.', es: 'Los destinos de la relajación fijados, luego programados como un CPIT.' }, render: (lang) => <DestinationRecut lang={lang} />, wide: true },
        limits: [
          { en: 'HiGHS bounds the destination problem directly only up to about a million rows here. The Lagrangian route reaches the same value by closures, but how close its iterations come is a property of the run, recorded as its status and gap estimate, and not certified by an exact closure as the joint CPIT bound is.', es: 'HiGHS acota el problema con destinos directamente solo hasta cerca de un millón de filas aquí. La vía lagrangiana llega al mismo valor por cierres, pero cuán cerca llegan sus iteraciones es una propiedad de la corrida, registrada como su estado y su estimación de brecha, y no certificada por un cierre exacto como la cota conjunta de CPIT.' },
        ],
        refs: ['jelvez2018', 'huangfu2018', 'geoffrion1974', 'picard1976', 'espinoza2013'],
      },
    ],
  },
  {
    id: 'plans',
    label: { en: 'Plans, as computed', es: 'Planes, como se calculan' },
    topics: [
      {
        id: 'toposort-built',
        title: { en: 'TopoSort and its weights, as computed', es: 'TopoSort y sus pesos, como se calculan' },
        paragraphs: [
          {
            en: 'The walk uses a binary heap keyed by the negated weight, so the available block with the highest weight is popped next and ties go to the smaller block id; a block becomes available when its last predecessor inside the pit has been popped. Each popped block takes the earliest period from the latest of its predecessors\' periods whose remaining capacity fits every resource, within 1e-9; a block that fits no period stays unmined, and so does everything that needs it.',
            es: 'El recorrido usa un montículo binario con la clave del peso negado, de modo que el bloque disponible de mayor peso sale primero y los empates van al id de bloque menor; un bloque queda disponible cuando sale su último predecesor dentro del pit. Cada bloque que sale toma el período más temprano desde el último de los períodos de sus predecesores cuya capacidad restante admite cada recurso, dentro de 1e-9; un bloque que no cabe en ningún período queda sin extraer, y también todo lo que lo necesita.',
          },
          {
            en: 'The weights are computed once per plan. Greedy is the block value. Expected time comes from the tightest single-resource relaxation, as minus E_b. Gershon\'s weight is the value of the successor SET: the cone of every block is a bitset built in reverse topological order as the union of its successors\' cones plus the successors themselves, released as soon as every predecessor has read it, and summed once over its members. In the worst case that is O(n^2 / 64) machine words; on the 14,400-block twins it takes about half a second.',
            es: 'Los pesos se calculan una vez por plan. El codicioso es el valor del bloque. El tiempo esperado viene de la relajación de un recurso más ajustada, como menos E_b. El peso de Gershon es el valor del CONJUNTO sucesor: el cono de cada bloque es un bitset construido en orden topológico inverso como la unión de los conos de sus sucesores más los sucesores mismos, liberado apenas cada predecesor lo ha leído, y sumado una vez sobre sus miembros. En el peor caso son O(n^2 / 64) palabras de máquina; en los gemelos de 14.400 bloques toma cerca de medio segundo.',
          },
          {
            en: 'The table shows the expected-time method on every case; its time includes the bound it is seeded by, which is where nearly all of it goes.',
            es: 'La tabla muestra el método de tiempo esperado en cada caso; su tiempo incluye la cota que lo siembra, que es donde se va casi todo.',
          },
        ],
        steps: {
          title: { en: 'One TopoSort plan', es: 'Un plan TopoSort' },
          items: [
            { en: 'Compute the weight (value, successor-set value, or minus the expected time).', es: 'Calcular el peso (valor, valor del conjunto sucesor, o menos el tiempo esperado).' },
            { en: 'Push every pit block with no pit predecessor onto the heap.', es: 'Poner en el montículo cada bloque del pit sin predecesor en el pit.' },
            { en: 'Pop the highest weight; find its earliest period with room for every resource; place it or leave it unmined.', es: 'Sacar el de mayor peso; buscar su período más temprano con espacio para cada recurso; ubicarlo o dejarlo sin extraer.' },
            { en: 'Release successors whose predecessors are all popped; repeat until the heap is empty.', es: 'Liberar los sucesores cuyos predecesores ya salieron todos; repetir hasta vaciar el montículo.' },
          ],
        },
        equations: [
          { tex: String.raw`\tau_b=\min\Bigl\{t\ge\max_{a\in\mathrm{pred}(b)}\tau_a:\ \ \text{rem}_{rt}\ge a_{rb}-10^{-9}\ \ \forall r\Bigr\}`, caption: { en: 'The period a TopoSort walk gives a block', es: 'El período que el recorrido TopoSort da a un bloque' } },
        ],
        figure: { caption: { en: 'Gershon\'s weight counts each successor once; a path sum would count a shared block twice.', es: 'El peso de Gershon cuenta cada sucesor una vez; una suma por caminos contaría dos veces un bloque compartido.' }, render: (lang) => <GershonCone lang={lang} /> },
        data: (lang) => <MethodCasesPanel lang={lang} method="toposort-expected" />,
        limits: [
          { en: 'No look-ahead: a block placed early may consume capacity a later, better block needed.', es: 'Sin anticipación: un bloque ubicado temprano puede consumir capacidad que un bloque posterior y mejor necesitaba.' },
        ],
        refs: ['chicoisne2012', 'gershon1987'],
      },
      {
        id: 'sliding-built',
        title: { en: 'The sliding window, as computed', es: 'La ventana deslizante, como se calcula' },
        paragraphs: [
          {
            en: 'Each slide builds a MILP over the candidate blocks and the slots of the window (three periods and a tail): one binary per candidate and slot, cumulative, with rows for monotonicity, precedence between candidates in every slot, floors from predecessors fixed on earlier slides, and capacity per resource and slot (the window\'s remaining capacity in its periods, the total of the remaining periods in the tail). The objective is the Abel form over the slots, with the tail valued at the discount of its first period.',
            es: 'Cada paso construye un MILP sobre los bloques candidatos y los intervalos de la ventana (tres períodos y una cola): un binario por candidato e intervalo, acumulado, con filas de monotonía, precedencia entre candidatos en cada intervalo, pisos desde predecesores fijados en pasos anteriores, y capacidad por recurso e intervalo (la capacidad restante de la ventana en sus períodos, el total de los períodos restantes en la cola). El objetivo es la forma de Abel sobre los intervalos, con la cola valorada al descuento de su primer período.',
          },
          {
            en: 'The candidates are the undecided pit blocks ordered by the LP expected time, then by depth from the surface, then by id, taken from the front until their extraction tonnage covers 1.6 times the window\'s capacity, and closed upward explicitly. If that needs more than 6,000 blocks the method raises rather than starve the window. HiGHS solves each slide with presolve to a relative MIP gap of 3 percent and no time limit; the first period of the answer is fixed, its capacity consumed, and the window slides by one period.',
            es: 'Los candidatos son los bloques del pit no decididos ordenados por el tiempo esperado de la LP, luego por profundidad desde la superficie, luego por id, tomados desde el frente hasta que su tonelaje de extracción cubre 1,6 veces la capacidad de la ventana, y cerrados hacia arriba de manera explícita. Si eso requiere más de 6.000 bloques el método se detiene con un error en vez de dejar la ventana famélica. HiGHS resuelve cada paso con presolve hasta una brecha MIP relativa de 3 por ciento y sin límite de tiempo; el primer período de la respuesta se fija, su capacidad se consume, y la ventana se desliza un período.',
          },
          {
            en: 'The cost is the price of the look-ahead. A slide on a 6,912-block twin is a MILP over about 2,200 candidates and four slots; the whole method runs from seconds on newman1 to well over an hour on the largest declared instances, on one core. The table gives its gap and time on every case.',
            es: 'El costo es el precio de la anticipación. Un paso en un gemelo de 6.912 bloques es un MILP sobre cerca de 2.200 candidatos y cuatro intervalos; el método completo corre desde segundos en newman1 hasta bastante más de una hora en las mayores instancias declaradas, en un núcleo. La tabla da su brecha y su tiempo en cada caso.',
          },
        ],
        steps: {
          title: { en: 'One slide', es: 'Un paso' },
          items: [
            { en: 'Order the undecided pit blocks by (E_b, depth, id); take the prefix covering 1.6 window capacities; close it upward.', es: 'Ordenar los bloques del pit no decididos por (E_b, profundidad, id); tomar el prefijo que cubre 1,6 capacidades de ventana; cerrarlo hacia arriba.' },
            { en: 'Build the cumulative MILP over the candidates and the window slots plus the tail.', es: 'Construir el MILP acumulado sobre los candidatos y los intervalos de la ventana más la cola.' },
            { en: 'Solve with HiGHS to a 3 percent relative gap.', es: 'Resolver con HiGHS hasta una brecha relativa de 3 por ciento.' },
            { en: 'Fix the blocks the answer mines in the first slot; consume their capacity; slide.', es: 'Fijar los bloques que la respuesta extrae en el primer intervalo; consumir su capacidad; deslizar.' },
          ],
        },
        equations: [
          { tex: String.raw`\text{vars}=|\mathcal C|\,(w+1),\qquad \text{rows}\approx|\mathcal C|\,w+m_{\mathcal C}\,(w+1)+R\,(w+1)`, caption: { en: 'Size of one slide: candidates times slots; m_C is the number of arcs inside the candidate set', es: 'Tamaño de un paso: candidatos por intervalos; m_C es el número de arcos dentro del conjunto de candidatos' } },
        ],
        figure: { caption: { en: 'Solve three periods with a tail, keep one, slide.', es: 'Resolver tres períodos con una cola, conservar uno, deslizar.' }, render: (lang) => <SlidingWindow lang={lang} />, wide: true },
        data: (lang) => <MethodCasesPanel lang={lang} method="sliding-window" />,
        limits: [
          { en: 'The candidate set and the optimistic tail are approximations of the published full-model window.', es: 'El conjunto de candidatos y la cola optimista son aproximaciones de la ventana de modelo completo publicada.' },
          { en: 'The most expensive method by an order of magnitude; it runs offline only.', es: 'El método más costoso por un orden de magnitud; corre solo offline.' },
        ],
        refs: ['cullenbine2011', 'huangfu2018'],
      },
      {
        id: 'local-built',
        title: { en: 'Local search, as computed', es: 'Búsqueda local, como se calcula' },
        paragraphs: [
          {
            en: 'The shift search makes up to twelve passes. Each pass first visits mined blocks in increasing period and pulls every positive block to the earliest period at or after its latest predecessor that has room, then visits them in decreasing period and pushes every negative block to the latest period, no later than its earliest successor, that has room. Remaining capacities are updated move by move; the search stops when a pass moves nothing, and a final check asserts the value did not fall.',
            es: 'La búsqueda de desplazamiento hace hasta doce pasadas. Cada pasada primero recorre los bloques extraídos en período creciente y adelanta todo bloque positivo al período más temprano, desde su último predecesor, que tenga espacio; luego los recorre en período decreciente y atrasa todo bloque negativo al período más tardío, no posterior a su primer sucesor, que tenga espacio. Las capacidades restantes se actualizan movimiento a movimiento; la búsqueda termina cuando una pasada no mueve nada, y una verificación final asegura que el valor no bajó.',
          },
          {
            en: 'The restricted C-PIT[D] MILP draws a seeded neighbourhood (seed 11), with sixteen rounds up to 8,000 blocks and ten above, and at most 180 free blocks. The model accounts for the capacity left by fixed blocks and precedence floors and ceilings. HiGHS targets relative gap 1e-4 with a deterministic 2,000-node limit per neighborhood. A feasible incumbent can be retained before the target is proven; every method trace records status, node count, gap, incumbent, upper bound and proof status for every attempted solve. Only a candidate that improves the full schedule is accepted. If no MILP solver is available, the method records NOT RUN and shows the shift plan in its place.',
            es: 'El MILP restringido C-PIT[D] sortea un vecindario con semilla 11, con dieciséis rondas hasta 8.000 bloques y diez por encima, y hasta 180 bloques libres. El modelo considera la capacidad restante de los bloques fijos y los pisos y techos de precedencia. HiGHS apunta a una brecha relativa de 1e-4 con un límite determinista de 2.000 nodos por vecindario. Se puede conservar un incumbente factible antes de demostrar la meta; cada traza registra estado, nodos, brecha, incumbente, cota superior y estado de prueba de cada solve. Solo se acepta un candidato que mejora el plan completo. Si no hay solver MILP, el método registra NO CORRIÓ y muestra el plan de desplazamiento.',
          },
        ],
        steps: {
          title: { en: 'One bounded round', es: 'Una ronda acotada' },
          items: [
            { en: 'Draw D: a block and up to 180 connected predecessors, or successors, or the blocks of periods t - 1 to t + 1.', es: 'Sortear D: un bloque y hasta 180 predecesores conexos, o sucesores, o los bloques de los períodos t - 1 a t + 1.' },
            { en: 'Subtract the fixed blocks\' resource use from each period.', es: 'Descontar de cada período el uso de recursos de los bloques fijos.' },
            { en: 'Add floors from fixed predecessors and ceilings from fixed successors.', es: 'Agregar pisos desde predecesores fijos y techos desde sucesores fijos.' },
            { en: 'Stop at the 1e-4 gap target or 2,000 nodes; accept a feasible plan only if full-schedule value rises.', es: 'Detenerse en la brecha 1e-4 o 2.000 nodos; aceptar un plan factible solo si sube el valor total.' },
          ],
        },
        equations: [
          { tex: String.raw`\text{accept}\iff \mathrm{NPV}(\tau')>\mathrm{NPV}(\tau)\,\bigl(1+10^{-9}\bigr)`, caption: { en: 'Acceptance on the full schedule, so the objective is monotone', es: 'Aceptación sobre el plan completo, así que el objetivo es monótono' } },
        ],
        figure: { caption: { en: 'A neighbourhood re-solved with the rest of the plan fixed.', es: 'Un vecindario re-resuelto con el resto del plan fijo.' }, render: (lang) => <LocalSearch lang={lang} /> },
        data: (lang) => <MethodCasesPanel lang={lang} method="cpitD-local-search" showNotes />,
        limits: [
          { en: 'Few rounds and small neighbourhoods against the published hour of CPLEX on up to 3,250 blocks.', es: 'Pocas rondas y vecindarios pequeños frente a la hora publicada de CPLEX sobre hasta 3.250 bloques.' },
        ],
        refs: ['chicoisne2012', 'lamghari2012'],
      },
      {
        id: 'destination-built',
        title: { en: 'Destination plans, as computed', es: 'Planes con destino, como se calculan' },
        paragraphs: [
          {
            en: 'The re-cut is built once per case. The PCPSP instance is restricted to the LP\'s destinations (every other destination of a mined block is marked forbidden), and its CPIT reduction gives values and resource coefficients at those destinations. The ultimate pit of that CPIT is solved again, because dumping a marginal ore block changes its value, and its two single-resource relaxations are computed by the critical multiplier algorithm, as for any CPIT case. ExTS on the tighter relaxation gives destination-toposort; the sliding window with the same window, candidate rule and gap as the CPIT method gives destination-sliding-window. Each plan is read back as a PCPSP plan at the restricted destinations, verified for precedence and every capacity under the destination coefficients, and valued under the original instance.',
            es: 'El re-corte se construye una vez por caso. La instancia PCPSP se restringe a los destinos de la LP (todo otro destino de un bloque extraído se marca prohibido), y su reducción CPIT da valores y coeficientes de recurso en esos destinos. El pit final de ese CPIT se resuelve de nuevo, porque botar un bloque de mineral marginal cambia su valor, y sus dos relajaciones de un recurso se calculan con el algoritmo del multiplicador crítico, como en cualquier caso CPIT. ExTS sobre la relajación más ajustada da destination-toposort; la ventana deslizante con la misma ventana, regla de candidatos y brecha que el método CPIT da destination-sliding-window. Cada plan se lee de vuelta como plan PCPSP en los destinos restringidos, se verifica en precedencia y en cada capacidad bajo los coeficientes por destino, y se valora bajo la instancia original.',
          },
          {
            en: 'The improving method starts from the best of three plans: the two re-cut plans and the best comparable CPIT plan lifted to PCPSP. It searches destination-aware neighbourhoods with up to 160 free blocks, sixteen rounds (ten above 8,000 blocks), seed 11, relative gap target 1e-4 and at most 2,000 branch-and-bound nodes per neighbourhood. Its MILP links cumulative extraction and destination binaries, subtracts fixed blocks\' destination-specific resource use and carries the same precedence floors and ceilings as CPIT. The trace records each attempted solve\'s status, node count, gap, incumbent, upper bound and proof status, as well as effective cutoffs, destination counts and plan value over the best CPIT plan.',
            es: 'El método de mejora parte del mejor de tres planes: los dos re-cortados y el mejor plan CPIT comparable elevado a PCPSP. Busca vecindarios con destino y hasta 160 bloques libres, dieciséis rondas (diez sobre 8.000 bloques), semilla 11, brecha objetivo 1e-4 y un máximo de 2.000 nodos de ramificación y acotación por vecindario. Su MILP vincula las variables binarias de extracción acumulada y destino, descuenta el uso de recursos por destino de los bloques fijos e incluye los mismos pisos y techos de precedencia que CPIT. La traza registra el estado, nodos, brecha, incumbente, cota superior y estado de prueba de cada solve, además de los cortes efectivos, conteos por destino y valor del plan sobre el mejor CPIT.',
          },
        ],
        steps: {
          title: { en: 'The destination methods', es: 'Los métodos con destino' },
          items: [
            { en: 'Solve the PCPSP LP; take each mined block\'s dominant destination; restrict the instance to it.', es: 'Resolver la LP PCPSP; tomar el destino dominante de cada bloque extraído; restringir la instancia a él.' },
            { en: 'Reduce to CPIT; solve its ultimate pit and its two relaxations.', es: 'Reducir a CPIT; resolver su pit final y sus dos relajaciones.' },
            { en: 'ExTS and the sliding window on that CPIT; read both back as PCPSP plans and check them.', es: 'ExTS y la ventana deslizante sobre ese CPIT; leer ambos de vuelta como planes PCPSP y verificarlos.' },
            { en: 'Start the bounded OPBSP-[D] neighborhood search from the best of those and the lifted best CPIT plan.', es: 'Iniciar la búsqueda acotada de vecindarios OPBSP-[D] desde el mejor de esos y el mejor plan CPIT elevado.' },
            { en: 'Score all three against the PCPSP LP of the case.', es: 'Juzgar los tres contra la LP PCPSP del caso.' },
          ],
        },
        equations: [
          { tex: String.raw`\mathrm{NPV}_{\mathrm{PCPSP}}(\text{lift}(\tau))=\mathrm{NPV}_{\mathrm{CPIT}}(\tau)\ \Rightarrow\ \mathrm{NPV}(\text{destination-local-search})\ \ge\ \max_{\text{CPIT methods}}\mathrm{NPV}`, caption: { en: 'Why the improving method can never end below the best CPIT plan', es: 'Por qué el método de mejora nunca puede terminar bajo el mejor plan CPIT' } },
          { tex: String.raw`\mathcal F_{\text{re-cut CPIT}}\subseteq\mathcal F_{\mathrm{PCPSP}},\qquad \mathrm{NPV}_{\mathrm{PCPSP}}(\tau,d^{*})=\mathrm{NPV}_{\text{re-cut}}(\tau)`, caption: { en: 'Every plan of the re-cut is a PCPSP plan with the same value', es: 'Todo plan del re-corte es un plan PCPSP con el mismo valor' } },
        ],
        figure: { caption: { en: 'The re-cut and the chain that schedules it.', es: 'El re-corte y la cadena que lo programa.' }, render: (lang) => <DestinationRecut lang={lang} />, wide: true },
        data: (lang) => <MethodCasesPanel lang={lang} method="destination-local-search" showNotes />,
        limits: [
          { en: 'Two destinations; blending rows are read and not enforced.', es: 'Dos destinos; las filas de mezcla se leen y no se imponen.' },
          { en: 'The re-cut adds a second sliding window per case, the largest single cost of the bake on the big twins.', es: 'El re-corte agrega una segunda ventana deslizante por caso, el mayor costo individual del horneado en los gemelos grandes.' },
        ],
        refs: ['jelvez2018', 'chicoisne2012'],
      },
      {
        id: 'minwidth-built',
        title: { en: 'Coherence and minimum width, as computed', es: 'Coherencia y ancho mínimo, como se calculan' },
        paragraphs: [
          {
            en: 'Coherence is computed per period by union-find over the blocks mined in it, joining face neighbours along x, y and level; the narrowest run is the shortest sequence of consecutive mined blocks along x or y within one level. Both are recorded for every plan of every method, period by period, and summarised per method in the manifest.',
            es: 'La coherencia se calcula por período con unión-búsqueda sobre los bloques extraídos en él, uniendo vecinos de cara en x, y y nivel; el tramo más estrecho es la secuencia más corta de bloques extraídos consecutivos en x o y dentro de un nivel. Ambos se registran para cada plan de cada método, período a período, y se resumen por método en el manifiesto.',
          },
          {
            en: 'The min-width method starts from the best comparable plan of the case, verifies it is capacity-feasible, and makes up to three passes. In each, every mined block whose run along its bench is shorter than three blocks votes among its four bench neighbours\' periods; it moves to the majority period if precedence holds in both directions and every resource of that period has room, and the remaining capacities are updated. It reports the blocks below the target before and after, the moves made and refused for capacity, and the NPV change.',
            es: 'El método de ancho mínimo parte del mejor plan comparable del caso, verifica que sea factible en capacidad, y hace hasta tres pasadas. En cada una, todo bloque extraído cuyo tramo a lo largo de su banco sea menor que tres bloques vota entre los períodos de sus cuatro vecinos de banco; se mueve al período mayoritario si la precedencia se cumple en ambos sentidos y cada recurso de ese período tiene espacio, y las capacidades restantes se actualizan. Reporta los bloques bajo el objetivo antes y después, los movimientos hechos y rechazados por capacidad, y el cambio de VAN.',
          },
        ],
        equations: [
          { tex: String.raw`\mathrm{run}(b)=\min_{\text{axis}\in\{x,y\}}\ \#\bigl\{\text{consecutive blocks with }\tau=\tau_b\ \text{through } b\ \text{on its level}\bigr\}`, caption: { en: 'The run length that the target width is compared with', es: 'La longitud de tramo con que se compara el ancho objetivo' } },
        ],
        figure: { caption: { en: 'Slivers absorbed into the majority neighbour\'s period, when capacity allows.', es: 'Astillas absorbidas por el período del vecino mayoritario, cuando la capacidad lo permite.' }, render: (lang) => <Operability lang={lang} /> },
        data: (lang) => <MethodCasesPanel lang={lang} method="min-width" showNotes />,
        limits: [
          { en: 'A grid-axis width in blocks; no geometric opening operator in metres.', es: 'Un ancho en bloques sobre los ejes de la grilla; sin un operador de apertura geométrico en metros.' },
        ],
        refs: ['bai2018', 'chicoisne2012'],
      },
    ],
  },
  {
    id: 'learned',
    label: { en: 'Learned, as trained', es: 'Aprendido, como se entrena' },
    topics: [
      {
        id: 'training',
        title: { en: 'Training the surrogates', es: 'Entrenar los sustitutos' },
        paragraphs: [
          {
            en: 'Training data are generated, not collected: for every training seed, archetype, scenario and grid size, a twin is built, both single-resource relaxations are solved exactly, the expected times of the tighter one become the block targets, the Algorithm 4 bound over the ultimate-pit value becomes the deposit target, and the exact ExTS and greedy plans are recorded for scoring. The jobs are independent and run in a pool of worker processes. Features are standardised with the training mean and spread only.',
            es: 'Los datos de entrenamiento se generan, no se recolectan: para cada semilla de entrenamiento, arquetipo, escenario y tamaño de grilla se construye un gemelo, se resuelven de manera exacta las dos relajaciones de un recurso, los tiempos esperados de la más ajustada pasan a ser los objetivos por bloque, la cota del Algoritmo 4 sobre el valor del pit final pasa a ser el objetivo por depósito, y se registran los planes ExTS exacto y codicioso para juzgar. Los trabajos son independientes y corren en un conjunto de procesos. Los rasgos se estandarizan solo con la media y la dispersión de entrenamiento.',
          },
          {
            en: 'Both models use small multilayer perceptrons trained in plain numpy with an explicit Adam update and a sigmoid head. The expected-time artifact is an ensemble of five independently seeded 48-24 MLPs trained for 10 epochs on 11 non-constant block features; browser and offline inference average the same five members. The deposit-bound model remains a single 24-12 MLP trained for 3,000 epochs. Inputs are standardized from the training split only. Each artifact is exported to ONNX with standardization folded in and checked against the numpy forward pass to 1e-5.',
            es: 'Ambos modelos usan perceptrones multicapa pequeños entrenados en numpy simple, con una actualización Adam explícita y una salida sigmoide. El artefacto de tiempo esperado es un conjunto de cinco MLP 48-24 con semillas independientes, entrenados durante 10 épocas con 11 rasgos de bloque no constantes; la inferencia del navegador y la offline promedian los mismos cinco miembros. La cota por depósito sigue siendo un MLP 24-12 entrenado durante 3.000 épocas. Las entradas se estandarizan solo con el conjunto de entrenamiento. Cada artefacto se exporta a ONNX con la estandarización incorporada y se verifica contra la pasada numpy con tolerancia 1e-5.',
          },
          {
            en: 'After training, the held-out deposits are scored by the value of the plans, the failures are characterised by archetype, size, rate and horizon, a guard rule is chosen on the TRAINING deposits by an F2 score (recall weighted four times precision), and a separate script measures that rule on a third, disjoint seed set without choosing anything.',
            es: 'Tras entrenar, los depósitos retenidos se juzgan por el valor de los planes, las fallas se caracterizan por arquetipo, tamaño, tasa y horizonte, se elige una regla de guarda sobre los depósitos de ENTRENAMIENTO con un puntaje F2 (el recall pesa cuatro veces la precisión), y un script aparte mide esa regla sobre un tercer conjunto disjunto de semillas sin elegir nada.',
          },
        ],
        equations: [
          { tex: String.raw`F_2=\frac{5\,P\,R}{4P+R},\qquad \theta\leftarrow\theta-\eta\,\frac{\hat m}{\sqrt{\hat v}+\epsilon}`, caption: { en: 'The guard\'s selection score, and the Adam update', es: 'El puntaje de selección de la guarda, y la actualización Adam' } },
        ],
        facts: [
          { k: { en: 'Seeds', es: 'Semillas' }, v: { en: '12 train, 6 held out, 6 for the guard', es: '12 entrenamiento, 6 retenidas, 6 para la guarda' } },
          { k: { en: 'Sweep', es: 'Barrido' }, v: { en: '4 archetypes x 9 scenarios x 2 sizes', es: '4 arquetipos x 9 escenarios x 2 tamaños' } },
          { k: { en: 'Export check', es: 'Verificación de exportación' }, v: { en: 'onnxruntime against numpy to 1e-5', es: 'onnxruntime contra numpy a 1e-5' } },
        ],
        figure: { caption: { en: 'Deposits are the unit of every split.', es: 'Los depósitos son la unidad de toda partición.' }, render: (lang) => <DepositSplit lang={lang} /> },
        limits: [
          { en: 'Trained on two grid sizes; larger deposits are an extrapolation, measured per case where the exact plan exists.', es: 'Entrenado en dos tamaños de grilla; los depósitos mayores son una extrapolación, medida por caso donde existe el plan exacto.' },
        ],
        refs: ['kingma2015', 'chicoisne2012'],
      },
      {
        id: 'browser-models',
        title: { en: 'The learned plan in the browser', es: 'El plan aprendido en el navegador' },
        paragraphs: [
          {
            en: 'In the focus view, every control change triggers two computations on the same block model. On the next animation frame the browser rebuilds the precedence for the slope angle, solves the ultimate pit, computes the eleven block features (rounded to single precision as the pipeline does), runs the expected-time model, and walks TopoSort on the predicted weights: the learned plan, drawn at once. When the control has been still for 220 ms the setting is sent to a worker, which computes the critical multiplier bound per resource, the greedy, Gershon and expected-time plans and a shift search, and returns the best exact plan.',
            es: 'En la vista de foco, cada cambio de control dispara dos cálculos sobre el mismo modelo de bloques. En el siguiente cuadro de animación el navegador reconstruye la precedencia para el ángulo de talud, resuelve el pit final, calcula los once rasgos por bloque (redondeados a precisión simple como hace el pipeline), corre el modelo de tiempo esperado y recorre TopoSort con los pesos predichos: el plan aprendido, dibujado de inmediato. Cuando el control lleva 220 ms quieto, el escenario se envía a un worker, que calcula la cota del multiplicador crítico por recurso, los planes codicioso, de Gershon y de tiempo esperado y una búsqueda de desplazamiento, y devuelve el mejor plan exacto.',
          },
          {
            en: 'When the exact answer for the same setting arrives, it replaces the learned plan, and the learned plan is scored against the exact expected-time plan: its share of that plan and how much sooner it came are shown in the HUD. A newer setting discards older answers, so the screen never shows a plan for a setting that is no longer selected. The forward pass and the feature builder are held to outputs the Python models wrote by a parity test, to 1e-9 on the model and 1e-6 on the features.',
            es: 'Cuando llega la respuesta exacta para el mismo escenario, reemplaza al plan aprendido, y el plan aprendido se juzga contra el plan exacto de tiempo esperado: su fracción de ese plan y cuánto antes llegó se muestran en el visor. Un escenario más nuevo descarta respuestas anteriores, de modo que la pantalla nunca muestra un plan de un escenario que ya no está seleccionado. La pasada del modelo y el constructor de rasgos están sujetos por una prueba de paridad a salidas que escribieron los modelos en Python, a 1e-9 en el modelo y 1e-6 en los rasgos.',
          },
        ],
        steps: {
          title: { en: 'On every control change', es: 'En cada cambio de control' },
          items: [
            { en: 'Next frame: precedence, ultimate pit, features, forward pass, TopoSort: the learned plan.', es: 'Siguiente cuadro: precedencia, pit final, rasgos, pasada del modelo, TopoSort: el plan aprendido.' },
            { en: 'After 220 ms still: post the setting to the worker.', es: 'Tras 220 ms quieto: enviar el escenario al worker.' },
            { en: 'Worker: bounds, three TopoSorts, shift search; return the best plan and the exact ExTS value.', es: 'Worker: cotas, tres TopoSort, búsqueda de desplazamiento; devolver el mejor plan y el valor ExTS exacto.' },
            { en: 'Replace the learned plan; show its share of the exact ExTS plan and the speed-up.', es: 'Reemplazar el plan aprendido; mostrar su fracción del plan ExTS exacto y la aceleración.' },
          ],
        },
        equations: [
          { tex: String.raw`\text{share}=\frac{\mathrm{NPV}(\text{learned})}{\mathrm{NPV}(\text{ExTS exact})},\qquad \text{speed-up}=\frac{t_{\text{exact}}}{t_{\text{learned}}}`, caption: { en: 'The two numbers the HUD shows for every setting', es: 'Los dos números que muestra el visor para cada escenario' } },
        ],
        figure: { caption: { en: 'The same TopoSort walk, with the weight from the exact relaxation or from the surrogate.', es: 'El mismo recorrido TopoSort, con el peso desde la relajación exacta o desde el sustituto.' }, render: (lang) => <SurrogatePath lang={lang} /> },
        data: (lang) => <PreviewTimingTable lang={lang} />,
        limits: [
          { en: 'The learned plan is a preview; the bound and the reported plan always come from the exact path.', es: 'El plan aprendido es una vista previa; la cota y el plan reportado siempre vienen del camino exacto.' },
        ],
        refs: ['kingma2015', 'chicoisne2012'],
      },
    ],
  },
  {
    id: 'evidence',
    label: { en: 'Live lane and evidence', es: 'Carril en vivo y evidencia' },
    topics: [
      {
        id: 'live',
        title: { en: 'What the browser recomputes', es: 'Qué recalcula el navegador' },
        paragraphs: [
          {
            en: 'The synthetic twins carry their block arrays in the committed trace, so the browser can re-solve them on the same block model the bake used; the block model is never regenerated in the browser, because a second implementation of a seeded random field would have to agree bit for bit and silently would not. A MineLib case carries no per-block data, so it is always replayed. A case is live if it is redistributable and within the measured budgets: 30,000 blocks, 300,000 precedence arcs and a 6 MB trace.',
            es: 'Los gemelos sintéticos llevan sus arreglos por bloque en la traza versionada, de modo que el navegador puede re-resolverlos sobre el mismo modelo de bloques que usó el horneado; el modelo de bloques nunca se regenera en el navegador, porque una segunda implementación de un campo aleatorio sembrado tendría que coincidir bit a bit y en silencio no lo haría. Un caso MineLib no lleva datos por bloque, así que siempre se reproduce. Un caso es en vivo si es redistribuible y está dentro de los presupuestos medidos: 30.000 bloques, 300.000 arcos de precedencia y una traza de 6 MB.',
          },
          {
            en: 'What the browser recomputes is the subset of methods fast enough to answer a control: the precedence for the chosen slope, the ultimate pit, the critical multiplier per resource and the Algorithm 4 bound, three TopoSort plans and a shift search, the learned plan and the coherence of the result. What it replays is everything that takes minutes to hours or needs a MILP solver: the joint bound, the PCPSP LP, the sliding window, the node-bounded re-solves, the destination plans, the smoothing and the ensemble. A parity test asserts that the browser\'s ultimate pit matches the offline one block for block and its bound matches to 1e-6 on a committed case, and that a live plan is feasible and never above its bound; it does not assert equal NPVs, because the two lanes run different subsets of the methods.',
            es: 'Lo que recalcula el navegador es el subconjunto de métodos lo bastante rápido para responder a un control: la precedencia para el talud elegido, el pit final, el multiplicador crítico por recurso y la cota del Algoritmo 4, tres planes TopoSort y una búsqueda de desplazamiento, el plan aprendido y la coherencia del resultado. Lo que reproduce es todo lo que toma de minutos a horas o necesita un solver MILP: la cota conjunta, la LP de PCPSP, la ventana deslizante, las re-resoluciones exactas, los planes con destino, el suavizado y el ensamble. Una prueba de paridad verifica que el pit final del navegador coincide con el offline bloque a bloque y su cota a 1e-6 en un caso versionado, y que un plan en vivo es factible y nunca supera su cota; no verifica VAN iguales, porque los dos carriles corren subconjuntos distintos de los métodos.',
          },
        ],
        equations: [
          { tex: String.raw`\text{live}\iff\text{redistributable}\ \wedge\ n\le 30{,}000\ \wedge\ m\le 300{,}000\ \wedge\ \text{trace}\le 6\ \text{MB}`, caption: { en: 'The lane rule, from measured numbers recorded in each manifest', es: 'La regla de carril, desde números medidos registrados en cada manifiesto' } },
        ],
        figure: { caption: { en: 'The browser recomputes fast results and replays the remaining evidence.', es: 'El navegador recalcula los resultados rápidos y reproduce la evidencia restante.' }, render: (lang) => <LaneFidelity lang={lang} /> },
        limits: [
          { en: 'The live bound is Algorithm 4\'s, not the joint one; on two-resource twins it can be looser than the baked bound of the same setting.', es: 'La cota en vivo es la del Algoritmo 4, no la conjunta; en gemelos de dos recursos puede ser más holgada que la cota horneada del mismo escenario.' },
        ],
        refs: ['chicoisne2012'],
      },
      {
        id: 'reproducible',
        title: { en: 'What makes a bake reproducible', es: 'Qué hace reproducible un horneado' },
        paragraphs: [
          {
            en: 'Every number on these pages comes from a committed trace and manifest, and each must be reproducible from its parameters and seeds alone. Every random choice is seeded (the twins, the neighbourhoods of both exact re-solves, the ensemble, the training); every tie is broken by block id or method name; and no solver runs against a wall clock, because a time limit makes the answer depend on the machine and its load. The MILP methods stop on relative gaps (3e-2 for the window, 1e-4 for the re-solves), which are properties of the problem.',
            es: 'Todo número de estas páginas viene de una traza y un manifiesto versionados, y cada uno debe ser reproducible solo desde sus parámetros y semillas. Toda elección aleatoria está sembrada (los gemelos, los vecindarios de ambas re-resoluciones exactas, el ensamble, el entrenamiento); todo empate se rompe por id de bloque o nombre de método; y ningún solver corre contra un reloj, porque un límite de tiempo hace que la respuesta dependa de la máquina y de su carga. Los métodos MILP se detienen en brechas relativas (3e-2 para la ventana, 1e-4 para las re-resoluciones), que son propiedades del problema.',
          },
          {
            en: 'Before a trace is written every plan is checked for precedence in every period and for every capacity, against the coefficients of the problem it solves, and after it is written the pipeline re-reads it: every plan below the bound of its own problem, period rows summing to the plan\'s value, per-block arrays of the right length, no per-block data on a non-redistributable instance. A separate check of the committed artifacts repeats these rules and adds the cross-case ones: the bound used is the smaller certified one, and the PCPSP LP sits above the joint CPIT LP.',
            es: 'Antes de escribir una traza cada plan se verifica en precedencia en cada período y en cada capacidad, contra los coeficientes del problema que resuelve, y después de escribirla el pipeline la relee: todo plan bajo la cota de su propio problema, filas por período que suman el valor del plan, arreglos por bloque del largo correcto, ningún dato por bloque en una instancia no redistribuible. Una verificación aparte de los artefactos versionados repite estas reglas y agrega las que cruzan casos: la cota usada es la menor certificada, y la LP de PCPSP queda sobre la LP conjunta de CPIT.',
          },
        ],
        equations: [
          { tex: String.raw`\forall\ \text{plans}:\ \ \tau_a\le\tau_b\ \ \forall(a,b),\ \ \text{use}_{rt}\le c_{rt}(1+10^{-9}),\ \ \mathrm{NPV}\le Z^{\text{bound}}_{\text{own problem}}`, caption: { en: 'The feasibility and bound gate every plan of every method passes before it is recorded', es: 'El control de factibilidad y cota que pasa cada plan de cada método antes de registrarse' } },
        ],
        facts: [
          { k: { en: 'Seeds', es: 'Semillas' }, v: { en: 'twins, neighbourhoods (11), ensemble (31), training (17, 23)', es: 'gemelos, vecindarios (11), ensamble (31), entrenamiento (17, 23)' } },
          { k: { en: 'Stops', es: 'Paradas' }, v: { en: 'relative gaps, never a wall clock', es: 'brechas relativas, nunca un reloj' } },
          { k: { en: 'Checks', es: 'Verificaciones' }, v: { en: 'feasibility, own bound, period sums, array shapes, licence', es: 'factibilidad, cota propia, sumas por período, forma de arreglos, licencia' } },
        ],
        limits: [
          { en: 'Reproducible on the same library versions; a different HiGHS release may stop at a different point inside the same gap.', es: 'Reproducible con las mismas versiones de bibliotecas; otra versión de HiGHS puede detenerse en otro punto dentro de la misma brecha.' },
        ],
        refs: ['huangfu2018'],
      },
    ],
  },
  {
    id: 'architecture',
    label: { en: 'Architecture and delivery', es: 'Arquitectura y entrega' },
    topics: [
      {
        id: 'architecture',
        title: { en: 'From source cases to browser views', es: 'De los casos fuente a las vistas del navegador' },
        paragraphs: [
          {
            en: 'The offline pipeline is the scientific authority: it loads a declared case, validates the model, runs pinned OreBlocks methods, checks feasibility and bound relations, then writes a trace, manifest and index. The browser consumes those versioned artifacts; it does not quietly rebake experiments when a reader opens a page. The trace contract keeps method rows, per-period plans and provenance together, while the index chooses exactly one default case.',
            es: 'El pipeline fuera de línea es la autoridad científica: carga un caso declarado, valida el modelo, ejecuta métodos OreBlocks fijados, verifica factibilidad y relaciones entre cotas, y luego escribe una traza, manifiesto e índice. El navegador consume esos artefactos versionados; no vuelve a hornear experimentos en silencio cuando alguien abre una página. El contrato de la traza mantiene juntas las filas de métodos, los planes por período y la procedencia, mientras el índice elige exactamente un caso predeterminado.',
          },
          {
            en: 'A replay view draws the committed result. A live view sends the same baked synthetic block arrays to a Web Worker for the explicitly supported fast subset. Keeping the worker off the document thread preserves interaction, and keeping the two lanes visible makes it clear which values were recomputed and which were replayed.',
            es: 'Una vista de reproducción dibuja el resultado versionado. Una vista en vivo envía los mismos arreglos de bloques sintéticos horneados a un Web Worker para el subconjunto rápido explícitamente admitido. Mantener el worker fuera del hilo del documento preserva la interacción, y mostrar los dos carriles deja claro qué valores se recalcularon y cuáles se reprodujeron.',
          },
        ],
        figure: { caption: { en: 'The evidence path and the browser boundary.', es: 'La ruta de evidencia y el límite del navegador.' }, render: (lang) => <LaneFidelity lang={lang} />, wide: true },
        refs: ['chicoisne2012'],
      },
      {
        id: 'admission',
        title: { en: 'What admits a case to the live lane', es: 'Qué admite un caso al carril en vivo' },
        paragraphs: [
          {
            en: 'Admission requires redistributable inputs and measured size budgets: at most 30,000 blocks, 300,000 precedence arcs and a 6 MB trace. MineLib cases fail the redistribution condition by design and therefore remain aggregate replay evidence. A synthetic case outside any size budget remains viewable from its trace but cannot be selected for a live solve.',
            es: 'La admisión requiere entradas redistribuibles y presupuestos de tamaño medidos: como máximo 30.000 bloques, 300.000 arcos de precedencia y una traza de 6 MB. Los casos MineLib no cumplen la condición de redistribución por diseño y por eso permanecen como evidencia agregada de reproducción. Un caso sintético que excede cualquier presupuesto sigue visible desde su traza, pero no se puede elegir para una resolución en vivo.',
          },
          {
            en: 'The limit is an explicit product boundary, not a claim that larger pits are unsupported by the underlying algorithms. A future case can enter only after its browser cost is measured, parity checks are added, and the artifact guard records why its input is safe to ship.',
            es: 'El límite es una frontera explícita del producto, no una afirmación de que los algoritmos subyacentes no admitan rajos mayores. Un caso futuro solo puede entrar después de medir su costo en el navegador, agregar verificaciones de paridad y registrar en el control de artefactos por qué es seguro distribuir su entrada.',
          },
        ],
        facts: [
          { k: { en: 'Blocks', es: 'Bloques' }, v: { en: '30,000 maximum', es: '30.000 máximo' } },
          { k: { en: 'Precedence arcs', es: 'Arcos de precedencia' }, v: { en: '300,000 maximum', es: '300.000 máximo' } },
          { k: { en: 'Trace', es: 'Traza' }, v: { en: '6 MB maximum', es: '6 MB máximo' } },
        ],
        refs: ['chicoisne2012'],
      },
      {
        id: 'deployment',
        title: { en: 'Static deployment and route integrity', es: 'Despliegue estático e integridad de rutas' },
        paragraphs: [
          {
            en: 'The product is a static client application deployed through the repository workflow to GitHub Pages at phaseflow.fasl-work.com. The production build materialises direct-route fallbacks and copies the committed data artifacts into the served bundle; no runtime service computes or substitutes scientific results.',
            es: 'El producto es una aplicación cliente estática que se despliega mediante el flujo del repositorio a GitHub Pages en phaseflow.fasl-work.com. El build de producción materializa rutas directas de respaldo y copia los artefactos de datos versionados al paquete servido; ningún servicio en tiempo de ejecución calcula ni sustituye resultados científicos.',
          },
          {
            en: 'A deployment is ready only when direct routes hydrate, every requested JSON artifact returns JSON rather than the SPA fallback, and the bilingual browser gate passes at phone and desktop sizes. A successful local build is a preparation check; the Actions deployment and live HTTPS route checks establish the remote state.',
            es: 'Un despliegue está listo solo cuando las rutas directas hidratan, cada artefacto JSON solicitado devuelve JSON en vez del respaldo SPA y el control bilingüe del navegador pasa en tamaños de teléfono y escritorio. Un build local exitoso es una verificación de preparación; el despliegue de Actions y las comprobaciones de rutas HTTPS en vivo establecen el estado remoto.',
          },
        ],
        steps: {
          title: { en: 'Release checks', es: 'Controles de publicación' },
          items: [
            { en: 'Build and materialise direct routes.', es: 'Construir y materializar rutas directas.' },
            { en: 'Validate every trace, manifest, index and provenance boundary.', es: 'Validar cada traza, manifiesto, índice y límite de procedencia.' },
            { en: 'Run the full browser gate across routes, controls, languages, themes and viewport sizes.', es: 'Ejecutar el control completo del navegador en rutas, controles, idiomas, temas y tamaños de ventana.' },
            { en: 'Verify the deployed HTTPS routes and artifact responses.', es: 'Verificar las rutas HTTPS desplegadas y las respuestas de artefactos.' },
          ],
        },
        refs: ['chicoisne2012'],
      },
    ],
  },
];
