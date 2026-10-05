/**
 * Experiments: the questions, the data, the cases, the metrics and the protocol, then the results per
 * question. Result sentences that depend on the evidence are computed by the panels from the committed
 * manifests, so the prose here states what is measured and how to read it.
 */
import type { TopicGroup } from './doc.tsx';
import { MetricsFigure, QuestionsMap } from './figures/exp.tsx';
import { DepositSplit, EnsembleFan, Operability, TopoSortWalk, SlidingWindow, DestinationChoice } from './figures/method.tsx';
import { Archetypes } from './figures/impl.tsx';
import { LearnedStudyPanel } from './panels.tsx';
import {
  CaseMatrixPanel, DepositPanel, DestinationPanel, EnsemblePanel, LadderGridPanel, LearnedLadderPanel,
  LookAheadPanel, OperabilityPanel, RegimePanel, SeedingPanel,
} from './panels-exp.tsx';

export const EXPERIMENTS: TopicGroup[] = [
  {
    id: 'design',
    label: { en: 'Design', es: 'Diseño' },
    topics: [
      {
        id: 'questions',
        title: { en: 'The questions', es: 'Las preguntas' },
        paragraphs: [
          {
            en: 'The case matrix is built to answer seven questions, and every case exists because at least one question needs it. Q1 asks whether the certified bound is right, which only a published instance and an exact control can answer. Q2 asks what seeding a plan with the bound buys over the classical orderings, Q3 what the look-ahead of a sliding window and the exact neighbourhood searches add on top of a rounding. Q4 asks which capacity binds and when, Q5 what the shape of the orebody does to each family of methods, Q6 whether the learned plan holds up on deposits and sizes it was not trained on, and Q7 what the destination decision, a workable width and geological uncertainty are worth or cost.',
            es: 'La matriz de casos está construida para responder siete preguntas, y cada caso existe porque al menos una pregunta lo necesita. P1 pregunta si la cota certificada es correcta, lo que solo pueden responder una instancia publicada y un control exacto. P2 pregunta qué aporta sembrar un plan con la cota frente a los órdenes clásicos, P3 qué agregan la anticipación de una ventana deslizante y las búsquedas exactas de vecindario sobre un redondeo. P4 pregunta qué capacidad limita y cuándo, P5 qué le hace la forma del cuerpo mineralizado a cada familia de métodos, P6 si el plan aprendido se sostiene en depósitos y tamaños con los que no se entrenó, y P7 cuánto valen o cuestan la decisión de destino, un ancho operable y la incertidumbre geológica.',
          },
          {
            en: 'A question decides which comparison is legitimate. Q1 compares against published numbers and an external exact solve, and nothing else may be compared with a published bound. Q2 and Q3 compare methods on the same case against the same certified bound, which is the only fair way to rank plans. Q4 and Q5 hold the method fixed and vary one thing: the scenario on one deposit, or the deposit under one kind of scenario. Q6 is a held-out evaluation with its own split. Q7 reports each extra decision against the plan without it.',
            es: 'Una pregunta decide qué comparación es legítima. P1 compara con números publicados y una resolución exacta externa, y nada más puede compararse con una cota publicada. P2 y P3 comparan métodos en el mismo caso contra la misma cota certificada, que es la única manera justa de ordenar planes. P4 y P5 fijan el método y varían una cosa: el escenario sobre un depósito, o el depósito bajo un tipo de escenario. P6 es una evaluación retenida con su propia partición. P7 reporta cada decisión adicional contra el plan sin ella.',
          },
          {
            en: 'The answers are in the result tabs, each one computed from the committed manifests; the benchmark page holds the published comparison in full.',
            es: 'Las respuestas están en las pestañas de resultados, cada una calculada desde los manifiestos versionados; la página de comparación contiene completa la comparación publicada.',
          },
        ],
        figure: { caption: { en: 'Seven questions and the five case families built to answer them.', es: 'Siete preguntas y las cinco familias de casos construidas para responderlas.' }, render: (lang) => <QuestionsMap lang={lang} />, wide: true },
        facts: [
          { k: { en: 'Cases', es: 'Casos' }, v: { en: '13 in 5 families', es: '13 en 5 familias' } },
          { k: { en: 'Methods', es: 'Métodos' }, v: { en: '13 rungs plus 4 bounds', es: '13 peldaños más 4 cotas' } },
          { k: { en: 'Comparisons', es: 'Comparaciones' }, v: { en: 'same case, same bound of the same problem', es: 'mismo caso, misma cota del mismo problema' } },
        ],
        refs: ['espinoza2013', 'chicoisne2012', 'jelvez2018'],
      },
      {
        id: 'datasets',
        title: { en: 'Datasets and their terms', es: 'Conjuntos de datos y sus términos' },
        paragraphs: [
          {
            en: 'Three real block models come from MineLib, the public library of open-pit instances of Espinoza, Goycoolea, Moreno and Newman; ten synthetic cases come from the seeded twin generator. The library grants an academic download, not redistribution, so the real instances are solved offline and only aggregate results are committed: no per-block data of a MineLib instance appears in an artifact, and the artifact check enforces it.',
            es: 'Tres modelos de bloques reales vienen de MineLib, la biblioteca pública de instancias de rajo abierto de Espinoza, Goycoolea, Moreno y Newman; diez casos sintéticos vienen del generador de gemelos sembrados. La biblioteca concede una descarga académica, no redistribución, de modo que las instancias reales se resuelven offline y solo se versionan resultados agregados: ningún dato por bloque de una instancia MineLib aparece en un artefacto, y la verificación de artefactos lo impone.',
          },
          {
            en: 'Only newman1 is reachable with its scheduling files, so it is the only instance solved exactly as published. kd and zuck_small are reachable as ultimate-pit data; their scheduling scenario is declared here and labelled declared, and only their ultimate pit is compared with a published value. The twins carry every block, so they ship to the browser and are re-solved live.',
            es: 'Solo newman1 es alcanzable con sus archivos de programación, así que es la única instancia resuelta exactamente como se publica. kd y zuck_small son alcanzables como datos de pit final; su escenario de programación se declara aquí y se rotula como declarado, y solo su pit final se compara con un valor publicado. Los gemelos llevan cada bloque, de modo que viajan al navegador y se re-resuelven en vivo.',
          },
        ],
        table: {
          head: [
            { en: 'dataset', es: 'conjunto' }, { en: 'blocks', es: 'bloques' }, { en: 'files used', es: 'archivos usados' },
            { en: 'terms', es: 'términos' }, { en: 'in the artifacts', es: 'en los artefactos' }, { en: 'scenario', es: 'escenario' },
          ],
          rows: [
            ['newman1 (MineLib)', '1,060', '.blocks .prec .upit .cpit .pcpsp', { en: 'academic download', es: 'descarga académica' }, { en: 'aggregates only', es: 'solo agregados' }, { en: 'as published', es: 'tal como se publica' }],
            ['kd (MineLib)', '14,153', '.blocks .prec .upit', { en: 'academic download', es: 'descarga académica' }, { en: 'aggregates only', es: 'solo agregados' }, { en: 'declared', es: 'declarado' }],
            ['zuck_small (MineLib)', '9,400', '.blocks .prec .upit', { en: 'academic download', es: 'descarga académica' }, { en: 'aggregates only', es: 'solo agregados' }, { en: 'declared', es: 'declarado' }],
            [{ en: 'seeded twins (this product)', es: 'gemelos sembrados (este producto)' }, '6,912 - 14,400', { en: 'generated from a seed', es: 'generados desde una semilla' }, 'MIT', { en: 'every block', es: 'cada bloque' }, { en: 'declared per case', es: 'declarado por caso' }],
          ],
        },
        figure: { caption: { en: 'The four twin archetypes.', es: 'Los cuatro arquetipos de gemelo.' }, render: (lang) => <Archetypes lang={lang} />, wide: true },
        limits: [
          { en: 'One published scheduling instance; the published-comparison claims rest on newman1 alone.', es: 'Una sola instancia de programación publicada; las afirmaciones de comparación publicada descansan solo en newman1.' },
        ],
        refs: ['espinoza2013', 'minelibresults', 'amplminelib'],
      },
      {
        id: 'cases',
        title: { en: 'The thirteen cases', es: 'Los trece casos' },
        paragraphs: [
          {
            en: 'Five families. The published case is the trust anchor. The two declared cases are real block models at nine and thirteen times its size. The five deposit twins put the four archetypes under the same kind of scenario (ten periods, ten percent, two resources), with the porphyry at two sizes. The three regime cases keep the 6,912-block porphyry and change only the scenario: a plant that binds while the fleet idles, a fleet that binds while the plant idles, and a twenty percent discount rate. The two controls are an exact identity (one period, rate zero, unlimited capacity) and a loose-capacity diagnostic.',
            es: 'Cinco familias. El caso publicado es el ancla de confianza. Los dos casos declarados son modelos de bloques reales de nueve y trece veces su tamaño. Los cinco gemelos de depósito ponen los cuatro arquetipos bajo el mismo tipo de escenario (diez períodos, diez por ciento, dos recursos), con el pórfido en dos tamaños. Los tres casos de régimen mantienen el pórfido de 6.912 bloques y cambian solo el escenario: una planta que limita mientras la flota sobra, una flota que limita mientras la planta sobra, y una tasa de descuento de veinte por ciento. Los dos controles son una identidad exacta (un período, tasa cero, capacidad ilimitada) y un diagnóstico con capacidad holgada.',
          },
          {
            en: 'The table is read from the manifests, including what each case is for. Capacity is given as a fraction of what the ultimate pit needs per period, so a mining fraction below one means the pit outlives the horizon; the published case\'s absolute limits are converted to the same scale.',
            es: 'La tabla se lee de los manifiestos, incluido para qué está cada caso. La capacidad se da como fracción de lo que el pit final necesita por período, así que una fracción de mina bajo uno significa que el pit sobrevive al horizonte; los límites absolutos del caso publicado se convierten a la misma escala.',
          },
        ],
        data: (lang) => <CaseMatrixPanel lang={lang} />,
        refs: ['espinoza2013'],
      },
      {
        id: 'metrics',
        title: { en: 'Metrics', es: 'Métricas' },
        paragraphs: [
          {
            en: 'The primary metric is the gap of a plan to the bound of its own problem, with the CPIT rungs scored against the smaller certified CPIT bound of the case and the destination rungs against the PCPSP LP. Its complement, the captured share of the bound, is what the method bars draw: the track is the bound and the fill is the plan, so longer is better on every row. The bound slack between Algorithm 4 and the joint bound is reported per case because it is part of every gap that uses Algorithm 4.',
            es: 'La métrica principal es la brecha de un plan a la cota de su propio problema, con los peldaños CPIT juzgados contra la menor cota CPIT certificada del caso y los peldaños con destino contra la LP de PCPSP. Su complemento, la fracción capturada de la cota, es lo que dibujan las barras de métodos: la pista es la cota y el relleno es el plan, de modo que más largo es mejor en cada fila. La holgura de la cota entre el Algoritmo 4 y la cota conjunta se reporta por caso porque es parte de toda brecha que usa el Algoritmo 4.',
          },
          {
            en: 'Spatial coherence is measured per period by the number of connected components, the share of the period held by the largest, and the narrowest run along a bench. The learned rung is scored by the value of its plan over the value of the exact ExTS plan of the same case, never by the error of its prediction, and summarised by median, tenth percentile and minimum, because a mean hides the failure a user would meet. Uncertainty is read as each plan\'s tenth and ninetieth percentiles across realisations and the value of re-planning, a lower bound on the expected value of perfect information.',
            es: 'La coherencia espacial se mide por período con el número de componentes conexas, la fracción del período que contiene la mayor y el tramo más estrecho a lo largo de un banco. El peldaño aprendido se juzga por el valor de su plan sobre el valor del plan ExTS exacto del mismo caso, nunca por el error de su predicción, y se resume con mediana, décimo percentil y mínimo, porque una media oculta la falla que encontraría un usuario. La incertidumbre se lee como los percentiles diez y noventa de cada plan a través de las realizaciones y el valor de re-planificar, una cota inferior del valor esperado de la información perfecta.',
          },
        ],
        equations: [
          { tex: String.raw`\text{gap}=\frac{Z^{\text{bound}}-\mathrm{NPV}}{Z^{\text{bound}}},\qquad \text{captured}=1-\text{gap},\qquad \text{slack}=\frac{Z^{\text{Alg4}}-Z^{\text{BZ}}}{Z^{\text{Alg4}}}`, caption: { en: 'Plan quality and bound quality, as reported per case', es: 'Calidad del plan y calidad de la cota, como se reportan por caso' } },
          { tex: String.raw`\text{share}_{\text{learned}}=\frac{\mathrm{NPV}(\text{learned})}{\mathrm{NPV}(\text{ExTS})},\qquad \kappa_t=\#\text{components}_t,\qquad s_t=\frac{|\text{largest}_t|}{|\text{mined}_t|}`, caption: { en: 'The learned share, and coherence per period', es: 'La fracción aprendida, y la coherencia por período' } },
        ],
        figure: { caption: { en: 'The metrics drawn on one plan.', es: 'Las métricas dibujadas sobre un plan.' }, render: (lang) => <MetricsFigure lang={lang} /> },
        limits: [
          { en: 'Gaps are comparable only within one case and one problem; across cases the bounds differ.', es: 'Las brechas son comparables solo dentro de un caso y un problema; entre casos las cotas difieren.' },
        ],
        refs: ['jelvez2018', 'chicoisne2012'],
      },
      {
        id: 'protocol',
        title: { en: 'Protocol', es: 'Protocolo' },
        paragraphs: [
          {
            en: 'Every case is baked by the same pipeline from its parameters and seeds, with no wall-clock limit anywhere, so the committed evidence is reproducible. Before a plan is recorded it is checked for precedence in every period and for every capacity; after the trace is written the pipeline re-reads it. The three controls run on every case and the bake refuses a case that fails one.',
            es: 'Cada caso se hornea con el mismo pipeline desde sus parámetros y semillas, sin límite de reloj en ninguna parte, de modo que la evidencia versionada es reproducible. Antes de registrar un plan se verifica en precedencia en cada período y en cada capacidad; después de escribir la traza el pipeline la relee. Los tres controles corren en cada caso y el horneado rechaza un caso que falla uno.',
          },
          {
            en: 'The learned models are evaluated by deposit, never by row. Twelve generator seeds train, six disjoint seeds are held out, and a third set of six seeds measures the guard chosen on the first two; the scripts assert that the sets do not overlap. A random split of block rows is the anti-pattern: two scenarios of one deposit share almost every feature, so the model would be scored on a copy of what it memorised. In the ladder, the learned plan is measured against the exact plan of the same case, which is available in the same bake.',
            es: 'Los modelos aprendidos se evalúan por depósito, nunca por fila. Doce semillas del generador entrenan, seis semillas disjuntas quedan retenidas y un tercer conjunto de seis semillas mide la guarda elegida con los dos primeros; los scripts verifican que los conjuntos no se superponen. Una partición aleatoria por filas de bloque es el antipatrón: dos escenarios de un depósito comparten casi todos los rasgos, así que el modelo se juzgaría sobre una copia de lo que memorizó. En la escalera, el plan aprendido se mide contra el plan exacto del mismo caso, disponible en el mismo horneado.',
          },
        ],
        figure: { caption: { en: 'The split by deposit, with the forbidden row split struck out.', es: 'La partición por depósito, con la partición prohibida por filas tachada.' }, render: (lang) => <DepositSplit lang={lang} /> },
        facts: [
          { k: { en: 'Seeds', es: 'Semillas' }, v: { en: '12 train, 6 held out, 6 third split', es: '12 entrenamiento, 6 retenidas, 6 tercera partición' } },
          { k: { en: 'Controls', es: 'Controles' }, v: { en: 'duality, bound, order invariance, every case', es: 'dualidad, cota, invariancia al orden, cada caso' } },
          { k: { en: 'Gate', es: 'Control' }, v: { en: 'feasibility and own bound, every plan', es: 'factibilidad y cota propia, cada plan' } },
        ],
        refs: ['chicoisne2012'],
      },
    ],
  },
  {
    id: 'plans',
    label: { en: 'Results: bound to plan', es: 'Resultados: de la cota al plan' },
    topics: [
      {
        id: 'ladder',
        title: { en: 'The ladder on every case', es: 'La escalera en cada caso' },
        paragraphs: [
          {
            en: 'The grid is the whole experiment in one table: every method on every case, as the gap to the bound of its own problem, with the best comparable plan of each case outlined. Select a case, or click its row, to draw its methods as captured share of the bound; hovering a bar gives the plan\'s value and its gap. Rows without a value say why the method did not run on that case.',
            es: 'La grilla es todo el experimento en una tabla: cada método en cada caso, como brecha a la cota de su propio problema, con el mejor plan comparable de cada caso enmarcado. Seleccione un caso, o haga clic en su fila, para dibujar sus métodos como fracción capturada de la cota; al pasar sobre una barra se ven el valor del plan y su brecha. Las filas sin valor dicen por qué el método no corrió en ese caso.',
          },
        ],
        figure: { caption: { en: 'The walk every TopoSort rung shares; only the weight differs.', es: 'El recorrido que comparten todos los peldaños TopoSort; solo cambia el peso.' }, render: (lang) => <TopoSortWalk lang={lang} /> },
        data: (lang) => <LadderGridPanel lang={lang} />,
        refs: ['chicoisne2012', 'cullenbine2011'],
      },
      {
        id: 'seeding',
        title: { en: 'Q2: seeding the plan with the bound', es: 'P2: sembrar el plan con la cota' },
        paragraphs: [
          {
            en: 'The published argument for computing the bound before scheduling is that the expected times it yields are a far better ordering than any classical weight. Here the comparison is made on each non-trivial case against the BEST of the four classical rungs, not against greedy alone, so the advantage shown is the smallest one that can be claimed.',
            es: 'El argumento publicado para calcular la cota antes de programar es que los tiempos esperados que entrega son un orden mucho mejor que cualquier peso clásico. Aquí la comparación se hace en cada caso no trivial contra el MEJOR de los cuatro peldaños clásicos, no solo contra el codicioso, de modo que la ventaja mostrada es la menor que se puede afirmar.',
          },
        ],
        figure: { caption: { en: 'The same walk with a different weight is the whole difference.', es: 'El mismo recorrido con otro peso es toda la diferencia.' }, render: (lang) => <TopoSortWalk lang={lang} /> },
        data: (lang) => <SeedingPanel lang={lang} />,
        refs: ['chicoisne2012', 'gershon1987'],
      },
      {
        id: 'lookahead',
        title: { en: 'Q3: look-ahead and exact search', es: 'P3: anticipación y búsqueda exacta' },
        paragraphs: [
          {
            en: 'On top of the rounding, three rungs try to close the gap: the shift search moves single blocks, the exact re-solve moves neighbourhoods, and the sliding window plans three periods jointly. The table gives the gap of each on every non-trivial case and the time the window takes, which is the price of its look-ahead.',
            es: 'Sobre el redondeo, tres peldaños intentan cerrar la brecha: la búsqueda de desplazamiento mueve bloques sueltos, la re-resolución exacta mueve vecindarios, y la ventana deslizante planifica tres períodos en conjunto. La tabla da la brecha de cada uno en cada caso no trivial y el tiempo que toma la ventana, que es el precio de su anticipación.',
          },
        ],
        figure: { caption: { en: 'The window solves three periods with a tail and keeps one.', es: 'La ventana resuelve tres períodos con una cola y conserva uno.' }, render: (lang) => <SlidingWindow lang={lang} />, wide: true },
        data: (lang) => <LookAheadPanel lang={lang} />,
        refs: ['cullenbine2011', 'chicoisne2012', 'lamghari2012'],
      },
    ],
  },
  {
    id: 'structure',
    label: { en: 'Results: regimes and deposits', es: 'Resultados: regímenes y depósitos' },
    topics: [
      {
        id: 'regimes',
        title: { en: 'Q4: which capacity binds', es: 'P4: qué capacidad limita' },
        paragraphs: [
          {
            en: 'Four cases share one deposit and differ only in the scenario. The table gives, for the best plan of each, the use of each resource as a share of its limit in every period: a cell at 100 is a capacity that binds. Reading across a row shows when a resource stops binding; reading down a case shows which one sets the pace. The shape of the early pit follows from it: a binding plant rewards stripping waste while the plant is full, a binding fleet rewards the ore that is cheapest to reach.',
            es: 'Cuatro casos comparten un depósito y difieren solo en el escenario. La tabla da, para el mejor plan de cada uno, el uso de cada recurso como fracción de su límite en cada período: una celda en 100 es una capacidad que limita. Leer una fila muestra cuándo un recurso deja de limitar; leer un caso muestra cuál marca el ritmo. La forma del rajo temprano se sigue de eso: una planta que limita premia remover estéril mientras la planta está llena, una flota que limita premia el mineral más barato de alcanzar.',
          },
        ],
        figure: { caption: { en: 'Capacity per period is what the walk spends.', es: 'La capacidad por período es lo que gasta el recorrido.' }, render: (lang) => <TopoSortWalk lang={lang} /> },
        data: (lang) => <RegimePanel lang={lang} />,
        refs: ['chicoisne2012'],
      },
      {
        id: 'deposits',
        title: { en: 'Q5: what the orebody changes', es: 'P5: qué cambia el cuerpo mineralizado' },
        paragraphs: [
          {
            en: 'The four archetypes under the same kind of scenario separate the methods by what they assume. Greedy and Gershon weights encode a view of what matters (the block itself, or what it unlocks), and each archetype rewards or punishes that view; the expected time encodes the relaxation\'s balance of value, discounting and capacity, and holds up across shapes. The learned share and the coherence of the best plan complete the row: a deposit can be easy for the bound and hard for the surrogate, or easy in value and scattered in space.',
            es: 'Los cuatro arquetipos bajo el mismo tipo de escenario separan a los métodos por lo que suponen. Los pesos codicioso y de Gershon codifican una visión de lo que importa (el bloque mismo, o lo que libera), y cada arquetipo premia o castiga esa visión; el tiempo esperado codifica el equilibrio de la relajación entre valor, descuento y capacidad, y se sostiene entre formas. La fracción aprendida y la coherencia del mejor plan completan la fila: un depósito puede ser fácil para la cota y difícil para el sustituto, o fácil en valor y disperso en el espacio.',
          },
        ],
        figure: { caption: { en: 'The four shapes being compared.', es: 'Las cuatro formas que se comparan.' }, render: (lang) => <Archetypes lang={lang} />, wide: true },
        data: (lang) => <DepositPanel lang={lang} />,
        refs: ['chicoisne2012', 'gershon1987'],
      },
    ],
  },
  {
    id: 'learned',
    label: { en: 'Results: learned', es: 'Resultados: aprendido' },
    topics: [
      {
        id: 'heldout',
        title: { en: 'Q6: held-out deposits', es: 'P6: depósitos retenidos' },
        paragraphs: [
          {
            en: 'On deposits it never saw, the surrogate\'s plans are scored against the plans the true expected times produce. The tables give the summary, the breakdown by archetype and by grid size, and the guard that was chosen on the training deposits measured on a third split that had no part in choosing it. A rule over the archetype cannot be applied to a real deposit, which carries no archetype label; that is why, wherever the exact plan exists, the product shows the measured share instead of the rule.',
            es: 'En depósitos que nunca vio, los planes del sustituto se juzgan contra los planes que producen los tiempos esperados verdaderos. Las tablas dan el resumen, el desglose por arquetipo y por tamaño de grilla, y la guarda elegida con los depósitos de entrenamiento medida en una tercera partición que no participó en elegirla. Una regla sobre el arquetipo no se puede aplicar a un depósito real, que no trae rótulo de arquetipo; por eso, donde existe el plan exacto, el producto muestra la fracción medida en vez de la regla.',
          },
        ],
        figure: { caption: { en: 'The protocol behind every number in these tables.', es: 'El protocolo detrás de cada número de estas tablas.' }, render: (lang) => <DepositSplit lang={lang} /> },
        data: (lang) => <LearnedStudyPanel lang={lang} />,
        refs: ['kingma2015'],
      },
      {
        id: 'inladder',
        title: { en: 'Q6: the learned rung on the product\'s cases', es: 'P6: el peldaño aprendido en los casos del producto' },
        paragraphs: [
          {
            en: 'The product\'s cases are larger than most training deposits and include real block models, so the held-out numbers do not transfer by assumption. The table measures the learned plan against the exact ExTS plan of each case in the same bake, with both times. A share below 90 percent is the line the study calls a failure, and it is marked.',
            es: 'Los casos del producto son mayores que la mayoría de los depósitos de entrenamiento e incluyen modelos de bloques reales, así que los números retenidos no se transfieren por supuesto. La tabla mide el plan aprendido contra el plan ExTS exacto de cada caso en el mismo horneado, con ambos tiempos. Una fracción bajo 90 por ciento es la línea que el estudio llama falla, y se marca.',
          },
        ],
        figure: { caption: { en: 'Two paths to one walk.', es: 'Dos caminos a un recorrido.' }, render: (lang) => <TopoSortWalk lang={lang} /> },
        data: (lang) => <LearnedLadderPanel lang={lang} />,
        refs: ['chicoisne2012'],
      },
    ],
  },
  {
    id: 'beyond',
    label: { en: 'Results: beyond CPIT', es: 'Resultados: más allá de CPIT' },
    topics: [
      {
        id: 'destinations',
        title: { en: 'Q7: what choosing destinations is worth', es: 'P7: cuánto vale elegir destinos' },
        paragraphs: [
          {
            en: 'The destination plan starts from the best CPIT plan of the case and can only improve on it. Its gain over that plan has two sources, because each exact neighbourhood re-solve frees both the destinations and the periods of its blocks: choosing a destination other than the fixed cutoff, and re-timing blocks the CPIT search left where they were. The count of blocks whose destination differs from the fixed cutoff separates the two: where it is zero, the whole gain is re-timing, and the destination freedom was worth nothing on that case.',
            es: 'El plan con destinos parte del mejor plan CPIT del caso y solo puede mejorarlo. Su ganancia sobre ese plan tiene dos fuentes, porque cada re-resolución exacta de vecindario libera a la vez los destinos y los períodos de sus bloques: elegir un destino distinto del corte fijo, y re-programar bloques que la búsqueda CPIT dejó donde estaban. El conteo de bloques cuyo destino difiere del corte fijo separa ambas: donde es cero, toda la ganancia es re-programación, y la libertad de destino no valió nada en ese caso.',
          },
          {
            en: 'The table also gives the plan\'s gap to the PCPSP LP bound and the range of the effective cutoff across periods: the lowest grade the plan sends to the plant in each period. A period that sends nothing to the plant has no effective cutoff and is left out of the range.',
            es: 'La tabla también da la brecha del plan a la cota LP de PCPSP y el rango de la ley de corte efectiva entre períodos: la menor ley que el plan envía a la planta en cada período. Un período que no envía nada a la planta no tiene ley de corte efectiva y queda fuera del rango.',
          },
        ],
        figure: { caption: { en: 'The comparison behind every destination change.', es: 'La comparación detrás de cada cambio de destino.' }, render: (lang) => <DestinationChoice lang={lang} /> },
        data: (lang) => <DestinationPanel lang={lang} />,
        refs: ['jelvez2018'],
      },
      {
        id: 'operability',
        title: { en: 'Q7: what a workable plan costs', es: 'P7: cuánto cuesta un plan operable' },
        paragraphs: [
          {
            en: 'The best plan of each case is measured for coherence, then smoothed toward a minimum width of three blocks with capacity and precedence kept. The table gives the components and the largest share of the best plan, the blocks in runs narrower than the target before and after, the moves made and refused for capacity, and the NPV the smoothing cost.',
            es: 'El mejor plan de cada caso se mide en coherencia y luego se suaviza hacia un ancho mínimo de tres bloques manteniendo capacidad y precedencia. La tabla da las componentes y la fracción mayor del mejor plan, los bloques en tramos más estrechos que el objetivo antes y después, los movimientos hechos y rechazados por capacidad, y el VAN que costó el suavizado.',
          },
        ],
        figure: { caption: { en: 'Slivers absorbed when capacity allows.', es: 'Astillas absorbidas cuando la capacidad lo permite.' }, render: (lang) => <Operability lang={lang} /> },
        data: (lang) => <OperabilityPanel lang={lang} />,
        refs: ['bai2018', 'chicoisne2012'],
      },
      {
        id: 'uncertainty',
        title: { en: 'Q7: plans under geological uncertainty', es: 'P7: planes bajo incertidumbre geológica' },
        paragraphs: [
          {
            en: 'Every candidate plan is evaluated on twelve correlated realisations of the block values. Where the best plan on average and the best plan at the tenth percentile differ, the robust choice is a different plan, and it is highlighted. The value of re-planning compares re-solving each realisation with keeping the best fixed plan, and is a lower bound on the value of perfect information.',
            es: 'Cada plan candidato se evalúa en doce realizaciones correlacionadas de los valores de bloque. Donde el mejor plan en promedio y el mejor plan en el décimo percentil difieren, la elección robusta es otro plan, y se resalta. El valor de re-planificar compara re-resolver cada realización con mantener el mejor plan fijo, y es una cota inferior del valor de la información perfecta.',
          },
        ],
        figure: { caption: { en: 'Plans read by their spread.', es: 'Planes leídos por su dispersión.' }, render: (lang) => <EnsembleFan lang={lang} /> },
        data: (lang) => <EnsemblePanel lang={lang} />,
        limits: [
          { en: 'Synthetic, correlated perturbation of block values; not a conditional simulation.', es: 'Perturbación sintética y correlacionada de los valores de bloque; no una simulación condicional.' },
        ],
        refs: ['ramazan2013', 'blom2024'],
      },
    ],
  },
];
