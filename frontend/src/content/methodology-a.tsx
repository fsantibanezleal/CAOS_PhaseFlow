/**
 * Methodology, part one: the formulations and the certified bound. Transcribed from the research
 * dossiers on the formulations (Chicoisne et al. 2012; Espinoza et al. 2013; Jelvez et al. 2018) and on
 * the algorithms (the critical multiplier algorithm, Algorithm 4, Bienstock-Zuckerberg).
 */
import type { TopicGroup } from './doc.tsx';
import { AbelSplit, Algorithm4, BzLoop, ConeAndStep, ParametricPits, ProblemInclusion } from './figures/method.tsx';
import { NewmanGapFigure } from './panels-bench.tsx';

export const FORMULATION: TopicGroup = {
  id: 'formulation',
  label: { en: 'Formulation', es: 'Formulación' },
  topics: [
    {
      id: 'cpit',
      title: { en: 'CPIT in cumulative variables', es: 'CPIT en variables acumuladas' },
      paragraphs: [
        {
          en: 'Every published CPIT algorithm and every published CPIT bound is stated in cumulative variables, and so is everything here. The variable $x_{bt}$ equals one when block b has been mined by the END of period t, so a block mined in period four has $x_{b1}=x_{b2}=x_{b3}=0$ and $x_{b4}=x_{b5}=\dots=1$. What is mined IN period t is the difference $x_{bt}-x_{b,t-1}$, and the objective sums the discounted value of those differences. This form, from Chicoisne, Espinoza, Goycoolea, Moreno and Rubio, turns precedence into a two-entry inequality per arc and period, which is what makes the problem amenable to maximum-closure machinery.',
          es: 'Todo algoritmo y toda cota publicada de CPIT se enuncian en variables acumuladas, y aquí también. La variable $x_{bt}$ vale uno cuando el bloque b fue extraído al FINAL del período t, de modo que un bloque extraído en el período cuatro tiene $x_{b1}=x_{b2}=x_{b3}=0$ y $x_{b4}=x_{b5}=\dots=1$. Lo que se extrae EN el período t es la diferencia $x_{bt}-x_{b,t-1}$, y el objetivo suma el valor descontado de esas diferencias. Esta forma, de Chicoisne, Espinoza, Goycoolea, Moreno y Rubio, convierte la precedencia en una desigualdad de dos términos por arco y período, que es lo que hace al problema tratable con la maquinaria de cierres máximos.',
        },
        {
          en: 'Three details are real defects when they are missed, and each one produces a plausible number. Precedence is imposed in EVERY period, not once at the end: imposing it only on the final pit allows a schedule that mines a block in year two under rock removed in year three. Monotonicity ($x_{bt}\le x_{b,t+1}$) is a constraint, not a convention: dropping it lets a block be un-mined. And the destination is decided before the model runs, folded into $p_b$, so the ore and waste tonnages a CPIT schedule reports are an integral of a classification fixed in advance, not decisions of the model.',
          es: 'Tres detalles son defectos reales cuando se pasan por alto, y cada uno produce un número plausible. La precedencia se impone en CADA período, no una vez al final: imponerla solo sobre el pit final permite un plan que extrae un bloque el año dos bajo roca removida el año tres. La monotonía ($x_{bt}\le x_{b,t+1}$) es una restricción, no una convención: omitirla permite des-extraer un bloque. Y el destino se decide antes de resolver, plegado en $p_b$, de modo que las toneladas de mineral y estéril que reporta un plan CPIT son una integral de una clasificación fijada de antemano, no decisiones del modelo.',
        },
        {
          en: 'The discount convention matters and was checked against the published file, not assumed. With $d_t=(1+\eta)^{-(t-1)}$, the first period is undiscounted. On MineLib\'s newman1 that convention gives an Algorithm 4 bound of 24,487,410, just above the CPIT LP bound MineLib publishes (24,486,184), as a looser relaxation must; discounting the first period as well gives 22,673,528, which is below the published LP bound and therefore cannot be the convention of the file.',
          es: 'La convención de descuento importa y se verificó contra el archivo publicado, no se supuso. Con $d_t=(1+\eta)^{-(t-1)}$, el primer período no se descuenta. En newman1 de MineLib esa convención da una cota del Algoritmo 4 de 24.487.410, apenas sobre la cota LP de CPIT que publica MineLib (24.486.184), como debe ocurrir con una relajación más holgada; descontar también el primer período da 22.673.528, que queda bajo la cota LP publicada y por lo tanto no puede ser la convención del archivo.',
        },
        {
          en: 'Real instances carry two resources per period: the tonnes the fleet moves (every block consumes it) and the tonnes the plant processes (only ore consumes it). newman1 declares 2,000,000 and 1,100,000 per period over six periods at eight percent. In aggregate those capacities are loose (the whole model is 5.6 Mt against 12 Mt of mining capacity, 3.0 Mt of ore against 6.6 Mt of plant), and they bind only in the early periods, which is exactly the regime where discounting and capacity fight and the schedule is not trivial.',
          es: 'Las instancias reales llevan dos recursos por período: las toneladas que mueve la flota (todo bloque lo consume) y las toneladas que procesa la planta (solo el mineral lo consume). newman1 declara 2.000.000 y 1.100.000 por período en seis períodos al ocho por ciento. En agregado esas capacidades son holgadas (el modelo completo son 5,6 Mt contra 12 Mt de capacidad de mina, 3,0 Mt de mineral contra 6,6 Mt de planta), y limitan solo en los primeros períodos, que es justamente el régimen donde descuento y capacidad se enfrentan y el plan no es trivial.',
        },
      ],
      equations: [
        { tex: String.raw`\max\ \sum_{b\in\mathcal B}\sum_{t=1}^{T}p_{bt}\,\bigl(x_{bt}-x_{b,t-1}\bigr)`, caption: { en: 'Objective (3a): discounted value of what is mined in each period', es: 'Objetivo (3a): valor descontado de lo que se extrae en cada período' } },
        { tex: String.raw`\sum_{b}a_{rb}\bigl(x_{bt}-x_{b,t-1}\bigr)\le c_{rt},\qquad x_{bt}\le x_{at}\ \ \forall(a,b)\in\mathcal A,\qquad x_{bt}\le x_{b,t+1},\qquad x_{bt}\in\{0,1\},\ x_{b0}=0`, caption: { en: 'Capacity (3b), precedence in every period (3c), monotonicity (3d), integrality (3e, 3f)', es: 'Capacidad (3b), precedencia en cada período (3c), monotonía (3d), integralidad (3e, 3f)' } },
        { tex: String.raw`p_{bt}=\frac{p_b}{(1+\eta)^{t-1}}`, caption: { en: 'Discounted value; the first period is not discounted, as in the published MineLib files', es: 'Valor descontado; el primer período no se descuenta, como en los archivos publicados de MineLib' } },
      ],
      facts: [
        { k: { en: 'Variables', es: 'Variables' }, v: { en: 'one binary per block and period: n T', es: 'un binario por bloque y período: n T' } },
        { k: { en: 'Precedence rows', es: 'Filas de precedencia' }, v: { en: 'arcs times periods (newman1: 3,922 x 6)', es: 'arcos por períodos (newman1: 3.922 x 6)' } },
        { k: { en: 'newman1', es: 'newman1' }, v: { en: '1,060 blocks, 6 periods, rate 0.08, capacities 2.0 Mt and 1.1 Mt', es: '1.060 bloques, 6 períodos, tasa 0,08, capacidades 2,0 Mt y 1,1 Mt' } },
        { k: { en: 'Complexity', es: 'Complejidad' }, v: { en: 'NP-hard: one capacity row turns a closure into a precedence-constrained knapsack', es: 'NP-duro: una fila de capacidad convierte un cierre en una mochila con precedencias' } },
      ],
      figure: { caption: { en: 'The slope cone above a block, and the cumulative variable of a block mined in period 4.', es: 'El cono de talud sobre un bloque, y la variable acumulada de un bloque extraído en el período 4.' }, render: (lang) => <ConeAndStep lang={lang} /> },
      limits: [
        { en: 'The destination is fixed before scheduling; CPIT cannot move a block from the dump to the plant.', es: 'El destino se fija antes de programar; CPIT no puede mover un bloque del botadero a la planta.' },
        { en: 'Blocks are the planning unit; bench-phases and minimum mining widths are not constraints of the model.', es: 'Los bloques son la unidad de planificación; las fases-banco y los anchos mínimos de minado no son restricciones del modelo.' },
      ],
      refs: ['chicoisne2012', 'espinoza2013', 'caccetta2003', 'minelibresults'],
    },
    {
      id: 'pcpsp',
      title: { en: 'PCPSP and OPBSP: the destination as a decision', es: 'PCPSP y OPBSP: el destino como decisión' },
      paragraphs: [
        {
          en: 'The precedence-constrained production scheduling problem extends CPIT by letting the model decide each block\'s destination. In Johnson\'s general form, transcribed by Chicoisne et al. as their equations 2a to 2g, the variable x_bdt is the fraction of block b sent to destination d by period t, every destination carries its own profit and its own resource use, and a block can be split across destinations. Johnson\'s 1968 model already contained stockpiling capacity; its absence from most implementations is a simplification of the theory, not a gap in it.',
          es: 'El problema de programación de producción con precedencias extiende CPIT dejando que el modelo decida el destino de cada bloque. En la forma general de Johnson, transcrita por Chicoisne et al. como sus ecuaciones 2a a 2g, la variable x_bdt es la fracción del bloque b enviada al destino d al final del período t, cada destino tiene su propio beneficio y su propio uso de recursos, y un bloque puede repartirse entre destinos. El modelo de Johnson de 1968 ya contenía capacidad de acopio; su ausencia en la mayoría de las implementaciones es una simplificación de la teoría, no un vacío en ella.',
        },
        {
          en: 'Jelvez, Morales and Nancel-Penard propose OPBSP, a fully binary version in which a block goes to exactly one destination. OPBSP solutions are feasible for PCPSP, so an OPBSP plan can be scored against a PCPSP bound. That is the comparison PhaseFlow makes: its destination plans have binary destinations and are scored against the PCPSP LP relaxation, and on newman1 they can be compared with the PCPSP LP bound (24,486,549) and the best-known OPBSP plan (24,176,861) that Jelvez et al. publish in their Tables 3 and 4.',
          es: 'Jelvez, Morales y Nancel-Penard proponen OPBSP, una versión totalmente binaria en que un bloque va a exactamente un destino. Las soluciones OPBSP son factibles para PCPSP, de modo que un plan OPBSP se puede juzgar contra una cota PCPSP. Esa es la comparación que hace PhaseFlow: sus planes con destino tienen destinos binarios y se juzgan contra la relajación LP de PCPSP, y en newman1 se pueden comparar con la cota LP de PCPSP (24.486.549) y el mejor plan OPBSP conocido (24.176.861) que Jelvez et al. publican en sus Tablas 3 y 4.',
        },
        {
          en: 'CPIT is a restriction of PCPSP: fixing every block to its best destination, which is how the CPIT values are built, yields a PCPSP plan of the same value. Every CPIT plan is therefore a PCPSP plan, so the PCPSP optimum is at least the CPIT optimum, and the PCPSP LP bound is at least the CPIT LP bound. On newman1 the two published LP bounds differ by 365 units in 24.5 million, which says that on that instance choosing destinations can add almost nothing; a destination method that ends below the best CPIT plan has not found a property of PCPSP, it has failed to search it.',
          es: 'CPIT es una restricción de PCPSP: fijar cada bloque a su mejor destino, que es como se construyen los valores CPIT, produce un plan PCPSP del mismo valor. Todo plan CPIT es por lo tanto un plan PCPSP, de modo que el óptimo de PCPSP es al menos el de CPIT, y la cota LP de PCPSP es al menos la de CPIT. En newman1 las dos cotas LP publicadas difieren en 365 unidades en 24,5 millones, lo que dice que en esa instancia elegir destinos puede agregar casi nada; un método con destinos que termina bajo el mejor plan CPIT no encontró una propiedad de PCPSP, falló en explorarlo.',
        },
        {
          en: 'The reason the step matters is the cutoff grade. In CPIT the cutoff is decided before scheduling, by a rule such as Lane\'s, and folded into the block values. In PCPSP the effective cutoff is an output: a block goes to the plant only if the plant has room in that period and the plant is worth more than the dump, so the lowest grade actually processed moves with the schedule. General side constraints such as blending are part of PCPSP too; PhaseFlow reads them from the files and declares that it does not solve them.',
          es: 'La razón por la que el paso importa es la ley de corte. En CPIT la ley de corte se decide antes de programar, con una regla como la de Lane, y se pliega en los valores de bloque. En PCPSP la ley de corte efectiva es un resultado: un bloque va a planta solo si la planta tiene espacio en ese período y vale más que el botadero, de modo que la menor ley efectivamente procesada se mueve con el plan. Las restricciones laterales generales como la mezcla también son parte de PCPSP; PhaseFlow las lee de los archivos y declara que no las resuelve.',
        },
      ],
      equations: [
        { tex: String.raw`\max\sum_{b,d,t}p_{bdt}\bigl(x_{bdt}-x_{b,d,t-1}\bigr)\ \ \text{s.t.}\ \ \sum_{d,b}a_{bdtr}\bigl(x_{bdt}-x_{b,d,t-1}\bigr)\le c_{rt},\ \ \sum_{t,d}\bigl(x_{bdt}-x_{b,d,t-1}\bigr)\le 1`, caption: { en: 'PCPSP (Johnson 1968, as in Chicoisne et al. 2012, equations 2a to 2c)', es: 'PCPSP (Johnson 1968, como en Chicoisne et al. 2012, ecuaciones 2a a 2c)' } },
        { tex: String.raw`\mathcal F_{\mathrm{CPIT}}\subseteq\mathcal F_{\mathrm{PCPSP}}\ \Rightarrow\ Z^{*}_{\mathrm{CPIT}}\le Z^{*}_{\mathrm{PCPSP}},\qquad Z^{\mathrm{LP}}_{\mathrm{CPIT}}\le Z^{\mathrm{LP}}_{\mathrm{PCPSP}}`, caption: { en: 'Inclusion: a larger feasible set can only raise its optimum and its relaxation', es: 'Inclusión: un conjunto factible mayor solo puede subir su óptimo y su relajación' } },
      ],
      facts: [
        { k: { en: 'newman1 CPIT LP', es: 'LP CPIT newman1' }, v: { en: '24,486,184 (MineLib results)', es: '24.486.184 (resultados MineLib)' } },
        { k: { en: 'newman1 PCPSP LP', es: 'LP PCPSP newman1' }, v: { en: '24,486,549 (Jelvez et al. 2018, Table 3)', es: '24.486.549 (Jelvez et al. 2018, Tabla 3)' } },
        { k: { en: 'Best known OPBSP', es: 'Mejor OPBSP conocido' }, v: { en: '24,176,861, gap 1.26 percent (Table 4)', es: '24.176.861, brecha 1,26 por ciento (Tabla 4)' } },
        { k: { en: 'Here', es: 'Aquí' }, v: { en: 'binary destinations, scored against the PCPSP LP computed per case', es: 'destinos binarios, juzgados contra la LP PCPSP calculada por caso' } },
      ],
      figure: { caption: { en: 'CPIT plans are PCPSP plans; the relaxations keep that order.', es: 'Los planes CPIT son planes PCPSP; las relajaciones conservan ese orden.' }, render: (lang) => <ProblemInclusion lang={lang} /> },
      limits: [
        { en: 'Blending and other general side constraints are read and not solved.', es: 'La mezcla y otras restricciones laterales generales se leen y no se resuelven.' },
        { en: 'Destination economics exist only for newman1 (its .pcpsp file) and for the twins (their seeded costs); the declared kd and zuck_small scenarios have no source for a second destination value and skip the destination methods.', es: 'La economía de destinos existe solo para newman1 (su archivo .pcpsp) y para los gemelos (sus costos sembrados); los escenarios declarados de kd y zuck_small no tienen fuente para un segundo valor de destino y omiten los métodos con destino.' },
      ],
      refs: ['johnson1968', 'chicoisne2012', 'jelvez2018', 'espinoza2013'],
    },
    {
      id: 'gap',
      title: { en: 'What a gap measures, and the controls', es: 'Qué mide una brecha, y los controles' },
      paragraphs: [
        {
          en: 'A schedule\'s gap is the distance from its value to an upper bound, as a fraction of the bound: the definition Jelvez et al. use as their equation 12 and the one MineLib\'s results use. A gap is honest only when the bound is certified, and it is comparable only between plans scored against the same bound of the same problem. A two percent gap on a scenario declared by this product is not the same thing as a two percent gap against a published bound, and a destination plan cannot be scored against the CPIT bound at all.',
          es: 'La brecha de un plan es la distancia de su valor a una cota superior, como fracción de la cota: la definición que Jelvez et al. usan como su ecuación 12 y la que usan los resultados de MineLib. Una brecha es honesta solo cuando la cota está certificada, y es comparable solo entre planes juzgados contra la misma cota del mismo problema. Una brecha de dos por ciento en un escenario declarado por este producto no es lo mismo que una brecha de dos por ciento contra una cota publicada, y un plan con destinos no puede juzgarse contra la cota de CPIT.',
        },
        {
          en: 'A gap mixes three distances that only an exact integer solution can separate. From the looser bound to the joint LP is the slack of the bound itself (Algorithm 4 against Bienstock-Zuckerberg); from the LP to the integer optimum is the integrality gap of the instance, which no method can close; and from the integer optimum to the plan is the loss of the method. On newman1 an external exact solve exists (AMPL with Gurobi 13.0.0 reports 24,176,864.82 with an equal MIP bound), so the three can be read separately there and nowhere else in the matrix.',
          es: 'Una brecha mezcla tres distancias que solo una solución entera exacta puede separar. De la cota más holgada a la LP conjunta está la holgura de la propia cota (Algoritmo 4 contra Bienstock-Zuckerberg); de la LP al óptimo entero está la brecha de integralidad de la instancia, que ningún método puede cerrar; y del óptimo entero al plan está la pérdida del método. En newman1 existe una resolución exacta externa (AMPL con Gurobi 13.0.0 reporta 24.176.864,82 con una cota MIP igual), de modo que ahí las tres se pueden leer por separado, y en ningún otro caso de la matriz.',
        },
        {
          en: 'Three controls run on every case because a wrong schedule looks exactly like a right one on a chart. Duality: at rate zero with unlimited capacity CPIT collapses to the ultimate pit, so the relaxation must return the exact pit block for block and its value exactly, and the pit comes from a different code path (a maximum closure). Bound: the certified bound must sit above every feasible plan; a plan above it proves a defect in one of the two. Order invariance: at rate zero with unlimited capacity the value cannot depend on the order, so every TopoSort weighting must return the same number.',
          es: 'Tres controles corren en cada caso, porque un plan equivocado se ve exactamente igual que uno correcto en un gráfico. Dualidad: con tasa cero y capacidad ilimitada CPIT colapsa al pit final, de modo que la relajación debe devolver el pit exacto bloque a bloque y su valor exacto, y el pit viene de otro camino de código (un cierre máximo). Cota: la cota certificada debe quedar sobre todo plan factible; un plan sobre ella prueba un defecto en uno de los dos. Invariancia al orden: con tasa cero y capacidad ilimitada el valor no puede depender del orden, de modo que todo peso de TopoSort debe devolver el mismo número.',
        },
        {
          en: 'A fourth check sits in front of every artifact: each plan of every method, including the ones that answer a different question, is verified for precedence in every period and for every capacity before it can be recorded, and its value must stay below the bound of the problem it solves. Where both relaxations exist, the PCPSP LP must sit above the joint CPIT LP. These checks are cheap, and each one exists because the corresponding defect once produced a plausible number that every other gate accepted.',
          es: 'Un cuarto control está delante de todo artefacto: cada plan de cada método, incluidos los que responden otra pregunta, se verifica en precedencia en cada período y en cada capacidad antes de poder registrarse, y su valor debe quedar bajo la cota del problema que resuelve. Donde existen ambas relajaciones, la LP de PCPSP debe quedar sobre la LP conjunta de CPIT. Estos controles son baratos, y cada uno existe porque el defecto correspondiente produjo alguna vez un número plausible que todos los demás controles aceptaron.',
        },
      ],
      equations: [
        { tex: String.raw`\text{gap}=\frac{Z^{\text{bound}}-Z^{\text{plan}}}{Z^{\text{bound}}}`, caption: { en: 'The gap (Jelvez et al. 2018, equation 12), against the bound of the plan\'s own problem', es: 'La brecha (Jelvez et al. 2018, ecuación 12), contra la cota del problema del propio plan' } },
        { tex: String.raw`Z^{\text{Alg4}}-Z^{\text{plan}}=\underbrace{\bigl(Z^{\text{Alg4}}-Z^{\text{LP}}\bigr)}_{\text{bound slack}}+\underbrace{\bigl(Z^{\text{LP}}-Z^{*}\bigr)}_{\text{integrality}}+\underbrace{\bigl(Z^{*}-Z^{\text{plan}}\bigr)}_{\text{method loss}}`, caption: { en: 'The identity that separates a gap; percent gaps have different denominators and are not added', es: 'La identidad que separa una brecha; las brechas porcentuales tienen distintos denominadores y no se suman' } },
      ],
      facts: [
        { k: { en: 'Duality control', es: 'Control de dualidad' }, v: { en: 'rate 0, unlimited capacity: the exact pit, block for block', es: 'tasa 0, capacidad ilimitada: el pit exacto, bloque a bloque' } },
        { k: { en: 'Bound control', es: 'Control de cota' }, v: { en: 'every plan below the bound of its own problem', es: 'todo plan bajo la cota de su propio problema' } },
        { k: { en: 'Order control', es: 'Control de orden' }, v: { en: 'rate 0, unlimited capacity: every weighting equal', es: 'tasa 0, capacidad ilimitada: todo peso igual' } },
        { k: { en: 'Feasibility gate', es: 'Control de factibilidad' }, v: { en: 'precedence and capacity on every plan of every method', es: 'precedencia y capacidad en cada plan de cada método' } },
      ],
      figure: { caption: { en: 'Where a gap comes from: bound slack, integrality, and the method\'s own loss.', es: 'De dónde viene una brecha: holgura de la cota, integralidad y la pérdida del método.' }, render: (lang) => <NewmanGapFigure lang={lang} /> },
      limits: [
        { en: 'Integrality and method loss are separable only where an exact integer optimum is known: newman1, through an external solve.', es: 'La integralidad y la pérdida del método se pueden separar solo donde se conoce un óptimo entero exacto: newman1, por una resolución externa.' },
        { en: 'The controls prove the machinery is consistent; they do not prove any plan is good.', es: 'Los controles prueban que la maquinaria es consistente; no prueban que algún plan sea bueno.' },
      ],
      refs: ['jelvez2018', 'minelibresults', 'amplminelib', 'chicoisne2012'],
    },
  ],
};

export const BOUND: TopicGroup = {
  id: 'bound',
  label: { en: 'The certified bound', es: 'La cota certificada' },
  topics: [
    {
      id: 'lp',
      title: { en: 'The LP relaxation, decomposed', es: 'La relajación LP, descompuesta' },
      paragraphs: [
        {
          en: 'Relaxing $x_{bt}\in\{0,1\}$ to $0\le x_{bt}\le 1$ can only raise the optimum of a maximisation, so the linear relaxation of CPIT is a valid upper bound on every schedule. It also carries information beyond its value: the fractional solution says, for each block and period, how much of the block the relaxation wants mined by then, and that is what later seeds the best rounding heuristics. The difficulty is size: the relaxation has $nT$ variables and arcs-times-periods precedence rows, and a general LP solver fails on real instances long before memory does.',
          es: 'Relajar $x_{bt}\in\{0,1\}$ a $0\le x_{bt}\le 1$ solo puede subir el óptimo de una maximización, de modo que la relajación lineal de CPIT es una cota superior válida de todo plan. Además trae información más allá de su valor: la solución fraccionaria dice, para cada bloque y período, cuánto del bloque quiere extraído la relajación a esa altura, y eso es lo que después siembra las mejores heurísticas de redondeo. La dificultad es el tamaño: la relajación tiene $nT$ variables y filas de precedencia en número de arcos por períodos, y un solver LP general falla en instancias reales mucho antes que la memoria.',
        },
        {
          en: 'Chicoisne et al. remove the difficulty in two steps. First, Abel summation rewrites the objective, a sum of discounted increments, as a sum of cumulative pit values with weights $\gamma_t=d_t-d_{t+1}$ (and $\gamma_T=d_T$). Discount factors decrease, so every weight is positive, and maximising a positively weighted sum of independent terms is the same as maximising each term. Second, relaxing the per-period capacities into their cumulative form (what is mined by period t uses at most $U_t$, the sum of the capacities up to $t$) removes the only coupling between periods.',
          es: 'Chicoisne et al. eliminan la dificultad en dos pasos. Primero, la suma de Abel reescribe el objetivo, una suma de incrementos descontados, como una suma de valores de pit acumulados con pesos $\gamma_t=d_t-d_{t+1}$ (y $\gamma_T=d_T$). Los factores de descuento decrecen, así que todo peso es positivo, y maximizar una suma con pesos positivos de términos independientes es lo mismo que maximizar cada término. Segundo, relajar las capacidades por período a su forma acumulada (lo extraído al período t usa a lo más $U_t$, la suma de las capacidades hasta $t$) elimina el único acoplamiento entre períodos.',
        },
        {
          en: 'What remains is $T$ separate problems $\mathrm{CP}(U_t)$: find the most valuable fractional closed set whose resource use is at most $U_t$. Their optima nest, because a larger capacity can only admit a larger pit, so stacking them gives a monotone cumulative solution that is feasible for the original relaxation, and the authors prove (their Theorem 3.1) that it is optimal for it. With one resource per period, the cumulative relaxation is exact: nothing was lost in the second step.',
          es: 'Lo que queda son $T$ problemas separados $\mathrm{CP}(U_t)$: encontrar el conjunto cerrado fraccionario de mayor valor cuyo uso de recurso sea a lo más $U_t$. Sus óptimos se anidan, porque una capacidad mayor solo puede admitir un pit mayor, de modo que apilarlos da una solución acumulada monótona que es factible para la relajación original, y los autores demuestran (su Teorema 3.1) que es óptima para ella. Con un recurso por período, la relajación acumulada es exacta: nada se perdió en el segundo paso.',
        },
        {
          en: 'That last condition is the reason two-resource instances need more. With a mining and a plant capacity in every period, solving one resource\'s cumulative problem ignores the other, so each single-resource relaxation is still a valid bound, and none is exact. The next three topics are the three ways this product computes a certified number anyway: the critical multiplier algorithm for one resource, Algorithm 4 for several, and the joint bound of Bienstock and Zuckerberg.',
          es: 'Esa última condición es la razón por la que las instancias con dos recursos necesitan más. Con una capacidad de mina y una de planta en cada período, resolver el problema acumulado de un recurso ignora el otro, de modo que cada relajación de un solo recurso sigue siendo una cota válida, y ninguna es exacta. Los tres temas siguientes son las tres maneras en que este producto calcula de todos modos un número certificado: el algoritmo del multiplicador crítico para un recurso, el Algoritmo 4 para varios, y la cota conjunta de Bienstock y Zuckerberg.',
        },
      ],
      equations: [
        { tex: String.raw`\sum_{t=1}^{T}d_t\bigl(x_t-x_{t-1}\bigr)\cdot p=\sum_{t=1}^{T}\gamma_t\,(x_t\cdot p),\qquad \gamma_t=d_t-d_{t+1}>0,\ \ \gamma_T=d_T`, caption: { en: 'Abel summation: positive weights on cumulative pit values', es: 'Suma de Abel: pesos positivos sobre valores de pit acumulados' } },
        { tex: String.raw`\mathrm{CP}(U_t)=\max\ p\cdot x\ \ \text{s.t.}\ \ x\ \text{closed},\ \ a\cdot x\le U_t,\ \ 0\le x\le 1,\qquad U_t=\sum_{s\le t}c_s`, caption: { en: 'One problem per period over the cumulative capacity', es: 'Un problema por período sobre la capacidad acumulada' } },
      ],
      symbols: [
        { tex: String.raw`\gamma_t`, text: { en: 'Abel weight of period t, positive', es: 'peso de Abel del período t, positivo' } },
        { tex: String.raw`U_t`, text: { en: 'cumulative capacity up to period t', es: 'capacidad acumulada hasta el período t' } },
        { tex: String.raw`\mathrm{CP}(U)`, text: { en: 'best fractional closed set with resource use at most U', es: 'mejor conjunto cerrado fraccionario con uso de recurso a lo más U' } },
        { tex: String.raw`x_t`, text: { en: 'cumulative extraction vector at period t', es: 'vector de extracción acumulada en el período t' } },
      ],
      figure: { caption: { en: 'Discount factors, the positive Abel weights, and the T separate problems they leave.', es: 'Factores de descuento, los pesos de Abel positivos y los T problemas separados que dejan.' }, render: (lang) => <AbelSplit lang={lang} /> },
      limits: [
        { en: 'The decomposition is exact for ONE resource per period; with two it yields valid but looser bounds.', es: 'La descomposición es exacta para UN recurso por período; con dos entrega cotas válidas pero más holgadas.' },
        { en: 'Requires a non-negative resource coefficient and upper-bounded capacities; minimum-production (sense G) rows are refused.', es: 'Requiere coeficientes de recurso no negativos y capacidades con cota superior; las filas de producción mínima (sentido G) se rechazan.' },
      ],
      refs: ['chicoisne2012'],
    },
    {
      id: 'cma',
      title: { en: 'The critical multiplier algorithm', es: 'El algoritmo del multiplicador crítico' },
      paragraphs: [
        {
          en: 'Each problem $\mathrm{CP}(U)$ is solved by pricing the resource. For a multiplier $\lambda$, the ultimate pit of the modified values $p-\lambda a$ is a maximum closure; as $\lambda$ grows, every block\'s value falls in proportion to the resource it uses, so the pit can only shrink. The optimal value $z(\lambda)$ of that family is a convex piecewise-linear function of $\lambda$ with finitely many break-points, and the pits at consecutive break-points are nested (Chicoisne et al., Propositions 3.1 and 3.2).',
          es: 'Cada problema $\mathrm{CP}(U)$ se resuelve poniendo precio al recurso. Para un multiplicador $\lambda$, el pit final de los valores modificados $p-\lambda a$ es un cierre máximo; al crecer $\lambda$, el valor de cada bloque cae en proporción al recurso que usa, de modo que el pit solo puede achicarse. El valor óptimo $z(\lambda)$ de esa familia es una función de $\lambda$ convexa y lineal por tramos con un número finito de quiebres, y los pits en quiebres consecutivos están anidados (Chicoisne et al., Proposiciones 3.1 y 3.2).',
        },
        {
          en: 'For a target capacity $U$, the optimum of $\mathrm{CP}(U)$ is found between two consecutive break-points: the pit $x^u$, whose capacity $b^u$ is at least $U$, and the pit $x^l$, whose capacity $b^l$ is at most $U$. The convex combination with weight $\alpha=(b^u-U)/(b^u-b^l)$ uses exactly $U$ and is optimal. The value of $\lambda$ where this happens is the critical multiplier, and strong duality states the certificate that it has been found: $\mathrm{CP}(U)=\min_{\lambda}\,[\,z(\lambda)+\lambda U\,]$.',
          es: 'Para una capacidad objetivo $U$, el óptimo de $\mathrm{CP}(U)$ se encuentra entre dos quiebres consecutivos: el pit $x^u$, cuya capacidad $b^u$ es al menos $U$, y el pit $x^l$, cuya capacidad $b^l$ es a lo más $U$. La combinación convexa con peso $\alpha=(b^u-U)/(b^u-b^l)$ usa exactamente $U$ y es óptima. El valor de $\lambda$ donde esto ocurre es el multiplicador crítico, y la dualidad fuerte enuncia el certificado de haberlo encontrado: $\mathrm{CP}(U)=\min_{\lambda}\,[\,z(\lambda)+\lambda U\,]$.',
        },
        {
          en: 'The theorem\'s consequence is that the CPIT LP relaxation with one resource per period needs no LP solver at all: it is a sequence of maximum closures, each a minimum cut, in $O(mn\log n)$. The authors measured it at 12 seconds on Marvin (53,668 blocks, 606,403 precedences) where CPLEX took more than an hour, and on AsiaMine (772,800 blocks) in 2 minutes 36 seconds where CPLEX ran for more than ten days. It is also why the bound can be recomputed in a browser when a control moves.',
          es: 'La consecuencia del teorema es que la relajación LP de CPIT con un recurso por período no necesita ningún solver LP: es una secuencia de cierres máximos, cada uno un corte mínimo, en $O(mn\log n)$. Los autores la midieron en 12 segundos en Marvin (53.668 bloques, 606.403 precedencias) donde CPLEX tomó más de una hora, y en AsiaMine (772.800 bloques) en 2 minutos 36 segundos donde CPLEX corrió más de diez días. Es también la razón por la que la cota se puede recalcular en un navegador cuando se mueve un control.',
        },
        {
          en: 'Two choices make the computation both faster and provably right. The break-points do not depend on the period, only the target capacity does, so the pits found for one period are kept and reused by the others, and every new closure is restricted to the smallest known pit that must contain it. And the search for the critical multiplier stops on the duality certificate itself (primal and dual within a relative 1e-9), not on the width of an interval, because a small interval does not prove that the two bracketing pits are consecutive break-points, and the certificate does.',
          es: 'Dos decisiones hacen el cálculo más rápido y demostrablemente correcto. Los quiebres no dependen del período, solo la capacidad objetivo, de modo que los pits encontrados para un período se guardan y los reutilizan los demás, y cada nuevo cierre se restringe al menor pit conocido que debe contenerlo. Y la búsqueda del multiplicador crítico se detiene sobre el propio certificado de dualidad (primal y dual dentro de un relativo 1e-9), no sobre el ancho de un intervalo, porque un intervalo pequeño no prueba que los dos pits que encajonan sean quiebres consecutivos, y el certificado sí.',
        },
      ],
      equations: [
        { tex: String.raw`z(\lambda)=\mathrm{UPL}(p-\lambda a),\qquad \mathrm{CP}(U)=\min_{\lambda\ge 0}\bigl[\,z(\lambda)+\lambda U\,\bigr]`, caption: { en: 'The parametric family and the duality certificate checked at run time', es: 'La familia paramétrica y el certificado de dualidad verificado en ejecución' } },
        { tex: String.raw`\alpha=\frac{b^{u}-U}{b^{u}-b^{l}},\qquad x=\alpha\,x^{l}+(1-\alpha)\,x^{u},\qquad a\cdot x=U`, caption: { en: 'The optimal convex combination of two consecutive nested pits (Theorem 3.1)', es: 'La combinación convexa óptima de dos pits anidados consecutivos (Teorema 3.1)' } },
      ],
      symbols: [
        { tex: String.raw`\lambda`, text: { en: 'price on the resource', es: 'precio del recurso' } },
        { tex: String.raw`z(\lambda)`, text: { en: 'value of the ultimate pit of p minus lambda a', es: 'valor del pit final de p menos lambda a' } },
        { tex: String.raw`x^{u},\,x^{l}`, text: { en: 'the bracketing pits, above and below the capacity', es: 'los pits que encajonan, sobre y bajo la capacidad' } },
        { tex: String.raw`b^{u},\,b^{l}`, text: { en: 'their resource use', es: 'su uso de recurso' } },
        { tex: 'm,\\ n', text: { en: 'precedence arcs, blocks', es: 'arcos de precedencia, bloques' } },
      ],
      figure: { caption: { en: 'Each step of the curve is one maximum closure; the target capacity falls between two nested pits.', es: 'Cada escalón de la curva es un cierre máximo; la capacidad objetivo cae entre dos pits anidados.' }, render: (lang) => <ParametricPits lang={lang} /> },
      limits: [
        { en: 'Exact for one resource per period only.', es: 'Exacto solo para un recurso por período.' },
        { en: 'The bound is the LP value; the fractional solution is not a schedule.', es: 'La cota es el valor LP; la solución fraccionaria no es un plan.' },
      ],
      refs: ['chicoisne2012', 'picard1976', 'lerchs1965'],
    },
    {
      id: 'alg4',
      title: { en: 'Two resources: Algorithm 4', es: 'Dos recursos: Algoritmo 4' },
      paragraphs: [
        {
          en: 'With a mining and a plant capacity in every period, the critical multiplier algorithm cannot run on the full problem. Chicoisne et al. give Algorithm 4: drop all resources but one, solve that relaxation exactly with the critical multiplier algorithm, repeat for each resource, keep the smallest of the relaxed objectives as the bound, and keep the best of the feasible plans that each relaxation seeds. Each single-resource problem relaxes the two-resource one, so each objective is a valid upper bound; the smallest is the tightest this construction gives.',
          es: 'Con una capacidad de mina y una de planta en cada período, el algoritmo del multiplicador crítico no puede correr sobre el problema completo. Chicoisne et al. dan el Algoritmo 4: quitar todos los recursos menos uno, resolver esa relajación de manera exacta con el algoritmo del multiplicador crítico, repetir para cada recurso, conservar el menor de los objetivos relajados como cota y conservar el mejor de los planes factibles que siembra cada relajación. Cada problema de un recurso relaja el de dos, de modo que cada objetivo es una cota superior válida; el menor es la más ajustada que da esta construcción.',
        },
        {
          en: 'The bound is certified and looser than the joint LP. How much looser depends on whether both resources bind in the same periods: if one resource determines the LP alone, the smaller relaxation equals the joint bound; if they bind in different periods, each relaxation ignores what the other one forbids. When the bound is loose, a reported gap mixes the slack of the bound with the loss of the plan, which is why this product also computes the joint bound wherever it can and reports the difference between the two.',
          es: 'La cota está certificada y es más holgada que la LP conjunta. Cuánto más holgada depende de si ambos recursos limitan en los mismos períodos: si un recurso determina la LP por sí solo, la relajación menor es igual a la cota conjunta; si limitan en períodos distintos, cada relajación ignora lo que la otra prohíbe. Cuando la cota es holgada, una brecha reportada mezcla la holgura de la cota con la pérdida del plan, y por eso este producto también calcula la cota conjunta donde puede y reporta la diferencia entre ambas.',
        },
        {
          en: 'The plan side of Algorithm 4 is the expected-time TopoSort, run once from each relaxation\'s fractional solution and each time scheduled against BOTH capacities, so both plans are feasible for the real problem. The relaxation with the smaller bound does not always seed the better plan; in this product that difference is a separate rung (exts-two-resource against toposort-expected), and on most cases the two coincide.',
          es: 'El lado del plan del Algoritmo 4 es el TopoSort de tiempo esperado, corrido una vez desde la solución fraccionaria de cada relajación y cada vez programado contra AMBAS capacidades, de modo que ambos planes son factibles para el problema real. La relajación con la cota menor no siempre siembra el mejor plan; en este producto esa diferencia es un peldaño aparte (exts-two-resource contra toposort-expected), y en la mayoría de los casos ambos coinciden.',
        },
        {
          en: 'On newman1 the construction gives 24,487,410, against a joint LP of 24,486,184: the slack of the bound is 1,226 units in 24.5 million, small because one resource dominates that instance. On the synthetic twins with a tight plant the slack is larger, and the benchmark reports it per case.',
          es: 'En newman1 la construcción da 24.487.410, contra una LP conjunta de 24.486.184: la holgura de la cota son 1.226 unidades en 24,5 millones, pequeña porque un recurso domina esa instancia. En los gemelos sintéticos con planta estrecha la holgura es mayor, y la comparación la reporta por caso.',
        },
      ],
      equations: [
        { tex: String.raw`Z^{\text{Alg4}}=\min_{r\in\{1,\dots,R\}}Z^{\text{LP}}_{\{r\}}\ \ge\ Z^{\text{LP}}_{\text{joint}}\ \ge\ Z^{*}`, caption: { en: 'Every single-resource relaxation bounds the joint problem; the smallest is kept', es: 'Toda relajación de un recurso acota el problema conjunto; se conserva la menor' } },
        { tex: String.raw`\text{slack}=\frac{Z^{\text{Alg4}}-Z^{\text{LP}}_{\text{joint}}}{Z^{\text{Alg4}}}`, caption: { en: 'The part of a gap that belongs to the bound, reported per case', es: 'La parte de una brecha que pertenece a la cota, reportada por caso' } },
      ],
      figure: { caption: { en: 'Algorithm 4: one exact relaxation per resource, the smallest bound and the best plan.', es: 'Algoritmo 4: una relajación exacta por recurso, la menor cota y el mejor plan.' }, render: (lang) => <Algorithm4 lang={lang} /> },
      facts: [
        { k: { en: 'Cost', es: 'Costo' }, v: { en: 'R runs of the critical multiplier algorithm', es: 'R corridas del algoritmo del multiplicador crítico' } },
        { k: { en: 'newman1', es: 'newman1' }, v: { en: '24,487,410 against a joint LP of 24,486,184', es: '24.487.410 contra una LP conjunta de 24.486.184' } },
        { k: { en: 'Plans', es: 'Planes' }, v: { en: 'feasible for both resources by construction', es: 'factibles para ambos recursos por construcción' } },
      ],
      limits: [
        { en: 'Looser than the joint LP whenever the resources bind in different periods.', es: 'Más holgada que la LP conjunta cuando los recursos limitan en períodos distintos.' },
      ],
      refs: ['chicoisne2012'],
    },
    {
      id: 'bz',
      title: { en: 'The joint bound: Bienstock-Zuckerberg', es: 'La cota conjunta: Bienstock-Zuckerberg' },
      paragraphs: [
        {
          en: 'Bienstock and Zuckerberg solve the LP relaxation of general precedence-constrained problems with side constraints, and Munoz, Espinoza, Goycoolea, Moreno, Queyranne and Rivera Letelier recast their algorithm as column generation, which is the form implemented here. CPIT is time-expanded: every (block, period) pair becomes a node, precedence holds in every period, monotonicity links each block to itself one period later, and the capacities become side rows with a positive coefficient on period t and a negative one on period t minus one.',
          es: 'Bienstock y Zuckerberg resuelven la relajación LP de problemas generales con precedencias y restricciones laterales, y Munoz, Espinoza, Goycoolea, Moreno, Queyranne y Rivera Letelier reformulan su algoritmo como generación de columnas, que es la forma implementada aquí. CPIT se expande en el tiempo: cada par (bloque, período) pasa a ser un nodo, la precedencia se cumple en cada período, la monotonía liga cada bloque consigo mismo un período después, y las capacidades pasan a ser filas laterales con un coeficiente positivo en el período t y uno negativo en el período t menos uno.',
        },
        {
          en: 'The restricted master problem works on a partition of the nodes into groups whose variables are equated, which contracts the LP while keeping its structure. Its duals price the side rows; the pricing problem is then a maximum closure of the modified values, one minimum cut, which returns a new closed set. The partition is refined with that set (intersections and differences with every part), and the loop stops when no closure has a positive reduced profit. Coarsening the partition only after a strict improvement prevents cycling.',
          es: 'El problema maestro restringido trabaja sobre una partición de los nodos en grupos cuyas variables se igualan, lo que contrae la LP conservando su estructura. Sus duales ponen precio a las filas laterales; el problema de pricing es entonces un cierre máximo de los valores modificados, un corte mínimo, que devuelve un nuevo conjunto cerrado. La partición se refina con ese conjunto (intersecciones y diferencias con cada parte), y el ciclo termina cuando ningún cierre tiene beneficio reducido positivo. Engrosar la partición solo tras una mejora estricta evita los ciclos.',
        },
        {
          en: 'The authors are explicit about what this buys: the value the algorithm reaches equals the LP value, because the precedence system is totally unimodular, so the bound is no tighter than the LP relaxation; it is the same bound, computed where a general solver cannot compute it. Their measurement on zuck_medium is 40 seconds where CPLEX took 954,405 seconds, about eleven days, and CPLEX solved only the five smallest of fifteen instances at all.',
          es: 'Los autores son explícitos sobre lo que esto entrega: el valor que alcanza el algoritmo es igual al valor LP, porque el sistema de precedencias es totalmente unimodular, de modo que la cota no es más ajustada que la relajación LP; es la misma cota, calculada donde un solver general no puede calcularla. Su medición en zuck_medium es 40 segundos donde CPLEX tomó 954.405 segundos, cerca de once días, y CPLEX resolvió solo las cinco instancias más pequeñas de quince.',
        },
        {
          en: 'Two properties make the number trustworthy here. On an instance with a single resource, Bienstock-Zuckerberg and the critical multiplier algorithm are two unrelated algorithms computing the same LP, and they must agree to machine precision; that is a test. And the bound is reported only once it has been certified by one exact closure at the final dual vector; a case whose time-expanded graph is above the measured budget keeps the Algorithm 4 bound and says why.',
          es: 'Dos propiedades hacen confiable el número aquí. En una instancia con un solo recurso, Bienstock-Zuckerberg y el algoritmo del multiplicador crítico son dos algoritmos sin relación calculando la misma LP, y deben coincidir a precisión de máquina; eso es una prueba. Y la cota se reporta solo después de certificarse con un cierre exacto en el vector dual final; un caso cuyo grafo expandido supera el presupuesto medido conserva la cota del Algoritmo 4 y dice por qué.',
        },
      ],
      equations: [
        { tex: String.raw`Z^{*}=\max\ c^{\top}z\ \ \text{s.t.}\ \ z_i\le z_j\ \ \forall (i,j)\in I,\ \ Hz\le h,\ \ z\in\{0,1\}^{n}`, caption: { en: 'The general precedence-constrained problem that Bienstock-Zuckerberg relaxes', es: 'El problema general con precedencias que relaja Bienstock-Zuckerberg' } },
        { tex: String.raw`Z^{\mathrm{BZ}}=Z^{\mathrm{LP}}`, caption: { en: 'Proved by Munoz et al.: the precedence system is totally unimodular, so BZ is a speed result', es: 'Demostrado por Munoz et al.: el sistema de precedencias es totalmente unimodular, BZ es un resultado de velocidad' } },
      ],
      facts: [
        { k: { en: 'Graph', es: 'Grafo' }, v: { en: 'n T nodes, arcs T + n (T - 1) edges', es: 'n T nodos, arcos T + n (T - 1) aristas' } },
        { k: { en: 'Pricing', es: 'Pricing' }, v: { en: 'one minimum cut per iteration', es: 'un corte mínimo por iteración' } },
        { k: { en: 'Budget here', es: 'Presupuesto aquí' }, v: { en: '130,000 nodes, 1.4 million edges, 240 s, measured on the certification solve', es: '130.000 nodos, 1,4 millones de aristas, 240 s, medido sobre la resolución de certificación' } },
        { k: { en: 'Check', es: 'Verificación' }, v: { en: 'equals the critical multiplier on one resource, to machine precision', es: 'igual al multiplicador crítico con un recurso, a precisión de máquina' } },
      ],
      figure: { caption: { en: 'Column generation with a maximum-closure pricing problem.', es: 'Generación de columnas con un problema de pricing de cierre máximo.' }, render: (lang) => <BzLoop lang={lang} /> },
      limits: [
        { en: 'Not tighter than the LP; the same bound computed faster.', es: 'No es más ajustada que la LP; es la misma cota calculada más rápido.' },
        { en: 'Above the budget a case keeps the Algorithm 4 bound, with the reason recorded.', es: 'Sobre el presupuesto un caso conserva la cota del Algoritmo 4, con la razón registrada.' },
      ],
      refs: ['bienstock2010', 'munoz2017', 'chicoisne2012'],
    },
  ],
};
