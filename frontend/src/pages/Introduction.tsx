import { Callout, Cite, Figure, Refs, useShellLang } from '@fasl-work/caos-app-shell';

export default function Introduction() {
  const es = useShellLang() === 'es';
  return (
    <div className="page-body">
      <h1>{es ? 'Que bloques, y CUANDO' : 'Which blocks, and WHEN'}</h1>

      <p>
        {es
          ? 'El pit final responde una pregunta y solo una: que conjunto de bloques, extraido bajo restricciones de talud, tiene el mayor valor sin descontar. Es un problema resuelto desde 1965, es polinomial, y se resuelve exactamente por cierre maximo.'
          : 'The ultimate pit answers one question and only one: which set of blocks, extracted under slope constraints, has the greatest undiscounted value. It has been a solved problem since 1965, it is polynomial, and it is solved exactly by maximum closure.'}{' '}
        <Cite id="lerchs1965" />
        {es
          ? ' No dice nada sobre el tiempo. No sabe que una tonelada este ano vale mas que una tonelada en diez anos, ni que una flota mueve una cantidad finita al ano, ni que la planta tiene un limite.'
          : ' It says nothing about time. It does not know that a tonne this year is worth more than a tonne in ten years, nor that a fleet moves a finite amount per year, nor that the plant has a limit.'}
      </p>

      <p>
        {es
          ? 'PhaseFlow responde la otra pregunta: EN QUE ANO se extrae cada bloque, sujeto a precedencia de talud en cada periodo y a capacidad por periodo, maximizando el valor descontado. Ese es el problema del pit limite restringido, CPIT, y a diferencia del pit final es NP-duro.'
          : 'PhaseFlow answers the other question: in WHICH YEAR each block is extracted, subject to slope precedence in every period and to per-period capacity, maximising discounted value. That is the constrained pit limit problem, CPIT, and unlike the ultimate pit it is NP-hard.'}{' '}
        <Cite id="caccetta2003" />
      </p>

      <Callout variant="note" title={es ? 'Por que importa el orden' : 'Why the ordering matters'}>
        {es
          ? 'El descuento quiere todo ahora. La precedencia dice que primero hay que sacar lo que esta encima. La capacidad dice cuanto cabe por ano. Un plan es donde esas tres presiones se equilibran, y el equilibrio es distinto para cada tasa, cada flota y cada planta. Por eso el hoyo cambia de forma cuando mueves un control: la geometria es el resultado del calculo, no una ilustracion de el.'
          : 'Discounting wants everything now. Precedence says the rock on top comes off first. Capacity says how much fits in a year. A schedule is where those three pressures balance, and the balance is different for every rate, every fleet and every plant. That is why the hole changes shape when you move a control: the geometry IS the computed result, not an illustration of it.'}
      </Callout>

      <h2>{es ? 'Quien lo usa' : 'Who it is for'}</h2>
      <p>
        {es
          ? 'Planificacion estrategica de largo plazo: el paso posterior al limite del pit, donde se decide la secuencia de fases y con ella el perfil de caja del proyecto. En la practica industrial esto se hace con un encadenamiento de cuatro pasos: pits anidados por factor de ingreso, seleccion manual de pushbacks, subdivision en fases de banco y asignacion de periodos.'
          : 'Long-term strategic planning: the step after the pit limit, where the phase sequence is decided and with it the cash profile of the project. In industrial practice this is done as a four-step chain: nested pits by revenue factor, manual pushback selection, subdivision into bench-phases, and period assignment.'}{' '}
        <Cite id="chicoisne2012" />
        {es
          ? ' Solo dos de esos cuatro pasos son algoritmos; la seleccion de pushbacks la hace una persona, y el cumplimiento de las restricciones tambien.'
          : ' Only two of those four steps are algorithms; the pushback selection is done by a person, and so is compliance with the constraints.'}{' '}
        <Cite id="morales2015" />
      </p>

      <h2>{es ? 'La honestidad primero' : 'Honesty first'}</h2>
      <p>
        {es
          ? 'Ningun plan aqui es optimo, y ninguno pretende serlo. Lo que se entrega es una COTA SUPERIOR CERTIFICADA (el optimo exacto de la relajacion lineal) y planes factibles heuristicos, con la brecha entre ambos en pantalla en todo momento. La brecha es la unica forma de saber si un NPV es bueno: sin ella, un numero grande y un numero correcto se ven igual.'
          : 'No schedule here is optimal, and none pretends to be. What ships is a CERTIFIED UPPER BOUND (the exact optimum of the linear relaxation) plus feasible heuristic schedules, with the gap between them on screen at all times. The gap is the only way to know whether an NPV is good: without it, a large number and a correct number look identical.'}
      </p>

      <Figure caption={es ? 'La escalera: clasico, SOTA, aprendido, y lo que queda fuera a proposito.' : 'The ladder: classical, SOTA, learned, and what is deliberately left out.'}>
        <table className="pf-table">
          <thead>
            <tr><th>{es ? 'peldano' : 'rung'}</th><th>{es ? 'metodo' : 'method'}</th><th>{es ? 'que reclama' : 'what it claims'}</th></tr>
          </thead>
          <tbody>
            <tr><td>classical</td><td>bench-by-bench</td><td>{es ? 'un plan, y a proposito malo: el piso' : 'a schedule, and deliberately a bad one: the floor'}</td></tr>
            <tr><td>classical</td><td>nested-shells</td><td>{es ? 'la cadena de cuatro pasos de la industria' : "the industry's four-step chain"}</td></tr>
            <tr><td>classical</td><td>toposort-greedy / gershon</td><td>{es ? 'las heuristicas publicadas de base' : 'the published baseline heuristics'}</td></tr>
            <tr><td>sota</td><td>critical multiplier</td><td>{es ? 'una cota certificada, no un plan' : 'a certified bound, not a schedule'}</td></tr>
            <tr><td>sota</td><td>toposort-expected</td><td>{es ? 'el mejor redondeo publicado, sembrado por el LP' : 'the best published rounding, seeded by the LP'}</td></tr>
            <tr><td>sota</td><td>exact C-PIT[D] re-solve</td><td>{es ? 'el mejor plan factible que produce este producto' : 'the best feasible plan this product produces, and it is `cpitD-local-search`'}</td></tr>
            <tr><td>{es ? 'fuera' : 'out'}</td><td>{es ? 'acopios, mezcla, estocastico' : 'stockpiles, blending, stochastic'}</td><td>{es ? 'citados, no reclamados' : 'cited, not claimed'}</td></tr>
          </tbody>
        </table>
      </Figure>

      <h2>{es ? 'Alcance honesto' : 'Honest scope'}</h2>
      <ul>
        <li>{es ? 'Sin acopios. Un inventario cuya ley recuperada es la mezcla de su contenido vuelve bilineal el modelo; los modelos lineales publicados fijan la ley del acopio como parametro y la buscan.' : 'No stockpiles. An inventory whose reclaimed grade is the blend of what is inside makes the model bilinear; the published linear models fix the stockpile grade as a parameter and search over it.'} <Cite id="rezakhah2020a" /></li>
        <li>{es ? 'Sin mezcla ni restricciones generales de lado. El lector de .pcpsp las lee y el solver no las resuelve, y eso se declara.' : 'No blending or other general side constraints. The .pcpsp reader reads them and the solver does not solve them, and that is declared.'}</li>
        <li>{es ? 'Sin optimizacion estocastica. Un plan robusto sobre multiples realizaciones es otro modelo.' : 'No stochastic optimisation. A schedule robust over multiple realisations is a different model.'} <Cite id="ramazan2013" /></li>
        <li>{es ? 'Sin transporte ni despacho, sin ley de corte como producto, sin pit final como producto: esos son otros miembros de la linea.' : 'No haulage or dispatch, no cutoff grade as a product, no ultimate pit as a product: those are other members of the line.'}</li>
      </ul>

      <Refs ids={['lerchs1965', 'caccetta2003', 'chicoisne2012', 'morales2015', 'ramazan2013', 'rezakhah2020a', 'newman2010']} label="References" />
    </div>
  );
}
