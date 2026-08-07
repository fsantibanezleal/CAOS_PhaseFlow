import { Callout, Cite, Equation, InlineMath, Refs, SubTabs, useShellLang } from '@fasl-work/caos-app-shell';

export default function Methodology() {
  const es = useShellLang() === 'es';

  const tabs = [
    {
      id: 'formulation',
      label: es ? 'Formulacion' : 'Formulation',
      content: (
        <>
          <p>
            {es ? 'CPIT en variables acumuladas, la forma en que estan enunciados todos los algoritmos y todas las cotas publicadas. ' : 'CPIT in cumulative variables, the form every published algorithm and every published bound is stated in. '}
            <InlineMath tex="x_{bt}=1" /> {es ? 'significa que el bloque' : 'means block'} <InlineMath tex="b" /> {es ? 'fue extraido al FINAL del periodo' : 'has been extracted by the END of period'} <InlineMath tex="t" />.
          </p>
          <Equation
            tex={String.raw`\max \sum_{b\in\mathcal B}\sum_{t=1}^{T} p_{bt}\,\bigl(x_{bt}-x_{b,t-1}\bigr)`}
            caption={es ? 'valor descontado del material extraido' : 'discounted value of the extracted material'}
          />
          <Equation
            tex={String.raw`\sum_{b\in\mathcal B} a_{rb}\,\bigl(x_{bt}-x_{b,t-1}\bigr) \;\le\; c_{rt} \qquad \forall r,\ \forall t`}
            caption={es ? 'capacidad por recurso y por periodo' : 'capacity per resource, per period'}
          />
          <Equation
            tex={String.raw`x_{bt}\le x_{at}\ \ \forall (a,b)\in\mathcal A,\ \forall t \qquad x_{bt}\le x_{b,t+1} \qquad x_{b0}=0`}
            caption={es ? 'precedencia en CADA periodo, y monotonia: lo extraido no vuelve' : 'precedence in EVERY period, and monotonicity: once mined, it stays mined'}
          />
          <p>
            {es ? 'con' : 'with'} <InlineMath tex="p_{bt}=p_b/(1+\eta)^{t-1}" />
            {es ? ', es decir el primer periodo NO se descuenta. Esa convencion se fijo por medicion, no por lectura: bajo ella la cota calculada sobre el newman1.cpit publicado da 24.487.410 contra la cota publicada de 24.486.549; la otra convencion da 22.673.528, un 8 por ciento fuera.' : ', that is, the first period is NOT discounted. That convention was settled by measurement rather than by reading: under it the bound computed on the published newman1.cpit gives 24,487,410 against the published 24,486,549; the other convention gives 22,673,528, off by 8 percent.'}
          </p>
          <p>
            {es ? 'Tres cosas que un lector nuevo pasa por alto y que son errores reales: la precedencia se impone en CADA periodo (por eso es una restriccion de planificacion y no de conjunto); la monotonia es una restriccion de verdad, y omitirla permite silenciosamente "des-extraer" un bloque; y el DESTINO esta fijado antes de resolver, plegado dentro de' : 'Three things a new reader misses, each a real bug: precedence is imposed in EVERY period (which is what makes it a scheduling constraint rather than a set constraint); monotonicity is a real constraint, and dropping it silently lets a block be un-mined; and the DESTINATION is fixed before the model runs, folded into'} <InlineMath tex="p_b" />.
          </p>
          <Callout variant="honest" title={es ? 'CPIT contra PCPSP' : 'CPIT versus PCPSP'}>
            {es
              ? 'CPIT fija el destino de antemano. PCPSP deja que el modelo lo elija y admite restricciones generales de lado como mezcla. El paso entre ambos no es contabilidad, es otro problema: la ley de corte deja de ser una entrada y pasa a ser un resultado. PhaseFlow resuelve CPIT y lo dice en el escenario de cada caso.'
              : 'CPIT fixes the destination in advance. PCPSP lets the model choose it and admits general side constraints such as blending. The step between them is not accounting, it is a different problem: the cutoff grade stops being an input and becomes a result. PhaseFlow solves CPIT and says so in every case scenario.'}{' '}
            <Cite id="jelvez2018" />
          </Callout>
        </>
      ),
    },
    {
      id: 'bound',
      label: es ? 'La cota' : 'The bound',
      content: (
        <>
          <p>
            {es ? 'La relajacion LP es una cota superior valida, y para una restriccion de recurso por periodo se resuelve EXACTAMENTE sin solver LP. Ese es el Teorema 3.1 de ' : 'The LP relaxation is a valid upper bound, and for one resource constraint per period it is solved EXACTLY with no LP solver. That is Theorem 3.1 of '}
            <Cite id="chicoisne2012" />{es ? ', en ' : ', in '}<InlineMath tex="O(mn\log n)" />.
          </p>
          <p>{es ? 'Primero, la suma de Abel convierte el objetivo por periodo en una suma de pesos POSITIVOS sobre valores de pit acumulados:' : 'First, Abel summation turns the by-period objective into a POSITIVELY weighted sum over cumulative pit values:'}</p>
          <Equation
            tex={String.raw`\sum_t d_t\,(x_t-x_{t-1})\cdot p \;=\; \sum_t \gamma_t\,(x_t\cdot p), \qquad \gamma_t=d_t-d_{t+1}>0,\ \ \gamma_T=d_T`}
          />
          <p>{es ? 'Como cada peso es positivo, maximizar el total es maximizar cada termino por separado. Segundo, relajar las capacidades a su forma acumulada desacopla los periodos en T problemas independientes:' : 'Because every weight is positive, maximising the total is maximising each term separately. Second, relaxing the capacities into their cumulative form decouples the periods into T independent problems:'}</p>
          <Equation
            tex={String.raw`\mathrm{CP}(U_t)=\max\ p\cdot x \quad \text{s.t. } x \text{ closed},\ a\cdot x\le U_t,\ 0\le x\le 1, \qquad U_t=\textstyle\sum_{s\le t}c_s`}
          />
          <p>{es ? 'Tercero, cada uno de esos se alcanza como combinacion convexa de dos PITS ANIDADOS consecutivos de la familia parametrica, que son cierres maximos, que son cortes minimos:' : 'Third, each of those is attained as a convex combination of two consecutive NESTED PITS from the parametric family, which are maximum closures, which are minimum cuts:'}</p>
          <Equation
            tex={String.raw`\alpha=\frac{b^{u}-U}{b^{u}-b^{l}},\qquad x=\alpha\,x^{l}+(1-\alpha)\,x^{u},\qquad a\cdot x = U`}
            caption={es ? 'con b^u >= U >= b^l las capacidades de los dos pits que encajonan' : 'with b^u >= U >= b^l the capacities of the two bracketing pits'}
          />
          <p>
            {es ? 'La busqueda del multiplicador critico se detiene sobre el CERTIFICADO de dualidad, no sobre un ancho de intervalo: ' : 'The search for the critical multiplier stops on the duality CERTIFICATE, not on an interval width: '}
            <InlineMath tex={String.raw`\mathrm{CP}(U)=\min_{\lambda}\bigl[\,\mathrm{UPL}(p-\lambda a)+\lambda U\,\bigr]`} />
            {es ? '. Cuando primal y dual coinciden, los dos pits que encajonan son puntos de quiebre consecutivos; un ancho pequeno no prueba eso.' : '. When primal and dual agree, the two bracketing pits are provably consecutive break-points; a small interval does not prove that.'}
          </p>
          <Callout variant="note" title={es ? 'Bienstock-Zuckerberg no da una cota mejor' : 'Bienstock-Zuckerberg does not give a better bound'}>
            {es
              ? 'Esta demostrado que Z_BZ = Z_LP, porque el sistema de precedencia es totalmente unimodular. BZ es un resultado de VELOCIDAD en instancias enormes, no una cota mas ajustada. Medido por sus autores: 40 segundos donde CPLEX tomo 954.405 segundos, y CPLEX solo resolvio las cinco instancias mas pequenas de quince.'
              : 'It is proven that Z_BZ = Z_LP, because the precedence system is totally unimodular. BZ is a SPEED result on very large instances, not a tighter bound. Measured by its own authors: 40 seconds where CPLEX took 954,405 seconds, and CPLEX solved only the five smallest of fifteen instances at all.'}{' '}
            <Cite id="munoz2017" /> <Cite id="bienstock2010" />
          </Callout>
        </>
      ),
    },
    {
      id: 'rounding',
      label: es ? 'Del limite al plan' : 'From bound to plan',
      content: (
        <>
          <p>
            {es ? 'La cota no es solo la vara de medir, es la SEMILLA del plan. Del optimo fraccionario se lee el tiempo esperado de extraccion de cada bloque:' : 'The bound is not only the yardstick, it is the SEED of the plan. From the fractional optimum one reads each block\'s expected extraction time:'}
          </p>
          <Equation tex={String.raw`E_b=\sum_{t=1}^{T} t\,\bigl(x^{*}_{bt}-x^{*}_{b,t-1}\bigr)\;+\;(T+1)\bigl(1-x^{*}_{bT}\bigr)`} />
          <p>
            {es ? 'y se usa' : 'and uses'} <InlineMath tex="w_b=-E_b" /> {es ? 'como peso del orden topologico: recorre el DAG de precedencia poniendo primero los bloques de mayor peso, y da a cada bloque el periodo mas temprano cuyos recursos alcanzan. La factibilidad es por construccion.' : 'as the topological-order weight: walk the precedence DAG putting high-weight blocks first, and give each block the earliest period whose remaining resources fit. Feasibility is by construction.'}{' '}
            <Cite id="chicoisne2012" />
          </p>
          <table className="pf-table">
            <thead><tr><th>{es ? 'peso' : 'weight'}</th><th>{es ? 'formula' : 'formula'}</th><th>{es ? 'origen' : 'origin'}</th></tr></thead>
            <tbody>
              <tr><td>greedy (GrTS)</td><td><InlineMath tex="w_b=p_b" /></td><td>{es ? 'la base obvia' : 'the obvious baseline'}</td></tr>
              <tr><td>gershon (GeTS)</td><td><InlineMath tex={String.raw`w_b=p_b+\sum_{a\in\mathcal B^{+}(b)}p_a`} /></td><td>Gershon 1987a</td></tr>
              <tr><td>expected (ExTS)</td><td><InlineMath tex="w_b=-E_b" /></td><td><Cite id="chicoisne2012" /></td></tr>
            </tbody>
          </table>
          <p>
            {es
              ? 'La diferencia publicada entre ellos es enorme y es el argumento completo para calcular la cota: en la instancia AsiaMine de los autores con dos restricciones de recurso, los pesos codiciosos llegaron a 0,138 de la cota y los de tiempo esperado a 0,972, con el MISMO codigo de planificacion.'
              : 'The published spread between them is large and is the entire argument for computing the bound: on the authors\' AsiaMine instance with two resource constraints, greedy weights reached 0.138 of the bound and expected-time weights reached 0.972, using the SAME scheduling code.'}
          </p>
          <p>
            {es ? 'Despues, una busqueda local por desplazamiento: adelantar bloques de valor positivo cuando la precedencia y la capacidad lo permiten, y atrasar bloques de valor negativo cuando sus sucesores lo permiten. Ambos movimientos mejoran estrictamente bajo descuento y preservan la factibilidad. NO es el vecindario exacto C-PIT[D] de la seccion 3.3, que re-resuelve un entero restringido y necesita un solver MILP; eso no esta implementado y se dice.'
              : 'Then a shift local search: pull positive-value blocks forward when precedence and capacity allow, push negative-value blocks back when their successors allow. Both moves strictly improve under discounting and preserve feasibility. It is NOT the exact C-PIT[D] neighbourhood of section 3.3, which re-solves a restricted integer program and needs a MILP solver; that is not implemented and is said so.'}{' '}
            <Cite id="lamghari2012" />
          </p>
        </>
      ),
    },
    {
      id: 'controls',
      label: es ? 'Controles' : 'Controls',
      content: (
        <>
          <p>{es ? 'Tres controles, corridos en cada caso, registrados en el artefacto y mostrados en la App. Existen porque un plan equivocado se ve exactamente igual que uno correcto en un grafico.' : 'Three controls, run on every case, recorded in the artifact and shown in the App. They exist because a wrong schedule looks exactly like a right one on a chart.'}</p>
          <ul>
            <li><b>{es ? 'dualidad' : 'duality'}</b>: {es ? 'a tasa 0 con capacidad ilimitada, CPIT colapsa al pit final; el conjunto extraido debe igualar al pit exacto BLOQUE A BLOQUE y la cota debe igualar su valor. El pit exacto lo calcula un camino de codigo distinto (cierre maximo), asi que el control compara dos implementaciones.' : 'at rate 0 with unlimited capacity, CPIT collapses to the ultimate pit; the mined set must equal the exact pit BLOCK FOR BLOCK and the bound must equal its value. The exact pit comes from a different code path (maximum closure), so the control compares two implementations.'}</li>
            <li><b>{es ? 'cota' : 'bound'}</b>: {es ? 'la cota certificada debe ser al menos cualquier objetivo factible. Una cota por debajo de una solucion factible es prueba de un error, no un resultado ajustado.' : 'the certified bound must be at least any feasible objective. A bound below a feasible solution is proof of a bug, not a tight result.'}</li>
            <li><b>{es ? 'invariancia al orden' : 'order invariance'}</b>: {es ? 'todavia a tasa 0 con capacidad ilimitada, el objetivo no puede depender de la secuencia, asi que todos los pesos deben devolver el mismo valor.' : 'still at rate 0 with unlimited capacity, the objective cannot depend on the sequence, so every weighting must return the same value.'}</li>
          </ul>
          <Callout variant="honest" title={es ? 'Coherencia espacial: el numero que nadie reporta' : 'Spatial coherence: the number nobody reports'}>
            {es
              ? 'Los propios autores del algoritmo lo advierten: "es probable que las soluciones de C-PIT tengan los bloques de un mismo periodo dispersos por toda la mina", y que eso exija intervencion manual. Un plan con NPV alto y cuarenta fragmentos por ano no es un plan minero, y ningun grafico de NPV muestra la diferencia. PhaseFlow mide componentes conexas por periodo, la fraccion en la mayor y el ancho minimo, y las pone en pantalla.'
              : 'The algorithm\'s own authors warn of it: "it is likely that the C-PIT solutions are such that blocks scheduled in a same time period are scattered throughout the mine", and that this needs manual intervention. A schedule with a high NPV and forty fragments per year is not a mine plan, and no NPV chart shows the difference. PhaseFlow measures connected components per period, the share in the largest, and the minimum width, and puts them on screen.'}{' '}
            <Cite id="chicoisne2012" /> <Cite id="bai2018" />
          </Callout>
        </>
      ),
    },
    {
      id: 'excluded',
      label: es ? 'Fuera de alcance' : 'Out of scope',
      content: (
        <>
          <p>{es ? 'Lo que NO esta aqui, con la razon, porque un alcance no declarado se lee como una capacidad.' : 'What is NOT here, with the reason, because an undeclared scope reads as a capability.'}</p>
          <h3>{es ? 'Acopios' : 'Stockpiles'}</h3>
          <p>
            {es
              ? 'Un acopio no es un tercer destino. El metal recuperado es (toneladas que salen) por (ley promedio de la pila), y esa ley promedio es a su vez un cociente de variables de decision: el modelo honesto es BILINEAL. Los modelos lineales publicados existen precisamente por eso, y su tecnica es fijar la ley del acopio como PARAMETRO y buscar sobre ella. Ademas el valor es fragil: con 5 y 10 por ciento de degradacion anual, el valor que aporta un acopio cae 37 y 69 por ciento.'
              : 'A stockpile is not a third destination. The metal reclaimed is (tonnes out) times (average grade of the pile), and that average grade is itself a ratio of decision variables: the honest model is BILINEAR. The published linear models exist precisely for that reason, and their technique is to fix the stockpile grade as a PARAMETER and search over it. The value is also fragile: at 5 and 10 percent annual degradation, the value a stockpile provides falls by 37 and 69 percent.'}{' '}
            <Cite id="moreno2017" /> <Cite id="rezakhah2020a" /> <Cite id="rezakhah2020b" />
          </p>
          <p>
            {es
              ? 'Lo que la industria hace bajo presion de escala tambien esta documentado: quitar los acopios del modelo, lo que produce planes que subestiman la capacidad y la flexibilidad, y reintroducirlos despues no funciona.'
              : 'What industry does under scale pressure is documented too: remove the stockpiles from the model, which produces plans that underestimate capacity and flexibility, and reintroducing them afterwards does not work.'}{' '}
            <Cite id="blom2024" />
          </p>
          <h3>{es ? 'Mezcla y restricciones de produccion minima' : 'Blending and minimum-production constraints'}</h3>
          <p>{es ? 'El lector de .pcpsp lee NGENERAL_SIDE_CONSTRAINTS y el solver no las resuelve. Una restriccion de produccion minima (sentido G) hace que el algoritmo levante NotImplementedError en vez de resolver silenciosamente otro problema.' : 'The .pcpsp reader reads NGENERAL_SIDE_CONSTRAINTS and the solver does not solve them. A minimum-production constraint (sense G) makes the algorithm raise NotImplementedError rather than quietly solve a different problem.'}</p>
          <h3>{es ? 'Estocastico' : 'Stochastic'}</h3>
          <p>
            {es
              ? 'Un programa entero estocastico de dos etapas sobre un conjunto de realizaciones es otro modelo. La ganancia publicada en un caso de estudio de oro australiano es cerca de 10 por ciento de NPV sobre el enfoque tradicional; ese numero es de otro trabajo y no de este.'
              : 'A two-stage stochastic integer program over an ensemble of realisations is a different model. The published gain on an Australian gold case study is about 10 percent of NPV over the traditional approach; that number belongs to that work and not to this one.'}{' '}
            <Cite id="ramazan2013" /> <Cite id="goodfellow2016" />
          </p>
        </>
      ),
    },
  ];

  return (
    <div className="page-body">
      <h1>{es ? 'Metodologia' : 'Methodology'}</h1>
      <SubTabs tabs={tabs} ariaLabel={es ? 'Familias de metodo' : 'Method families'} />
      <Refs ids={['chicoisne2012', 'munoz2017', 'bienstock2010', 'jelvez2018', 'espinoza2013', 'lamghari2012', 'moreno2017', 'rezakhah2020a', 'rezakhah2020b', 'blom2024', 'ramazan2013', 'goodfellow2016', 'bai2018', 'lambert2014']} label="References" />
    </div>
  );
}
