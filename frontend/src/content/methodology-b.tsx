/**
 * Methodology, part two: building a schedule, the learned methods, and beyond CPIT. Transcribed from
 * the dossiers on the algorithms (TopoSort, local search, sliding window), on direct block scheduling
 * against nested shells, on destinations and stockpiles, and on uncertainty.
 */
import type { TopicGroup } from './doc.tsx';
import {
  DepositSplit, DestinationRecut, EnsembleFan, LocalSearch, Operability, ShellsAsWeights,
  SlidingWindow, StockpileBilinear, SurrogatePath, TopoSortWalk,
} from './figures/method.tsx';
import { LearnedStudyPanel, BoundSurrogatePanel } from './panels.tsx';

export const SCHEDULES: TopicGroup = {
  id: 'schedules',
  label: { en: 'From bound to plan', es: 'De la cota al plan' },
  topics: [
    {
      id: 'toposort',
      title: { en: 'TopoSort: greedy, Gershon, expected time', es: 'TopoSort: codicioso, Gershon, tiempo esperado' },
      paragraphs: [
        {
          en: 'A feasible extraction sequence is a topological order of the precedence graph: every block appears after all the blocks it needs. Given one, a schedule follows by walking it and giving each block the earliest period that is not before any of its predecessors and whose remaining capacities fit the block. Feasibility is by construction, so the whole quality of the method sits in the ORDER, and the order is produced by a weight: among the blocks whose predecessors are all placed, take the one with the highest weight next (Chicoisne et al., Algorithms 2 and 3). The walk is restricted to the ultimate pit, because a schedule never gains by mining outside it.',
          es: 'Una secuencia de extracción factible es un orden topológico del grafo de precedencias: cada bloque aparece después de todos los bloques que necesita. Dado uno, un plan se obtiene recorriéndolo y dando a cada bloque el período más temprano que no sea anterior a ninguno de sus predecesores y cuyas capacidades restantes admitan el bloque. La factibilidad es por construcción, así que toda la calidad del método está en el ORDEN, y el orden lo produce un peso: entre los bloques cuyos predecesores ya están ubicados, tomar el de mayor peso (Chicoisne et al., Algoritmos 2 y 3). El recorrido se restringe al pit final, porque un plan nunca gana extrayendo fuera de él.',
        },
        {
          en: 'Three published weights make the classical-to-state-of-the-art step. Greedy (GrTS) uses the block\'s own value: mine the most valuable available block first. Gershon (GeTS) uses the total value of every block that has b as a predecessor, the set of blocks b unlocks, each counted once. Expected time (ExTS) uses minus the expected extraction time read from the fractional LP solution, $E_b$, so the relaxation that certifies the bound also orders the plan. The published spread between them is the argument for computing the bound before scheduling: on AsiaMine with two resources, the same code reached 0.138 of the LP bound with greedy weights, 0.840 with Gershon\'s and 0.972 with expected times.',
          es: 'Tres pesos publicados forman el paso de lo clásico al estado del arte. El codicioso (GrTS) usa el valor del propio bloque: extraer primero el bloque disponible más valioso. Gershon (GeTS) usa el valor total de todo bloque que tiene a b como predecesor, el conjunto de bloques que b libera, cada uno contado una vez. El de tiempo esperado (ExTS) usa menos el tiempo esperado de extracción leído de la solución LP fraccionaria, $E_b$, de modo que la relajación que certifica la cota también ordena el plan. La diferencia publicada entre ellos es el argumento para calcular la cota antes de programar: en AsiaMine con dos recursos, el mismo código alcanzó 0,138 de la cota LP con pesos codiciosos, 0,840 con los de Gershon y 0,972 con tiempos esperados.',
        },
        {
          en: 'Gershon\'s weight is a set sum, and the definition matters in practice. Computed by adding each successor\'s already accumulated weight, a deep block reachable along $k$ precedence paths is counted $k$ times, and on a slope cone with five or nine arcs per block the number of paths grows geometrically with depth; the weight then measures path multiplicity, not value. Here the successor set of every block is built as a bitset in reverse topological order, so each block counts once, and a test compares it with the definition computed the slow way.',
          es: 'El peso de Gershon es una suma sobre un conjunto, y la definición importa en la práctica. Calculado sumando el peso ya acumulado de cada sucesor, un bloque profundo alcanzable por $k$ caminos de precedencia se cuenta $k$ veces, y en un cono de talud con cinco o nueve arcos por bloque el número de caminos crece geométricamente con la profundidad; el peso mide entonces multiplicidad de caminos, no valor. Aquí el conjunto sucesor de cada bloque se construye como un bitset en orden topológico inverso, de modo que cada bloque cuenta una vez, y una prueba lo compara con la definición calculada por el camino lento.',
        },
        {
          en: 'Even exact, Gershon\'s weight has a blind spot that the measurements below show: it rewards what a block unlocks and ignores what it costs to reach it. On a narrow vein, every block along the strike has the vein in its successor set, so the order opens the whole strike length at once and pays for its waste early. The expected time has no such blind spot, because it comes from a relaxation that already balances value, discounting and capacity; that is why it is the seed of every state-of-the-art rung here.',
          es: 'Aun exacto, el peso de Gershon tiene un punto ciego que muestran las mediciones de abajo: premia lo que un bloque libera e ignora lo que cuesta llegar a él. En una veta estrecha, todo bloque a lo largo del rumbo tiene la veta en su conjunto sucesor, de modo que el orden abre toda la longitud del rumbo de una vez y paga su estéril temprano. El tiempo esperado no tiene ese punto ciego, porque viene de una relajación que ya equilibra valor, descuento y capacidad; por eso es la semilla de todo peldaño del estado del arte aquí.',
        },
      ],
      equations: [
        { tex: String.raw`w^{\mathrm{Gr}}_b=p_b,\qquad w^{\mathrm{Ge}}_b=\sum_{a\in\mathcal B^{+}(b)}p_a,\qquad w^{\mathrm{Ex}}_b=-E_b`, caption: { en: 'The three published weights; B+(b) is the set of every block that has b as a predecessor', es: 'Los tres pesos publicados; B+(b) es el conjunto de todo bloque que tiene a b como predecesor' } },
        { tex: String.raw`E_b=\sum_{t=1}^{T}t\,\bigl(x^{*}_{bt}-x^{*}_{b,t-1}\bigr)+(T+1)\bigl(1-x^{*}_{bT}\bigr)`, caption: { en: 'Expected extraction time from the fractional LP solution; a block never mined counts T + 1', es: 'Tiempo esperado de extracción desde la solución LP fraccionaria; un bloque nunca extraído cuenta T + 1' } },
      ],
      table: {
        head: [
          { en: 'instance, fraction of the bound', es: 'instancia, fracción de la cota' },
          { en: 'greedy', es: 'codicioso' },
          { en: 'Gershon', es: 'Gershon' },
          { en: 'expected time', es: 'tiempo esperado' },
        ],
        rows: [
          [{ en: 'AsiaMine, R = 2 (Chicoisne et al., Table 4)', es: 'AsiaMine, R = 2 (Chicoisne et al., Tabla 4)' }, '0.138', '0.840', '0.972'],
          [{ en: 'Andina, R = 2 (Table 4)', es: 'Andina, R = 2 (Tabla 4)' }, '0.487', '0.509', '0.953'],
          [{ en: 'Marvin, R = 1 (Table 3)', es: 'Marvin, R = 1 (Tabla 3)' }, '0.856', '0.867', '0.957'],
          [{ en: 'porphyry twin, 10 periods, R = 2 (measured here)', es: 'gemelo pórfido, 10 períodos, R = 2 (medido aquí)' }, '0.556', '0.810', '0.884'],
          [{ en: 'core-halo twin (measured here)', es: 'gemelo núcleo-halo (medido aquí)' }, '0.136', '0.779', '0.715'],
          [{ en: 'layered twin (measured here)', es: 'gemelo estratificado (medido aquí)' }, '0.857', '0.830', '0.969'],
          [{ en: 'vein twin (measured here)', es: 'gemelo veta (medido aquí)' }, '0.762', '0.174', '0.903'],
        ],
      },
      figure: { caption: { en: 'The walk: order by weight, then the earliest feasible period.', es: 'El recorrido: ordenar por peso, luego el período factible más temprano.' }, render: (lang) => <TopoSortWalk lang={lang} /> },
      facts: [
        { k: { en: 'Cost', es: 'Costo' }, v: { en: 'one heap walk plus a capacity scan; ExTS also needs the bound', es: 'un recorrido con montículo más una revisión de capacidad; ExTS además necesita la cota' } },
        { k: { en: 'Ties', es: 'Empates' }, v: { en: 'broken by block id, so the order is deterministic', es: 'se rompen por id de bloque, el orden es determinista' } },
        { k: { en: 'Gershon', es: 'Gershon' }, v: { en: 'successor SET as bitsets; each block once', es: 'CONJUNTO sucesor como bitsets; cada bloque una vez' } },
      ],
      limits: [
        { en: 'A block whose capacity never fits stays unmined, together with everything below it.', es: 'Un bloque cuya capacidad nunca alcanza queda sin extraer, junto con todo lo que está bajo él.' },
        { en: 'The twin measurements are four seeded deposits at 30 x 30 x 16 (porphyry 24 x 24 x 12), against the Algorithm 4 bound.', es: 'Las mediciones en gemelos son cuatro depósitos sembrados de 30 x 30 x 16 (pórfido 24 x 24 x 12), contra la cota del Algoritmo 4.' },
      ],
      refs: ['chicoisne2012', 'gershon1987'],
    },
    {
      id: 'classical',
      title: { en: 'The classical floor: benches and nested shells', es: 'El piso clásico: bancos y cáscaras anidadas' },
      paragraphs: [
        {
          en: 'Two classical rungs give the ladder a floor that a planner would recognise. Bench by bench mines the top bench out completely before touching the next: its weight is the level, so the topological order is a strict descent through the benches. It is what a schedule degenerates to when nobody optimises, and its gap is the number every other rung implicitly claims to improve on.',
          es: 'Dos peldaños clásicos dan a la escalera un piso que un planificador reconocería. Banco a banco extrae el banco superior completo antes de tocar el siguiente: su peso es el nivel, de modo que el orden topológico es un descenso estricto por los bancos. Es aquello en que degenera un plan cuando nadie optimiza, y su brecha es el número que todo otro peldaño afirma implícitamente mejorar.',
        },
        {
          en: 'Nested shells is the industrial four-step chain collapsed into a weight. The ultimate pit is solved for twelve descending revenue factors from 1.0 to 0.35; a lower price can only shrink the optimal pit (Lerchs and Grossmann; Matheron), so the pits nest, and a block\'s shell is the smallest revenue factor at which it is still in the pit. Mining inner shells first is the pushback order. Each solve runs inside the previous pit, so the twelve closures cost little more than one.',
          es: 'Cáscaras anidadas es la cadena industrial de cuatro pasos plegada en un peso. El pit final se resuelve para doce factores de ingreso decrecientes de 1,0 a 0,35; un precio menor solo puede achicar el pit óptimo (Lerchs y Grossmann; Matheron), de modo que los pits se anidan, y la cáscara de un bloque es el menor factor de ingreso con el que sigue en el pit. Extraer primero las cáscaras internas es el orden de expansiones. Cada resolución corre dentro del pit anterior, así que los doce cierres cuestan poco más que uno.',
        },
        {
          en: 'This is the most favourable reading of the classical method: every shell is taken in order, with no manual pushback selection and no smoothing, and capacity is respected by the same walk the other rungs use. In practice, as Morales et al. record, the pushback choice is a planner\'s, and so is meeting the capacities. A baseline built favourably is the right one to beat; a weak straw man would flatter every rung above it.',
          es: 'Esta es la lectura más favorable del método clásico: cada cáscara se toma en orden, sin selección manual de expansiones y sin suavizado, y la capacidad se respeta con el mismo recorrido que usan los demás peldaños. En la práctica, como registran Morales et al., la elección de expansiones es del planificador, y también el cumplimiento de las capacidades. Una base construida de manera favorable es la correcta para superar; un hombre de paja débil favorecería a todo peldaño sobre él.',
        },
        {
          en: 'Meagher, Dimitrakopoulos and Avis explain why the shell order caps what a schedule can reach: pit sizes jump between revenue factors, a shell can be several disconnected pieces, and discounting plays no part in designing the shells. Their conclusion is that a truly optimal schedule cannot come from sub-optimally designed pushbacks, and the distance between this rung and the expected-time rungs on each case is that statement, measured.',
          es: 'Meagher, Dimitrakopoulos y Avis explican por qué el orden de cáscaras limita lo que un plan puede alcanzar: el tamaño del pit salta entre factores de ingreso, una cáscara puede ser varios trozos desconectados, y el descuento no tiene ningún papel en el diseño de las cáscaras. Su conclusión es que un plan verdaderamente óptimo no puede salir de expansiones diseñadas de manera subóptima, y la distancia entre este peldaño y los de tiempo esperado en cada caso es esa afirmación, medida.',
        },
      ],
      equations: [
        { tex: String.raw`P(\rho)=\arg\max_{x\ \text{closed}}\ \sum_b\bigl(\rho\,p_b^{+}+p_b^{-}\bigr)x_b,\qquad \rho_1>\rho_2\ \Rightarrow\ P(\rho_2)\subseteq P(\rho_1)`, caption: { en: 'Revenue factor rho scales the positive values; lower factors give nested, smaller pits', es: 'El factor rho escala los valores positivos; factores menores dan pits anidados más pequeños' } },
        { tex: String.raw`w^{\text{shell}}_b=-\min\{k:\ b\in P(\rho_k)\},\qquad w^{\text{bench}}_b=\text{level}_b`, caption: { en: 'The two classical weights, walked by the same TopoSort', es: 'Los dos pesos clásicos, recorridos por el mismo TopoSort' } },
      ],
      figure: { caption: { en: 'Nested pits by revenue factor: the shells that become the pushback order.', es: 'Pits anidados por factor de ingreso: las cáscaras que se vuelven el orden de expansiones.' }, render: (lang) => <ShellsAsWeights lang={lang} /> },
      facts: [
        { k: { en: 'Revenue factors', es: 'Factores de ingreso' }, v: { en: '12, from 1.0 to 0.35', es: '12, de 1,0 a 0,35' } },
        { k: { en: 'Reading', es: 'Lectura' }, v: { en: 'the most favourable: every shell, no manual step', es: 'la más favorable: cada cáscara, sin paso manual' } },
        { k: { en: 'Role', es: 'Rol' }, v: { en: 'the floor the state-of-the-art rungs must beat', es: 'el piso que deben superar los peldaños del estado del arte' } },
      ],
      limits: [
        { en: 'Bench-phases and pushback smoothing are not modelled; a real classical plan involves a planner\'s choices that a weight cannot represent.', es: 'Las fases-banco y el suavizado de expansiones no se modelan; un plan clásico real incluye elecciones de un planificador que un peso no puede representar.' },
      ],
      refs: ['lerchs1965', 'chicoisne2012', 'morales2015', 'meagher2014'],
    },
    {
      id: 'sliding',
      title: { en: 'The sliding time window', es: 'La ventana de tiempo deslizante' },
      paragraphs: [
        {
          en: 'Cullenbine, Wood and Newman schedule a mine by enforcing every constraint exactly inside a short window of periods, treating the rest of the horizon as an aggregated tail, fixing only the first period of the answer, and sliding one period forward. It is the heuristic industrial platforms run: Blom, Pearce and Cote describe Rio Tinto\'s system seeding its large neighbourhood search with it. What makes it a look-ahead is that the window is solved JOINTLY, so a block worth taking in period one only because of what it unlocks in period three is visible to the solver.',
          es: 'Cullenbine, Wood y Newman programan una mina imponiendo exactamente toda restricción dentro de una ventana corta de períodos, tratando el resto del horizonte como una cola agregada, fijando solo el primer período de la respuesta y deslizándose un período. Es la heurística que corren las plataformas industriales: Blom, Pearce y Cote describen el sistema de Rio Tinto sembrando con ella su búsqueda de vecindario grande. Lo que la hace anticipatoria es que la ventana se resuelve en CONJUNTO, de modo que un bloque que conviene tomar en el período uno solo por lo que libera en el período tres es visible para el solver.',
        },
        {
          en: 'Each slide is a mixed-integer program in cumulative variables, solved with HiGHS: $y_{ij}$ equals one when candidate $i$ is mined by the end of slot $j$, the slots being the window\'s periods plus one tail slot. The tail\'s capacity is the total of the remaining periods and its discount factor that of its first period, which over-values tail production; that is the standard optimistic relaxation for this heuristic, and it keeps the tail from dominating while still telling the window a horizon exists. Precedence and monotonicity are two-entry rows; blocks fixed on earlier slides impose floors.',
          es: 'Cada paso es un programa entero mixto en variables acumuladas, resuelto con HiGHS: $y_{ij}$ vale uno cuando el candidato $i$ fue extraído al final del intervalo $j$, siendo los intervalos los períodos de la ventana más un intervalo de cola. La capacidad de la cola es el total de los períodos restantes y su factor de descuento el de su primer período, lo que sobrevalora la producción de cola; esa es la relajación optimista estándar para esta heurística, y evita que la cola domine sin dejar de decirle a la ventana que existe un horizonte. Precedencia y monotonía son filas de dos términos; los bloques fijados en pasos anteriores imponen pisos.',
        },
        {
          en: 'The published method solves the full model per window. Without a commercial solver the window works on a candidate set, and the choice of that set is the approximation this product makes: the undecided blocks ordered by the LP expected extraction time, taken from the front until their tonnage covers 1.6 times the window\'s capacity. Because the relaxation is closed in every period, E_a is at most E_b on every arc, so that prefix is closed under precedence; a test asserts the inequality, and the closure is still completed explicitly so that ties cannot block a candidate. Blocks outside the set are not forbidden; they are decided on a later slide.',
          es: 'El método publicado resuelve el modelo completo por ventana. Sin un solver comercial la ventana trabaja sobre un conjunto de candidatos, y la elección de ese conjunto es la aproximación que hace este producto: los bloques no decididos ordenados por el tiempo esperado de extracción de la LP, tomados desde el frente hasta que su tonelaje cubre 1,6 veces la capacidad de la ventana. Como la relajación es cerrada en cada período, $E_a\le E_b$ en todo arco, de modo que ese prefijo es cerrado bajo precedencia; una prueba verifica la desigualdad, y la clausura igual se completa explícitamente para que un empate no bloquee a un candidato. Los bloques fuera del conjunto no quedan prohibidos; se deciden en un paso posterior.',
        },
        {
          en: 'The candidate set used to have to cover the whole remaining horizon as well, ordered by value density; on real-size cases that asked for thousands of blocks and the method declined to run rather than return a starved plan. Sized by the window and ordered by the relaxation, it runs on every case, and it is where the look-ahead pays: the benchmark shows it ahead of every rounding and local search on most of the matrix. Its cost is the price of that: minutes to two hours per case on one core, against seconds for the rounding.',
          es: 'El conjunto de candidatos tenía que cubrir además todo el horizonte restante, ordenado por densidad de valor; en casos de tamaño real eso pedía miles de bloques y el método se negaba a correr en vez de devolver un plan famélico. Dimensionado por la ventana y ordenado por la relajación, corre en todos los casos, y es donde la anticipación rinde: la comparación lo muestra por delante de todo redondeo y búsqueda local en la mayor parte de la matriz. Su costo es el precio de eso: de minutos a dos horas por caso en un núcleo, contra segundos para el redondeo.',
        },
      ],
      equations: [
        { tex: String.raw`\max\sum_{i}\sum_{j}p_i\bigl(\delta_{j}-\delta_{j+1}\bigr)\,y_{ij}\ \ \text{s.t.}\ \ y_{ij}\le y_{i,j+1},\ \ y_{ij}\le y_{a j},\ \ \sum_i a_{ri}\bigl(y_{ij}-y_{i,j-1}\bigr)\le c^{\text{win}}_{rj}`, caption: { en: 'One slide: cumulative binaries over the window slots and the tail; delta is the discount factor of each slot', es: 'Un paso: binarios acumulados sobre los intervalos de la ventana y la cola; delta es el factor de descuento de cada intervalo' } },
        { tex: String.raw`\mathcal C=\Bigl\{\text{first blocks by }E_b\ \text{until}\ \sum_{i\in\mathcal C}a_{0i}\ge 1.6\sum_{t\in\text{window}}c_{0t}\Bigr\}`, caption: { en: 'The candidate set: the LP\'s own guess of what the window will mine', es: 'El conjunto de candidatos: la propia estimación de la LP de lo que extraerá la ventana' } },
      ],
      figure: { caption: { en: 'Three periods solved jointly with an aggregated tail; only the first is kept; slide.', es: 'Tres períodos resueltos en conjunto con una cola agregada; solo el primero se conserva; deslizar.' }, render: (lang) => <SlidingWindow lang={lang} />, wide: true },
      facts: [
        { k: { en: 'Window', es: 'Ventana' }, v: { en: '3 periods, 1 fixed per slide, plus a tail', es: '3 períodos, 1 fijado por paso, más una cola' } },
        { k: { en: 'Solver', es: 'Solver' }, v: { en: 'HiGHS MILP, relative gap 3 percent, no wall-clock limit', es: 'MILP HiGHS, brecha relativa 3 por ciento, sin límite de reloj' } },
        { k: { en: 'Candidates', es: 'Candidatos' }, v: { en: 'LP-ordered closed prefix, 1.6 window capacities, at most 6,000', es: 'prefijo cerrado ordenado por la LP, 1,6 capacidades de ventana, a lo más 6.000' } },
      ],
      limits: [
        { en: 'The tail is optimistic by design; the window does not see the true capacity of later periods.', es: 'La cola es optimista por diseño; la ventana no ve la capacidad real de los períodos posteriores.' },
        { en: 'The candidate set is an approximation of the published full-model window.', es: 'El conjunto de candidatos es una aproximación de la ventana de modelo completo publicada.' },
      ],
      refs: ['cullenbine2011', 'blom2024', 'huangfu2018', 'chicoisne2012'],
    },
    {
      id: 'local',
      title: { en: 'Local search: shifts and exact neighbourhoods', es: 'Búsqueda local: desplazamientos y vecindarios exactos' },
      paragraphs: [
        {
          en: 'A rounding produces a feasible plan; local search is what closes the remaining distance, and which neighbourhood is searched decides how much closes. The shift neighbourhood moves one block at a time: a positive block moves to an earlier period when its predecessors are already there and the capacity allows, a negative block moves later when its successors allow. Under discounting both moves strictly improve and keep the plan feasible, so the objective is monotone. It is the shift family of the mine-scheduling metaheuristic literature (Lamghari and Dimitrakopoulos).',
          es: 'Un redondeo produce un plan factible; la búsqueda local es lo que cierra la distancia restante, y qué vecindario se explora decide cuánto se cierra. El vecindario de desplazamiento mueve un bloque a la vez: un bloque positivo pasa a un período anterior cuando sus predecesores ya están ahí y la capacidad lo permite, un bloque negativo pasa a uno posterior cuando sus sucesores lo permiten. Bajo descuento ambos movimientos mejoran estrictamente y mantienen la factibilidad, de modo que el objetivo es monótono. Es la familia de desplazamiento de la literatura de metaheurísticas de programación minera (Lamghari y Dimitrakopoulos).',
        },
        {
          en: 'What a shift cannot do is move a block together with its cone. A block worth pulling forward whose predecessors are not yet clear is invisible to it, and that is where the remaining value usually is. Chicoisne et al. section 3.3 define the exact restricted re-solve, C-PIT[D]: fix every block outside a set $D$ at its current period, and solve the restricted problem exactly. $D$ is built in one of three ways with equal probability: a random scheduled block and a connected set of its predecessors, the same with successors, or the blocks scheduled in three consecutive periods around a random block.',
          es: 'Lo que un desplazamiento no puede hacer es mover un bloque junto con su cono. Un bloque que convendría adelantar cuyos predecesores aún no están libres le resulta invisible, y es ahí donde suele estar el valor restante. Chicoisne et al., sección 3.3, definen la re-resolución exacta restringida, C-PIT[D]: fijar todo bloque fuera de un conjunto $D$ en su período actual y resolver exactamente el problema restringido. $D$ se construye de una de tres maneras con igual probabilidad: un bloque programado al azar y un conjunto conexo de sus predecesores, lo mismo con sucesores, o los bloques programados en tres períodos consecutivos alrededor de un bloque al azar.',
        },
        {
          en: 'The restricted model carries the real constraints of the whole plan. The capacity used by fixed blocks is subtracted from each period; a fixed predecessor imposes a floor on when a free block may be mined, and a fixed successor imposes a ceiling. Getting either direction wrong produces a plan that mines a block before the rock above it and still passes a value check. Every accepted re-solve is a proven improvement of the restricted problem, so the objective is again monotone. The authors measured their heuristic at 0.937 to 0.986 of the bound before local search and 0.955 to 0.997 after an hour of it.',
          es: 'El modelo restringido lleva las restricciones reales de todo el plan. La capacidad que usan los bloques fijos se descuenta de cada período; un predecesor fijo impone un piso a cuándo puede extraerse un bloque libre, y un sucesor fijo impone un techo. Equivocar cualquiera de las dos direcciones produce un plan que extrae un bloque antes de la roca sobre él y que igual pasa un control de valor. Toda re-resolución aceptada es una mejora demostrada del problema restringido, de modo que el objetivo es otra vez monótono. Los autores midieron su heurística en 0,937 a 0,986 de la cota antes de la búsqueda local y 0,955 a 0,997 después de una hora de ella.',
        },
        {
          en: 'Both searches start from the same rounding, ExTS on the Algorithm 4 relaxations, and the exact one from the shift plan, so the ladder shows what each neighbourhood adds to that plan. Neither starts from the sliding window\'s plan: where the window leads, by several points on most cases, that distance is the look-ahead a neighbourhood of 180 blocks does not have. The operability rung smooths whichever comparable plan is best, which on most cases is the window\'s.',
          es: 'Las dos búsquedas parten del mismo redondeo, ExTS sobre las relajaciones del Algoritmo 4, y la exacta desde el plan de desplazamiento, de modo que la escalera muestra lo que cada vecindario agrega a ese plan. Ninguna parte del plan de la ventana deslizante: donde la ventana lidera, por varios puntos en la mayoría de los casos, esa distancia es la anticipación que un vecindario de 180 bloques no tiene. El peldaño de operabilidad suaviza el plan comparable que sea mejor, que en la mayoría de los casos es el de la ventana.',
        },
        {
          en: 'Each re-solve stops on a relative MIP gap and never on a wall-clock limit. A time limit makes the answer depend on the machine and its load, and a bake whose artifacts are evidence must be reproducible from its inputs and seed; a relative gap is a property of the problem and stops in the same place everywhere.',
          es: 'Cada re-resolución se detiene en una brecha MIP relativa y nunca en un límite de reloj. Un límite de tiempo hace que la respuesta dependa de la máquina y de su carga, y un horneado cuyos artefactos son evidencia debe ser reproducible desde sus entradas y su semilla; una brecha relativa es una propiedad del problema y se detiene en el mismo lugar en todas partes.',
        },
      ],
      equations: [
        { tex: String.raw`\max\sum_{i\in D}\sum_t p_i\bigl(d_t-d_{t+1}\bigr)y_{it}\ \ \text{s.t.}\ \ \sum_{i\in D}a_{ri}\bigl(y_{it}-y_{i,t-1}\bigr)\le c_{rt}-\sum_{b\notin D}a_{rb}\,[\tau_b=t]`, caption: { en: 'C-PIT[D]: the free blocks over the capacity the fixed blocks leave', es: 'C-PIT[D]: los bloques libres sobre la capacidad que dejan los bloques fijos' } },
        { tex: String.raw`y_{it}=0\ \ \forall t<\tau_a\ \ (a\notin D\ \text{predecessor}),\qquad y_{i,\tau_c}=1\ \ (c\notin D\ \text{successor})`, caption: { en: 'Floors from fixed predecessors, ceilings from fixed successors; tau is a fixed block\'s period', es: 'Pisos desde predecesores fijos, techos desde sucesores fijos; tau es el período de un bloque fijo' } },
      ],
      figure: { caption: { en: 'A neighbourhood re-solved exactly, and the one-block shift moves.', es: 'Un vecindario re-resuelto de manera exacta, y los movimientos de desplazamiento de un bloque.' }, render: (lang) => <LocalSearch lang={lang} /> },
      facts: [
        { k: { en: 'Shift', es: 'Desplazamiento' }, v: { en: 'up to 12 passes, no solver', es: 'hasta 12 pasadas, sin solver' } },
        { k: { en: 'C-PIT[D]', es: 'C-PIT[D]' }, v: { en: 'D up to 180 blocks, 16 rounds (10 above 8,000 blocks), seed 11', es: 'D hasta 180 bloques, 16 rondas (10 sobre 8.000 bloques), semilla 11' } },
        { k: { en: 'Stop', es: 'Parada' }, v: { en: 'relative MIP gap 1e-4, no time limit', es: 'brecha MIP relativa 1e-4, sin límite de tiempo' } },
      ],
      limits: [
        { en: 'A local optimum of a neighbourhood, not of the problem.', es: 'Un óptimo local de un vecindario, no del problema.' },
        { en: 'The exact search is not seeded from the sliding window\'s plan; what it would add there is not measured in this release.', es: 'La búsqueda exacta no se siembra desde el plan de la ventana deslizante; lo que agregaría ahí no está medido en esta versión.' },
        { en: 'The published runs used CPLEX for an hour on neighbourhoods of up to 3,250 blocks; here the neighbourhoods are smaller and the rounds few.', es: 'Las corridas publicadas usaron CPLEX una hora sobre vecindarios de hasta 3.250 bloques; aquí los vecindarios son menores y las rondas pocas.' },
      ],
      refs: ['chicoisne2012', 'lamghari2012', 'huangfu2018'],
    },
  ],
};

export const LEARNED: TopicGroup = {
  id: 'learned',
  label: { en: 'Learned methods', es: 'Métodos aprendidos' },
  topics: [
    {
      id: 'expected-time',
      title: { en: 'The expected-time surrogate', es: 'El sustituto del tiempo esperado' },
      paragraphs: [
        {
          en: 'The best rounding needs the LP relaxation first, because its weight is the relaxation\'s expected extraction time; that relaxation is tens of maximum closures, and in the browser it is 0.9 to 3.6 seconds per change on the larger cases. The surrogate predicts each block\'s expected extraction time, as a fraction of the horizon, from eleven features a block and a scenario carry: its value and grade, its depth, the size and value of the cone above it, its distance from the centre, whether it is in the ultimate pit, the discount rate, the two capacity fractions and the number of periods. The plan is the same TopoSort walk with the predicted weight, and it costs one forward pass.',
          es: 'El mejor redondeo necesita primero la relajación LP, porque su peso es el tiempo esperado de extracción de la relajación; esa relajación son decenas de cierres máximos, y en el navegador son 0,9 a 3,6 segundos por cambio en los casos mayores. El sustituto predice el tiempo esperado de extracción de cada bloque, como fracción del horizonte, a partir de once rasgos que traen un bloque y un escenario: su valor y ley, su profundidad, el tamaño y valor del cono sobre él, su distancia al centro, si está en el pit final, la tasa de descuento, las dos fracciones de capacidad y el número de períodos. El plan es el mismo recorrido TopoSort con el peso predicho, y cuesta una pasada hacia adelante.',
        },
        {
          en: 'The model is a multilayer perceptron with two hidden layers of 48 and 24 ReLU units and a sigmoid output, trained with explicit Adam on a squared loss. The training target is the expected time of the tightest single-resource relaxation, the one the product\'s ExTS rung schedules from. The sweep crosses nine scenarios (horizons of 6 to 12 periods, rates of 5 to 20 percent, capacity fractions crossed rather than tied to the rate) over four deposit archetypes, at two grid sizes, 12 x 12 x 7 and 24 x 24 x 12, because a model trained only on small deposits is used on large ones.',
          es: 'El modelo es un perceptrón multicapa con dos capas ocultas de 48 y 24 unidades ReLU y una salida sigmoide, entrenado con Adam explícito sobre una pérdida cuadrática. El objetivo de entrenamiento es el tiempo esperado de la relajación de un recurso más ajustada, la misma desde la que programa el peldaño ExTS del producto. El barrido cruza nueve escenarios (horizontes de 6 a 12 períodos, tasas de 5 a 20 por ciento, fracciones de capacidad cruzadas en vez de atadas a la tasa) sobre cuatro arquetipos de depósito, en dos tamaños de grilla, 12 x 12 x 7 y 24 x 24 x 12, porque un modelo entrenado solo en depósitos pequeños se usa en grandes.',
        },
        {
          en: 'The split is by deposit, never by row. Two scenarios of one deposit share almost every block feature, so a row split would let the model score itself on a copy of what it memorised. Twelve generator seeds train, six disjoint seeds are held out, and a third set of six seeds measures the guard that was chosen on the first two; the scripts assert the sets are disjoint. The score that decides usefulness is not the error of the prediction but the value of the plan it produces against the plan the true times produce, on deposits it never saw, reported as a median, a tenth percentile and a minimum.',
          es: 'La partición es por depósito, nunca por fila. Dos escenarios de un depósito comparten casi todos los rasgos de bloque, de modo que una partición por filas dejaría al modelo juzgarse sobre una copia de lo que memorizó. Doce semillas del generador entrenan, seis semillas disjuntas quedan retenidas y un tercer conjunto de seis semillas mide la guarda elegida con los dos primeros; los scripts verifican que los conjuntos son disjuntos. La medida que decide la utilidad no es el error de la predicción sino el valor del plan que produce contra el plan que producen los tiempos verdaderos, en depósitos que nunca vio, reportado como mediana, décimo percentil y mínimo.',
        },
        {
          en: 'In the product the surrogate has one job: the instant plan. When a control moves in the focus view, the learned plan is drawn within about a tenth of a second while the exact bound and plans are computed in parallel; when they arrive, the learned plan is scored against the exact ExTS plan of the same setting and the share is shown. In the offline ladder it is a rung like the others, and the measured ratio to the exact plan is recorded per case. It certifies nothing: the bound always comes from the exact path.',
          es: 'En el producto el sustituto tiene una tarea: el plan instantáneo. Cuando se mueve un control en la vista de foco, el plan aprendido aparece en cerca de una décima de segundo mientras la cota y los planes exactos se calculan en paralelo; cuando llegan, el plan aprendido se juzga contra el plan ExTS exacto del mismo escenario y se muestra la fracción. En la escalera offline es un peldaño como los demás, y la razón medida al plan exacto se registra por caso. No certifica nada: la cota siempre viene del camino exacto.',
        },
      ],
      equations: [
        { tex: String.raw`\hat E_b=(T+1)\,\sigma\!\Bigl(W_3\,\mathrm{ReLU}\bigl(W_2\,\mathrm{ReLU}(W_1\tilde f_b+b_1)+b_2\bigr)+b_3\Bigr),\qquad \tilde f_b=\frac{f_b-\mu}{s}`, caption: { en: 'The surrogate: standardised block features through two ReLU layers and a sigmoid head', es: 'El sustituto: rasgos de bloque estandarizados por dos capas ReLU y una salida sigmoide' } },
        { tex: String.raw`\text{share}=\frac{\mathrm{NPV}\bigl(\text{TopoSort}(-\hat E)\bigr)}{\mathrm{NPV}\bigl(\text{TopoSort}(-E)\bigr)}`, caption: { en: 'The score that matters: the learned plan against the exact ExTS plan, per held-out case', es: 'La medida que importa: el plan aprendido contra el plan ExTS exacto, por caso retenido' } },
      ],
      figure: { caption: { en: 'Two paths to the same walk: the exact relaxation and the surrogate.', es: 'Dos caminos al mismo recorrido: la relajación exacta y el sustituto.' }, render: (lang) => <SurrogatePath lang={lang} /> },
      data: (lang) => <LearnedStudyPanel lang={lang} />,
      limits: [
        { en: 'Trained on seeded synthetic archetypes; a real deposit is outside that distribution and its share can only be measured, not predicted.', es: 'Entrenado sobre arquetipos sintéticos sembrados; un depósito real está fuera de esa distribución y su fracción solo se puede medir, no predecir.' },
        { en: 'The guard against failure is an orebody rule that a real deposit cannot be labelled with; where the exact plan exists the measured share replaces it.', es: 'La guarda contra fallas es una regla sobre el cuerpo mineralizado con la que no se puede rotular un depósito real; donde existe el plan exacto, la fracción medida la reemplaza.' },
      ],
      refs: ['chicoisne2012', 'kingma2015'],
    },
    {
      id: 'bound-surrogate',
      title: { en: 'The bound surrogate and the sensitivity surface', es: 'El sustituto de la cota y la superficie de sensibilidad' },
      paragraphs: [
        {
          en: 'The second model predicts the certified bound as a fraction of the ultimate-pit value, from eleven summary statistics of a deposit (its size, the fraction of blocks and of value in the pit, the mean and 90th-percentile grade, the ore fraction and the strip ratio) and the scenario (rate, two capacity fractions, horizon). Its use is the sensitivity surface: the bound over a grid of discount rates and plant capacities is a few hundred maximum closures per point, which is fine once and impossible across a grid, and one forward pass per cell draws the whole plane.',
          es: 'El segundo modelo predice la cota certificada como fracción del valor del pit final, a partir de once estadísticos resumen de un depósito (su tamaño, la fracción de bloques y de valor en el pit, la ley media y del percentil 90, la fracción de mineral y la razón estéril-mineral) y del escenario (tasa, dos fracciones de capacidad, horizonte). Su uso es la superficie de sensibilidad: la cota sobre una grilla de tasas de descuento y capacidades de planta son unos cientos de cierres máximos por punto, lo que está bien una vez e imposible en una grilla, y una pasada hacia adelante por celda dibuja el plano completo.',
        },
        {
          en: 'The surface is anchored: the exact certified bound at the case\'s own point is drawn on top of it, so the plane is always tied to at least one true value, and the held-out error is shown beside it. An error metric is not enough, though. The first version of this model scored a low mean error and predicted the bound falling as capacity rose, which an LP bound cannot do; its training sweep had moved rate and capacity together, and it had learned one as a proxy for the other.',
          es: 'La superficie está anclada: la cota certificada exacta en el punto del propio caso se dibuja sobre ella, de modo que el plano siempre queda atado a al menos un valor verdadero, y el error retenido se muestra al lado. Una métrica de error no basta, de todos modos. La primera versión de este modelo tuvo un error medio bajo y predecía la cota bajando al subir la capacidad, lo que una cota LP no puede hacer; su barrido de entrenamiento había movido tasa y capacidad juntas, y había aprendido una como sustituto de la otra.',
        },
        {
          en: 'So the physics is checked before the model may draw anything. For every held-out deposit, the prediction is swept along one axis with everything else held: more capacity must not lower the bound and a higher discount rate must not raise it. The rates at which those directions hold are part of the model\'s metrics, and the panel refuses to draw a plane from a model that breaks them. The crossed sweep is what made the directions learnable.',
          es: 'Por eso la física se verifica antes de que el modelo pueda dibujar algo. Para cada depósito retenido, la predicción se barre sobre un eje con todo lo demás fijo: más capacidad no debe bajar la cota y una tasa de descuento mayor no debe subirla. Las tasas con que se cumplen esas direcciones son parte de las métricas del modelo, y el panel se niega a dibujar un plano con un modelo que las rompe. El barrido cruzado es lo que hizo aprendibles esas direcciones.',
        },
        {
          en: 'In the browser the model runs as a plain forward pass, held to outputs the Python model wrote by a parity test, so the surface is drawn by the function that was trained and scored and not by a re-implementation of it.',
          es: 'En el navegador el modelo corre como una pasada hacia adelante simple, sujeta por una prueba de paridad a salidas que escribió el modelo en Python, de modo que la superficie la dibuja la función que se entrenó y se midió y no una reimplementación de ella.',
        },
      ],
      equations: [
        { tex: String.raw`\hat\beta(s)=\sigma\bigl(\mathrm{MLP}(g_{\text{deposit}},\eta,f_0,f_1,T)\bigr)\approx\frac{Z^{\text{bound}}(s)}{Z^{\text{UPIT}}}`, caption: { en: 'The bound as a fraction of the ultimate-pit value, from deposit statistics and the scenario', es: 'La cota como fracción del valor del pit final, desde estadísticos del depósito y el escenario' } },
        { tex: String.raw`\frac{\partial\hat\beta}{\partial f_1}\ge 0,\qquad \frac{\partial\hat\beta}{\partial\eta}\le 0`, caption: { en: 'The two directions an LP bound obeys, checked on every held-out deposit', es: 'Las dos direcciones que cumple una cota LP, verificadas en cada depósito retenido' } },
      ],
      figure: { caption: { en: 'The same deposit split; the bound surrogate is held to the same discipline.', es: 'La misma partición por depósito; el sustituto de la cota se rige por la misma disciplina.' }, render: (lang) => <DepositSplit lang={lang} /> },
      data: (lang) => <BoundSurrogatePanel lang={lang} />,
      limits: [
        { en: 'Exploratory: away from the anchor the surface is a prediction with the error shown, not a bound.', es: 'Exploratoria: lejos del ancla la superficie es una predicción con su error, no una cota.' },
        { en: 'It uses tonnage with positive net value as the plant-tonnage proxy.', es: 'Usa el tonelaje con valor neto positivo como sustituto del tonelaje a planta.' },
      ],
      refs: ['chicoisne2012', 'kingma2015'],
    },
  ],
};

export const BEYOND: TopicGroup = {
  id: 'beyond',
  label: { en: 'Beyond CPIT', es: 'Más allá de CPIT' },
  topics: [
    {
      id: 'destinations',
      title: { en: 'Choosing destinations: the re-cut', es: 'Elegir destinos: el re-corte' },
      paragraphs: [
        {
          en: 'When the plant binds, the destination decision is a decision about which ore gets the plant. A rule that compares a block\'s two values cannot make it: a marginal ore block has a positive plant value and a negative dump value, so the comparison always sends it to the plant, and the plant tonnage it takes is gone for the richer ore below it. Lane\'s cutoff theory (The Economic Definition of Ore, 1988) names what is missing: with the mill as the bottleneck the cutoff rises above break-even by the opportunity cost of the mill, and with the fleet as the bottleneck it stays at break-even, because ore and waste consume a mining hour alike. The opportunity cost is a price on the plant capacity, and the PCPSP relaxation is what computes it.',
          es: 'Cuando la planta limita, la decisión de destino es una decisión sobre qué mineral recibe la planta. Una regla que compara los dos valores de un bloque no puede tomarla: un bloque de mineral marginal tiene valor de planta positivo y valor de botadero negativo, de modo que la comparación siempre lo envía a planta, y el tonelaje de planta que toma se pierde para el mineral más rico bajo él. La teoría de ley de corte de Lane (The Economic Definition of Ore, 1988) nombra lo que falta: con la planta como cuello de botella la ley de corte sube sobre el equilibrio en el costo de oportunidad de la planta, y con la flota como cuello de botella se queda en el equilibrio, porque mineral y estéril consumen igual una hora de mina. El costo de oportunidad es un precio sobre la capacidad de planta, y es la relajación PCPSP la que lo calcula.',
        },
        {
          en: 'So the destination plans are built the way the best CPIT plans are, from the relaxation. The PCPSP LP is solved, by HiGHS up to 1.1 million rows and through its Lagrangian dual above that, and its solution is read: each block goes to the destination the LP sends most of it to. Fixing those destinations gives a CPIT whose values and resource coefficients are those of the chosen destinations, so every plan of it is a plan of the original PCPSP with the same value. That re-cut CPIT is scheduled by the full CPIT machinery: its own critical-multiplier relaxations seed ExTS (destination-toposort) and the sliding window (destination-sliding-window). Finally the exact OPBSP-[D] search, which re-solves neighbourhoods with the period and the destination of every free block free again, starts from the best of those plans and the best CPIT plan read as a PCPSP plan, so it can never end below CPIT (destination-local-search).',
          es: 'Por eso los planes con destino se construyen como los mejores planes CPIT, desde la relajación. La LP de PCPSP se resuelve, con HiGHS hasta 1,1 millones de filas y a través de su dual lagrangiano sobre eso, y se lee su solución: cada bloque va al destino al que la LP envía la mayor parte de él. Fijar esos destinos da un CPIT cuyos valores y coeficientes de recurso son los de los destinos elegidos, de modo que todo plan de él es un plan del PCPSP original con el mismo valor. Ese CPIT re-cortado se programa con toda la maquinaria CPIT: sus propias relajaciones del multiplicador crítico siembran ExTS (destination-toposort) y la ventana deslizante (destination-sliding-window). Por último la búsqueda exacta OPBSP-[D], que re-resuelve vecindarios con el período y el destino de cada bloque libre otra vez libres, parte del mejor de esos planes y del mejor plan CPIT leído como plan PCPSP, de modo que nunca puede terminar bajo CPIT (destination-local-search).',
        },
        {
          en: 'Why not walk the PCPSP LP\'s own expected times, as ExTS walks the CPIT ones? It was measured and it loses: the PCPSP relaxation mines deep cones fractionally from the first period, paying only part of the overburden and dumping the marginal ore on the way, so its expected times are a poor order for an integer plan; the CPIT relaxation of the re-cut instance has no such freedom on the destination side. On a 320-block twin with this product\'s economics, solved exactly, the destination freedom is worth about 59 percent over the fixed cutoff (exact OPBSP 10.37 M against exact CPIT 6.53 M), the PCPSP LP is about 5 percent above the integer optimum, and the re-cut scheduled by the sliding window reaches 10.15 M; a rule comparing values returned a negative NPV on the same instance.',
          es: '¿Por qué no recorrer los tiempos esperados de la propia LP de PCPSP, como ExTS recorre los de CPIT? Se midió y pierde: la relajación PCPSP extrae conos profundos de manera fraccionaria desde el primer período, pagando solo parte del estéril y botando el mineral marginal en el camino, de modo que sus tiempos esperados son un mal orden para un plan entero; la relajación CPIT de la instancia re-cortada no tiene esa libertad del lado de los destinos. En un gemelo de 320 bloques con la economía de este producto, resuelto de manera exacta, la libertad de destino vale cerca de 59 por ciento sobre el corte fijo (OPBSP exacto 10,37 M contra CPIT exacto 6,53 M), la LP de PCPSP está cerca de 5 por ciento sobre el óptimo entero, y el re-corte programado con la ventana deslizante alcanza 10,15 M; una regla que compara valores devolvió un VAN negativo en la misma instancia.',
        },
        {
          en: 'All three plans are scored against the PCPSP LP (above the row budget its Lagrangian dual, equal to it up to the rounding slack), never against the CPIT bound, which does not bound them. What the reader gets is the cutoff as a result (the lowest grade actually sent to the plant in each period), the blocks whose destination differs from the fixed cutoff, and the value over the best CPIT plan. Three checks make the LP trustworthy here, and each is visible in the results: on newman1 it reproduces the published PCPSP LP bound, 24,486,549; where only the fleet binds it equals the CPIT bound, as Lane\'s mine-limited result requires; and it can never sit below the joint CPIT LP.',
          es: 'Los tres planes se juzgan contra la LP de PCPSP (sobre el presupuesto de filas su dual lagrangiano, igual a ella salvo la holgura del redondeo), nunca contra la cota CPIT, que no los acota. Lo que obtiene el lector es la ley de corte como resultado (la menor ley efectivamente enviada a planta en cada período), los bloques cuyo destino difiere del corte fijo y el valor sobre el mejor plan CPIT. Tres verificaciones hacen confiable la LP aquí, y cada una es visible en los resultados: en newman1 reproduce la cota LP de PCPSP publicada, 24.486.549; donde solo limita la flota es igual a la cota CPIT, como exige el resultado de Lane para la mina limitante; y nunca puede quedar bajo la LP conjunta de CPIT.',
        },
      ],
      equations: [
        { tex: String.raw`d^{*}_b=\arg\max_{d}\ \sum_{t}y^{\mathrm{LP}}_{bdt},\qquad \tilde p_b=p_{b,d^{*}_b},\ \ \tilde a_{rb}=a_{r,b,d^{*}_b}`, caption: { en: 'The re-cut: each block at the LP\'s destination, giving a CPIT whose plans are PCPSP plans of the same value', es: 'El re-corte: cada bloque en el destino de la LP, lo que da un CPIT cuyos planes son planes PCPSP del mismo valor' } },
        { tex: String.raw`g_{\text{mill}}=\frac{h+F/M}{y\,(p-k)}\ >\ g_{\text{mine}}=g_{\text{break-even}}=\frac{h}{y\,(p-k)},\qquad F=\delta V+f`, caption: { en: 'Lane: a binding mill raises the cutoff by its opportunity cost F per unit of mill capacity M; a binding fleet does not', es: 'Lane: una planta que limita sube la ley de corte en su costo de oportunidad F por unidad de capacidad de planta M; una flota que limita no' } },
        { tex: String.raw`\sum_{d}z_{idt}=y_{it}-y_{i,t-1},\qquad z_{idt}\in\{0,1\}`, caption: { en: 'OPBSP-[D]: binary destinations linked to cumulative extraction for the free blocks', es: 'OPBSP-[D]: destinos binarios ligados a la extracción acumulada de los bloques libres' } },
      ],
      symbols: [
        { tex: 'h,\\ p,\\ k,\\ y', text: { en: 'processing cost per tonne, price, selling cost, recovery', es: 'costo de proceso por tonelada, precio, costo de venta, recuperación' } },
        { tex: 'F=\\delta V+f', text: { en: 'cost of time per period: discount rate times remaining value, plus fixed cost', es: 'costo del tiempo por período: tasa de descuento por valor restante, más costo fijo' } },
        { tex: 'y^{\\mathrm{LP}}_{bdt}', text: { en: 'share of block b the LP sends to destination d in period t', es: 'fracción del bloque b que la LP envía al destino d en el período t' } },
      ],
      figure: { caption: { en: 'Which ore gets a binding plant: the fixed cutoff against the re-cut, and the chain that schedules it.', es: 'Qué mineral recibe una planta que limita: el corte fijo contra el re-corte, y la cadena que lo programa.' }, render: (lang) => <DestinationRecut lang={lang} />, wide: true },
      facts: [
        { k: { en: 'Bound', es: 'Cota' }, v: { en: 'PCPSP LP: HiGHS up to 1.1 M rows, its Lagrangian dual above; newman1 24,486,549', es: 'LP de PCPSP: HiGHS hasta 1,1 M filas, su dual lagrangiano sobre eso; newman1 24.486.549' } },
        { k: { en: 'Rungs', es: 'Peldaños' }, v: { en: 'ExTS and the sliding window on the re-cut; OPBSP-[D] from the best', es: 'ExTS y la ventana deslizante sobre el re-corte; OPBSP-[D] desde el mejor' } },
        { k: { en: 'Guarantee', es: 'Garantía' }, v: { en: 'the local search never ends below the best CPIT plan', es: 'la búsqueda local nunca termina bajo el mejor plan CPIT' } },
        { k: { en: 'Output', es: 'Salida' }, v: { en: 'effective cutoff per period; blocks moved against the fixed cutoff', es: 'ley de corte efectiva por período; bloques movidos respecto del corte fijo' } },
      ],
      limits: [
        { en: 'Two destinations (plant and dump); no stockpile, no blending.', es: 'Dos destinos (planta y botadero); sin acopio, sin mezcla.' },
        { en: 'The re-cut takes the LP\'s dominant destination; a block the LP splits is rounded to one side.', es: 'El re-corte toma el destino dominante de la LP; un bloque que la LP reparte se redondea a un lado.' },
        { en: 'Runs only where destination economics exist: newman1 and every case built on a deposit twin; the two declared real models carry no destination values.', es: 'Corre solo donde existe la economía de destinos: newman1 y cada caso construido sobre un gemelo de yacimiento; los dos modelos reales declarados no traen valores por destino.' },
      ],
      refs: ['jelvez2018', 'chicoisne2012', 'huangfu2018', 'geoffrion1974', 'espinoza2013'],
    },
    {
      id: 'operability',
      title: { en: 'Operability: coherence and minimum width', es: 'Operabilidad: coherencia y ancho mínimo' },
      paragraphs: [
        {
          en: 'A block-level schedule is free to pick blocks anywhere, and it does. The authors of the algorithm say it themselves in their final remarks: it is likely that blocks scheduled in the same period are scattered throughout the mine, which may require manual intervention, and the effect is exacerbated because the planning unit is a block rather than a bench-phase. A plan with a high NPV and forty disconnected fragments a year is not a mine plan, and no NPV chart shows the difference.',
          es: 'Un plan por bloques puede elegir bloques en cualquier parte, y lo hace. Los autores del algoritmo lo dicen ellos mismos en sus observaciones finales: es probable que los bloques programados en un mismo período queden dispersos por la mina, lo que puede requerir intervención manual, y el efecto se agrava porque la unidad de planificación es un bloque y no una fase-banco. Un plan con un VAN alto y cuarenta fragmentos desconectados al año no es un plan minero, y ningún gráfico de VAN muestra la diferencia.',
        },
        {
          en: 'So coherence is measured per period on every plan: the number of connected components of the blocks mined in the period (six-neighbour connectivity, because blocks touching only along an edge or a corner are not one mining front), the share of the period held by the largest component, and the narrowest run of consecutive mined blocks along a bench, a crude proxy for minimum mining width. Bai, Marcotte, Gamache, Gregory and Lapworth give the operational reason: equipment needs room, and they target about 100 metres.',
          es: 'Por eso la coherencia se mide por período en cada plan: el número de componentes conexas de los bloques extraídos en el período (conectividad de seis vecinos, porque bloques que solo se tocan por una arista o un vértice no son un frente de extracción), la fracción del período que contiene la componente mayor, y el tramo más estrecho de bloques consecutivos extraídos a lo largo de un banco, un indicador simple del ancho mínimo de minado. Bai, Marcotte, Gamache, Gregory y Lapworth dan la razón operativa: los equipos necesitan espacio, y ellos apuntan a cerca de 100 metros.',
        },
        {
          en: 'The min-width rung makes the best plan more workable and reports what that changes in NPV, almost always a cost. It is an adaptive opening: a mined block whose run along its bench is narrower than the target is moved to the period that the majority of its four bench neighbours belong to, provided precedence holds in both directions (moving a block later can be overtaken by a successor already scheduled earlier) and every resource of the receiving period has room. The result is a feasible plan, so its NPV is comparable, and the difference is the price of operability.',
          es: 'El peldaño de ancho mínimo hace más operable el mejor plan y reporta cuánto cambia el VAN, casi siempre un costo. Es una apertura adaptativa: un bloque extraído cuyo tramo a lo largo de su banco es más estrecho que el objetivo se mueve al período al que pertenece la mayoría de sus cuatro vecinos de banco, siempre que la precedencia se cumpla en ambos sentidos (mover un bloque más tarde puede quedar adelantado por un sucesor ya programado antes) y que cada recurso del período receptor tenga espacio. El resultado es un plan factible, de modo que su VAN es comparable, y la diferencia es el precio de la operabilidad.',
        },
        {
          en: 'The reported figure is the count of blocks below the target width, before and after, because the minimum width of a whole period is dominated by a handful of isolated blocks that nothing can absorb; a metric that cannot move is decoration. The rung also reports how many moves the capacity refused, which is the honest limit of a smoothing that keeps the plan feasible.',
          es: 'La cifra reportada es la cantidad de bloques bajo el ancho objetivo, antes y después, porque el ancho mínimo de un período completo lo dominan unos pocos bloques aislados que nada puede absorber; una métrica que no se puede mover es decoración. El peldaño también reporta cuántos movimientos rechazó la capacidad, que es el límite honesto de un suavizado que mantiene el plan factible.',
        },
      ],
      equations: [
        { tex: String.raw`\kappa_t=\#\,\mathrm{components}_6\bigl(\{b:\tau_b=t\}\bigr),\qquad s_t=\frac{|\text{largest component}|}{|\{b:\tau_b=t\}|}`, caption: { en: 'Components and largest share per period, six-neighbour connectivity', es: 'Componentes y fracción mayor por período, conectividad de seis vecinos' } },
        { tex: String.raw`\tau_b\leftarrow\mathrm{mode}\{\tau_n:\ n\in N_4(b)\}\ \ \text{if}\ \ \mathrm{run}(b)<w,\ \text{precedence holds both ways},\ a_{\cdot b}\le\text{room}(\tau)`, caption: { en: 'The opening move, with a target width w of three blocks', es: 'El movimiento de apertura, con un ancho objetivo w de tres bloques' } },
      ],
      figure: { caption: { en: 'One bench before and after: slivers absorbed into their neighbours\' period.', es: 'Un banco antes y después: astillas absorbidas por el período de sus vecinos.' }, render: (lang) => <Operability lang={lang} /> },
      facts: [
        { k: { en: 'Metrics', es: 'Métricas' }, v: { en: 'components, largest share, narrowest run, per period', es: 'componentes, fracción mayor, tramo más estrecho, por período' } },
        { k: { en: 'Target width', es: 'Ancho objetivo' }, v: { en: '3 blocks, up to 3 passes', es: '3 bloques, hasta 3 pasadas' } },
        { k: { en: 'Feasibility', es: 'Factibilidad' }, v: { en: 'precedence both ways and every capacity', es: 'precedencia en ambos sentidos y toda capacidad' } },
      ],
      limits: [
        { en: 'A width in blocks, not metres, and along the two grid axes only.', es: 'Un ancho en bloques, no en metros, y solo a lo largo de los dos ejes de la grilla.' },
        { en: 'The smoothing is a post-process of one plan, not an operability constraint inside the optimisation.', es: 'El suavizado es un post-proceso de un plan, no una restricción de operabilidad dentro de la optimización.' },
      ],
      refs: ['chicoisne2012', 'bai2018'],
    },
    {
      id: 'uncertainty',
      title: { en: 'Geological uncertainty, framed as practice', es: 'Incertidumbre geológica, planteada como práctica' },
      paragraphs: [
        {
          en: 'Deterministic CPIT takes one block model as truth, and that model is an estimate: a kriged grade is a conditional mean, a smoother, and scheduling against it optimises for a deposit that does not exist. The stochastic programming answer is a two-stage integer program over an ensemble of simulated orebodies; Ramazan and Dimitrakopoulos report about ten percent more NPV than the traditional schedule on one Australian gold mine. That is a different and much larger model, and PhaseFlow does not solve it.',
          es: 'CPIT determinista toma un modelo de bloques como verdad, y ese modelo es una estimación: una ley krigeada es una media condicional, un suavizador, y programar contra ella optimiza para un depósito que no existe. La respuesta de la programación estocástica es un programa entero en dos etapas sobre un ensamble de cuerpos simulados; Ramazan y Dimitrakopoulos reportan cerca de diez por ciento más de VAN que el plan tradicional en una mina de oro australiana. Ese es otro modelo, mucho más grande, y PhaseFlow no lo resuelve.',
        },
        {
          en: 'What it does is what Blom, Pearce and Cote describe Rio Tinto\'s planners doing: solve many deterministic problems with varied inputs and read the spread. Block values are perturbed by a spatially correlated, mean-preserving field (uncorrelated noise would average out over a pushback and make uncertainty look harmless; a biased multiplier would corrupt the optimism number), and every candidate plan of the ladder is evaluated on every realisation without being re-optimised. Each plan gets an NPV distribution, its tenth and ninetieth percentiles, and the robust choice is the plan with the best tenth percentile, which is often not the best on average.',
          es: 'Lo que hace es lo que Blom, Pearce y Cote describen que hacen los planificadores de Rio Tinto: resolver muchos problemas deterministas con entradas variadas y leer la dispersión. Los valores de bloque se perturban con un campo espacialmente correlacionado que preserva la media (un ruido no correlacionado se promediaría en una expansión y haría parecer inofensiva la incertidumbre; un multiplicador sesgado corrompería el número de optimismo), y cada plan candidato de la escalera se evalúa en cada realización sin re-optimizarse. Cada plan obtiene una distribución de VAN, sus percentiles diez y noventa, y la elección robusta es el plan con el mejor percentil diez, que a menudo no es el mejor en promedio.',
        },
        {
          en: 'Two more numbers come out. The optimism of the single-model forecast is the difference between the NPV the mean model promises and what the same plan earns on average across the realisations. The value of re-planning improves the best fixed plan on each realisation with the exact restricted re-solve (the same neighbourhoods as the local-search rung, no bound) and compares the average with keeping the plan; because the re-plan is a local improvement and not the realisation's optimum, the number is a LOWER bound on the expected value of perfect information, never negative by construction, and it is never labelled EVPI.',
          es: 'Salen dos números más. El optimismo del pronóstico de un solo modelo es la diferencia entre el VAN que promete el modelo medio y lo que el mismo plan gana en promedio en las realizaciones. El valor de re-planificar mejora el mejor plan fijo en cada realización con la re-resolución exacta restringida (las mismas vecindades del peldaño de búsqueda local, sin cota) y compara el promedio con mantener el plan; como el re-plan es una mejora local y no el óptimo de la realización, el número es una cota INFERIOR del valor esperado de la información perfecta, nunca negativa por construcción, y nunca se rotula como EVPI.',
        },
        {
          en: 'The ensemble is synthetic, from a generator, and is labelled so on every surface: it is not a conditional simulation from drillholes. A frequently quoted figure, that accounting for geological uncertainty predicts an NPV fifty percent below the conventional forecast, comes from one gold-mine example that Meagher et al. summarise from Dimitrakopoulos, Farrelly and Godoy; it is attributed exactly that way here because the original was not read, and it is a claim about a forecast being wrong, not about a plan being better.',
          es: 'El ensamble es sintético, de un generador, y se rotula así en toda superficie: no es una simulación condicional desde sondajes. Una cifra citada con frecuencia, que considerar la incertidumbre geológica predice un VAN cincuenta por ciento menor que el pronóstico convencional, viene de un ejemplo de una mina de oro que Meagher et al. resumen de Dimitrakopoulos, Farrelly y Godoy; aquí se atribuye exactamente así porque el original no se leyó, y es una afirmación sobre un pronóstico equivocado, no sobre un plan mejor.',
        },
      ],
      equations: [
        { tex: String.raw`v^{(k)}_b=p_b\,\bigl(1+\sigma\,\xi^{(k)}_b\bigr),\qquad \xi^{(k)}\ \text{spatially correlated},\ \ \mathbb E\bigl[v^{(k)}\bigr]=p`, caption: { en: 'Realisation k: a correlated, mean-preserving perturbation of block values', es: 'Realización k: una perturbación correlacionada de los valores de bloque que preserva la media' } },
        { tex: String.raw`\text{robust}=\arg\max_{\pi}\ P_{10}\bigl[\mathrm{NPV}(\pi;v^{(k)})\bigr],\qquad \text{VoR}=\mathbb E_k\Bigl[\max\bigl(\mathrm{NPV}(\mathrm{LS}_k(\pi^\star);v^{(k)}),\ \max_{\pi}\mathrm{NPV}(\pi;v^{(k)})\bigr)\Bigr]-\max_{\pi}\mathbb E_k\bigl[\mathrm{NPV}(\pi;v^{(k)})\bigr]`, caption: { en: 'The robust choice by P10, and the value of re-planning: the best fixed plan π* improved on each realisation by the exact restricted re-solve LS (a lower bound on EVPI)', es: 'La elección robusta por P10, y el valor de re-planificar: el mejor plan fijo π* mejorado en cada realización por la re-resolución exacta restringida LS (una cota inferior de EVPI)' } },
      ],
      figure: { caption: { en: 'Plans read by their spread: the robust choice is not the best on average.', es: 'Planes leídos por su dispersión: la elección robusta no es la mejor en promedio.' }, render: (lang) => <EnsembleFan lang={lang} /> },
      facts: [
        { k: { en: 'Realisations', es: 'Realizaciones' }, v: { en: '12 per case (6 above 25,000 blocks), sigma 0.25', es: '12 por caso (6 sobre 25.000 bloques), sigma 0,25' } },
        { k: { en: 'Re-solve', es: 'Re-resolución' }, v: { en: 'Gershon weights and shift search, no bound', es: 'pesos de Gershon y búsqueda de desplazamiento, sin cota' } },
        { k: { en: 'Published SIP gain', es: 'Ganancia SIP publicada' }, v: { en: 'about 10 percent of NPV, one gold mine (Ramazan and Dimitrakopoulos 2013)', es: 'cerca de 10 por ciento del VAN, una mina de oro (Ramazan y Dimitrakopoulos 2013)' } },
      ],
      limits: [
        { en: 'Synthetic uncertainty from a generator, not conditional simulation.', es: 'Incertidumbre sintética de un generador, no simulación condicional.' },
        { en: 'No stochastic optimisation: plans are evaluated, not optimised, across realisations.', es: 'Sin optimización estocástica: los planes se evalúan, no se optimizan, a través de realizaciones.' },
      ],
      refs: ['ramazan2013', 'blom2024', 'meagher2014', 'goodfellow2016', 'lamghari2012'],
    },
    {
      id: 'out',
      title: { en: 'Out of scope, with the reasons', es: 'Fuera de alcance, con las razones' },
      paragraphs: [
        {
          en: 'A stockpile is not a third destination. Material enters in one period and leaves in another, which needs an inventory balance and is linear; but the metal reclaimed is the tonnes reclaimed times the average grade of the pile, and that average is a ratio of decision variables, so the honest model is bilinear and non-convex. The published linear models exist for that reason (Moreno, Rezakhah, Newman and Ferreira), and their working technique, as Rezakhah, Moreno and Newman describe it, is to fix the stockpile grade as a parameter and search over it. Adding a stockpile without that machinery would chart something the model cannot compute.',
          es: 'Un acopio no es un tercer destino. El material entra en un período y sale en otro, lo que requiere un balance de inventario y es lineal; pero el metal recuperado son las toneladas recuperadas por la ley media de la pila, y esa media es un cociente de variables de decisión, de modo que el modelo honesto es bilineal y no convexo. Los modelos lineales publicados existen por esa razón (Moreno, Rezakhah, Newman y Ferreira), y su técnica de trabajo, como la describen Rezakhah, Moreno y Newman, es fijar la ley del acopio como parámetro y buscar sobre ella. Agregar un acopio sin esa maquinaria graficaría algo que el modelo no puede calcular.',
        },
        {
          en: 'Its value is also fragile. Rezakhah and Newman measure that with five and ten percent annual degradation the value a stockpile provides falls by 37 and 69 percent. And what industry does under scale pressure is documented: Rio Tinto\'s planners removed stockpiles from large models, which produced plans that underestimated capacity and flexibility, and reintroducing them afterwards gave unrealistic or infeasible plans.',
          es: 'Su valor además es frágil. Rezakhah y Newman miden que con cinco y diez por ciento de degradación anual el valor que aporta un acopio cae 37 y 69 por ciento. Y lo que hace la industria bajo presión de escala está documentado: los planificadores de Rio Tinto quitaron los acopios de los modelos grandes, lo que produjo planes que subestimaban la capacidad y la flexibilidad, y reintroducirlos después dio planes irreales o infactibles.',
        },
        {
          en: 'Blending and other general side constraints are read from the .pcpsp file and not solved; a minimum-production row (sense G) makes the bound refuse to run rather than quietly solve a different problem. Two-stage stochastic programming is cited, not claimed. Haulage, dispatch and cutoff-grade policy as products belong to other members of this line, and an ultimate-pit study is not this product\'s subject.',
          es: 'La mezcla y otras restricciones laterales generales se leen del archivo .pcpsp y no se resuelven; una fila de producción mínima (sentido G) hace que la cota se niegue a correr en vez de resolver en silencio otro problema. La programación estocástica en dos etapas se cita, no se reclama. Transporte, despacho y política de ley de corte como productos pertenecen a otros miembros de esta línea, y un estudio de pit final no es el tema de este producto.',
        },
        {
          en: 'Each exclusion is stated where a reader would otherwise assume the capability: on this page, in the scope of the introduction, and in the footer\'s one line.',
          es: 'Cada exclusión se declara donde un lector supondría la capacidad: en esta página, en el alcance de la introducción y en la línea del pie de página.',
        },
      ],
      equations: [
        { tex: String.raw`\text{metal}_t=R_t\cdot\frac{M_t}{S_t},\qquad S_t=S_{t-1}+I_t-R_t,\ \ M_t=M_{t-1}+g^{\text{in}}_tI_t-\frac{M_{t-1}}{S_{t-1}}R_t`, caption: { en: 'A pile\'s reclaimed metal is a product of decisions: the model becomes bilinear', es: 'El metal recuperado de una pila es un producto de decisiones: el modelo se vuelve bilineal' } },
        { tex: String.raw`\text{value}_{\text{stockpile}}(10\%\ \text{degradation})\approx 0.31\cdot\text{value}_{\text{stockpile}}(0\%)`, caption: { en: 'Rezakhah and Newman 2020: a 69 percent loss of the stockpile\'s value at 10 percent yearly degradation', es: 'Rezakhah y Newman 2020: una pérdida de 69 por ciento del valor del acopio con 10 por ciento de degradación anual' } },
      ],
      symbols: [
        { tex: 'S_t,\\ M_t', text: { en: 'tonnes and metal in the pile at the end of t', es: 'toneladas y metal en la pila al final de t' } },
        { tex: 'I_t,\\ R_t', text: { en: 'tonnes into and out of the pile in t', es: 'toneladas que entran y salen de la pila en t' } },
        { tex: 'g^{\\text{in}}_t', text: { en: 'grade of what enters', es: 'ley de lo que entra' } },
      ],
      figure: { caption: { en: 'Why a stockpile changes the class of the model.', es: 'Por qué un acopio cambia la clase del modelo.' }, render: (lang) => <StockpileBilinear lang={lang} /> },
      limits: [
        { en: 'The specific linearisations of the closed-access 2017 paper are cited and not transcribed.', es: 'Las linealizaciones específicas del artículo de 2017, de acceso cerrado, se citan y no se transcriben.' },
      ],
      refs: ['moreno2017', 'rezakhah2020a', 'rezakhah2020b', 'blom2024', 'ramazan2013'],
    },
  ],
};
