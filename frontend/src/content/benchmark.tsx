/**
 * Benchmark: PhaseFlow's numbers against published and external references, on the same problem only,
 * then the bounds, plans and runtimes of every case, then the learned and in-browser lanes against the
 * exact pipeline. The numbers are read by the panels; the prose says what each comparison can and
 * cannot establish.
 */
import type { TopicGroup } from './doc.tsx';
import { Algorithm4, BzLoop, DestinationRecut, ProblemInclusion, TopoSortWalk } from './figures/method.tsx';
import { ClosureNetwork, LaneFidelity } from './figures/impl.tsx';
import { BoundSummaryPanel } from './panels.tsx';
import {
  BestPerCasePanel, LiveParityPanel, NewmanCpitPanel, NewmanGapPanel, NewmanPcpspPanel, RealPitsPanel, RuntimePanel,
} from './panels-bench.tsx';
import { PreviewTimingTable } from './static-tables.tsx';

export const BENCHMARK: TopicGroup[] = [
  {
    id: 'published',
    label: { en: 'Published instance', es: 'Instancia publicada' },
    topics: [
      {
        id: 'newman1-cpit',
        title: { en: 'Newman1 as published', es: 'Newman1 tal como se publica' },
        paragraphs: [
          {
            en: 'Newman1 is the one MineLib instance whose scheduling files can be obtained, so it is the one case where PhaseFlow solves exactly the problem the literature solved: 1,060 blocks, 3,922 precedence arcs, six periods, an eight percent discount rate and two capacities per period, all read from the published files. Three references exist for it, and each says something different. MineLib\'s results page gives the ultimate pit, the CPIT LP bound and a best known feasible plan. An executable AMPL notebook solves the same CPIT to proven optimality with Gurobi. A 2018 paper reports a better plan, but for the problem in which destinations are also decided.',
            es: 'Newman1 es la única instancia de MineLib cuyos archivos de programación se pueden obtener, así que es el único caso donde PhaseFlow resuelve exactamente el problema que resolvió la literatura: 1.060 bloques, 3.922 arcos de precedencia, seis períodos, una tasa de descuento de ocho por ciento y dos capacidades por período, todo leído de los archivos publicados. Existen tres referencias para ella, y cada una dice algo distinto. La página de resultados de MineLib da el pit final, la cota LP CPIT y un mejor plan factible conocido. Un cuaderno ejecutable de AMPL resuelve el mismo CPIT hasta optimalidad probada con Gurobi. Un artículo de 2018 reporta un plan mejor, pero para el problema en que también se deciden los destinos.',
          },
          {
            en: 'Only the first two are the same problem, and the table uses only those. The ultimate pit and the CPIT LP bound are reproduced to MineLib\'s rounding, which checks the reading of the files, the precedence, the economics and the bound together; the bound needs no LP solver, because the critical multiplier algorithm computes it from parametric maximum closures. MineLib still lists an older feasible value that later work and the exact solve both exceed, so the best plan is compared with both, each with its source.',
            es: 'Solo las dos primeras son el mismo problema, y la tabla usa solo esas. El pit final y la cota LP CPIT se reproducen hasta el redondeo de MineLib, lo que verifica a la vez la lectura de los archivos, la precedencia, la economía y la cota; la cota no necesita un solver LP, porque el algoritmo del multiplicador crítico la calcula con clausuras máximas paramétricas. MineLib todavía lista un valor factible antiguo que el trabajo posterior y la resolución exacta superan, así que el mejor plan se compara con ambos, cada uno con su fuente.',
          },
        ],
        data: (lang) => <NewmanCpitPanel lang={lang} />,
        figure: { caption: { en: 'Which comparison is legitimate: a CPIT plan against CPIT references, a PCPSP plan against PCPSP references.', es: 'Qué comparación es legítima: un plan CPIT contra referencias CPIT, un plan PCPSP contra referencias PCPSP.' }, render: (lang) => <ProblemInclusion lang={lang} /> },
        facts: [
          { k: { en: 'Instance', es: 'Instancia' }, v: { en: '1,060 blocks, 3,922 arcs', es: '1.060 bloques, 3.922 arcos' } },
          { k: { en: 'Scenario', es: 'Escenario' }, v: { en: '6 periods, 8 percent, 2 capacities', es: '6 períodos, 8 por ciento, 2 capacidades' } },
          { k: { en: 'References read', es: 'Referencias leídas' }, v: { en: '2026-10-02', es: '2026-10-02' } },
        ],
        limits: [
          { en: 'The exact optimum is an external run; its input file was not compared with this one coefficient by coefficient. Matching counts, formulation and objective corroborate it.', es: 'El óptimo exacto es una ejecución externa; su archivo de entrada no se comparó con este coeficiente por coeficiente. Conteos, formulación y objetivo coincidentes lo corroboran.' },
        ],
        refs: ['espinoza2013', 'minelibresults', 'amplminelib', 'chicoisne2012'],
      },
      {
        id: 'gap-split',
        title: { en: 'Where the newman1 gap comes from', es: 'De dónde viene la brecha de newman1' },
        paragraphs: [
          {
            en: 'A gap to an LP bound mixes three things that have nothing to do with each other: how loose the bound used is, how far the LP sits above the best integer plan, and how much the method loses against that plan. With the external optimum, newman1 is the one case where all three can be measured. The identity below is exact in value units; the percentages each have their own denominator and do not add.',
            es: 'Una brecha a una cota LP mezcla tres cosas que no tienen relación entre sí: cuán floja es la cota usada, cuánto está la LP sobre el mejor plan entero, y cuánto pierde el método contra ese plan. Con el óptimo externo, newman1 es el único caso donde las tres se pueden medir. La identidad de abajo es exacta en unidades de valor; los porcentajes tienen cada uno su propio denominador y no se suman.',
          },
          {
            en: 'The reading matters for every other case. On newman1 most of the distance from bound to plan is integrality, which no plan can recover; the method\'s own loss is a small fraction of it. On the other twelve cases no integer optimum is known, so their gaps are upper limits on the method\'s loss, not measurements of it.',
            es: 'La lectura importa para todos los demás casos. En newman1 la mayor parte de la distancia de la cota al plan es integralidad, que ningún plan puede recuperar; la pérdida propia del método es una fracción pequeña. En los otros doce casos no se conoce un óptimo entero, así que sus brechas son límites superiores de la pérdida del método, no mediciones de ella.',
          },
        ],
        equations: [
          { tex: String.raw`Z^{\text{Alg4}}-\mathrm{NPV}=\underbrace{\big(Z^{\text{Alg4}}-Z^{\text{LP}}\big)}_{\text{bound slack}}+\underbrace{\big(Z^{\text{LP}}-Z^{\text{IP}}\big)}_{\text{integrality}}+\underbrace{\big(Z^{\text{IP}}-\mathrm{NPV}\big)}_{\text{method loss}}`, caption: { en: 'The gap identity, in value units', es: 'La identidad de la brecha, en unidades de valor' } },
        ],
        data: (lang) => <NewmanGapPanel lang={lang} />,
        limits: [
          { en: 'The split exists only where an integer optimum is known; here that is newman1 alone.', es: 'La descomposición existe solo donde se conoce un óptimo entero; aquí eso es solo newman1.' },
        ],
        refs: ['amplminelib', 'chicoisne2012', 'munoz2017'],
      },
      {
        id: 'newman1-pcpsp',
        title: { en: 'Newman1 with destinations', es: 'Newman1 con destinos' },
        paragraphs: [
          {
            en: 'The 2018 result is the right reference for the destination plan, not for the CPIT plan. Its two numbers are reproduced here on their own problem. The PCPSP LP is the linear relaxation of the time-indexed formulation over the published .pcpsp file, solved with HiGHS; its value is set beside Table 3. The destination plan is the re-cut: each block fixed where the LP sends it, that CPIT scheduled by ExTS and the sliding window, then improved by exact re-solves of neighbourhoods in which the destinations are free again, starting from the best of those plans and the best CPIT plan read as a PCPSP plan; its value and gap are set beside Table 4.',
            es: 'El resultado de 2018 es la referencia correcta para el plan con destinos, no para el plan CPIT. Sus dos números se reproducen aquí en su propio problema. La LP PCPSP es la relajación lineal de la formulación indexada en el tiempo sobre el archivo .pcpsp publicado, resuelta con HiGHS; su valor se pone junto a la Tabla 3. El plan con destinos es el re-corte: cada bloque fijado donde lo envía la LP, ese CPIT programado con ExTS y la ventana deslizante, y luego mejorado con re-resoluciones exactas de vecindarios en los que los destinos vuelven a ser libres, partiendo del mejor de esos planes y del mejor plan CPIT leído como plan PCPSP; su valor y su brecha se ponen junto a la Tabla 4.',
          },
          {
            en: 'Problem inclusion gives a check that needs no reference: fixing every block to its best destination turns PCPSP into CPIT, so the PCPSP LP can never be below the CPIT LP. The row that measures it should be small and non-negative, here and in the published pair. The count of blocks whose destination differs from the fixed cutoff says whether the destination freedom was used at all on this instance.',
            es: 'La inclusión de problemas da una verificación que no necesita referencia: fijar cada bloque a su mejor destino convierte PCPSP en CPIT, así que la LP PCPSP nunca puede estar bajo la LP CPIT. La fila que lo mide debe ser pequeña y no negativa, aquí y en el par publicado. El conteo de bloques cuyo destino difiere del corte fijo dice si la libertad de destino se usó en absoluto en esta instancia.',
          },
        ],
        data: (lang) => <NewmanPcpspPanel lang={lang} />,
        figure: { caption: { en: 'The re-cut on the PCPSP relaxation and the chain that schedules it.', es: 'El re-corte sobre la relajación PCPSP y la cadena que lo programa.' }, render: (lang) => <DestinationRecut lang={lang} />, wide: true },
        equations: [
          { tex: String.raw`Z^{\text{LP}}_{\text{CPIT}}\le Z^{\text{LP}}_{\text{PCPSP}},\qquad Z^{\text{IP}}_{\text{CPIT}}\le Z^{\text{IP}}_{\text{PCPSP}}`, caption: { en: 'Problem inclusion: more decisions can only raise both values', es: 'Inclusión de problemas: más decisiones solo pueden subir ambos valores' } },
        ],
        refs: ['jelvez2018', 'huangfu2018', 'espinoza2013'],
      },
    ],
  },
  {
    id: 'real',
    label: { en: 'Real block models', es: 'Modelos de bloques reales' },
    topics: [
      {
        id: 'pits',
        title: { en: 'Ultimate pits of the three real models', es: 'Pits finales de los tres modelos reales' },
        paragraphs: [
          {
            en: 'The ultimate pit is a maximum-weight closure of the precedence graph, solved here as a minimum cut. It does not depend on periods, rates or capacities, so it is the one result that is comparable on kd and zuck_small even though their scheduling scenario is declared here. A pit that matches the published optimum to rounding checks the block values, the precedence arcs and the cut together on real geometry at nine and thirteen times the size of newman1.',
            es: 'El pit final es una clausura de peso máximo del grafo de precedencia, resuelta aquí como un corte mínimo. No depende de períodos, tasas ni capacidades, así que es el único resultado comparable en kd y zuck_small aunque su escenario de programación se declare aquí. Un pit que coincide con el óptimo publicado hasta el redondeo verifica a la vez los valores de bloque, los arcos de precedencia y el corte, sobre geometría real de nueve y trece veces el tamaño de newman1.',
          },
          {
            en: 'The schedule gaps of the two declared cases are shown for completeness and labelled: they are measured against this product\'s own certified bound on this product\'s own scenario, and no published number exists to compare them with.',
            es: 'Las brechas de programación de los dos casos declarados se muestran por completitud y rotuladas: se miden contra la cota certificada propia de este producto sobre el escenario propio de este producto, y no existe un número publicado con el cual compararlas.',
          },
        ],
        data: (lang) => <RealPitsPanel lang={lang} />,
        figure: { caption: { en: 'The closure as a cut: source to profitable blocks, unprofitable blocks to sink, precedence arcs of infinite capacity.', es: 'La clausura como corte: fuente a bloques rentables, bloques no rentables al sumidero, arcos de precedencia de capacidad infinita.' }, render: (lang) => <ClosureNetwork lang={lang} />, wide: true },
        refs: ['picard1976', 'lerchs1965', 'espinoza2013'],
      },
    ],
  },
  {
    id: 'cases',
    label: { en: 'Every case', es: 'Todos los casos' },
    topics: [
      {
        id: 'two-bounds',
        title: { en: 'Two bounds on every case', es: 'Dos cotas en cada caso' },
        paragraphs: [
          {
            en: 'With two capacities per period, the cheap certified bound is Algorithm 4: relax all but one capacity, solve each single-resource problem exactly with the critical multiplier algorithm, and keep the smallest value. It is valid and it is looser than the joint LP, because each relaxation ignores the capacities it dropped. Bienstock and Zuckerberg\'s method solves the joint LP by column generation over a time-expanded closure graph; where that graph fits, it gives the tighter bound and every gap of the case is measured against it.',
            es: 'Con dos capacidades por período, la cota certificada barata es el Algoritmo 4: relajar todas las capacidades menos una, resolver cada problema de un recurso exactamente con el algoritmo del multiplicador crítico, y quedarse con el menor valor. Es válida y es más floja que la LP conjunta, porque cada relajación ignora las capacidades que soltó. El método de Bienstock y Zuckerberg resuelve la LP conjunta por generación de columnas sobre un grafo de clausura expandido en el tiempo; donde ese grafo cabe, da la cota más ajustada y cada brecha del caso se mide contra ella.',
          },
          {
            en: 'The slack column is the part of any Algorithm 4 gap that belongs to the bound, not the plan. The PCPSP LP column is the bound the destination rungs are measured against; it is solved only where the destination economics exist.',
            es: 'La columna de holgura es la parte de cualquier brecha del Algoritmo 4 que pertenece a la cota, no al plan. La columna LP PCPSP es la cota contra la que se miden los peldaños con destino; se resuelve solo donde existe la economía de destinos.',
          },
        ],
        data: (lang) => <BoundSummaryPanel lang={lang} />,
        figure: { caption: { en: 'Algorithm 4: one exact relaxation per capacity, the smallest kept.', es: 'Algoritmo 4: una relajación exacta por capacidad, se conserva la menor.' }, render: (lang) => <Algorithm4 lang={lang} /> },
        refs: ['chicoisne2012', 'bienstock2010', 'munoz2017'],
      },
      {
        id: 'joint-bound',
        title: { en: 'How the joint bound is computed', es: 'Cómo se calcula la cota conjunta' },
        paragraphs: [
          {
            en: 'The joint LP is solved by alternating a small master LP over a set of closure columns with a pricing step that is itself a maximum closure on the time-expanded graph. The loop stops when no column has positive reduced value, at which point the master value equals the LP value. Its cost grows with blocks times periods, which is why it is skipped, and Algorithm 4 used, where the expanded graph would not fit in the bake\'s budget; the table on the previous tab says where that happened.',
            es: 'La LP conjunta se resuelve alternando una LP maestra pequeña sobre un conjunto de columnas de clausura con un paso de precios que es a su vez una clausura máxima sobre el grafo expandido en el tiempo. El ciclo se detiene cuando ninguna columna tiene valor reducido positivo, momento en que el valor maestro iguala el valor de la LP. Su costo crece con bloques por períodos, por eso se omite, y se usa el Algoritmo 4, donde el grafo expandido no cabría en el presupuesto del horneado; la tabla de la pestaña anterior dice dónde pasó.',
          },
        ],
        figure: { caption: { en: 'The Bienstock-Zuckerberg loop: master LP, closure pricing, new columns, until none prices out.', es: 'El ciclo de Bienstock-Zuckerberg: LP maestra, precios por clausura, columnas nuevas, hasta que ninguna mejora.' }, render: (lang) => <BzLoop lang={lang} /> },
        equations: [
          { tex: String.raw`Z^{\text{BZ}}=Z^{\text{LP}}_{\text{CPIT}}\le Z^{\text{Alg4}}=\min_{r}\,Z^{\text{LP}}_{r}`, caption: { en: 'The joint LP is never looser than the best single-resource relaxation', es: 'La LP conjunta nunca es más floja que la mejor relajación de un recurso' } },
        ],
        refs: ['bienstock2010', 'munoz2017'],
      },
      {
        id: 'best-plans',
        title: { en: 'The best plan of every case', es: 'El mejor plan de cada caso' },
        paragraphs: [
          {
            en: 'For each case, the best plan among the comparable rungs (the classical, state-of-the-art and learned CPIT plans, all on the same fixed-destination problem), its gap to the bound of that problem and which bound that is. Three controls run on every case. Duality: at rate zero with unlimited capacity the problem collapses to the ultimate pit, so the relaxation must mine exactly the pit\'s blocks and its bound must equal the pit\'s value. Bound: the best plan may not exceed its certified bound. Order invariance: in the same collapsed problem the sequence cannot matter, so every TopoSort weighting must return the same value.',
            es: 'Para cada caso, el mejor plan entre los peldaños comparables (los planes CPIT clásicos, del estado del arte y aprendido, todos sobre el mismo problema de destino fijo), su brecha a la cota de ese problema y qué cota es. Tres controles corren en cada caso. Dualidad: con tasa cero y capacidad ilimitada el problema colapsa al pit final, así que la relajación debe extraer exactamente los bloques del pit y su cota debe igualar el valor del pit. Cota: el mejor plan no puede superar su cota certificada. Invariancia al orden: en el mismo problema colapsado la secuencia no puede importar, así que todo peso TopoSort debe devolver el mismo valor.',
          },
        ],
        data: (lang) => <BestPerCasePanel lang={lang} />,
        figure: { caption: { en: 'The walk every TopoSort rung shares.', es: 'El recorrido que comparten todos los peldaños TopoSort.' }, render: (lang) => <TopoSortWalk lang={lang} /> },
        refs: ['chicoisne2012', 'cullenbine2011'],
      },
      {
        id: 'runtime',
        title: { en: 'Runtime', es: 'Tiempo de cómputo' },
        paragraphs: [
          {
            en: 'Every bound and method is timed in the bake, which has no time limit anywhere, so a method is never reported as worse because it was cut short. The bake runs one process per case, eight cases at a time with two numerical threads each; the times are wall times under that load and are comparable within a row, less so between rows baked beside different neighbours.',
            es: 'Cada cota y cada método se cronometra en el horneado, que no tiene límite de tiempo en ninguna parte, así que un método nunca se reporta como peor porque se lo cortó. El horneado corre un proceso por caso, ocho casos a la vez con dos hilos numéricos cada uno; los tiempos son tiempos de pared bajo esa carga y son comparables dentro de una fila, menos entre filas horneadas junto a vecinos distintos.',
          },
          {
            en: 'The costs separate cleanly. The TopoSort rungs and the shift search cost almost nothing once the bound exists. The bound costs tens of maximum closures. The sliding window solves one MILP per period and dominates wherever it runs; the exact neighbourhood re-solves, the joint bound and the PCPSP LP grow with blocks times periods.',
            es: 'Los costos se separan con claridad. Los peldaños TopoSort y la búsqueda de desplazamiento casi no cuestan una vez que existe la cota. La cota cuesta decenas de clausuras máximas. La ventana deslizante resuelve un MILP por período y domina donde corre; las re-resoluciones exactas de vecindario, la cota conjunta y la LP PCPSP crecen con bloques por períodos.',
          },
        ],
        data: (lang) => <RuntimePanel lang={lang} />,
        refs: ['cullenbine2011', 'huangfu2018', 'chicoisne2012'],
      },
    ],
  },
  {
    id: 'lanes',
    label: { en: 'Learned and in-browser', es: 'Aprendido y en el navegador' },
    topics: [
      {
        id: 'speed-quality',
        title: { en: 'The learned plan: speed against quality', es: 'El plan aprendido: velocidad contra calidad' },
        paragraphs: [
          {
            en: 'The learned rung exists for one reason: the exact live solve takes seconds in a browser, and a plan that appears while a control is still moving is worth having if it is close enough. The table measures both sides on the committed twins with the browser\'s own engine: the time to draw the learned plan, the time of the exact solve it stands in for, and the learned plan\'s value as a share of the exact ExTS plan at the same setting.',
            es: 'El peldaño aprendido existe por una razón: la resolución exacta en vivo toma segundos en un navegador, y un plan que aparece mientras un control todavía se mueve vale la pena si es lo bastante cercano. La tabla mide ambos lados sobre los gemelos versionados con el propio motor del navegador: el tiempo para dibujar el plan aprendido, el tiempo de la resolución exacta que reemplaza, y el valor del plan aprendido como fracción del plan ExTS exacto en la misma configuración.',
          },
          {
            en: 'The App never leaves the learned plan unscored: when the exact plan arrives it replaces the preview, and the preview\'s measured share at that setting is shown beside it.',
            es: 'La App nunca deja el plan aprendido sin juzgar: cuando llega el plan exacto reemplaza a la vista previa, y la fracción medida de la vista previa en esa configuración se muestra junto a él.',
          },
        ],
        data: (lang) => <PreviewTimingTable lang={lang} />,
        figure: { caption: { en: 'Two paths to the same walk: the expected times from the bound, or predicted from features.', es: 'Dos caminos al mismo recorrido: los tiempos esperados desde la cota, o predichos desde rasgos.' }, render: (lang) => <TopoSortWalk lang={lang} /> },
        refs: ['kingma2015', 'chicoisne2012'],
      },
      {
        id: 'parity',
        title: { en: 'The browser engine against the bake', es: 'El motor del navegador contra el horneado' },
        paragraphs: [
          {
            en: 'The live lane is a TypeScript implementation of the ultimate pit, the critical multiplier bound, Algorithm 4 and the TopoSort rungs, written to the same equations as the Python pipeline. A live lane and a replay lane that disagree would be two sciences presented as one, so this panel lets the reader check it on their own machine: it loads a committed twin, rebuilds the baked scenario with its absolute capacities, solves it in a worker and sets every item beside the trace.',
            es: 'El carril en vivo es una implementación TypeScript del pit final, la cota del multiplicador crítico, el Algoritmo 4 y los peldaños TopoSort, escrita con las mismas ecuaciones que el pipeline Python. Un carril en vivo y uno de reproducción que discrepan serían dos ciencias presentadas como una, así que este panel deja al lector verificarlo en su propia máquina: carga un gemelo versionado, reconstruye el escenario horneado con sus capacidades absolutas, lo resuelve en un worker y pone cada elemento junto a la traza.',
          },
          {
            en: 'The pit and the bound are asserted equal in the test suite at every build; the panel extends the check to the plans and to every live case. Nothing runs until the button is pressed.',
            es: 'El pit y la cota se verifican iguales en la batería de pruebas en cada build; el panel extiende la verificación a los planes y a cada caso en vivo. Nada corre hasta presionar el botón.',
          },
        ],
        data: (lang) => <LiveParityPanel lang={lang} />,
        figure: { caption: { en: 'What each lane computes, and where they must agree.', es: 'Qué calcula cada carril, y dónde deben coincidir.' }, render: (lang) => <LaneFidelity lang={lang} />, wide: true },
        refs: ['chicoisne2012', 'picard1976'],
      },
    ],
  },
];
