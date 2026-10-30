# Notebooks de PhaseFlow

Esta ruta en español avanza desde la formulación CPIT y la procedencia de datos hasta las cotas certificadas, la elección de destinos, la incertidumbre geológica, los modelos sustitutos aprendidos y la operabilidad de los planes. Ejecuta métodos de referencia, métodos publicados y el conjunto propuesto de tiempos esperados con datos del producto. El caso didáctico reproducible de 48 bloques se construye con la canalización de PhaseFlow y lo resuelve OreBlocks en su versión fijada; los experimentos sintéticos se distinguen de los agregados publicados de MineLib.

## Tema 01: problema CPIT y planificación

- 01-problem/01-problem-and-published-data.ipynb : nivel 1: formular la decisión por período, distinguir los datos sintéticos de los agregados MineLib, ejecutar el primer plan e inspeccionar la carga de recursos.
- 01-problem/02-bound-and-feasible-plan.ipynb : nivel 2: calcular certificados por recurso, comparar cuatro métodos del paquete frente a una cota, graficar carga y brechas y ejecutar controles independientes.
- 01-problem/03-sliding-window-and-expected-ordering.ipynb : nivel 3: ejecutar la heurística de ventana deslizante respaldada por la literatura en la misma entrada que Expected, comparar valores y brechas medidas y explicar los límites del prefijo candidato y la cola optimista.

## Tema 02: elección del destino

- 02-destination-choice/01-first-destination-schedule.ipynb : nivel 1: construir un caso con destinos, ejecutar un primer plan conjunto de período y destino y conciliar planta, estéril, valor y recursos.
- 02-destination-choice/02-destination-strategies-and-cutoffs.ipynb : nivel 2: comparar decisiones de destino fijas y adaptativas, y medir cómo los cortes cambian el plan factible y su interpretación económica.
- 02-destination-choice/03-published-binary-formulation.ipynb : nivel 3: ejecutar la formulación binaria publicada sobre la misma instancia y comparar el resultado exacto con heurísticas del paquete y la relajación LP.

El tema incluye nivel 3 porque el dossier de elección de destino y el SDD identifican la formulación binaria publicada como base de comparación. El estudio de elección de destino no plantea un método de nivel 4.

## Tema 03: incertidumbre geológica

- 03-uncertainty/01-single-plan-risk.ipynb : nivel 1: construir un plan determinista, generar realizaciones sintéticas correlacionadas espacialmente y medir la exposición del plan fijo.
- 03-uncertainty/02-compare-risk-aware-candidates.ipynb : nivel 2: puntuar varios planes generados por el paquete en las mismas realizaciones y comparar retorno esperado con P10 de cola inferior.
- 03-uncertainty/03-replanning-across-realisations.ipynb : nivel 3: seleccionar una política fija de mayor media antes de observar resultados y luego volver a resolver cada realización con búsqueda local C-PIT[D] exacta y restringida, siempre desde el mismo incumbente, para comparar ganancias pareadas. Es replanificación determinista por escenarios con una cota inferior heurística, no un programa entero estocástico de dos etapas.
- 03-uncertainty/04-learned-expected-time-ensemble.ipynb : nivel 4: inspeccionar el conjunto de tiempos esperados, reproducir un plan sintético, evaluar transferencia por depósitos disjuntos e interpretar la cola de fallas y su alerta.

El notebook de nivel 3 ejecuta replanificación determinista por escenario, como describe la investigación persistida, y la compara con candidatos fijos sobre realizaciones idénticas. Se presenta explícitamente como comparación heurística, no como programación entera estocástica de dos etapas ni EVPI. La lección de nivel 4 cubre el método propuesto de tiempos esperados del SDD y conserva tanto la mediana de prueba como su cola de fallas.

## Tema 04: modelos sustitutos aprendidos

- 04-learned-surrogates/01-learned-preview.ipynb : nivel 1: cargar modelos comprometidos de tiempos esperados y cota, construir un plan aprendido factible y medirlo frente a ExTS exacto.
- 04-learned-surrogates/02-cross-case-validation.ipynb : nivel 2: comparar razones pareadas de valor en cuatro arquetipos generados e inspeccionar la regla en particiones de validación y limpias. Sin nivel 3: el dossier evalúa el surrogate propio y no identifica una implementación aprendida de referencia ejecutable.

## Tema 05: operabilidad

- 05-operability/01-coherence-and-width.ipynb : nivel 1: medir fragmentación por período y ancho de banco, aplicar el postproceso factible y revisar su cambio medido.
- 05-operability/02-width-tradeoffs.ipynb : nivel 2: comparar objetivos y planes iniciales, verificar controles y graficar reducción de ancho frente al costo y los rechazos de capacidad. Sin nivel 3: la literatura modela pushbacks en otro problema y no hay referencia ejecutable para el postproceso restringido de PhaseFlow.

Instale el entorno exacto desde la raíz con python -m pip install -r notebooks/requirements.txt. Ejecute todos los notebooks con python scripts/run_notebooks.py. Antes de una versión, ejecute python scripts/run_notebooks.py --check --tmp <raíz-temporal-externa> y python scripts/check_notebooks.py.
