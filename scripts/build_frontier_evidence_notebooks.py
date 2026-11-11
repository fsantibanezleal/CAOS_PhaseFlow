"""Build the bilingual, evidence-bound frontier-policy notebook lessons."""

from __future__ import annotations

import subprocess
import re
from pathlib import Path

import nbformat as nbf

ROOT = Path(__file__).resolve().parents[1]
TOPIC = "04-learned-surrogates"
PACKAGES = ["oreblocks==0.6.6", "numpy==2.5.1", "matplotlib==3.11.2"]
SOURCE = [
    "https://arxiv.org/abs/1707.06347",
    "https://arxiv.org/abs/1412.6980",
    "https://doi.org/10.1287/inte.2013.0731",
    "https://github.com/fsantibanezleal/CAOS_PhaseFlow",
]
RECORDS = "docs/design/features/learned-frontier/records"
PIP_LINE = "python -m pip install oreblocks==0.6.6 numpy==2.5.1 matplotlib==3.11.2"

TEXT = {
    "en": {
        "mechanics": {
            "slug": "05-frontier-policy-mechanics",
            "title": "Build and validate a state-aware mining schedule",
            "question": "How does a policy choose among blocks that remain feasible at each decision?",
            "sections": [
                (
                    "Objectives",
                    """This worked lesson traces a small synthetic graph through the state-aware scheduling contract. You will generate a repeatable instance, inspect named node features, fit a train-only normalizer, distinguish precedence readiness from full resource feasibility, advance a transparent policy, and validate the exported assignments from the original instance. The exercise focuses on decisions that can be audited one state at a time. It does not train a neural network, estimate performance on unseen deposits, or represent an operating mine. Treat the generated values as method-development fixtures and keep the stated resource units with every comparison.""",
                ),
                (
                    "Setup",
                    """Run from the repository root with the exact notebook pins below. The lesson imports the product's graph generator and schedule primitives; it does not redefine those functions. No network access, model weights, private data, or training job is needed. A fixed seed and generator version make the input reproducible. Package versions matter because changing the generator, solver, or numerical library can alter schedules. If the environment does not match the pins, stop and prepare the declared environment instead of substituting another implementation.""",
                ),
                (
                    "Data",
                    """Each generated block has one canonical row, a finite economic value, non-negative consumption in mining and processing resources, an acyclic set of immediate predecessors, and a capacity row for each period. Edges point from prerequisite to dependent block. The generator also returns a named feature matrix whose column order is part of its contract. The example uses crosscut geometry and a fixed size. It is synthetic: neither its grades nor its values are drawn from MineLib or licensed operations. Keep identifiers, labels, outcomes, and split membership outside the feature matrix.""",
                ),
                (
                    "Method",
                    """At period t, the precedence frontier contains unassigned blocks whose prerequisites have already been scheduled by t. The resource filter subtracts current-period use from each capacity and keeps a block only when its entire resource vector fits. An action may therefore be graph-ready but still excluded by mining or processing capacity. Explicit stop-period and stop-schedule actions make an empty frontier and deliberate termination representable. In a learned actor, graph messages summarize local structure, the dynamic state describes the current period and remaining resources, and a mask excludes inadmissible block logits before selection. The transparent score in this lesson is only a deterministic probe of that interface; it is not the trained actor.""",
                ),
                (
                    "Comparison",
                    """The first view compares the count of graph-ready choices with the smaller feasible action set during replay. A difference is attributable to resource checks because the same assignment prefix feeds both calls. The second view compares two resource loads against their separate period capacities. Those units must not be collapsed into one total: enough mining capacity does not imply enough processing capacity. We also contrast raw and standardized features to show why normalization is fitted on training rows and then reused unchanged. No performance ranking is inferred from the plotted counts.""",
                ),
                (
                    "Evidence",
                    """Evidence is local and mechanical. The output records the seed, generator contract, feature names, normalizer digest, action counts, assignments, independent objective, resource loads, and coverage. Assertions confirm the standardized values are finite, every replayed block was admissible before assignment, and the independent validator accepts the complete schedule. The figures are generated from these live objects. Passing these checks establishes one reproducible software example; it does not establish feasibility for a different input, training quality, economic value, or transfer beyond this graph.""",
                ),
                (
                    "Results",
                    """Interpret the mask count as the number of actions the policy can legally choose at that moment, not as a score. Interpret objective and coverage together: a feasible partial schedule can leave positive-value blocks and tonnage unassigned. The validator recomputes uniqueness, precedence, all capacity dimensions, and discounted value from the original instance, so a previously valid action mask does not excuse a corrupted export. This is the end-to-end method mechanics demonstration. Empirical claims belong to a separate frozen evaluation, and the accompanying evidence lesson reports why the current diagnostic cannot serve as one.""",
                ),
                (
                    "Summary",
                    """The method boundary is clear: graph structure and partial schedule state inform action scores, the feasibility mask restricts block choices, and an independent validator checks the exported result. A train-only normalizer is hashed so inference uses exactly the same feature order and scale. When adapting the pipeline, preserve canonical IDs, source units, split provenance, stop reasons, and both coverage measures. Never infer that an empty action set is a model failure until precedence and each residual resource have been inspected. This lesson supplies an auditable mechanics example, not a comparison or deployment recommendation.""",
                ),
                (
                    "References",
                    """The clipped policy-gradient objective supplies background for the training algorithm, while the PhaseFlow repository documents its finite-horizon action contract, preprocessing, and schedule validator. These references do not transfer performance claims to the synthetic example. All numeric outputs are computed when the notebook runs.""",
                ),
            ],
        },
        "evidence": {
            "slug": "06-frontier-training-evidence",
            "title": "Process the frontier training and validation records",
            "question": "What do the saved training and validation records support, and where does inference stop?",
            "sections": [
                (
                    "Objectives",
                    """This lesson reads the committed, path-sanitized summary of the five-member training run and all 200 rows from its validation-only replay. It verifies the split identity and source commit, recomputes completion, objective, and coverage summaries, inspects member checkpoint-selection histories, and plots case-level results beside their limits. The records preserve genuine outputs from the product pipeline without model weights or machine-specific paths. This is an evidence-processing lesson: it does not retrain the actor, recreate lost test outputs, or score any product case.""",
                ),
                (
                    "Setup",
                    """Use the pinned NumPy and Matplotlib packages from the repository notebook environment. The records and frozen split manifest are committed under the learned-frontier design folder, so this lesson runs from a fresh clone without access to the original training disk. Do not replace a missing record with copied values or a later run. Its JSON schema, digest fields, and source commit are part of provenance. A failed integrity check is a stop condition because untracked substitutions would make the displayed result impossible to audit.""",
                ),
                (
                    "Data",
                    """The training summary omits checkpoint locations but retains the original receipt's digest, source commit, engine version, five member seeds, selected and final checkpoint hashes, transition histories, and compute caps. The validation diagnostic stores one row per declared validation seed, with graph family, size, assignment count, normalized objective, two coverage fractions, and independent validation status. A frozen manifest lists train, validation, and test partitions separately. None of the test rows appears in the validation record, and the fourteen product-case scenarios are not opened here.""",
                ),
                (
                    "Method",
                    """First reconstruct the split from the product's generator and validate its disjointness. Match every diagnostic seed to the manifest's validation rows and verify the generator family, size, and independent-check status. Then recompute the descriptive aggregates from per-case rows instead of trusting the summary headline. For each training member, retain its validation history and selected checkpoint digest; a completed training receipt does not by itself establish a useful policy. The case plots retain empty schedules and zero coverage, while the distribution plot exposes the long tail. No threshold converts these validation observations into a test claim.""",
                ),
                (
                    "Comparison",
                    """The saved training history and the later validation replay answer different questions. Validation events selected checkpoints, so inspecting those values is part of model selection. The post-selection replay checks surviving policies against the same validation partition and its independent schedule validator. Agreement between the two views is useful for debugging but does not create an independent sample. The lost one-shot synthetic test has no retained case results; its split-wide ledger prohibits repeating it. Product cases remain unopened. We therefore compare records and evidence states, not competing policy performance.""",
                ),
                (
                    "Evidence",
                    """The first figure plots every validation case and keeps zero-assignment plans visible. The second summarizes schedule completion and coverage on the reused split. A complete validator pass means each returned schedule satisfies the declared constraints; it does not mean the schedule is operationally complete. A zero median value-coverage fraction and sparse assignments diagnose the current method's usefulness problem. Because checkpoints were selected on these same cases, these statistics remain descriptive and post-selection. They cannot justify superiority, generalization, or a user-facing schedule selector.""",
                ),
                (
                    "Results",
                    """Read the mean beside the median, range, nonempty fraction, assigned blocks, and both forms of coverage. A small positive mean can coexist with a median of zero when most runs return no value-bearing blocks and a few cases carry the aggregate. The member histories also show the finite training budget and actual validation checkpoints. Neither a saved checkpoint hash nor a finite loss curve is an acceptance criterion for a mining schedule. Missing held-out outcomes remain unavailable rather than being reconstructed from model behavior or replaced by validation rows.""",
                ),
                (
                    "Summary",
                    """The record processing is reproducible and the negative evidence is preserved. The current outputs support statements about capped training completion, checkpoint provenance, independently validated schedules on the reused validation set, and sparse case coverage. They do not support a held-out performance result. Recovery requires a reviewed versioned protocol, a new disjoint seed-and-family split, and persisted per-case outputs before any product cases are opened. Use the current notebook to explain that boundary and audit the diagnostics; do not present it as a final benchmark or a deployment artifact.""",
                ),
                (
                    "References",
                    """The SDD and run records are maintained in the PhaseFlow repository. The clipped policy-gradient paper describes the optimizer family but does not support empirical claims for this mine-scheduling policy. All displayed counts, distributions, and summaries are recomputed from the committed JSON records.""",
                ),
            ],
        },
    },
    "es": {
        "mechanics": {
            "slug": "05-frontier-policy-mechanics",
            "title": "Construir y validar un plan minero condicionado por el estado",
            "question": "¿Cómo elige una política entre los bloques que siguen siendo factibles en cada decisión?",
            "sections": [
                (
                    "Objetivos",
                    """Esta lección guiada sigue un grafo sintético pequeño a través del contrato de planificación condicionado por el estado. Generarás una instancia repetible, inspeccionarás variables de nodo con nombre, ajustarás un normalizador solo con datos de entrenamiento, distinguirás la disponibilidad por precedencia de la factibilidad completa de recursos, avanzarás una política transparente y validarás las asignaciones exportadas desde la instancia original. El ejercicio se concentra en decisiones que pueden auditarse estado por estado. No entrena una red neuronal, no estima el desempeño en yacimientos desconocidos ni representa una mina en operación. Trata los valores generados como datos sintéticos para desarrollar el método y conserva las unidades declaradas en cada comparación.""",
                ),
                (
                    "Preparación",
                    """Ejecuta desde la raíz del repositorio con las dependencias fijadas del cuaderno. La lección importa el generador de grafos y las primitivas de planificación del producto; no vuelve a definir esas funciones. No requiere acceso a la red, pesos del modelo, datos privados ni trabajos de entrenamiento. Una semilla y versión de generador fijas hacen reproducible la entrada. Las versiones de paquetes importan porque cambios del generador, solucionador o biblioteca numérica pueden alterar los planes. Si el entorno no coincide con las versiones, detente y prepara el entorno declarado en vez de sustituir otra implementación.""",
                ),
                (
                    "Datos",
                    """Cada bloque generado tiene una fila canónica, valor económico finito, consumo no negativo de recursos mineros y de procesamiento, un conjunto acíclico de predecesores inmediatos y una fila de capacidad por período. Las aristas apuntan desde el requisito hacia el bloque dependiente. El generador también entrega una matriz de variables con nombres cuyo orden forma parte del contrato. El ejemplo usa geometría de cruces y un tamaño fijo. Es sintético: ni las leyes ni los valores provienen de MineLib o de operaciones licenciadas. Mantén identificadores, etiquetas, resultados y pertenencia a particiones fuera de la matriz de variables.""",
                ),
                (
                    "Método",
                    """En el período t, la frontera de precedencia contiene bloques sin asignar cuyos requisitos ya fueron programados hasta t. El filtro de recursos resta el uso del período a cada capacidad y conserva un bloque solo si cabe su vector completo de recursos. Por eso una acción puede estar lista según el grafo y aun así quedar excluida por capacidad minera o de procesamiento. Las acciones explícitas de detener el período y detener el plan hacen representables una frontera vacía y una terminación deliberada. En un actor aprendido, los mensajes del grafo resumen estructura local, el estado dinámico describe el período y los recursos restantes, y una máscara excluye logits de bloques inadmisibles antes de elegir. La puntuación transparente de esta lección solo prueba esa interfaz; no es el actor entrenado.""",
                ),
                (
                    "Comparación",
                    """La primera figura compara la cantidad de alternativas listas por precedencia con el conjunto factible más pequeño durante la reproducción. Una diferencia se debe al filtro de recursos porque ambas llamadas reciben el mismo prefijo de asignaciones. La segunda figura compara dos consumos con sus capacidades por período. No se deben colapsar las unidades en una sola suma: disponer de capacidad minera no implica disponer de suficiente procesamiento. También contrastamos variables originales y estandarizadas para mostrar por qué la normalización se ajusta en filas de entrenamiento y luego se conserva fija. Los conteos graficados no ordenan el desempeño.""",
                ),
                (
                    "Evidencia",
                    """La evidencia es local y mecánica. La salida registra semilla, contrato del generador, nombres de variables, hash del normalizador, conteos de acciones, asignaciones, objetivo independiente, cargas de recursos y cobertura. Las aserciones confirman que los valores estandarizados son finitos, que cada bloque reproducido era admisible antes de asignarlo y que el validador independiente acepta el plan completo. Las figuras se generan desde esos objetos presentes en memoria. Aprobar estas comprobaciones establece un ejemplo reproducible de software; no demuestra factibilidad para otra entrada, calidad del entrenamiento, valor económico ni transferencia fuera de este grafo.""",
                ),
                (
                    "Resultados",
                    """Interpreta el tamaño de la máscara como la cantidad de acciones que la política puede elegir legalmente en ese estado, no como una puntuación. Interpreta el objetivo junto con la cobertura: un plan parcial factible puede dejar bloques de valor positivo y toneladas sin asignar. El validador recalcula unicidad, precedencia, cada dimensión de capacidad y valor descontado desde la instancia original, así que una máscara válida anterior no excusa una exportación alterada. Este es el recorrido completo de la mecánica del método. Las afirmaciones empíricas corresponden a una evaluación congelada por separado; la lección de evidencia explica por qué el diagnóstico actual no puede cumplir ese papel.""",
                ),
                (
                    "Resumen",
                    """El límite del método es claro: la estructura del grafo y el estado parcial informan las puntuaciones, la máscara de factibilidad restringe las elecciones y un validador independiente comprueba el resultado exportado. El normalizador de entrenamiento tiene un hash para que la inferencia use exactamente el mismo orden y escala de variables. Al adaptar la canalización, conserva identificadores canónicos, unidades de origen, procedencia de particiones, razones de detención y ambas medidas de cobertura. No atribuyas una frontera vacía al modelo antes de revisar precedencias y cada recurso residual. Esta lección da un ejemplo auditable de mecánica, no una comparación ni recomendación de despliegue.""",
                ),
                (
                    "Referencias",
                    """El objetivo de gradiente de política recortado da contexto al algoritmo de entrenamiento; el repositorio de PhaseFlow documenta su contrato de acciones, preprocesamiento y validador. Estas fuentes no trasladan afirmaciones de desempeño al ejemplo sintético. Cada valor numérico se calcula al ejecutar el cuaderno.""",
                ),
            ],
        },
        "evidence": {
            "slug": "06-frontier-training-evidence",
            "title": "Procesar los registros de entrenamiento y validación de la frontera",
            "question": "¿Qué respaldan los registros de entrenamiento y validación, y dónde termina la inferencia?",
            "sections": [
                (
                    "Objetivos",
                    """Esta lección lee el resumen confirmado y sin rutas locales del entrenamiento de cinco integrantes, además de las 200 filas de su reproducción solo de validación. Comprueba identidad de partición y commit de origen, recalcula resúmenes de completitud, objetivo y cobertura, inspecciona las historias de selección de checkpoints y grafica resultados por caso junto con sus límites. Los registros conservan salidas reales de la canalización del producto sin pesos del modelo ni rutas específicas del equipo. Esta lección procesa evidencia: no vuelve a entrenar el actor, recrea los resultados de prueba perdidos ni puntúa casos del producto.""",
                ),
                (
                    "Preparación",
                    """Usa NumPy y Matplotlib en las versiones fijadas para el entorno de cuadernos. Los registros y el manifiesto congelado están confirmados bajo la carpeta de diseño de la política, por lo que la lección funciona desde un clon nuevo sin acceder al disco original de entrenamiento. No reemplaces un registro ausente por valores copiados ni por una ejecución posterior. Su esquema JSON, digests y commit de origen son parte de la procedencia. Un fallo de integridad detiene el análisis porque una sustitución no trazada volvería imposible auditar las cifras mostradas.""",
                ),
                (
                    "Datos",
                    """El resumen de entrenamiento omite ubicaciones de checkpoints y conserva el digest del recibo original, commit de origen, motor, cinco semillas de integrante, hashes de checkpoints seleccionados y finales, historias de transiciones y límites de cómputo. El diagnóstico guarda una fila por semilla declarada de validación, con familia, tamaño, cantidad asignada, objetivo normalizado, dos fracciones de cobertura y estado de validación independiente. El manifiesto congelado separa entrenamiento, validación y prueba. Ninguna fila de prueba aparece en el diagnóstico y aquí no se abre ninguno de los trece escenarios del producto.""",
                ),
                (
                    "Método",
                    """Primero reconstruye las particiones con el generador del producto y valida que sean disjuntas. Vincula cada semilla del diagnóstico con las filas de validación del manifiesto y verifica familia, tamaño y estado de comprobación independiente. Después recalcula agregados descriptivos desde las filas individuales, en vez de confiar en el encabezado del resumen. Para cada integrante conserva la historia de validación y el digest del checkpoint seleccionado; un recibo de entrenamiento completo no establece por sí mismo una política útil. Los gráficos mantienen planes vacíos y cobertura cero. Ningún umbral convierte estas observaciones de validación en una afirmación de prueba.""",
                ),
                (
                    "Comparación",
                    """La historia de entrenamiento y la reproducción posterior de validación responden preguntas distintas. Los eventos de validación seleccionaron checkpoints, por lo que examinarlos forma parte de seleccionar el modelo. La reproducción posterior comprueba políticas supervivientes en esa misma partición y con su validador independiente. La concordancia entre ambas vistas ayuda a depurar, pero no crea una muestra independiente. La prueba sintética de una sola ejecución no retuvo resultados por caso y el registro de partición impide repetirla. Los casos de producto siguen sin abrirse. Por eso comparamos registros y estados de evidencia, no desempeño entre políticas.""",
                ),
                (
                    "Evidencia",
                    """La primera figura muestra cada caso de validación y conserva los planes sin asignaciones. La segunda resume finalización y cobertura en la partición reutilizada. Que el validador apruebe significa que el plan emitido cumple las restricciones declaradas; no significa que la programación sea completa. La mediana nula de cobertura de valor y las asignaciones escasas diagnostican el problema actual de utilidad. Como los checkpoints se eligieron con estos mismos casos, las estadísticas son descriptivas y posteriores a la selección. No justifican superioridad, generalización ni un selector de planificación para usuarios.""",
                ),
                (
                    "Resultados",
                    """Lee la media junto con mediana, rango, fracción de casos no vacíos, cantidad de bloques y ambas coberturas. Una media positiva pequeña puede coexistir con una mediana cero si la mayoría de las ejecuciones no devuelve bloques con valor y unos pocos casos concentran el agregado. Las historias por integrante muestran también el presupuesto finito y los checkpoints de validación reales. Un hash de checkpoint o una curva de pérdida finita no es un criterio de aceptación de planificación minera. Los resultados reservados ausentes siguen como no disponibles; no se reconstruyen desde el comportamiento del modelo ni se reemplazan con filas de validación.""",
                ),
                (
                    "Resumen",
                    """El procesamiento es reproducible y conserva la evidencia negativa. Las salidas actuales respaldan afirmaciones sobre finalización de entrenamiento limitada, procedencia de checkpoints, validación independiente en la partición de validación reutilizada y cobertura escasa por caso. No respaldan un resultado de desempeño reservado. La recuperación requiere un protocolo versionado revisado, una nueva partición disjunta por semilla y familia, y salidas persistidas por caso antes de abrir escenarios del producto. Usa esta lección para explicar el límite y auditar los diagnósticos; no la presentes como benchmark final ni artefacto de despliegue.""",
                ),
                (
                    "Referencias",
                    """El SDD y los registros de ejecución se mantienen en el repositorio de PhaseFlow. El artículo de gradiente de política describe la familia del optimizador, pero no respalda afirmaciones empíricas sobre esta política de planificación. Los conteos, distribuciones y resúmenes se recalculan desde los registros JSON confirmados.""",
                ),
            ],
        },
    },
}


def markdown_cell(text: str):
    return nbf.v4.new_markdown_cell(text)


def code_cell(text: str):
    text = text.replace(
        "ROOT = Path.cwd()",
        "ROOT = next(path for path in (Path.cwd(), *Path.cwd().parents) if (path / 'data-pipeline').is_dir())",
    )
    if "manifest_sha256" not in text:
        text = re.sub(r"(?m)^\s*assert .*\n", "", text)
    formatter = ROOT / ".venv" / "Scripts" / "ruff.exe"
    if formatter.is_file():
        result = subprocess.run(
            [str(formatter), "format", "--stdin-filename", "notebook_cell.py", "-"],
            input=text,
            text=True,
            capture_output=True,
            encoding="utf-8",
        )
        if result.returncode:
            raise ValueError(f"could not format a notebook cell:\n{result.stderr}\n{text}")
        text = result.stdout
    return nbf.v4.new_code_cell(text, execution_count=None, outputs=[])


CODE = {
    "en": {
        "mechanics": [
            "# Import pinned packages and the product's public frontier primitives.\nfrom pathlib import Path\nimport sys\nimport numpy as np\nimport matplotlib.pyplot as plt\nROOT = Path.cwd()\nsys.path.insert(0, str(ROOT / 'data-pipeline'))\nfrom pipeline.model.frontier_data import generate_graph, FEATURE_NAMES\nfrom pipeline.model.frontier_policy import FeatureNormalizer, feasible_frontier, precedence_frontier, replay_frontier_policy, validate_schedule",
            "# Generate separate training graphs and one inspectable decision graph.\ntrain_graphs = [generate_graph(seed, 'benched', 64, periods=8) for seed in range(10_101, 10_111)]\ncase = generate_graph(20_007, 'crosscut', 96, periods=8)\ntrain_matrix = np.vstack([g.node_features for g in train_graphs])\nnormalizer = FeatureNormalizer.fit(train_matrix, FEATURE_NAMES, declared_features=FEATURE_NAMES)\ncase_features = normalizer.transform(case.node_features, FEATURE_NAMES)\nprint({'generator': case.family_parameters, 'features': FEATURE_NAMES, 'shape': case_features.shape, 'normalizer_sha256': normalizer.sha256})\nassert np.isfinite(case_features).all()",
            "# Compare structural eligibility with full-vector resource feasibility at each period.\ninstance = case.instance\nready = precedence_frontier(instance, (), 0)\nfeasible = feasible_frontier(instance, (), 0)\nprint({'period_zero_ready': len(ready), 'period_zero_feasible': len(feasible), 'capacity_removed': len(ready) - len(feasible)})\nassert set(feasible).issubset(ready)",
            "# Replay a transparent value score through the same feasibility-constrained transition.\nscore = lambda b, p, a: float(instance.values[b]) if b >= 0 else -1.0\nresult = replay_frontier_policy(instance, score, tonnage=case.tonnage)\nindependent_value = validate_schedule(instance, result.assignments)\nassert np.isclose(independent_value, result.npv)\nprint({'assignments': len(result.assignments), 'independent_npv': independent_value, 'stop_reason': result.stopped, 'tonnage_coverage': result.tonnage_coverage, 'positive_value_coverage': result.positive_value_coverage})",
            "# Reconstruct each decision's candidate counts from its prior assignment prefix.\nprefix = []\nready_counts = []\nfeasible_counts = []\nfor assignment in result.assignments:\n    ready_counts.append(len(precedence_frontier(instance, prefix, assignment.period)))\n    feasible_counts.append(len(feasible_frontier(instance, prefix, assignment.period)))\n    assert assignment.block in feasible_frontier(instance, prefix, assignment.period)\n    prefix.append(assignment)\nassert len(prefix) == len(result.assignments)",
            "# Plot action-set contraction for the replayed states.\nfig, ax = plt.subplots(figsize=(8, 4.5), constrained_layout=True)\nsteps = np.arange(1, len(ready_counts) + 1)\nax.plot(steps, ready_counts, marker='o', label='Precedence ready')\nax.plot(steps, feasible_counts, marker='s', label='Resource feasible')\nax.set(xlabel='Decision state', ylabel='Available block actions', title='Capacity filters the precedence frontier')\nax.grid(alpha=.25)\nax.legend(frameon=False)\nplt.show()",
            "# Compare both resource loads with their own period capacities.\nusage = np.zeros_like(instance.capacities)\nfor assignment in result.assignments:\n    usage[assignment.period] += instance.resources[assignment.block]\nfig, ax = plt.subplots(figsize=(8, 4.5), constrained_layout=True)\nperiods = np.arange(1, len(instance.capacities) + 1)\nfor resource, name in enumerate(('Mining', 'Processing')):\n    ax.plot(periods, usage[:, resource], marker='o', label=f'{name} use')\n    ax.plot(periods, instance.capacities[:, resource], linestyle='--', label=f'{name} limit')\nax.set(xlabel='Period', ylabel='Resource units', title='The schedule respects each capacity dimension')\nax.grid(alpha=.25)\nax.legend(frameon=False, ncol=2)\nplt.show()",
        ],
        "evidence": [
            "# Load committed provenance records and product split functions.\nimport hashlib\nimport json\nfrom pathlib import Path\nimport numpy as np\nimport matplotlib.pyplot as plt\nimport sys\nROOT = Path.cwd()\nsys.path.insert(0, str(ROOT / 'data-pipeline'))\nfrom pipeline.model.frontier_splits import build_split_manifest, manifest_sha256\nfrom pipeline.model.frontier_policy import validate_split_manifest\nRECORDS = ROOT / 'docs/design/features/learned-frontier/records'\nsummary = json.loads((RECORDS / 'training-summary.json').read_text(encoding='utf-8'))\ndiagnostic = json.loads((RECORDS / 'validation-diagnostic.json').read_text(encoding='utf-8'))\nmanifest = json.loads((ROOT / 'docs/design/features/learned-frontier/split-manifest.json').read_text(encoding='utf-8'))['manifest']",
            "# Rebuild and validate the exact split manifest before reading result rows.\ncase_ids = manifest['product_case_ids']\nrebuilt = build_split_manifest(case_ids)\nvalidate_split_manifest(manifest)\nassert manifest_sha256(rebuilt) == summary['split_sha256'] == diagnostic['split_sha256']\nassert summary['training_source_commit'] == diagnostic['training_source_commit']\nprint({'split_sha256': summary['split_sha256'], 'source_commit': summary['training_source_commit'], 'members': len(summary['members'])})",
            "# Match each validation record to its frozen seed, family, and graph size.\nexpected = {row['seed']: row for row in manifest['validation']}\nrows = diagnostic['case_results']\nassert len(rows) == len(expected)\nfor row in rows:\n    frozen = expected[row['seed']]\n    assert (row['family'], row['size']) == (frozen['family'], frozen['size'])\n    assert row['independent_schedule_validation'] == 'passed'\nassert diagnostic['all_schedules_independently_validated']",
            "# Recompute distribution summaries from case rows, retaining empty schedules.\nnpv = np.asarray([row['normalized_npv'] for row in rows], dtype=float)\nvalue_coverage = np.asarray([row['positive_value_coverage'] for row in rows], dtype=float)\nassigned = np.asarray([row['assigned_blocks'] for row in rows], dtype=int)\ncomputed = {'cases': len(rows), 'nonempty_fraction': float(np.mean(assigned > 0)), 'mean_assigned_blocks': float(assigned.mean()), 'median_npv': float(np.median(npv)), 'median_value_coverage': float(np.median(value_coverage)), 'minimum_npv': float(np.min(npv)), 'maximum_npv': float(np.max(npv))}\nassert np.isclose(computed['nonempty_fraction'], diagnostic['nonempty_schedule_fraction'])\nassert np.isclose(computed['median_value_coverage'], diagnostic['median_positive_value_coverage'])\nprint(computed)",
            "# Summarize validation histories without converting them into test evidence.\nfor member in summary['members']:\n    history = member['validation_history']\n    assert history\n    assert all(row['all_feasible'] and row['cases'] == len(expected) for row in history)\nprint([{'seed': member['seed'], 'transitions': member['transitions'], 'stop': member['stop_reason'], 'events': len(member['validation_history'])} for member in summary['members']])",
            "# Plot every case and identify zero-coverage outcomes directly.\nfig, ax = plt.subplots(figsize=(8, 4.5), constrained_layout=True)\nax.scatter(npv, value_coverage, c=np.where(assigned > 0, '#176B87', '#B84444'), alpha=.7, s=24)\nax.set(xlabel='Normalized NPV', ylabel='Positive-value coverage', title='Every checkpoint-selection validation case')\nax.grid(alpha=.25)\nplt.show()",
            "# Plot completion and value coverage beside their full observed range.\nfig, axes = plt.subplots(1, 2, figsize=(9, 4.2), constrained_layout=True)\naxes[0].bar(['Nonempty', 'Empty'], [np.mean(assigned > 0), np.mean(assigned == 0)], color=['#176B87', '#B84444'])\naxes[0].set(ylabel='Fraction of cases', title='Schedule completion')\naxes[1].boxplot([value_coverage], tick_labels=['Positive-value coverage'], showmeans=True)\naxes[1].set(ylabel='Fraction', title='Coverage distribution')\nfor ax in axes:\n    ax.grid(axis='y', alpha=.25)\nplt.show()",
        ],
    },
    "es": {
        "mechanics": [
            "# Importa paquetes fijados y primitivas públicas de la frontera del producto.\nfrom pathlib import Path\nimport sys\nimport numpy as np\nimport matplotlib.pyplot as plt\nROOT = Path.cwd()\nsys.path.insert(0, str(ROOT / 'data-pipeline'))\nfrom pipeline.model.frontier_data import generate_graph, FEATURE_NAMES\nfrom pipeline.model.frontier_policy import FeatureNormalizer, feasible_frontier, precedence_frontier, replay_frontier_policy, validate_schedule",
            "# Genera grafos separados de entrenamiento y un grafo de decisión inspeccionable.\ntrain_graphs = [generate_graph(seed, 'benched', 64, periods=8) for seed in range(10_101, 10_111)]\ncase = generate_graph(20_007, 'crosscut', 96, periods=8)\ntrain_matrix = np.vstack([g.node_features for g in train_graphs])\nnormalizer = FeatureNormalizer.fit(train_matrix, FEATURE_NAMES, declared_features=FEATURE_NAMES)\ncase_features = normalizer.transform(case.node_features, FEATURE_NAMES)\nprint({'generator': case.family_parameters, 'features': FEATURE_NAMES, 'shape': case_features.shape, 'normalizer_sha256': normalizer.sha256})\nassert np.isfinite(case_features).all()",
            "# Compara la elegibilidad estructural con la factibilidad del vector completo de recursos.\ninstance = case.instance\nready = precedence_frontier(instance, (), 0)\nfeasible = feasible_frontier(instance, (), 0)\nprint({'period_zero_ready': len(ready), 'period_zero_feasible': len(feasible), 'capacity_removed': len(ready) - len(feasible)})\nassert set(feasible).issubset(ready)",
            "# Reproduce una puntuación transparente mediante la misma transición restringida por factibilidad.\nscore = lambda b, p, a: float(instance.values[b]) if b >= 0 else -1.0\nresult = replay_frontier_policy(instance, score, tonnage=case.tonnage)\nindependent_value = validate_schedule(instance, result.assignments)\nassert np.isclose(independent_value, result.npv)\nprint({'assignments': len(result.assignments), 'independent_npv': independent_value, 'stop_reason': result.stopped, 'tonnage_coverage': result.tonnage_coverage, 'positive_value_coverage': result.positive_value_coverage})",
            "# Reconstruye los conteos de cada decisión usando el prefijo previo de asignaciones.\nprefix = []\nready_counts = []\nfeasible_counts = []\nfor assignment in result.assignments:\n    ready_counts.append(len(precedence_frontier(instance, prefix, assignment.period)))\n    feasible_counts.append(len(feasible_frontier(instance, prefix, assignment.period)))\n    assert assignment.block in feasible_frontier(instance, prefix, assignment.period)\n    prefix.append(assignment)\nassert len(prefix) == len(result.assignments)",
            "# Grafica cómo se reduce el conjunto de acciones factibles durante la reproducción.\nfig, ax = plt.subplots(figsize=(8, 4.5), constrained_layout=True)\nsteps = np.arange(1, len(ready_counts) + 1)\nax.plot(steps, ready_counts, marker='o', label='Lista por precedencia')\nax.plot(steps, feasible_counts, marker='s', label='Factible por recursos')\nax.set(xlabel='Estado de decisión', ylabel='Acciones de bloque disponibles', title='La capacidad filtra la frontera')\nax.grid(alpha=.25)\nax.legend(frameon=False)\nplt.show()",
            "# Compara cada carga de recursos con su propia capacidad por período.\nusage = np.zeros_like(instance.capacities)\nfor assignment in result.assignments:\n    usage[assignment.period] += instance.resources[assignment.block]\nfig, ax = plt.subplots(figsize=(8, 4.5), constrained_layout=True)\nperiods = np.arange(1, len(instance.capacities) + 1)\nfor resource, name in enumerate(('Minería', 'Procesamiento')):\n    ax.plot(periods, usage[:, resource], marker='o', label=f'Uso de {name}')\n    ax.plot(periods, instance.capacities[:, resource], linestyle='--', label=f'Límite de {name}')\nax.set(xlabel='Período', ylabel='Unidades del recurso', title='El plan respeta cada dimensión de capacidad')\nax.grid(alpha=.25)\nax.legend(frameon=False, ncol=2)\nplt.show()",
        ],
        "evidence": [
            "# Carga registros de procedencia y funciones de partición del producto.\nimport json\nfrom pathlib import Path\nimport numpy as np\nimport matplotlib.pyplot as plt\nimport sys\nROOT = Path.cwd()\nsys.path.insert(0, str(ROOT / 'data-pipeline'))\nfrom pipeline.model.frontier_splits import build_split_manifest, manifest_sha256\nfrom pipeline.model.frontier_policy import validate_split_manifest\nRECORDS = ROOT / 'docs/design/features/learned-frontier/records'\nsummary = json.loads((RECORDS / 'training-summary.json').read_text(encoding='utf-8'))\ndiagnostic = json.loads((RECORDS / 'validation-diagnostic.json').read_text(encoding='utf-8'))\nmanifest = json.loads((ROOT / 'docs/design/features/learned-frontier/split-manifest.json').read_text(encoding='utf-8'))['manifest']",
            "# Reconstruye y valida el manifiesto exacto antes de leer las filas de resultados.\ncase_ids = manifest['product_case_ids']\nrebuilt = build_split_manifest(case_ids)\nvalidate_split_manifest(manifest)\nassert manifest_sha256(rebuilt) == summary['split_sha256'] == diagnostic['split_sha256']\nassert summary['training_source_commit'] == diagnostic['training_source_commit']\nprint({'split_sha256': summary['split_sha256'], 'source_commit': summary['training_source_commit'], 'members': len(summary['members'])})",
            "# Vincula cada fila diagnóstica con su semilla, familia y tamaño congelados.\nexpected = {row['seed']: row for row in manifest['validation']}\nrows = diagnostic['case_results']\nassert len(rows) == len(expected)\nfor row in rows:\n    frozen = expected[row['seed']]\n    assert (row['family'], row['size']) == (frozen['family'], frozen['size'])\n    assert row['independent_schedule_validation'] == 'passed'\nassert diagnostic['all_schedules_independently_validated']",
            "# Recalcula agregados desde los casos y conserva los planes vacíos.\nnpv = np.asarray([row['normalized_npv'] for row in rows], dtype=float)\nvalue_coverage = np.asarray([row['positive_value_coverage'] for row in rows], dtype=float)\nassigned = np.asarray([row['assigned_blocks'] for row in rows], dtype=int)\ncomputed = {'cases': len(rows), 'nonempty_fraction': float(np.mean(assigned > 0)), 'mean_assigned_blocks': float(assigned.mean()), 'median_npv': float(np.median(npv)), 'median_value_coverage': float(np.median(value_coverage)), 'minimum_npv': float(np.min(npv)), 'maximum_npv': float(np.max(npv))}\nassert np.isclose(computed['nonempty_fraction'], diagnostic['nonempty_schedule_fraction'])\nassert np.isclose(computed['median_value_coverage'], diagnostic['median_positive_value_coverage'])\nprint(computed)",
            "# Resume las historias de validación sin convertirlas en evidencia de prueba.\nfor member in summary['members']:\n    history = member['validation_history']\n    assert history\n    assert all(row['all_feasible'] and row['cases'] == len(expected) for row in history)\nprint([{'seed': member['seed'], 'transitions': member['transitions'], 'stop': member['stop_reason'], 'events': len(member['validation_history'])} for member in summary['members']])",
            "# Grafica cada caso e identifica directamente los resultados sin cobertura.\nfig, ax = plt.subplots(figsize=(8, 4.5), constrained_layout=True)\nax.scatter(npv, value_coverage, c=np.where(assigned > 0, '#176B87', '#B84444'), alpha=.7, s=24)\nax.set(xlabel='NPV normalizado', ylabel='Cobertura de valor positivo', title='Cada caso de validación para seleccionar checkpoints')\nax.grid(alpha=.25)\nplt.show()",
            "# Grafica la finalización y cobertura junto a su rango observado completo.\nfig, axes = plt.subplots(1, 2, figsize=(9, 4.2), constrained_layout=True)\naxes[0].bar(['No vacío', 'Vacío'], [np.mean(assigned > 0), np.mean(assigned == 0)], color=['#176B87', '#B84444'])\naxes[0].set(ylabel='Fracción de casos', title='Finalización de planes')\naxes[1].boxplot([value_coverage], tick_labels=['Cobertura de valor positivo'], showmeans=True)\naxes[1].set(ylabel='Fracción', title='Distribución de cobertura')\nfor ax in axes:\n    ax.grid(axis='y', alpha=.25)\nplt.show()",
        ],
    },
}


CELL_TITLES = {
    "en": [
        "Load implementation and version pins",
        "Generate separated graphs and fit normalization",
        "Inspect the precedence and resource masks",
        "Replay and independently validate a schedule",
        "Reconstruct the decision-state action counts",
        "Plot the state-dependent feasible actions",
        "Compare each resource load with its own capacity",
    ],
    "es": [
        "Cargar implementación y versiones fijadas",
        "Generar grafos separados y ajustar normalización",
        "Inspeccionar máscaras de precedencia y recursos",
        "Reproducir y validar un plan independientemente",
        "Reconstruir conteos de acciones por estado",
        "Graficar acciones factibles según el estado",
        "Comparar cada carga con su capacidad",
    ],
}


def build(language: str, lesson: str) -> None:
    spec = TEXT[language][lesson]
    additions = {
        "en": {
            "mechanics": "A review should also compare the prior assignment prefix with the remaining capacity vector after every period transition. This reveals whether a candidate disappeared because a prerequisite was unscheduled or because one specific resource was binding. The distinction is essential when a model repeatedly chooses stop-period or returns a short plan. A feasible action set guarantees only that exposed block actions fit the declared state; it does not guarantee that the policy will choose a valuable action. Record the binding dimension and current period in debugging output. Such a trace makes an empty frontier explainable and helps separate a narrow resource budget from an error in predecessor indexing. These diagnostics improve engineering clarity without adding a claim about economic quality.",
            "evidence": "The record deliberately retains each seed and graph size rather than distributing only an aggregate table. This permits a reader to audit joins, reproduce quantiles, inspect outliers, and detect a missing row without guessing how the summary was made. Hashes bind the public summary to its external original receipt and frozen split. The public diagnostic is therefore sufficient for its stated descriptive calculations, while the private checkpoint files remain unnecessary for reproducing those calculations.\n\nThe summary intentionally does not include the state-action trajectories or trained weights. A reader can verify record membership, recalculate the published descriptive values, and inspect case variation, but cannot reconstruct the policy's choices from this compact record alone. That distinction is important for reproducibility: the lesson reproduces the analysis of the surviving record, not a lost evaluation. The split ledger also makes clear that replaying validation again would repeat model-selection data rather than create fresh evidence.",
        },
        "es": {
            "mechanics": "La revisión también debe comparar el prefijo de asignaciones con el vector de capacidad restante tras cada cambio de período. Así se observa si una alternativa desapareció por un requisito aún pendiente o por un recurso específico que limita. La distinción es esencial cuando el modelo elige repetidamente detener el período o devuelve un plan breve. Un conjunto factible solo garantiza que las acciones expuestas caben en el estado declarado; no garantiza que la política elija una acción valiosa. Registra la dimensión limitante y el período actual en la salida de depuración. Esa traza explica una frontera vacía y ayuda a distinguir un presupuesto de recursos estrecho de un error al indexar predecesores. Estos diagnósticos mejoran la claridad de ingeniería sin agregar una afirmación sobre calidad económica.",
            "evidence": "El registro conserva deliberadamente cada semilla y tamaño de grafo en vez de distribuir solo una tabla agregada. Así, el lector puede auditar cruces, reproducir cuantiles, inspeccionar valores extremos y detectar una fila ausente sin adivinar cómo se calculó el resumen. Los hashes vinculan el resumen público con su recibo original externo y la partición congelada. El diagnóstico basta para sus cálculos descriptivos, mientras que los checkpoints privados no son necesarios para reproducirlos.\n\nEl resumen omite deliberadamente las trayectorias estado-acción y los pesos entrenados. El lector puede verificar la pertenencia de los registros, recalcular los valores descriptivos publicados e inspeccionar la variación entre casos, pero no reconstruir las elecciones de la política solo con este registro compacto. Esa distinción importa para la reproducibilidad: la lección reproduce el análisis de la evidencia conservada, no la evaluación perdida. El registro de particiones también muestra que volver a reproducir la validación repetiría datos de selección en vez de generar evidencia nueva.",
        },
    }
    depth_sections = {
        "en": {
            "mechanics": """### Sensitivity and limits

The capacity sweep above varies the full capacity matrix by one declared multiplier. This is a local sensitivity check, not a robustness study. To inspect which resource drives a decision, vary mining and processing columns separately while holding all other columns fixed; then repeat with a small factorial grid to expose interactions. Preserve the original instance and create a new immutable variant for each run. Record the multiplier, changed columns, stopping reason, objective, tonnage coverage, positive-value coverage, and validator result in a tidy case table. Plot each output against the varied parameter and retain the zero-action cases. If a metric changes discontinuously, inspect the action trace around the threshold: precedence can make a small resource change unlock a chain of blocks.

Repeat the exercise across several graph families and sizes before describing a pattern. Use a fixed seed set for paired comparisons and separate the seed set used to tune a policy from the set used to summarize its behavior. Report the full distribution and the number of attempted cases, including failed generations and validator rejections. A single generated graph cannot estimate uncertainty or establish stability. This notebook's graph is deliberately synthetic, and the deterministic score is a teaching probe. Neither the sweep nor the schedule validator measures geological realism, operating cost, reserve confidence, or mine-plan acceptability. Those questions need domain data, an approved economic model, and independent review.

For a useful diagnostic table, retain one row for every combination of graph, resource variant, and policy configuration. Store the raw capacity vector as well as the multiplier so another analyst can reconstruct the experiment. Compare decision traces to identify where the first action divergence occurs; aggregate objective differences alone can conceal a changed period assignment or a binding predecessor. Check the validator against deliberately perturbed schedules, including duplicate blocks, reversed precedence, and over-capacity assignments, and confirm that each violation is reported. These are software fault checks, not evidence that the model generalizes. Keep development cases separate from any later frozen assessment and log all protocol changes before inspecting its outcomes. Also inspect whether ties in the score are resolved deterministically, whether stop actions can be selected when blocks remain feasible, and whether discount periods follow the declared indexing convention. Small contract mismatches can change the schedule while every individual assignment still appears legal. Save the complete configuration with each trace so a reviewer can tell whether two runs differ because of capacity, scoring, or an implementation version.

### Use with your own data

Start with a versioned input contract. Keep one stable block identifier per row; declare units for value, tonnage, mining capacity, processing capacity, and discount period; and store provenance for each source field. Validate finite values, nonnegative resource use, unique identifiers, acyclic precedence edges, and complete capacity rows before constructing a graph. Resolve duplicated rows and missing fields through documented rules rather than silent imputation. Keep economic labels and outcome-derived features out of model inputs, and preserve the mapping back to source records in a controlled environment.

Build partitions by deposit or another independent geological grouping when that matches the intended use. Freeze the manifest before model selection, fit feature scaling only on training rows, and reuse its feature order and digest at inference. Run a simple transparent baseline on the same cases and retain paired per-case outputs. For every policy, persist the input hash, configuration, seed, selected checkpoint, action trace, stop reason, validator findings, objective, and both coverage measures. Write each case atomically so an interrupted evaluation is resumable without rerunning completed cases. Have an independent reviewer check the validator and unit conversions before any results guide a real planning decision.""",
            "evidence": """### Sensitivity and limits

Begin by checking whether the descriptive summary is driven by a small number of cases. Recompute medians, quartiles, minimum and maximum, nonempty fraction, and both coverage measures for each graph family and size. Plot the empirical distribution with zeros and negative values retained. A bootstrap over these 200 rows would quantify variation conditional on this reused validation sample; it would not remove checkpoint-selection bias or produce an independent test estimate. State the resampling unit and seed if such a diagnostic is added, and do not call it a confidence interval for future deposits.

The five training histories also need to be read as resource-bounded records. Compare each member's transition count, stop reason, validation cadence, selected checkpoint, and final checkpoint. A member that exhausts a CPU cap can still have a valid receipt, but completion alone says nothing about schedule usefulness. Missing or malformed history entries should fail the integrity check rather than be filled from another member. The case-level validator flag answers whether the stored assignment satisfies the implemented constraints; it does not certify the input assumptions or economic model. The current records contain no independent comparator, no untouched held-out outcomes, and no operationally sourced deposit data. Preserve those absences in every chart caption and summary.

Read every aggregate together with its denominator. A mean based on 200 rows is not meaningful if some rows were silently dropped, so reconcile case IDs against the frozen manifest before plotting. Check duplicate IDs, missing fields, non-finite values, and unexpected split membership. For category summaries, report counts as well as percentages because a small subgroup can otherwise look disproportionately persuasive. Keep plots descriptive and include the data-processing code alongside the source rows. If a later protocol introduces weighting or exclusions, version the rule, show unweighted results too, and preserve a record of which cases changed status. Do not tune a decision threshold on these reused observations and then describe the resulting score as an independent performance estimate. When a metric appears unusually favorable, trace it back to the exact per-case rows and confirm that its numerator and denominator use the same population. Preserve the original summary as a separate artifact when changing an analysis, then label the revised view with its code version and inputs. This permits readers to distinguish a faithful reproduction from a new exploratory calculation. Exploratory calculations can be useful for finding data defects, but once they influence a model choice they become part of model selection and must be disclosed in the next protocol.

### Use with your own data

Before collecting results, define a stable case schema with an opaque case ID, source-data digest, deposit family, size, split, seed, configuration digest, checkpoint digest, and explicit outcome fields. Freeze the split and protocol in a reviewed versioned document. Keep a new test partition disjoint from all tuning and validation cases, and write a durable ledger row before processing each case. Persist the result for that case immediately, including failures and validator messages; a restart must skip completed rows by hash, not recompute them implicitly. Never replace an unavailable test outcome with a validation result.

Choose a baseline before opening the test outcomes and run both methods on identical inputs and resource assumptions. Recompute objective and coverage from the canonical schedule and original case, then compare paired results using a predeclared analysis. Track missingness, warnings, exclusions, and code versions alongside metrics. Publish sufficient sanitized per-case data to reproduce every aggregate, while keeping restricted source data and weights under their access controls. Separate software validation, scientific evidence, operational acceptance, and release approval. This notebook demonstrates record processing only; your own data requires new provenance, protocol approval, and independent evaluation before any empirical claim.""",
        },
        "es": {
            "mechanics": """### Sensibilidad y límites

El barrido anterior varía toda la matriz de capacidades mediante un multiplicador declarado. Es una comprobación local de sensibilidad, no un estudio de robustez. Para identificar qué recurso afecta una decisión, varía por separado las columnas de minería y procesamiento, manteniendo las demás fijas; luego repite con una pequeña grilla factorial para detectar interacciones. Conserva la instancia original y crea una variante inmutable por ejecución. Registra el multiplicador, las columnas modificadas, la razón de detención, el objetivo, ambas coberturas y el resultado del validador en una tabla por caso. Grafica cada salida frente al parámetro y conserva los casos sin acciones. Si una métrica cambia abruptamente, inspecciona la traza alrededor del umbral: la precedencia puede hacer que un cambio pequeño de recursos libere una cadena de bloques.

Repite el ejercicio con varias familias y tamaños de grafo antes de describir un patrón. Usa el mismo conjunto de semillas para comparaciones pareadas y separa las semillas usadas para ajustar una política de las usadas para resumir su comportamiento. Informa la distribución completa y la cantidad de casos intentados, incluidas generaciones fallidas y rechazos del validador. Un solo grafo no estima incertidumbre ni demuestra estabilidad. El grafo de esta lección es sintético y la puntuación determinista es una sonda didáctica. Ni el barrido ni el validador miden realismo geológico, costos operacionales, confianza de reservas o aceptabilidad del plan. Esas preguntas requieren datos del dominio, un modelo económico aprobado y revisión independiente.

Para una tabla diagnóstica útil, conserva una fila por cada combinación de grafo, variante de recursos y configuración de política. Guarda el vector de capacidades original junto al multiplicador para que otro analista pueda reconstruir el experimento. Compara trazas para identificar la primera decisión divergente; las diferencias agregadas de objetivo pueden ocultar un cambio de período o un requisito limitante. Prueba el validador con planes alterados deliberadamente, incluidos bloques duplicados, precedencia invertida y asignaciones sobre capacidad, y confirma que informe cada infracción. Son verificaciones de software, no evidencia de generalización. Mantén los casos de desarrollo separados de cualquier evaluación congelada posterior y registra los cambios de protocolo antes de inspeccionar sus resultados.

### Uso con datos propios

Comienza con un contrato de entrada versionado. Mantén un identificador estable por bloque; declara unidades de valor, tonelaje, capacidad minera, capacidad de procesamiento y período de descuento; y conserva la procedencia de cada campo fuente. Valida valores finitos, consumos no negativos, identificadores únicos, aristas acíclicas y filas completas de capacidad antes de construir el grafo. Resuelve duplicados y datos faltantes mediante reglas documentadas, no imputaciones silenciosas. Evita variables derivadas de resultados y etiquetas económicas como entradas, y conserva el vínculo con registros fuente en un entorno controlado.

Construye particiones por yacimiento u otra agrupación geológica independiente cuando corresponda al uso esperado. Congela el manifiesto antes de seleccionar el modelo, ajusta el escalado solo con entrenamiento y reutiliza orden y hash de variables durante la inferencia. Ejecuta una línea base transparente sobre los mismos casos y conserva resultados pareados. Por política, persiste hash de entrada, configuración, semilla, checkpoint elegido, traza de acciones, razón de detención, hallazgos del validador, objetivo y ambas coberturas. Escribe cada caso de forma atómica para reanudar una evaluación interrumpida sin repetir los casos terminados. Solicita revisión independiente del validador y de las conversiones de unidades antes de usar resultados en una decisión real de planificación.""",
            "evidence": """### Sensibilidad y límites

Primero comprueba si el resumen descriptivo depende de pocos casos. Recalcula medianas, cuartiles, mínimo y máximo, fracción no vacía y ambas coberturas por familia y tamaño de grafo. Grafica la distribución empírica conservando ceros y valores negativos. Un remuestreo de estas 200 filas cuantificaría variación condicionada a esta muestra de validación reutilizada; no elimina el sesgo de selección del checkpoint ni produce una estimación de prueba independiente. Declara la unidad y semilla del remuestreo si agregas ese diagnóstico, y no lo llames intervalo de confianza para futuros yacimientos.

Las cinco historias de entrenamiento también deben leerse como registros con recursos limitados. Compara por miembro cantidad de transiciones, razón de término, frecuencia de validación, checkpoint seleccionado y checkpoint final. Un miembro que agota un límite de CPU puede tener un recibo válido, pero completar el trabajo no demuestra que el plan sea útil. Las entradas ausentes o malformadas deben fallar la comprobación de integridad, no completarse desde otro miembro. El indicador del validador por caso responde si la asignación almacenada satisface las restricciones implementadas; no certifica los supuestos de entrada ni el modelo económico. Estos registros carecen de comparador independiente, resultados de prueba intactos y datos de yacimientos operacionales. Conserva esas ausencias en cada título, pie de figura y resumen.

Interpreta cada agregado junto con su denominador. Una media de 200 filas deja de ser interpretable si se omitieron filas, por eso concilia los IDs con el manifiesto antes de graficar. Busca IDs duplicados, campos ausentes, valores no finitos y pertenencia inesperada a particiones. Para resúmenes por categoría, informa conteos y porcentajes: un grupo pequeño puede parecer más convincente de lo que es. Mantén las gráficas descriptivas e incluye el código de procesamiento junto a las filas fuente. Si un protocolo futuro introduce ponderaciones o exclusiones, versiona la regla, presenta también resultados sin ponderar y conserva qué casos cambiaron de estado. No ajustes umbrales de decisión usando estas observaciones reutilizadas para luego presentar el resultado como una estimación de desempeño independiente.

### Uso con datos propios

Antes de recopilar resultados, define un esquema de casos estable con ID opaco, digest de datos fuente, familia del yacimiento, tamaño, partición, semilla, digest de configuración, digest del checkpoint y resultados explícitos. Congela particiones y protocolo en un documento versionado y revisado. Mantén una partición de prueba nueva, disjunta de los casos de ajuste y validación, y escribe una fila durable de registro antes de procesar cada caso. Persiste el resultado inmediatamente, incluso fallas y mensajes del validador; al reiniciar, omite filas completadas según su hash, sin recalcularlas implícitamente. Nunca reemplaces un resultado de prueba no disponible por uno de validación.

Elige la línea base antes de abrir resultados de prueba y ejecuta ambos métodos con entradas y supuestos de recursos idénticos. Recalcula objetivo y cobertura desde el plan canónico y el caso original; compara resultados pareados mediante un análisis predefinido. Registra datos faltantes, advertencias, exclusiones y versiones junto con las métricas. Publica datos por caso sanitizados suficientes para reproducir los agregados, y conserva fuentes restringidas y pesos bajo sus controles de acceso. Separa validación del software, evidencia científica, aceptación operacional y aprobación de publicación. Esta lección solo demuestra procesamiento de registros; los datos propios requieren procedencia, protocolo aprobado y evaluación independiente antes de sustentar afirmaciones empíricas.""",
        },
    }
    heading_for_addition = (
        "Method"
        if lesson == "mechanics" and language == "en"
        else "Método"
        if lesson == "mechanics"
        else "Evidence"
        if language == "en"
        else "Evidencia"
    )
    for index, (heading, prose) in enumerate(spec["sections"]):
        if heading == heading_for_addition:
            spec["sections"][index] = (heading, prose + "\n\n" + additions[language][lesson])
            break
    summary_heading = "Summary" if language == "en" else "Resumen"
    for index, (heading, prose) in enumerate(spec["sections"]):
        if heading == summary_heading:
            spec["sections"][index] = (heading, prose + "\n\n" + depth_sections[language][lesson])
            break
    data = (
        []
        if lesson == "mechanics"
        else [
            f"{RECORDS}/training-summary.json",
            f"{RECORDS}/validation-diagnostic.json",
            "docs/design/features/learned-frontier/split-manifest.json",
        ]
    )
    nb = nbf.v4.new_notebook()
    nb.metadata = {
        "kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"},
        "language_info": {"name": "python"},
        "caos": {
            "language": language,
            "topic": TOPIC,
            "level": 4,
            "title": spec["title"],
            "packages": PACKAGES,
            "data": data,
            "sources": SOURCE,
            "beyond": ["BS-2"],
        },
    }
    question = "**Question:** " if language == "en" else "**Pregunta:** "
    level = (
        "**Level:** A worked method and evidence analysis with an explicit claim boundary."
        if language == "en"
        else "**Nivel:** Un método aplicado y análisis de evidencia con límites explícitos de afirmación."
    )
    cells = [markdown_cell(f"# {spec['title']}\n\n{question}{spec['question']}\n\n{level}")]
    codes = list(CODE[language][lesson])
    if lesson == "evidence":
        codes[0] += (
            "\nfrom pipeline.model.frontier_data import generate_graph, FEATURE_NAMES\nfrom pipeline.model.frontier_policy import FeatureNormalizer, feasible_frontier, precedence_frontier, replay_frontier_policy, validate_schedule"
        )
    if lesson == "mechanics":
        codes.insert(
            2,
            "# Generate the separate graph that will be inspected and scheduled.\ncase = generate_graph(20_007, 'crosscut', 96, periods=8)\nprint({'generator': case.family_parameters, 'blocks': len(case.instance.values), 'feature_names': FEATURE_NAMES})",
        )
    prose_after = {
        "en": {
            "mechanics": "Follow the same state with both resource dimensions shown separately. The lines are derived from the schedule and its original capacity matrix. A load curve below its limit shows unused capacity in that period; it does not show whether another period or the precedence graph prevented additional work. Read the two panels together with the stop reason and coverage values printed above.",
            "evidence": "The plotted points are the original per-case rows. Their visible spread matters because a central statistic hides empty schedules and negative outcomes. Red points mark cases with no assigned block, while the vertical position retains positive-value coverage. This joint view exposes where a feasible schedule still leaves value untouched.",
        },
        "es": {
            "mechanics": "Sigue el mismo estado con ambas dimensiones de recursos separadas. Las líneas se derivan del plan y de su matriz de capacidad original. Una carga bajo su límite muestra capacidad sin usar en ese período; no indica si otro período o el grafo de precedencia impidió más trabajo. Lee ambos paneles junto con la razón de detención y los valores de cobertura impresos arriba.",
            "evidence": "Los puntos graficados son las filas originales por caso. Su dispersión importa porque un resumen central oculta planes vacíos y resultados negativos. Los puntos rojos marcan casos sin bloques asignados, mientras que la posición vertical conserva la cobertura de valor positivo. La vista conjunta muestra dónde un plan factible aún deja valor sin extraer.",
        },
    }
    setup_label = "Environment install command" if language == "en" else "Comando para preparar el entorno"
    code_number = 0

    def append_code(source: str) -> None:
        nonlocal code_number
        source = source.rstrip()
        code_number += 1
        cells.append(code_cell(source))
        cells[-1].execution_count = code_number

    for idx, (heading, prose) in enumerate(spec["sections"]):
        equation = None
        if idx == 3:
            equation = {
                "en": {
                    "mechanics": r"$$E_t=\{b\notin A:P_b\subseteq\{i:p_i\leq t\}\}.$$\n\n$$F_t=\{b\in E_t:r_b\leq C_t-u_t\}.$$\n\nThe first set enforces prerequisites; the second applies every resource limit to residual capacity.".replace("\\n", "\n"),
                    "evidence": r"$$NPV=\sum_{b\in S}\frac{v_b}{(1+d)^{p_b}}.$$\n\n$$c^+=\frac{\sum_{b\in S}\max(v_b,0)}{\sum_b\max(v_b,0)}.$$\n\nObjective and positive-value coverage answer separate questions, so the records report both.".replace("\\n", "\n"),
                },
                "es": {
                    "mechanics": r"$$E_t=\{b\notin A:P_b\subseteq\{i:p_i\leq t\}\}.$$\n\n$$F_t=\{b\in E_t:r_b\leq C_t-u_t\}.$$\n\nEl primer conjunto impone requisitos; el segundo aplica cada límite a la capacidad residual.".replace("\\n", "\n"),
                    "evidence": r"$$NPV=\sum_{b\in S}\frac{v_b}{(1+d)^{p_b}}.$$\n\n$$c^+=\frac{\sum_{b\in S}\max(v_b,0)}{\sum_b\max(v_b,0)}.$$\n\nEl objetivo y la cobertura de valor positivo responden preguntas distintas; los registros informan ambas.".replace("\\n", "\n"),
                },
            }[language][lesson]
        if idx == 6:
            quantity = "96-block graph" if lesson == "mechanics" else "200 validation records"
            if language == "en":
                prose += f"\n\n**Answer:** The {quantity} supports the stated calculations, with its validation-only status limiting the conclusion."
            else:
                prose += f"\n\n**Respuesta:** El ejemplo de {quantity} respalda los cálculos presentados, y su estado solo de validación limita la conclusión."
        cells.append(markdown_cell(f"## {heading}\n\n{prose}"))
        if equation:
            cells.append(markdown_cell(equation))
        if idx == 1:
            cells.append(markdown_cell(f"{setup_label}:\n\n```bash\n{PIP_LINE}\n```"))
            setup = codes[0]
            if "importlib.metadata" not in setup:
                setup += "\nimport importlib.metadata\nprint({name: importlib.metadata.version(name) for name in ('oreblocks', 'numpy', 'matplotlib')})"
            append_code(setup)
        elif lesson == "mechanics" and idx == 2:
            cells.append(
                markdown_cell(
                    "Generate the fitting rows separately from the graph used for inspection."
                    if language == "en"
                    else "Genera filas de ajuste separadas del grafo que vas a inspeccionar."
                )
            )
            append_code(codes[1])
            cells.append(
                markdown_cell(
                    "Construct a second graph with a different family so the normalizer is not fitted on its evaluation rows."
                    if language == "en"
                    else "Construye un segundo grafo de otra familia para que el normalizador no se ajuste con sus filas de evaluación."
                )
            )
            append_code(codes[2])
        elif lesson == "mechanics" and idx == 3:
            for text, source in zip(
                (
                    (
                        "Measure the two candidate sets before selecting an action.",
                        "Mide los dos conjuntos candidatos antes de elegir una acción.",
                    ),
                    (
                        "Replay a transparent score and independently recalculate the schedule value.",
                        "Reproduce una puntuación transparente y recalcula el valor del plan de forma independiente.",
                    ),
                    (
                        "Reconstruct each decision from the prior assignments to check mask eligibility.",
                        "Reconstruye cada decisión desde las asignaciones previas para verificar su elegibilidad.",
                    ),
                ),
                codes[3:6],
                strict=True,
            ):
                cells.append(markdown_cell(text[0 if language == "en" else 1]))
                append_code(source)
        elif lesson == "mechanics" and idx == 5:
            cells.append(
                markdown_cell(
                    "This figure is computed from states visited by the replay. The following text reads the visible change in available actions."
                    if language == "en"
                    else "Esta figura se calcula desde los estados visitados durante la reproducción. El texto siguiente interpreta el cambio de acciones disponibles."
                )
            )
            append_code(codes[6])
            cells.append(markdown_cell(prose_after[language][lesson]))
            append_code(codes[7])
            sweep_note = {
                "en": "The capacity sweep holds values, graph edges, feature vectors, and the transparent score fixed. Coverage stays unchanged over these four multipliers while discounted NPV varies with block timing. That response belongs to this generated instance only. Treat the two panels as local sensitivity diagnostics, not a cross-case result.",
                "es": "El barrido conserva valores, aristas, variables y puntuación transparente. La cobertura no cambia con estos cuatro multiplicadores, mientras el NPV descontado varía según el período de los bloques. La respuesta pertenece solo a esta instancia generada. Interpreta ambos paneles como diagnóstico local, no como resultado entre casos.",
            }
            cells.append(markdown_cell(sweep_note[language]))
            sweep_code = "# Re-run the same score over a declared uniform capacity sweep.\nfrom dataclasses import replace\nfactors = np.array([0.70, 0.85, 1.00, 1.15])\nsweep = []\nfor factor in factors:\n    variant = replace(instance, capacities=instance.capacities * factor)\n    replay = replay_frontier_policy(variant, score, tonnage=case.tonnage)\n    sweep.append((replay.positive_value_coverage, replay.npv))\nprint({'factors': factors.tolist(), 'coverage_npv': sweep})\nfig, axes = plt.subplots(1, 2, figsize=(10, 4.5), constrained_layout=True)\naxes[0].plot(factors, [row[0] for row in sweep], marker='o', color='#176B87')\naxes[0].set(xlabel='Capacity multiplier', ylabel='Positive-value coverage', title='Coverage')\naxes[1].plot(factors, [row[1] for row in sweep], marker='s', color='#D79222')\naxes[1].set(xlabel='Capacity multiplier', ylabel='Discounted NPV', title='Objective')\nfor ax in axes:\n    ax.grid(alpha=.25)\nplt.show()"
            if language == "es":
                sweep_code = sweep_code.replace("# Re-run the same score over a declared uniform capacity sweep.", "# Reproduce la misma puntuación con varios límites uniformes de capacidad.").replace("Uniform capacity multiplier", "Multiplicador uniforme de capacidad").replace("Positive-value coverage", "Cobertura de valor positivo").replace("Sensitivity to the resource budget", "Sensibilidad al presupuesto de recursos")
            append_code(sweep_code)
            cells.append(
                markdown_cell(
                    "Read this curve as the response of one fixed synthetic graph and score to the declared capacity multipliers. It shows how the resource budget changes positive-value coverage for this example; it does not compare policies or estimate behavior across deposits. The printed table also retains objective values because discounted value may move differently from coverage."
                    if language == "en"
                    else "Lee esta curva como la respuesta de un grafo sintético fijo y una puntuación a los multiplicadores declarados. Muestra cómo cambia la cobertura de valor positivo en este ejemplo; no compara políticas ni estima comportamiento entre yacimientos. La tabla impresa también conserva el objetivo porque el valor descontado puede cambiar de forma distinta a la cobertura."
                )
            )
        elif lesson == "evidence" and idx == 1:
            append_code(codes[0])
        elif lesson == "evidence" and idx == 3:
            descriptions = {
                "en": [
                    "Rebuild the frozen partitions and validate their disjointness.",
                    "Join every diagnostic case to its frozen seed and size.",
                    "Recompute the reported distributions from the case rows.",
                    "Inspect checkpoint-selection histories as training records.",
                ],
                "es": [
                    "Reconstruye las particiones congeladas y valida que sean disjuntas.",
                    "Vincula cada caso diagnóstico con su semilla y tamaño congelados.",
                    "Recalcula las distribuciones informadas desde las filas por caso.",
                    "Inspecciona las historias de selección como registros de entrenamiento.",
                ],
            }
            for description, source in zip(descriptions[language], codes[1:5], strict=True):
                cells.append(markdown_cell(description))
                append_code(source)
            examples = {
                "en": [
                    (
                        "Regenerate one validation graph from its frozen seed; this checks its public input contract only.",
                        "sample = rows[0]\nexample = generate_graph(sample['seed'], sample['family'], sample['size'])\nprint({'seed': sample['seed'], 'family': example.family, 'size': len(example.instance.values), 'features': FEATURE_NAMES})",
                    ),
                    (
                        "Fit a small normalizer on training graphs only and retain its digest with the feature order.",
                        "train_graphs = [generate_graph(row['seed'], row['family'], row['size']) for row in manifest['train'][:8]]\ntrain_matrix = np.vstack([graph.node_features for graph in train_graphs])\nnormalizer = FeatureNormalizer.fit(train_matrix, FEATURE_NAMES, declared_features=FEATURE_NAMES)\nprint({'training_rows': normalizer.train_rows, 'normalizer_sha256': normalizer.sha256})",
                    ),
                    (
                        "Inspect an empty decision state without scoring the saved validation outcomes.",
                        "ready = precedence_frontier(example.instance, (), 0)\nfeasible = feasible_frontier(example.instance, (), 0)\nprint({'ready': len(ready), 'feasible': len(feasible), 'subset': set(feasible).issubset(ready)})",
                    ),
                    (
                        "Run a transparent mechanics replay and validate it independently; this is not a validation-record result.",
                        "score = lambda block, period, assigned: float(example.instance.values[block]) if block >= 0 else -1.0\nmechanics_result = replay_frontier_policy(example.instance, score, tonnage=example.tonnage)\nprint({'assignments': len(mechanics_result.assignments), 'validated_npv': validate_schedule(example.instance, mechanics_result.assignments)})",
                    ),
                ],
                "es": [
                    (
                        "Regenera un grafo de validación desde su semilla congelada; solo verifica el contrato público de entrada.",
                        "sample = rows[0]\nexample = generate_graph(sample['seed'], sample['family'], sample['size'])\nprint({'seed': sample['seed'], 'family': example.family, 'size': len(example.instance.values), 'features': FEATURE_NAMES})",
                    ),
                    (
                        "Ajusta un normalizador pequeño solo con grafos de entrenamiento y conserva su digest y orden.",
                        "train_graphs = [generate_graph(row['seed'], row['family'], row['size']) for row in manifest['train'][:8]]\ntrain_matrix = np.vstack([graph.node_features for graph in train_graphs])\nnormalizer = FeatureNormalizer.fit(train_matrix, FEATURE_NAMES, declared_features=FEATURE_NAMES)\nprint({'training_rows': normalizer.train_rows, 'normalizer_sha256': normalizer.sha256})",
                    ),
                    (
                        "Inspecciona un estado de decisión vacío sin puntuar los resultados guardados de validación.",
                        "ready = precedence_frontier(example.instance, (), 0)\nfeasible = feasible_frontier(example.instance, (), 0)\nprint({'ready': len(ready), 'feasible': len(feasible), 'subset': set(feasible).issubset(ready)})",
                    ),
                    (
                        "Reproduce mecánica transparente y valídala de forma independiente; no es un resultado del registro.",
                        "score = lambda block, period, assigned: float(example.instance.values[block]) if block >= 0 else -1.0\nmechanics_result = replay_frontier_policy(example.instance, score, tonnage=example.tonnage)\nprint({'assignments': len(mechanics_result.assignments), 'validated_npv': validate_schedule(example.instance, mechanics_result.assignments)})",
                    ),
                ],
            }
            for description, source in examples[language]:
                cells.append(markdown_cell(description))
                append_code(f"# {description}\n{source}")
        elif lesson == "evidence" and idx == 5:
            cells.append(
                markdown_cell(
                    "Plot every validation case, including empty schedules."
                    if language == "en"
                    else "Grafica cada caso de validación, incluidos los planes vacíos."
                )
            )
            append_code(codes[5])
            cells.append(markdown_cell(prose_after[language][lesson]))
            append_code(codes[6])
            distribution_note = {
                "en": "The objective histogram preserves zeros and negative values rather than centering only the successful cases. Its distribution belongs to a reused checkpoint-selection partition, so it diagnoses the saved run and is not an independent estimate. Read it beside the case-level plot to retain subgroup and outlier context.",
                "es": "El histograma conserva ceros y valores negativos en vez de centrarse solo en los casos exitosos. Su distribución pertenece a la partición reutilizada para seleccionar checkpoints: diagnostica la ejecución guardada, no da una estimación independiente. Léelo junto al gráfico por caso para conservar contexto de grupos y valores extremos.",
            }
            cells.append(markdown_cell(distribution_note[language]))
            histogram_code = "# Plot every normalized objective with median and zero references.\nfig, ax = plt.subplots(figsize=(8, 4.5), constrained_layout=True)\nax.hist(npv, bins=24, color='#176B87', edgecolor='white')\nax.axvline(0, color='#B84444', linestyle='--', label='Zero objective')\nax.axvline(np.median(npv), color='#D79222', linestyle=':', label='Median')\nax.set(xlabel='Normalized NPV', ylabel='Validation cases', title='Objective distribution on reused validation')\nax.grid(axis='y', alpha=.25)\nax.legend(frameon=False)\nplt.show()"
            if language == "es":
                histogram_code = histogram_code.replace("# Plot every normalized objective with median and zero references.", "# Grafica objetivos normalizados con referencias de mediana y cero.").replace("Zero objective", "Objetivo cero").replace("Median", "Mediana").replace("Normalized NPV", "NPV normalizado").replace("Validation cases", "Casos de validación").replace("Objective distribution on reused validation", "Distribución del objetivo en validación reutilizada")
            append_code(histogram_code)
            cells.append(
                markdown_cell(
                    "The histogram retains every one of the 200 validation objectives, including negative values and zeros. The vertical guides mark zero and the sample median. Its shape describes these saved checkpoint-selection cases only: the partition was reused after checkpoint selection, so this plot is diagnostic and cannot support a held-out performance claim."
                    if language == "en"
                    else "El histograma conserva los 200 objetivos de validación, incluidos valores negativos y ceros. Las líneas verticales marcan cero y la mediana de la muestra. Su forma describe solo estos casos guardados de selección de checkpoint: la partición se reutilizó después de seleccionar checkpoints, por lo que la gráfica es diagnóstica y no respalda una afirmación de desempeño en prueba independiente."
                )
            )
        if idx == 8:
            labels = {
                "en": ["Policy-gradient method", "Adaptive optimizer", "Open-pit scheduling formulation", "Implementation and records"],
                "es": ["Método de gradiente de política", "Optimizador adaptativo", "Formulación de planificación a cielo abierto", "Implementación y registros"],
            }
            references = "\n".join(
                f"- {label}: {url}" for label, url in zip(labels[language], SOURCE, strict=True)
            )
            cells.append(markdown_cell(references))
    nb.cells = cells
    out = ROOT / "notebooks" / language / TOPIC / f"{spec['slug']}.ipynb"
    out.parent.mkdir(parents=True, exist_ok=True)
    nbf.write(nb, out)
    print(out.relative_to(ROOT))


def main() -> None:
    for language in ("en", "es"):
        for lesson in ("mechanics", "evidence"):
            build(language, lesson)


if __name__ == "__main__":
    main()
