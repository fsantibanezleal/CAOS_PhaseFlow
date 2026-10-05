/**
 * Introduction: the planning problem and the approach. Transcribed from the research dossiers on the
 * formulations, the classical chain against direct block scheduling, and stockpiles and uncertainty.
 */
import type { TopicGroup } from './doc.tsx';
import { FourStepChain, PipelineOverview, PlanningChain, ScopeMap, ThreePressures, WhichWhen } from './figures/intro.tsx';

export const INTRODUCTION: TopicGroup[] = [
  {
    id: 'problem',
    label: { en: 'The planning problem', es: 'El problema de planificación' },
    topics: [
      {
        id: 'chain',
        title: { en: 'Where a production schedule sits', es: 'Dónde se ubica un plan de producción' },
        paragraphs: [
          {
            en: 'An open-pit mine is planned as a sequence of decisions, each fixing the input of the next. A block model divides the deposit into regular blocks, each carrying an estimated grade, a tonnage and a rock type. Block economics turns each block into a net value for each possible destination (the plant, the dump), using the metal price, the recovery and the mining and processing costs. The ultimate pit selects the set of blocks worth extracting at all. The production schedule then decides in which year each of those blocks leaves the ground. Short-term plans, fleet assignment and dispatch work inside the schedule, month by month.',
            es: 'Un rajo abierto se planifica como una secuencia de decisiones, cada una de las cuales fija la entrada de la siguiente. Un modelo de bloques divide el yacimiento en bloques regulares, cada uno con una ley estimada, un tonelaje y un tipo de roca. La economía por bloque convierte cada bloque en un valor neto para cada destino posible (la planta, el botadero), usando el precio del metal, la recuperación y los costos de mina y de proceso. El pit final selecciona el conjunto de bloques que vale la pena extraer. El plan de producción decide luego en qué año sale cada uno de esos bloques. Los planes de corto plazo, la asignación de flota y el despacho trabajan dentro de ese plan, mes a mes.',
          },
          {
            en: 'The schedule is the step that sets the cash profile of the project. Two schedules that mine exactly the same pit can differ by several percent of net present value, because money received in year one is worth more than the same money in year ten, and because the order in which waste is stripped decides when ore becomes reachable. On a project whose pit is worth hundreds of millions, a few percent is the difference that strategic planning exists to capture.',
            es: 'El plan es el paso que fija el perfil de caja del proyecto. Dos planes que extraen exactamente el mismo pit pueden diferir en varios puntos porcentuales de valor presente neto, porque el dinero recibido el año uno vale más que el mismo dinero el año diez, y porque el orden en que se remueve el estéril decide cuándo el mineral queda accesible. En un proyecto cuyo pit vale cientos de millones, unos pocos puntos porcentuales son justamente lo que la planificación estratégica existe para capturar.',
          },
          {
            en: 'Operations research has worked on this chain for six decades. The review by Newman, Rubio, Caro, Weintraub and Eurek describes the models used at each step and why the long-term schedule is the hardest of them: it couples a combinatorial precedence structure, inherited from the pit slopes, with capacities that bind period by period and an objective that discounts every period differently.',
            es: 'La investigación de operaciones ha trabajado sobre esta cadena por seis décadas. La revisión de Newman, Rubio, Caro, Weintraub y Eurek describe los modelos usados en cada paso y por qué el plan de largo plazo es el más difícil de ellos: acopla una estructura combinatoria de precedencias, heredada de los taludes del rajo, con capacidades que limitan período a período y un objetivo que descuenta cada período de manera distinta.',
          },
          {
            en: 'PhaseFlow works on that one step. It takes a block model whose economics are already fixed and whose pit is already computable exactly, and it answers the scheduling question: in which period each block is mined, subject to slope precedence in every period and to the mining and processing capacities of each period, so that the discounted value is as large as it can be shown to be. Everything upstream (estimation, economics) is an input; everything downstream (fleet, dispatch, blending) is outside the product and is named as such.',
            es: 'PhaseFlow trabaja sobre ese paso. Toma un modelo de bloques cuya economía ya está fijada y cuyo pit ya se calcula de manera exacta, y responde la pregunta del plan: en qué período se extrae cada bloque, sujeto a la precedencia de talud en cada período y a las capacidades de mina y de planta de cada período, de modo que el valor descontado sea tan grande como se pueda demostrar. Todo lo que está aguas arriba (estimación, economía) es una entrada; todo lo que está aguas abajo (flota, despacho, mezcla) queda fuera del producto y se declara así.',
          },
        ],
        facts: [
          { k: { en: 'Input', es: 'Entrada' }, v: { en: 'a block model with fixed economics and slope precedence', es: 'un modelo de bloques con economía y precedencia de talud fijadas' } },
          { k: { en: 'Decides', es: 'Decide' }, v: { en: 'the period in which each block is mined', es: 'el período en que se extrae cada bloque' } },
          { k: { en: 'Objective', es: 'Objetivo' }, v: { en: 'discounted value (net present value)', es: 'valor descontado (valor presente neto)' } },
          { k: { en: 'Constraints', es: 'Restricciones' }, v: { en: 'precedence in every period; mining and plant capacity per period', es: 'precedencia en cada período; capacidad de mina y de planta por período' } },
          { k: { en: 'Judged by', es: 'Se juzga por' }, v: { en: 'its gap to a certified upper bound', es: 'su brecha a una cota superior certificada' } },
          { k: { en: 'Not decided here', es: 'No se decide aquí' }, v: { en: 'estimation, economics, fleet, dispatch, blending', es: 'estimación, economía, flota, despacho, mezcla' } },
        ],
        figure: { caption: { en: 'The planning chain. PhaseFlow answers the schedule step: when each block of a computable pit is mined.', es: 'La cadena de planificación. PhaseFlow responde el paso del plan: cuándo se extrae cada bloque de un pit calculable.' }, render: (lang) => <PlanningChain lang={lang} />, wide: true },
        refs: ['newman2010', 'espinoza2013', 'chicoisne2012'],
      },
      {
        id: 'which-when',
        title: { en: 'Which blocks, and when', es: 'Qué bloques, y cuándo' },
        paragraphs: [
          {
            en: 'The ultimate pit problem (UPIT) chooses the subset of blocks with the largest undiscounted value under slope precedence: a block can be in the pit only if every block above it, inside the slope cone, is in the pit too. Lerchs and Grossmann showed in 1965 that this is the maximum closure of a directed graph, and Picard showed in 1976 that a maximum closure is a minimum cut. UPIT is therefore polynomial and solved exactly, and its linear relaxation has an integral optimum because the precedence system is totally unimodular. Time does not appear in it.',
            es: 'El problema del pit final (UPIT) elige el subconjunto de bloques con el mayor valor sin descontar bajo precedencia de talud: un bloque puede estar en el pit solo si todo bloque sobre él, dentro del cono de talud, también lo está. Lerchs y Grossmann mostraron en 1965 que esto es el cierre máximo de un grafo dirigido, y Picard mostró en 1976 que un cierre máximo es un corte mínimo. UPIT es por lo tanto polinomial y se resuelve de manera exacta, y su relajación lineal tiene un óptimo entero porque el sistema de precedencias es totalmente unimodular. El tiempo no aparece en él.',
          },
          {
            en: 'The constrained pit limit problem (CPIT) adds the time axis. Every block gets a period, the precedence must hold in every period and not only at the end, each period has a limited amount of each resource (tonnes moved, tonnes processed), and the value of each period is discounted. MineLib, the public library of open-pit instances, states the distinction exactly: CPIT schedules blocks over a fixed number of periods, maximising discounted value under slope precedence and capacity constraints, with block destinations fixed in advance.',
            es: 'El problema del pit límite restringido (CPIT) agrega el eje del tiempo. Cada bloque recibe un período, la precedencia debe cumplirse en cada período y no solo al final, cada período tiene una cantidad limitada de cada recurso (toneladas movidas, toneladas procesadas), y el valor de cada período se descuenta. MineLib, la biblioteca pública de instancias de rajo abierto, enuncia la distinción con exactitud: CPIT programa bloques en un número fijo de períodos, maximizando el valor descontado bajo restricciones de talud y de capacidad, con los destinos de los bloques fijados de antemano.',
          },
          {
            en: 'Adding a single capacity constraint to a maximum-closure problem already gives a precedence-constrained knapsack, and that is what makes CPIT NP-hard; Caccetta and Hill frame the problem this way in their branch-and-cut work. Real instances have three to ten million blocks and fifteen to twenty periods, which is why, in the words of Chicoisne, Espinoza, Goycoolea, Moreno and Rubio, exact models were long impractical for real planning and the field relied on numerous heuristic methods.',
            es: 'Agregar una sola restricción de capacidad a un problema de cierre máximo ya produce una mochila con precedencias, y eso es lo que hace a CPIT NP-duro; Caccetta y Hill enmarcan así el problema en su trabajo de ramificación y corte. Las instancias reales tienen entre tres y diez millones de bloques y entre quince y veinte períodos, por eso, en palabras de Chicoisne, Espinoza, Goycoolea, Moreno y Rubio, los modelos exactos fueron por mucho tiempo imprácticos para la planificación real y el área se apoyó en numerosos métodos heurísticos.',
          },
          {
            en: 'The precedence-constrained production scheduling problem (PCPSP) goes one step further: the model also chooses each block\'s destination. In CPIT the destination is decided before the model runs, folded into one value per block; the cutoff grade is an input. In PCPSP the cutoff becomes an output, because a block goes to the plant only if the plant has room in that period and processing it is worth more than dumping it once the plant tonnage it takes from other ore is counted: where the plant binds, marginal ore is dumped and the cutoff rises above break-even. The step from CPIT to PCPSP is not accounting; it is a different problem over a larger feasible set, and its bounds are different numbers.',
            es: 'El problema de programación de producción con precedencias (PCPSP) da un paso más: el modelo también elige el destino de cada bloque. En CPIT el destino se decide antes de resolver, plegado en un valor por bloque; la ley de corte es una entrada. En PCPSP la ley de corte pasa a ser un resultado, porque un bloque va a planta solo si la planta tiene capacidad en ese período y procesarlo vale más que botarlo una vez contado el tonelaje de planta que le quita a otro mineral: donde la planta limita, el mineral marginal se bota y la ley de corte sube sobre el equilibrio. El paso de CPIT a PCPSP no es contabilidad; es otro problema sobre un conjunto factible más grande, y sus cotas son otros números.',
          },
        ],
        equations: [
          { tex: String.raw`\mathrm{UPL}(p)=\max\sum_{b\in\mathcal B}p_b\,x_b\quad\text{s.t.}\quad x_b\le x_a\ \ \forall (a,b)\in\mathcal A,\quad x_b\in\{0,1\}`, caption: { en: 'UPIT: the most valuable precedence-closed set of blocks (Chicoisne et al. 2012, equations 1a to 1c)', es: 'UPIT: el conjunto cerrado por precedencias de mayor valor (Chicoisne et al. 2012, ecuaciones 1a a 1c)' } },
          { tex: String.raw`\max\sum_{b}\sum_{t=1}^{T}p_{bt}\,(x_{bt}-x_{b,t-1})\quad\text{s.t.}\quad \sum_b a_{rb}(x_{bt}-x_{b,t-1})\le c_{rt},\ \ x_{bt}\le x_{at},\ \ x_{bt}\le x_{b,t+1}`, caption: { en: 'CPIT in cumulative variables: x_bt = 1 when block b is mined by the end of period t', es: 'CPIT en variables acumuladas: x_bt = 1 cuando el bloque b fue extraído al final del período t' } },
        ],
        facts: [
          { k: { en: 'UPIT', es: 'UPIT' }, v: { en: 'a set; maximum closure; polynomial; LP is integral', es: 'un conjunto; cierre máximo; polinomial; la LP es entera' } },
          { k: { en: 'CPIT', es: 'CPIT' }, v: { en: 'a period per block; destinations fixed; NP-hard', es: 'un período por bloque; destinos fijos; NP-duro' } },
          { k: { en: 'PCPSP', es: 'PCPSP' }, v: { en: 'periods and destinations; the cutoff is an output', es: 'períodos y destinos; la ley de corte es un resultado' } },
          { k: { en: 'Real size', es: 'Tamaño real' }, v: { en: '3 to 10 million blocks, 15 to 20 periods (Chicoisne et al. 2012)', es: '3 a 10 millones de bloques, 15 a 20 períodos (Chicoisne et al. 2012)' } },
          { k: { en: 'Inclusion', es: 'Inclusión' }, v: { en: 'every CPIT plan is a PCPSP plan, so the PCPSP bound is the larger one', es: 'todo plan CPIT es un plan PCPSP, de modo que la cota PCPSP es la mayor' } },
        ],
        figure: { caption: { en: 'The same section read twice: as a set (UPIT) and as a period per block (CPIT). Period colours follow the app.', es: 'La misma sección leída dos veces: como conjunto (UPIT) y como un período por bloque (CPIT). Los colores de período son los de la app.' }, render: (lang) => <WhichWhen lang={lang} />, wide: true },
        refs: ['lerchs1965', 'picard1976', 'espinoza2013', 'caccetta2003', 'chicoisne2012', 'jelvez2018'],
      },
      {
        id: 'pressures',
        title: { en: 'Discounting, precedence and capacity', es: 'Descuento, precedencia y capacidad' },
        paragraphs: [
          {
            en: 'Three pressures shape every schedule. Discounting wants value as early as possible: with a rate of eight or ten percent a year, a tonne of ore processed in year ten is worth about half of the same tonne processed in year one. Precedence says that the rock above a block, inside the slope cone, must come out first, and it says it in every period: a schedule cannot mine a deep high-grade block in year two if its cover is scheduled for year three. Capacity says how much the fleet can move and how much the plant can process in each year.',
            es: 'Tres presiones dan forma a todo plan. El descuento quiere el valor lo antes posible: con una tasa de ocho o diez por ciento anual, una tonelada de mineral procesada el año diez vale cerca de la mitad de la misma tonelada procesada el año uno. La precedencia dice que la roca sobre un bloque, dentro del cono de talud, debe salir antes, y lo dice en cada período: un plan no puede extraer un bloque profundo de alta ley el año dos si su cobertura está programada para el año tres. La capacidad dice cuánto puede mover la flota y cuánto puede procesar la planta cada año.',
          },
          {
            en: 'The three pull against each other. Discounting alone would mine every positive block in period one. Precedence alone has no preference about time. Capacity alone would fill every period to its limit regardless of value. A schedule is the point where they balance, and the balance moves with every parameter: a higher discount rate rewards a deep, narrow early pit that reaches ore quickly; a tighter plant rewards stripping waste while the plant is full; a looser fleet removes the reason to stage the pit at all.',
            es: 'Las tres tiran en sentidos opuestos. El descuento por sí solo extraería todo bloque positivo en el período uno. La precedencia por sí sola no tiene preferencia temporal. La capacidad por sí sola llenaría cada período hasta su límite sin importar el valor. Un plan es el punto donde se equilibran, y el equilibrio se mueve con cada parámetro: una tasa de descuento mayor premia un rajo temprano profundo y estrecho que llega rápido al mineral; una planta más estrecha premia remover estéril mientras la planta está llena; una flota más holgada elimina la razón para escalonar el rajo.',
          },
          {
            en: 'This is why the pit changes shape in this product when a control moves: the geometry of each year is the computed answer to that balance, not an illustration of it. The schedule\'s value is a discounted sum over periods, and each period\'s value is the sum of the net values of the blocks mined in it. A block\'s net value is fixed before scheduling in CPIT, at its best destination; with the discount factor below, the first period is not discounted, which is the convention of the published MineLib files.',
            es: 'Por eso el rajo cambia de forma en este producto cuando se mueve un control: la geometría de cada año es la respuesta calculada a ese equilibrio, no una ilustración de él. El valor de un plan es una suma descontada sobre los períodos, y el valor de cada período es la suma de los valores netos de los bloques extraídos en él. El valor neto de un bloque se fija antes de programar en CPIT, en su mejor destino; con el factor de descuento de abajo, el primer período no se descuenta, que es la convención de los archivos publicados de MineLib.',
          },
          {
            en: 'The symbols on the right are the ones every page of this product uses. They are the notation of Chicoisne et al. 2012, the paper whose algorithm computes the bound, so a reader can move between these pages and the source without translating.',
            es: 'Los símbolos de la derecha son los que usa cada página de este producto. Son la notación de Chicoisne et al. 2012, el artículo cuyo algoritmo calcula la cota, de modo que un lector puede pasar de estas páginas a la fuente sin traducir.',
          },
        ],
        equations: [
          { tex: String.raw`p_b=\max\bigl(p^{\text{dump}}_b,\ p^{\text{plant}}_b\bigr),\quad p^{\text{dump}}_b=-c^{\text{mine}}q_b,\quad p^{\text{plant}}_b=(g_b\,r\,P-c^{\text{proc}})\,q_b-c^{\text{mine}}q_b`, caption: { en: 'Net value of a twin block at its two destinations; CPIT keeps the better one, which is the semantics of a MineLib .upit value', es: 'Valor neto de un bloque gemelo en sus dos destinos; CPIT conserva el mejor, que es la semántica de un valor .upit de MineLib' } },
          { tex: String.raw`p_{bt}=d_t\,p_b,\qquad d_t=(1+\eta)^{-(t-1)},\qquad \text{NPV}(x)=\sum_{t=1}^{T}d_t\sum_{b}p_b\,(x_{bt}-x_{b,t-1})`, caption: { en: 'Discounting, with the first period undiscounted (MineLib convention)', es: 'Descuento, con el primer período sin descontar (convención MineLib)' } },
          { tex: String.raw`\sum_{b}a_{rb}\,(x_{bt}-x_{b,t-1})\le c_{rt}\quad\forall r,t`, caption: { en: 'Capacity: what is mined in period t, per resource', es: 'Capacidad: lo que se extrae en el período t, por recurso' } },
        ],
        symbols: [
          { tex: String.raw`\mathcal B`, text: { en: 'the blocks of the model', es: 'los bloques del modelo' } },
          { tex: String.raw`\mathcal A`, text: { en: 'precedence arcs; (a, b) means a must be mined before b', es: 'arcos de precedencia; (a, b) significa que a debe extraerse antes que b' } },
          { tex: 'T', text: { en: 'number of periods (years)', es: 'número de períodos (años)' } },
          { tex: String.raw`x_{bt}`, text: { en: '1 if block b is mined by the end of period t (cumulative)', es: '1 si el bloque b fue extraído al final del período t (acumulada)' } },
          { tex: String.raw`p_b`, text: { en: 'net value of block b at its best destination', es: 'valor neto del bloque b en su mejor destino' } },
          { tex: String.raw`\eta`, text: { en: 'discount rate per period', es: 'tasa de descuento por período' } },
          { tex: String.raw`d_t`, text: { en: 'discount factor of period t', es: 'factor de descuento del período t' } },
          { tex: String.raw`a_{rb}`, text: { en: 'amount of resource r consumed by mining b (tonnes moved, tonnes processed)', es: 'cantidad del recurso r que consume extraer b (toneladas movidas, procesadas)' } },
          { tex: String.raw`c_{rt}`, text: { en: 'capacity of resource r in period t', es: 'capacidad del recurso r en el período t' } },
          { tex: String.raw`q_b,\ g_b`, text: { en: 'tonnage and grade of block b', es: 'tonelaje y ley del bloque b' } },
          { tex: String.raw`P,\ r`, text: { en: 'price per tonne of recovered metal, plant recovery', es: 'precio por tonelada de metal recuperado, recuperación de planta' } },
          { tex: String.raw`c^{\text{mine}},\ c^{\text{proc}}`, text: { en: 'mining cost per tonne moved, processing cost per tonne milled', es: 'costo de mina por tonelada movida, costo de proceso por tonelada procesada' } },
        ],
        figure: { caption: { en: 'Three pressures, one schedule: the balance moves when any of them moves.', es: 'Tres presiones, un plan: el equilibrio se mueve cuando cualquiera se mueve.' }, render: (lang) => <ThreePressures lang={lang} /> },
        refs: ['chicoisne2012', 'espinoza2013', 'johnson1968'],
      },
    ],
  },
  {
    id: 'approach',
    label: { en: 'The approach', es: 'El enfoque' },
    topics: [
      {
        id: 'practice',
        title: { en: 'How industry schedules, and what it costs', es: 'Cómo programa la industria, y qué cuesta' },
        paragraphs: [
          {
            en: 'Industrial practice reaches a schedule through a four-step chain, which Chicoisne et al. describe and draw in their Figure 1. First, the ultimate pit is solved for a decreasing sequence of revenue factors; because a lower price can only shrink the optimal pit, the solutions nest, giving nested pits. Second, pushbacks are chosen as differences of consecutive nested pits. Third, pushbacks are cut into bench-phases, the blocks of one pushback on one bench. Fourth, bench-phases are assigned to periods so that capacities hold. Only after that is each block given a destination, usually by a cutoff grade.',
            es: 'La práctica industrial llega a un plan por una cadena de cuatro pasos, que Chicoisne et al. describen y dibujan en su Figura 1. Primero, se resuelve el pit final para una secuencia decreciente de factores de ingreso; como un precio menor solo puede achicar el pit óptimo, las soluciones se anidan y dan pits anidados. Segundo, se eligen expansiones como diferencias de pits anidados consecutivos. Tercero, las expansiones se cortan en fases-banco, los bloques de una expansión en un banco. Cuarto, las fases-banco se asignan a períodos de modo que se cumplan las capacidades. Recién después se da a cada bloque un destino, normalmente por una ley de corte.',
          },
          {
            en: 'Morales, Jelvez, Nancel-Penard, Marinho and Guimaraes point out that only steps one and three are algorithms: the pushback selection is made by the planner, and compliance with the constraints is something the planner must ensure, while an optimisation model cannot produce a solution that violates one. Meagher, Dimitrakopoulos and Avis review what goes wrong: pushback sizes jump between revenue factors (the gap problem), a pushback may be several disconnected pieces far apart, discounting is ignored while the pits are designed, and the authors conclude that it is impossible to generate a truly optimal production schedule using sub-optimally designed pushbacks.',
            es: 'Morales, Jelvez, Nancel-Penard, Marinho y Guimaraes señalan que solo los pasos uno y tres son algoritmos: la selección de expansiones la hace el planificador, y el cumplimiento de las restricciones es algo que el planificador debe asegurar, mientras que un modelo de optimización no puede producir una solución que viole una. Meagher, Dimitrakopoulos y Avis revisan lo que falla: el tamaño de las expansiones salta entre factores de ingreso (el problema del gap), una expansión puede ser varios trozos desconectados y lejanos, el descuento se ignora mientras se diseñan los pits, y los autores concluyen que es imposible generar un plan de producción verdaderamente óptimo usando expansiones diseñadas de manera subóptima.',
          },
          {
            en: 'Direct block scheduling replaces the chain with one model whose constraints hold by construction. The honest measurement of what that buys is in Morales et al. 2015, who ran two direct engines against published MineLib solutions and against a commercial nested-pit package. The net present values differed by low single-digit percentages (1.2 percent on McLaughlin between the nested-pit plan and the best direct one). What differed a lot was the effort and the geometry: the direct engines produced their schedules in one run of 1.0 to 1.5 hours, while the nested-pit schedule took about 15 hours of a well-qualified planner, and the pit shapes differed most in the first periods.',
            es: 'La programación directa por bloques reemplaza la cadena por un modelo cuyas restricciones se cumplen por construcción. La medición honesta de lo que eso entrega está en Morales et al. 2015, que corrieron dos motores directos contra soluciones publicadas de MineLib y contra un paquete comercial de pits anidados. Los valores presentes netos difirieron en pocos puntos porcentuales (1,2 por ciento en McLaughlin entre el plan de pits anidados y el mejor directo). Lo que difirió mucho fue el esfuerzo y la geometría: los motores directos produjeron sus planes en una corrida de 1,0 a 1,5 horas, mientras que el plan de pits anidados tomó cerca de 15 horas de un planificador calificado, y las formas del rajo difirieron más en los primeros períodos.',
          },
          {
            en: 'That measurement is the framing of this product. PhaseFlow does not claim that direct scheduling wins by a large margin of NPV; it shows a classical nested-shell plan, direct heuristics and the certified bound side by side, so the reader sees values that are close, gaps that are not, and early-period geometry that differs. Direct block schedules also carry their own warning, from the authors of the algorithm PhaseFlow uses: blocks scheduled in the same period are likely to be scattered through the mine, which is why spatial coherence is measured here rather than assumed.',
            es: 'Esa medición es el marco de este producto. PhaseFlow no afirma que la programación directa gane por un gran margen de VAN; muestra lado a lado un plan clásico de cáscaras anidadas, heurísticas directas y la cota certificada, de modo que el lector ve valores cercanos, brechas que no lo son y una geometría de los primeros períodos que difiere. Los planes directos por bloque también traen su propia advertencia, de los autores del algoritmo que usa PhaseFlow: es probable que los bloques programados en un mismo período queden dispersos por la mina, y por eso aquí la coherencia espacial se mide en vez de suponerse.',
          },
        ],
        facts: [
          { k: { en: 'Classical chain', es: 'Cadena clásica' }, v: { en: 'nested pits, pushbacks, bench-phases, periods, then a cutoff', es: 'pits anidados, expansiones, fases-banco, períodos, luego una ley de corte' } },
          { k: { en: 'Algorithms in it', es: 'Algoritmos en ella' }, v: { en: 'steps 1 and 3; step 2 is the planner', es: 'pasos 1 y 3; el paso 2 es el planificador' } },
          { k: { en: 'NPV difference', es: 'Diferencia de VAN' }, v: { en: 'low single-digit percent (Morales et al. 2015)', es: 'pocos puntos porcentuales (Morales et al. 2015)' } },
          { k: { en: 'Effort difference', es: 'Diferencia de esfuerzo' }, v: { en: '1.0 to 1.5 h of computing against about 15 h of a planner', es: '1,0 a 1,5 h de cómputo contra cerca de 15 h de un planificador' } },
          { k: { en: 'Known caveat', es: 'Advertencia conocida' }, v: { en: 'block schedules scatter; coherence must be measured', es: 'los planes por bloque se dispersan; la coherencia debe medirse' } },
        ],
        figure: { caption: { en: 'The four-step chain on one section, after Chicoisne et al. 2012, Figure 1.', es: 'La cadena de cuatro pasos sobre una sección, según Chicoisne et al. 2012, Figura 1.' }, render: (lang) => <FourStepChain lang={lang} />, wide: true },
        table: {
          head: [
            { en: 'instance (Morales et al. 2015)', es: 'instancia (Morales et al. 2015)' },
            { en: 'SimSched', es: 'SimSched' },
            { en: 'BOS2', es: 'BOS2' },
            { en: 'MineLib published', es: 'MineLib publicado' },
            { en: 'Whittle', es: 'Whittle' },
          ],
          rows: [
            [{ en: 'Marvin, 53,271 blocks, 14 periods (M USD)', es: 'Marvin, 53.271 bloques, 14 períodos (M USD)' }, '921.3', '905.8', '886.3', { en: 'not run', es: 'no corrido' }],
            [{ en: 'KD, 14,153 blocks, 12 periods', es: 'KD, 14.153 bloques, 12 períodos' }, '406.6', '409.7', '407.0', { en: 'not run', es: 'no corrido' }],
            [{ en: 'McLaughlin, 2,140,342 blocks, 16 periods', es: 'McLaughlin, 2.140.342 bloques, 16 períodos' }, '1493', '1510', '1510', '1492'],
          ],
        },
        refs: ['chicoisne2012', 'morales2015', 'meagher2014', 'bai2018'],
      },
      {
        id: 'what',
        title: { en: 'What PhaseFlow does', es: 'Qué hace PhaseFlow' },
        paragraphs: [
          {
            en: 'Because CPIT is NP-hard, what a schedule can honestly carry is not a claim of optimality but a distance to a certified upper bound. PhaseFlow computes that bound first. For one resource per period the linear relaxation of CPIT is solved exactly by the critical multiplier algorithm of Chicoisne et al., as a sequence of maximum closures and with no linear-programming solver at all; for two resources it uses their Algorithm 4 and, where the instance fits, the joint bound of Bienstock and Zuckerberg. For the destination problem it solves the PCPSP relaxation with HiGHS.',
            es: 'Como CPIT es NP-duro, lo que un plan puede llevar honestamente no es una afirmación de optimalidad sino una distancia a una cota superior certificada. PhaseFlow calcula primero esa cota. Para un recurso por período, la relajación lineal de CPIT se resuelve de manera exacta con el algoritmo del multiplicador crítico de Chicoisne et al., como una secuencia de cierres máximos y sin ningún solver de programación lineal; para dos recursos usa su Algoritmo 4 y, cuando la instancia cabe, la cota conjunta de Bienstock y Zuckerberg. Para el problema con destinos resuelve la relajación de PCPSP con HiGHS.',
          },
          {
            en: 'It then runs a ladder of methods on the same instance and scores every plan against the bound of the problem it solves. The classical rungs are what a planner or a textbook would do: bench by bench, nested shells, greedy and Gershon orderings. The state-of-the-art rungs use the bound itself as the seed of the plan (expected-time TopoSort), solve the look-ahead of a sliding time window exactly, and improve plans with exact restricted re-solves. A learned rung predicts the expensive ordering with no LP at all. Beyond CPIT, the model chooses destinations, a smoothing pass makes plans workable, and an ensemble shows what geological uncertainty does to each plan.',
            es: 'Después corre una escalera de métodos sobre la misma instancia y juzga cada plan contra la cota del problema que resuelve. Los peldaños clásicos son lo que haría un planificador o un texto: banco a banco, cáscaras anidadas, órdenes codicioso y de Gershon. Los peldaños del estado del arte usan la propia cota como semilla del plan (TopoSort de tiempo esperado), resuelven de manera exacta la anticipación de una ventana deslizante y mejoran planes con re-resoluciones exactas restringidas. Un peldaño aprendido predice el orden costoso sin ninguna LP. Más allá de CPIT, el modelo elige destinos, una pasada de suavizado hace los planes operables y un ensamble muestra qué hace la incertidumbre geológica a cada plan.',
          },
          {
            en: 'The trust anchor is a published instance solved as published: MineLib\'s newman1, with its own six periods, its own eight percent rate and its own two capacities, read from its own files. On that instance the reproduced numbers can be checked against the literature: the ultimate pit, the CPIT LP bound MineLib publishes, the PCPSP LP bound Jelvez et al. publish, and an external exact CPIT solve. The other twelve cases are real block models under declared scenarios and seeded synthetic twins, chosen so that each one tests something the others cannot.',
            es: 'El ancla de confianza es una instancia publicada resuelta tal como se publica: newman1 de MineLib, con sus propios seis períodos, su propia tasa de ocho por ciento y sus propias dos capacidades, leídas de sus propios archivos. En esa instancia los números reproducidos se pueden contrastar con la literatura: el pit final, la cota LP de CPIT que publica MineLib, la cota LP de PCPSP que publican Jelvez et al. y una resolución exacta externa de CPIT. Los otros doce casos son modelos de bloques reales bajo escenarios declarados y gemelos sintéticos sembrados, elegidos para que cada uno pruebe algo que los demás no pueden.',
          },
          {
            en: 'Every number that reaches a screen travels with the bound it is judged against and with its controls. The steps below are the ones the offline pipeline runs for each case, in order; the app replays their committed result and, on the synthetic twins, re-solves the bound and a schedule live in the browser when a control moves.',
            es: 'Todo número que llega a una pantalla viaja con la cota contra la que se juzga y con sus controles. Los pasos de abajo son los que corre el pipeline offline para cada caso, en orden; la app reproduce su resultado versionado y, en los gemelos sintéticos, re-resuelve la cota y un plan en vivo en el navegador cuando se mueve un control.',
          },
        ],
        steps: {
          title: { en: 'The pipeline, per case', es: 'El pipeline, por caso' },
          items: [
            { en: 'Build the instance: read a MineLib file or generate a seeded twin, compute block values per destination, build the slope precedence, and pass the ingestion contract.', es: 'Construir la instancia: leer un archivo MineLib o generar un gemelo sembrado, calcular valores por destino, construir la precedencia de talud y pasar el contrato de ingesta.' },
            { en: 'Solve the ultimate pit exactly; it bounds every schedule and defines the blocks a schedule may use.', es: 'Resolver el pit final de manera exacta; acota todo plan y define los bloques que un plan puede usar.' },
            { en: 'Compute the certified bounds: the critical multiplier per resource, Algorithm 4, the joint Bienstock-Zuckerberg bound under a budget, and the PCPSP LP when destinations are modelled.', es: 'Calcular las cotas certificadas: el multiplicador crítico por recurso, el Algoritmo 4, la cota conjunta de Bienstock-Zuckerberg bajo un presupuesto, y la LP de PCPSP cuando se modelan destinos.' },
            { en: 'Run the method ladder; check every plan for precedence and capacity before it can be recorded.', es: 'Correr la escalera de métodos; verificar precedencia y capacidad de cada plan antes de poder registrarlo.' },
            { en: 'Run the controls: the zero-rate duality identity, the bound above every plan, and order invariance.', es: 'Correr los controles: la identidad de dualidad con tasa cero, la cota sobre todo plan y la invariancia al orden.' },
            { en: 'Measure spatial coherence per period and the cost of a workable plan; score the learned rung against the exact plan it approximates; run the uncertainty ensemble.', es: 'Medir la coherencia espacial por período y el costo de un plan operable; juzgar el peldaño aprendido contra el plan exacto que aproxima; correr el ensamble de incertidumbre.' },
            { en: 'Write the trace and the manifest, re-read them against the contract, and commit them as evidence.', es: 'Escribir la traza y el manifiesto, releerlos contra el contrato y versionarlos como evidencia.' },
          ],
        },
        facts: [
          { k: { en: 'Bounds', es: 'Cotas' }, v: { en: 'critical multiplier, Algorithm 4, joint Bienstock-Zuckerberg, PCPSP LP', es: 'multiplicador crítico, Algoritmo 4, Bienstock-Zuckerberg conjunta, LP PCPSP' } },
          { k: { en: 'Methods', es: 'Métodos' }, v: { en: '13 rungs: classical, state of the art, learned, beyond CPIT', es: '13 peldaños: clásicos, estado del arte, aprendido, más allá de CPIT' } },
          { k: { en: 'Cases', es: 'Casos' }, v: { en: '13: one published, two declared, five deposit twins (four archetypes), three regimes, two controls', es: '13: uno publicado, dos declarados, cinco gemelos de depósito (cuatro arquetipos), tres regímenes, dos controles' } },
          { k: { en: 'Anchor', es: 'Ancla' }, v: { en: 'newman1 as published: 6 periods, 8 percent, two capacities', es: 'newman1 tal como se publica: 6 períodos, 8 por ciento, dos capacidades' } },
          { k: { en: 'In the browser', es: 'En el navegador' }, v: { en: 'replay of the evidence; live re-solve of the synthetic twins', es: 'reproducción de la evidencia; re-resolución en vivo de los gemelos sintéticos' } },
        ],
        figure: { caption: { en: 'From a block model to a judged schedule. Each plan is scored against the bound of the problem it solves.', es: 'De un modelo de bloques a un plan juzgado. Cada plan se juzga contra la cota del problema que resuelve.' }, render: (lang) => <PipelineOverview lang={lang} />, wide: true },
        refs: ['chicoisne2012', 'bienstock2010', 'munoz2017', 'huangfu2018', 'espinoza2013', 'jelvez2018', 'amplminelib'],
      },
      {
        id: 'scope',
        title: { en: 'Exact, heuristic, illustrative, and out of scope', es: 'Exacto, heurístico, ilustrativo y fuera de alcance' },
        paragraphs: [
          {
            en: 'Exact here means a number that is proven: the ultimate pit (a maximum closure), the CPIT LP bound by the critical multiplier algorithm (a theorem with a duality certificate checked at run time), the joint bound and the PCPSP LP to solver tolerance, and the controls. Heuristic means every schedule: each is feasible and checked, and none is claimed optimal; its quality is its gap to the bound. The gap itself mixes three things (how loose the bound is, the integrality gap of the instance and the loss of the method), and on the one instance where an external integer optimum is known, PhaseFlow separates them.',
            es: 'Exacto aquí significa un número demostrado: el pit final (un cierre máximo), la cota LP de CPIT por el algoritmo del multiplicador crítico (un teorema con un certificado de dualidad verificado en ejecución), la cota conjunta y la LP de PCPSP a la tolerancia del solver, y los controles. Heurístico significa todo plan: cada uno es factible y verificado, y ninguno se declara óptimo; su calidad es su brecha a la cota. La brecha misma mezcla tres cosas (cuán holgada es la cota, la brecha de integralidad de la instancia y la pérdida del método), y en la única instancia donde se conoce un óptimo entero externo, PhaseFlow las separa.',
          },
          {
            en: 'Illustrative means synthetic and labelled so: the seeded twins (porphyry, vein, layered and core-halo archetypes), the declared scenarios on real block models whose scheduling files are not public, and the geological ensemble, which is a spatially correlated perturbation of block values and not a conditional simulation from drillholes.',
            es: 'Ilustrativo significa sintético y rotulado como tal: los gemelos sembrados (arquetipos pórfido, veta, estratificado y núcleo-halo), los escenarios declarados sobre modelos de bloques reales cuyos archivos de programación no son públicos, y el ensamble geológico, que es una perturbación espacialmente correlacionada de los valores de bloque y no una simulación condicional desde sondajes.',
          },
          {
            en: 'Out of scope, each with its reason. Stockpiles: the grade reclaimed from a pile is the blend of what is inside, a ratio of decision variables, so the honest model is bilinear; the published linear models fix the stockpile grade as a parameter and search over it, and at ten percent annual degradation the value a stockpile provides falls by 69 percent. Blending and other general side constraints: read from the files, not solved, and declared. Two-stage stochastic programming: a different and much larger model, whose published gain on a gold mine is about ten percent of NPV. Haulage, dispatch and cutoff policy as a product belong to other members of this line.',
            es: 'Fuera de alcance, cada uno con su razón. Acopios: la ley que se recupera de una pila es la mezcla de lo que contiene, un cociente de variables de decisión, de modo que el modelo honesto es bilineal; los modelos lineales publicados fijan la ley del acopio como parámetro y buscan sobre ella, y con diez por ciento de degradación anual el valor que aporta un acopio cae 69 por ciento. Mezcla y otras restricciones laterales generales: se leen de los archivos, no se resuelven, y se declara. Programación estocástica en dos etapas: otro modelo, mucho más grande, cuya ganancia publicada en una mina de oro es cerca de diez por ciento del VAN. Transporte, despacho y política de ley de corte como producto pertenecen a otros miembros de esta línea.',
          },
          {
            en: 'None of this is a tool for production mine planning. It is a research instrument that makes the scheduling problem, its bounds and the honest quality of each method visible on real and synthetic instances.',
            es: 'Nada de esto es una herramienta para planificación minera de producción. Es un instrumento de investigación que hace visibles el problema de programación, sus cotas y la calidad honesta de cada método, sobre instancias reales y sintéticas.',
          },
        ],
        figure: { caption: { en: 'What each number on these pages is, and what is deliberately left out.', es: 'Qué es cada número en estas páginas, y qué se deja fuera a propósito.' }, render: (lang) => <ScopeMap lang={lang} /> },
        limits: [
          { en: 'The schedules are heuristic; only the bounds and the controls are exact.', es: 'Los planes son heurísticos; solo las cotas y los controles son exactos.' },
          { en: 'Only newman1 is solved as published; kd and zuck_small carry declared scenarios because their scheduling files are not public.', es: 'Solo newman1 se resuelve tal como se publica; kd y zuck_small llevan escenarios declarados porque sus archivos de programación no son públicos.' },
          { en: 'The ensemble is synthetic geological uncertainty from a generator, not a conditional simulation.', es: 'El ensamble es incertidumbre geológica sintética de un generador, no una simulación condicional.' },
        ],
        refs: ['rezakhah2020a', 'rezakhah2020b', 'moreno2017', 'blom2024', 'ramazan2013', 'goodfellow2016'],
      },
    ],
  },
];
