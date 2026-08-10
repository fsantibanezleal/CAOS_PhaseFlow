import { Callout, Cite, Figure, Refs, useShellLang } from '@fasl-work/caos-app-shell';

export default function Implementation() {
  const es = useShellLang() === 'es';
  return (
    <div className="page-body">
      <h1>{es ? 'Implementacion' : 'Implementation'}</h1>

      <h2>{es ? 'El motor es un repositorio aparte' : 'The engine is a separate repository'}</h2>
      <p>
        {es
          ? 'PhaseFlow no declara paquete propio. El motor de scheduling vive en oreblocks, un proyecto PyPI publicado y versionado, y este producto lo consume fijado. La razon no es de estilo: un paquete interno sin publicar anuncia una libreria que nadie puede instalar y deja al producto en un estado intermedio que no es ni una cosa ni la otra. data-pipeline/ es tooling local invocado por ruta.'
          : 'PhaseFlow declares no package of its own. The scheduling engine lives in oreblocks, a published and versioned PyPI project, and this product consumes it pinned. The reason is not stylistic: an unpublished internal package advertises a library nobody can install and leaves the product in a middle state that is neither one thing nor the other. data-pipeline/ is repo-local tooling invoked by path.'}
      </p>
      <p>
        {es
          ? 'La eleccion fue deliberada. Un planificador CPIT necesita cinco cosas (malla de bloques, precedencia en CSR, valores netos por bloque, lectura de formatos MineLib y un solver exacto de cierre maximo) y oreblocks ya publicaba las cinco. Un cuarto repositorio habria dependido de oreblocks y aportado un nombre.'
          : 'The choice was deliberate. A CPIT scheduler needs five things (a block grid, precedence in CSR, per-block net values, MineLib format IO, and an exact maximum-closure solver) and oreblocks already published all five. A fourth repository would have depended on oreblocks and contributed a name.'}
      </p>

      <h2>{es ? 'Los dos contratos' : 'The two contracts'}</h2>
      <p>
        {es
          ? 'CONTRATO 1, ingesta: un modelo de bloques se vuelve instancia solo si pasa identificadores densos, arcos que existen y apuntan HACIA ARRIBA, coeficientes no negativos con tonelaje estrictamente positivo, objetivo sin NaN, y un escenario respondible. Las condiciones legales pero notables se MARCAN, y las marcas viajan al manifiesto y a la pantalla.'
          : 'CONTRACT 1, ingestion: a block model becomes an instance only if it passes dense ids, arcs that exist and point UPWARD, non-negative coefficients with a strictly positive tonnage, an objective with no NaN, and an answerable scenario. Legal but notable conditions are FLAGGED, and the flags ride into the manifest and onto the screen.'}
      </p>
      <p>
        {es
          ? 'CONTRATO 2, artefacto: los esquemas de traza y manifiesto estan espejados en TypeScript, asi que una divergencia rompe el build, y el pipeline vuelve a leer lo que escribio antes de terminar. Una de esas verificaciones es de licencia: una instancia no redistribuible nunca puede llevar datos por bloque.'
          : 'CONTRACT 2, artifact: the trace and manifest schemas are mirrored in TypeScript, so a drift fails the build, and the pipeline re-reads what it wrote before finishing. One of those assertions is a licence assertion: a non-redistributable instance can never carry per-block data.'}
      </p>

      <h2>{es ? 'Tres trampas del formato publicado, medidas' : 'Three published-format traps, measured'}</h2>
      <Figure caption={es ? 'Medidas sobre los archivos reales de newman1, no inferidas de la prosa.' : 'Measured on the real newman1 files, not inferred from prose.'}>
        <table className="pf-table">
          <thead><tr><th>{es ? 'trampa' : 'trap'}</th><th>{es ? 'que pasa' : 'what happens'}</th></tr></thead>
          <tbody>
            <tr>
              <td>{es ? 'coeficientes dispersos' : 'sparse coefficients'}</td>
              <td>{es ? 'el recurso 0 tiene fila para los 1060 bloques y el recurso 1 solo para 572: el lastre no consume planta. Un lector que exige R por n filas falla en el archivo publicado.' : 'resource 0 has a row for all 1060 blocks and resource 1 for only 572: waste consumes no plant capacity. A reader requiring R times n rows fails on the published file.'}</td>
            </tr>
            <tr>
              <td>{es ? 'centinela de destino' : 'destination sentinel'}</td>
              <td>{es ? 'el ultimo bloque lleva -5.36024E+19 para el destino 1, que significa destino prohibido y no un costo de 5e19. Sumarlo produce basura.' : 'the last block carries -5.36024E+19 for destination 1, meaning that destination is forbidden and not a cost of 5e19. Summing it produces nonsense.'}</td>
            </tr>
            <tr>
              <td>{es ? 'columnas no numericas' : 'non-numeric columns'}</td>
              <td>{es ? 'newman1 lleva un codigo de tipo de roca (FRWS, FROR, OXOR) en su primera columna libre, asi que llamar a float en cada token revienta con el archivo real.' : 'newman1 carries a rock-type code (FRWS, FROR, OXOR) in its first free column, so calling float on every token crashes on the real file.'}</td>
            </tr>
          </tbody>
        </table>
      </Figure>
      <p>
        {es
          ? 'La columna de tonelaje se resolvio por instancia y nunca se adivino: newman1 por el orden de su propia cabecera, kd porque el archivo trae una fila de encabezados que nombra tonn, y zuck_small por consistencia interna, siendo la unica columna estrictamente positiva, que domina a la columna 7 en cada fila, mientras la 7 vale cero exactamente en los bloques cuyo valor de proceso es cero.'
          : 'The tonnage column was resolved per instance and never guessed: newman1 by its own header order, kd because the file carries a header row naming tonn, and zuck_small by internal consistency, being the only strictly positive column, which dominates column 7 on every row, while column 7 is zero on exactly the blocks whose process value is zero.'}
      </p>

      <h2>{es ? 'Los carriles y la puerta' : 'The lanes and the gate'}</h2>
      <p>
        {es
          ? 'El carril offline es Python; el carril en vivo es un puerto TypeScript de los mismos algoritmos, corriendo sobre el modelo de bloques que trae la traza. El modelo NO se regenera en el navegador: hacerlo obligaria a portar un generador de campos aleatorios sembrado y esperar que las dos implementaciones coincidan bit a bit, que es exactamente la divergencia silenciosa que hace que un carril en vivo muestre otra respuesta.'
          : 'The offline lane is Python; the live lane is a TypeScript port of the same algorithms, running on the block model the trace carries. The model is NOT regenerated in the browser: doing that would mean porting a seeded random-field generator and hoping the two implementations agree bit for bit, which is exactly the silent divergence that makes a live lane show a different answer.'}
      </p>
      <p>
        {es
          ? 'La puerta clasifica cada caso como live o replay a partir de numeros medidos: bloques, arcos de precedencia y tamano de traza, con el tiempo offline registrado. Un caso MineLib es siempre replay, porque sus datos por bloque no pueden redistribuirse y por lo tanto nunca llegan al navegador.'
          : 'The gate classifies each case as live or replay from measured numbers: blocks, precedence arcs and trace size, with the offline time recorded. A MineLib case is always replay, because its per-block data may not be redistributed and therefore never reaches the browser.'}
      </p>
      <Callout variant="note" title={es ? 'Paridad offline contra vivo' : 'Offline versus live parity'}>
        {es
          ? 'Un test de paridad afirma que el motor TypeScript reproduce el pit final de Python bloque a bloque y la cota certificada a 1e-6 sobre un caso comiteado, y que un plan vivo es factible y nunca supera la cota. NO afirma igualdad de NPV, porque el carril vivo y el offline corren metodos distintos.'
          : 'A parity test asserts that the TypeScript engine reproduces the Python ultimate pit block for block and the certified bound to 1e-6 on a committed case, and that a live schedule is feasible and never beats the bound. It does NOT assert an NPV equality, because the live lane and the offline lane run different methods. Without it, live and replay can be two different sciences presented as one.'}
      </Callout>

      <h2>{es ? 'Rendimiento, y de donde salio' : 'Performance, and where it came from'}</h2>
      <p>
        {es
          ? 'La primera version del algoritmo del multiplicador critico re-derivaba la misma familia de pits una vez por periodo. Los puntos de quiebre no dependen del periodo, solo la capacidad objetivo, asi que ahora se resuelven perezosamente en un cache compartido y cada solve nuevo se restringe al menor pit conocido que debe contenerlo. Medido sobre el newman1.cpit publicado: 91 y 89 cierres antes, 34 y 45 despues, de 5,4 s a 1,3 s. Sobre un gemelo de 6912 bloques con dos recursos: 347 y 337 antes, 129 y 73 despues, de 36 s a 11,7 s. Cotas y planes identicos.'
          : 'The first version of the critical multiplier algorithm re-derived the same pit family once per period. The break-points do not depend on the period, only the target capacity does, so they are now solved lazily into a shared cache and each new solve is restricted to the smallest known pit that must contain it. Measured on the published newman1.cpit: 91 and 89 closures before, 34 and 45 after, 5.4 s to 1.3 s. On a 6912-block twin with two resources: 347 and 337 before, 129 and 73 after, 36 s to 11.7 s. Identical bounds and schedules.'}
      </p>
      <p>
        {es
          ? 'El criterio de parada tambien cambio, y ese cambio era de correccion y no de velocidad: antes se detenia por ancho de intervalo, que no prueba nada sobre si los dos pits que encajonan son puntos de quiebre consecutivos. Ahora se detiene sobre el certificado de dualidad.'
          : 'The stopping rule also changed, and that change was about correctness rather than speed: it used to stop on an interval width, which proves nothing about whether the two bracketing pits are consecutive break-points. It now stops on the duality certificate.'}{' '}
        <Cite id="chicoisne2012" />
      </p>

      <Refs ids={['chicoisne2012', 'espinoza2013', 'oreblocks', 'munoz2017']} label="References" />
    </div>
  );
}
