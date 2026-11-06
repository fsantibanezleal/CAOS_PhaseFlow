#!/usr/bin/env python3
"""Build the bilingual worked lesson for frontier training data provenance."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TOPIC = "04-learned-surrogates"
SLUG = "04-frontier-data-splits-and-normalization"
SOURCES = ["https://doi.org/10.1609/icaps.v33i1.27244", "https://doi.org/10.32473/flairs.v35i.130584"]
PACKAGES = ["numpy==2.5.1", "matplotlib==3.11.2"]

TEXT = {
    "en": {
        "title": "Prepare auditable data for a frontier policy",
        "question": "How do frozen partitions and train-only normalization make a synthetic scheduling experiment reproducible without exposing held-out cases?",
        "level": "**Level:** 2 : Method in practice.",
        "question_marker": "**Question:**",
        "answer_marker": "**Answer:**",
        "sections": [
            ("Objectives", "By the end, you can trace a generated graph from its seed and family through a frozen split record; inspect why seed, family, and product-case separation answer different leakage risks; fit named feature statistics on training records only; and reproduce the digest that binds those statistics to the source rows. You will also quantify how family and size alter the feature population. The exercise uses the repository's production data contracts on a small, deliberately bounded subset so it remains quick to run. It teaches data preparation, not policy training or model quality. A correct digest proves byte-level reproducibility for the declared inputs; it does not establish that synthetic graphs represent any operating mine."),
            ("Setup", "Run from the repository root with the pinned notebook environment. The source generator, partition builder, validator, and normalizer are imported from the data pipeline; the cells below do not copy their algorithms. The committed split ledger is the authority for the candidate experiment, while a compact prefix of its training rows is used here to keep the lesson practical. Validation and test rows are inspected as metadata only. They are never passed to the fitting call. The two package pins below match the notebook environment. Execute the whole notebook in a fresh kernel so that the printed counts and plots are regenerated from the frozen source files."),
            ("Data", "Each generator row declares exactly four fields: an integer seed, a graph family, a node count, and a generator version. The seed determines the pseudo-random stream; the family determines the precedence pattern; and the size determines the number of decision nodes. A graph then supplies seven named node features alongside resource vectors and precedence edges. The generator is deterministic for the same seed, family, size, periods, and implementation version. These records are synthetic method-development cases. They are not mine plans, MineLib instances, customer data, or evidence of operational performance. The product benchmark case identifiers are kept separately by the frozen ledger and are excluded from every fitting and model-selection split.\n\nThe split policy intentionally changes graph family between training, validation, and test. This asks the later evaluation to measure transfer across structures rather than merely memorization of nearby random seeds. Different seed ranges prevent exact random-stream reuse, while different family assignments provide a stronger structural separation. The product case set is sealed as an evaluation-only list; it must not influence normalizer fitting, training choices, or validation-based selection. Read the manifest before changing it: changing a family, seed, size rule, generator version, or case list changes the scientific question and should produce a new versioned receipt."),
            ("Method", "First, load the committed case index and rebuild the approved split manifest through the engine API. The validator checks that the lists are well formed and disjoint. Then sample only a small training prefix and inspect its generated graphs. The normalizer API consumes the row records, regenerates their feature matrices, and fits means and scales using those training values alone.\n\nFor feature j, a stored standardized value is zᵢⱼ = (xᵢⱼ − μⱼ) / σⱼ. The mean and scale are computed over nodes from the training rows only. A constant feature is handled by the implementation's explicit scale guard. The training-data digest hashes each seed and the exact contiguous little-endian float32 feature bytes in row order. A second canonical JSON digest binds that data digest to the named normalizer contract. This makes changes in row order, seed, generated feature values, feature names, or fitted statistics visible. It is an integrity receipt, not a cryptographic claim about the scientific validity of the generator.\n\nThe API rejects an empty training set, duplicate seeds, a mismatched row schema, non-training split labels, and feature names that introduce identifiers or outcomes. The frozen manifest itself carries the full 1,000/200/500 partition sizes; fitting the full training partition is part of the separate training run. The lesson fits only 24 training rows to limit runtime. Its small-sample statistics are for understanding the pipeline and must never replace the full-run normalizer or be reported as trained-model evidence."),
            ("Comparison", "Three views answer different data questions. The first compares node counts by family in a small deterministic sample, showing why a family label carries structural meaning. The second compares raw and standardized feature distributions for the lesson subset; centering and scaling can make numerical ranges easier for an optimizer, but it does not remove distribution shift. The third varies graph size while holding family and seed fixed, making size-related feature behavior visible.\n\nThe measured sample is intentionally not a benchmark and has no outcome labels. A plot that looks balanced is not proof that the full generator is balanced. Likewise, standardization does not make validation and test observations exchangeable with training. Their families are deliberately different, so a later performance drop can reflect structural transfer difficulty. The right response is to report it and inspect failure modes, not to refit on held-out data."),
            ("Results", "The printed table reports the frozen partition counts, unique seeds, family membership, the bounded lesson sample, the number of nodes used to fit its normalizer, and the two reproducibility digests. The table is the answer to the notebook question: preparation is auditable because the row schema, partition policy, train-only fitting boundary, and content hashes are explicit and independently checked. It does not say that the policy has learned a useful scheduling rule.\n\nThe feature summary reports the fitted mean and scale by declared name. These values describe only the 24-row lesson subset. If you increase the subset size, the statistics and training-data digest should change while the frozen partition manifest digest stays fixed. Regenerating with the same files, order, and subset should reproduce the same output. This distinction helps diagnose whether a difference came from a changed protocol or simply from the deliberately smaller sample used in this tutorial."),
            ("Sensitivity and limits", "Change the family and size in the final comparison cell and inspect whether the node-feature distributions move. Repeat the normalizer fit with 8, 24, and 48 training rows, then compare feature means and the data digest. These are sensitivity checks on the preprocessing population, not hyperparameter selection: do not choose the subset because it produces attractive downstream results. The approved full run uses the complete frozen training list.\n\nThe generated families encode a small set of synthetic precedence patterns and simple economic/resource relationships. They do not model geotechnical uncertainty, fleet interactions, detailed block models, changing prices, or human operational constraints. The normalizer only rescales features; it cannot repair a weak generator or leakage in a target. Seed disjointness is not enough by itself if generated cases share structure, which is why this protocol also partitions graph families. Family separation is a deliberate stress test, not a claim that the families span real deposits. A robust conclusion needs the later held-out experiments, uncertainty intervals, failure accounting, and authentic product cases under the approved evaluation design."),
            ("Use your own data", "Use this lesson to understand the interface, not to paste an operational dataset into the synthetic generator. The current row schema requires a seed, family, size, and generator version; real block models do not become valid observations by assigning them those fields. A real-data workflow needs its own documented source, rights and consent, schema mapping, missingness rules, units, split unit, and independent validation. Split at the mine or deposit level when observations from one source could otherwise appear on both sides. Keep identifiers and outcomes out of feature fitting. Fit every transformation on training cases, freeze it, and apply it unchanged to validation and test.\n\nFor a local experiment using the same synthetic contract, change the selected training-row count or inspect another declared family, then rerun all checks. Do not edit the committed ledger in place to accommodate custom data. A new generator or dataset requires a new versioned contract and receipt so that readers can distinguish it from the experiment taught here."),
            ("Summary", "You followed the data path from a versioned synthetic graph specification to disjoint manifest partitions, named node features, a train-only normalizer, and reproducibility hashes. The lesson's subset is intentionally too small for policy claims. The full training pipeline uses all frozen training rows and writes its receipt and model artifacts outside the source repository. Held-out rows remain unseen during fitting and selection.\n\nThe practical rule is to treat a preprocessing object as part of the model: its feature order, fitted values, source rows, and digest travel together. If one changes, rebuild and document the training artifact. When the separately approved training and evaluation complete, a later experimental lesson can use those receipts and report results. Until then, this notebook supports only data-contract and preprocessing instruction."),
            ("References", "The first source motivates structured decision-making with precedence constraints; the second provides context on learning methods for planning. The implementation details demonstrated here are defined by PhaseFlow's versioned pipeline and frozen manifest, not inferred from these papers.\n\n- [ICAPS proceedings, volume 33, issue 1](https://doi.org/10.1609/icaps.v33i1.27244)\n- [FLAIRS proceedings, volume 35](https://doi.org/10.32473/flairs.v35i.130584)"),
        ],
        "figure_notes": ["The chart shows the node-count range generated by the small, fixed seed sample, grouped by family. Distinct ranges reflect the sampling rule, not a learned-policy result. Family labels encode different precedence structures, so later evaluation across them tests structural transfer rather than random variation alone. The subset is illustrative; use the manifest counts as the protocol, not this plot, when describing the approved experiment.", "Each panel displays the same feature under raw and training-standardized scales. Centering and scaling are fitted only on the small training subset, and the vertical axis shows node observations, not independent mines. The shape remains informative after scaling, which is why normalization must not be described as distribution alignment. Held-out families may still differ substantially from the training population.", "The family and seed are fixed while graph size changes. The curves expose size-dependent behavior such as depth and degree fractions, while bounded value and tonnage features may remain on similar scales. This is a sensitivity view of the generator, not a model-quality test. A real deposit can have structures outside these patterns, so size alone cannot establish representativeness."],
        "code": [
            "from pathlib import Path\nimport json, sys\nimport numpy as np\nimport matplotlib.pyplot as plt\nROOT = Path.cwd().parents[2]\nsys.path.insert(0, str(ROOT / 'data-pipeline'))\nfrom pipeline.model.frontier_data import FEATURE_NAMES, GENERATOR_VERSION, generate_graph\nfrom pipeline.model.frontier_features import fit_training_normalizer, normalizer_contract, feature_contract_sha256\nfrom pipeline.model.frontier_policy import validate_split_manifest\nfrom pipeline.model.frontier_splits import build_split_manifest, manifest_sha256",
            "index = json.loads((ROOT / 'data/derived/manifests/index.json').read_text(encoding='utf-8'))\nmanifest = build_split_manifest([row['case_id'] for row in index['cases']])\npartition_counts = validate_split_manifest(manifest)\nmanifest_digest = manifest_sha256(manifest)\nprint({'generator': GENERATOR_VERSION, 'counts': partition_counts, 'manifest_sha256': manifest_digest})",
            "sample_rows = manifest['train'][:24]\nsample_graphs = [\n    generate_graph(row['seed'], row['family'], row['size'])\n    for row in sample_rows\n]\nfamily_sizes = {\n    family: [graph.size for graph in sample_graphs if graph.family == family]\n    for family in sorted({graph.family for graph in sample_graphs})\n}\nprint({\n    name: (len(values), min(values), max(values))\n    for name, values in family_sizes.items()\n})",
            "fig, ax = plt.subplots(figsize=(8, 3.5))\nax.boxplot([values for values in family_sizes.values()], tick_labels=list(family_sizes))\nax.set_ylabel('Nodes per generated graph')\nax.set_title('Lesson sample by training family')\nax.grid(axis='y', alpha=.25)\nplt.show()",
            "normalizer, training_data_digest = fit_training_normalizer(sample_rows)\nnormalizer_data = normalizer_contract(normalizer)\nfeature_digest = feature_contract_sha256(normalizer, training_data_digest)\nreceipt = {'rows_used': len(sample_rows), 'node_rows': normalizer.train_rows}\nreceipt['training_data_sha256'] = training_data_digest\nreceipt['feature_contract_sha256'] = feature_digest\nprint(receipt)\nprint(normalizer_data)",
            "raw = np.concatenate([graph.node_features for graph in sample_graphs], axis=0)\nscaled = (raw - np.asarray(normalizer.mean)) / np.asarray(normalizer.scale)\nprint('feature order:', list(FEATURE_NAMES))\nprint('raw shape:', raw.shape, 'scaled finite:', bool(np.isfinite(scaled).all()))",
            "fig, axes = plt.subplots(1, 2, figsize=(10, 3.5))\nseries = ((raw[:, 0], 'raw value_norm'), (scaled[:, 0], 'standardized value_norm'))\nfor axis, (values, title) in zip(axes, series):\n    axis.hist(values, bins=18, color='#247ba0', alpha=.85)\n    axis.set_title(title)\n    axis.set_ylabel('Node observations')\n    axis.grid(alpha=.2)\nplt.tight_layout()\nplt.show()",
            "size_rows = [\n    generate_graph(seed, 'branching', size)\n    for size in (32, 96, 256)\n    for seed in (71, 72, 73)\n]\nsize_summary = [\n    (graph.size, float(graph.node_features[:, 4].mean()),\n     float(graph.node_features[:, 5].mean()))\n    for graph in size_rows\n]\nprint('size, mean depth fraction, mean predecessor fraction:', size_summary[:3])",
            "fig, ax = plt.subplots(figsize=(7, 3.5))\nfor size in (32, 96, 256):\n    rows = [row for row in size_summary if row[0] == size]\n    ax.scatter([size] * len(rows), [row[1] for row in rows], label=f'{size} nodes')\nax.set_xlabel('Graph size')\nax.set_ylabel('Mean depth_fraction')\nax.set_title('Size sensitivity at fixed family')\nax.grid(alpha=.25)\nax.legend()\nplt.show()",
            "for count in (8, 24):\n    fitted, digest = fit_training_normalizer(manifest['train'][:count])\n    report = {'training_graphs': count, 'node_rows': fitted.train_rows}\n    report['mean_value_norm'] = round(float(fitted.mean[0]), 5)\n    report['data_sha256_prefix'] = digest[:12]\n    print(report)\nprint('Frozen manifest remains:', manifest_digest)",
        ],
    },
    "es": {
        "title": "Preparar datos auditables para una política de frontera",
        "question": "¿Cómo permiten las particiones congeladas y la normalización solo de entrenamiento reproducir un experimento sintético sin exponer casos reservados?",
        "level": "**Nivel:** 2 : Método en práctica.",
        "question_marker": "**Pregunta:**",
        "answer_marker": "**Respuesta:**",
        "sections": [
            ("Objetivos", "Al terminar podrás seguir un grafo generado desde su semilla y familia hasta un registro de partición congelado; distinguirás por qué separar semillas, familias y casos del producto responde a riesgos de fuga distintos; ajustarás estadísticas nombradas usando solo registros de entrenamiento; y reproducirás el resumen que vincula esas estadísticas con sus filas de origen. También cuantificarás cómo cambian la familia y el tamaño la población de atributos. El ejercicio usa los contratos de datos de la canalización del repositorio sobre un subconjunto pequeño y acotado para ejecutarlo rápidamente. Enseña preparación de datos, no entrenamiento ni calidad del modelo. Un resumen correcto demuestra reproducibilidad byte a byte para las entradas declaradas; no demuestra que los grafos sintéticos representen una mina operativa."),
            ("Preparación", "Ejecuta desde la raíz del repositorio con el entorno fijado para notebooks. El generador de origen, el constructor de particiones, el validador y el normalizador se importan desde la canalización de datos; las celdas no copian sus algoritmos. El registro de particiones comprometido es la autoridad del experimento candidato, mientras se usa aquí un prefijo compacto de las filas de entrenamiento para mantener la lección práctica. Las filas de validación y prueba se inspeccionan solo como metadatos. Nunca se entregan al ajuste. Las dos versiones indicadas corresponden al entorno de notebooks. Ejecuta el notebook completo en un kernel nuevo para regenerar conteos y figuras desde los archivos congelados."),
            ("Datos", "Cada fila del generador declara exactamente cuatro campos: una semilla entera, una familia de grafos, un número de nodos y una versión del generador. La semilla determina el flujo pseudoaleatorio; la familia determina el patrón de precedencia; y el tamaño determina el número de nodos de decisión. El grafo aporta siete atributos nombrados junto con vectores de recursos y aristas de precedencia. El generador es determinista con la misma semilla, familia, tamaño, períodos y versión de implementación. Estos registros son casos sintéticos para desarrollar métodos. No son planes mineros, instancias MineLib, datos de clientes ni evidencia de desempeño operativo. Los identificadores de casos de referencia del producto se mantienen aparte en el registro congelado y se excluyen de cada partición de ajuste y selección del modelo.\n\nLa política separa deliberadamente la familia de grafos entre entrenamiento, validación y prueba. Así, la evaluación posterior mide transferencia entre estructuras y no solo memorización de semillas aleatorias cercanas. Rangos de semillas distintos evitan reutilizar exactamente el flujo aleatorio, mientras que asignar familias distintas da una separación estructural más fuerte. El conjunto de casos del producto queda sellado como evaluación solamente; no debe influir en el ajuste del normalizador, las decisiones de entrenamiento ni la selección basada en validación. Lee el manifiesto antes de cambiarlo: modificar una familia, semilla, regla de tamaño, versión del generador o lista de casos cambia la pregunta científica y debe crear un recibo con nueva versión."),
            ("Método", "Primero carga el índice de casos comprometido y reconstruye el manifiesto aprobado mediante la API del motor. El validador comprueba que las listas estén bien formadas y sean disjuntas. Luego toma solo una muestra pequeña de entrenamiento e inspecciona los grafos generados. La API del normalizador consume los registros, regenera sus matrices de atributos y ajusta medias y escalas usando únicamente esos valores de entrenamiento.\n\nPara el atributo j, el valor estandarizado almacenado es zᵢⱼ = (xᵢⱼ − μⱼ) / σⱼ. La media y la escala se calculan sobre los nodos de las filas de entrenamiento. La implementación trata explícitamente los atributos constantes. El resumen de datos de entrenamiento procesa cada semilla y los bytes exactos de atributos float32 little-endian contiguos, en orden de filas. Un segundo resumen de JSON canónico vincula ese resumen con el contrato nombrado del normalizador. Así se hacen visibles cambios en el orden, las semillas, los valores generados, los nombres de atributos o las estadísticas. Es un recibo de integridad, no una afirmación criptográfica sobre la validez científica del generador.\n\nLa API rechaza un conjunto vacío, semillas duplicadas, un esquema de fila distinto, etiquetas de partición que no sean entrenamiento y nombres de atributos que introduzcan identificadores o resultados. El manifiesto congelado contiene las particiones completas de 1.000/200/500 filas; el ajuste completo pertenece al proceso de entrenamiento separado. Para limitar el tiempo, esta lección ajusta solo 24 filas de entrenamiento. Sus estadísticas pequeñas sirven para comprender la canalización y nunca deben reemplazar al normalizador completo ni presentarse como evidencia de un modelo entrenado."),
            ("Comparación", "Tres vistas responden preguntas de datos distintas. La primera compara los tamaños de nodo por familia en una muestra sintética fija y muestra por qué la familia tiene significado estructural. La segunda compara distribuciones de atributos originales y estandarizados para el subconjunto de la lección; centrar y escalar puede facilitar el trabajo de un optimizador, pero no elimina el cambio de distribución. La tercera varía el tamaño del grafo manteniendo fija la familia y la semilla, para hacer visibles los efectos asociados al tamaño.\n\nLa muestra medida no incluye etiquetas de resultado ni es un benchmark. Una figura aparentemente equilibrada no demuestra que el generador completo lo esté. La estandarización tampoco vuelve intercambiables las observaciones de validación y prueba con las de entrenamiento. Sus familias son deliberadamente distintas, por lo que una caída posterior puede reflejar dificultad de transferencia estructural. Corresponde informar e inspeccionar los modos de falla, no reajustar usando datos reservados."),
            ("Resultados", "La tabla impresa informa los conteos congelados, semillas únicas, pertenencia familiar, tamaño de la muestra didáctica, número de nodos usados al ajustar el normalizador y los dos resúmenes de reproducibilidad. Responde la pregunta: la preparación es auditable porque el esquema de filas, la política de partición, el límite de ajuste solo con entrenamiento y los hashes de contenido están explícitos y se verifican por separado. No indica que la política haya aprendido una regla útil de planificación.\n\nEl resumen de atributos muestra la media y escala ajustadas por nombre declarado. Estos valores describen solo las 24 filas de la lección. Si aumentas el tamaño del subconjunto, deberían cambiar las estadísticas y el resumen de datos, mientras el resumen del manifiesto congelado permanece fijo. Al regenerar con los mismos archivos, orden y subconjunto, los resultados deben coincidir. Esta diferencia ayuda a diagnosticar si un cambio proviene del protocolo o simplemente de la muestra pequeña elegida para el tutorial."),
            ("Sensibilidad y límites", "Cambia la familia y el tamaño en la celda de comparación final e inspecciona si se mueven las distribuciones. Repite el ajuste con 8, 24 y 48 filas de entrenamiento y compara medias de atributos y el resumen de datos. Son análisis de sensibilidad de la población de preprocesamiento, no selección de hiperparámetros: no elijas el subconjunto porque produzca resultados posteriores atractivos. El experimento aprobado usa la lista completa de entrenamiento congelada.\n\nLas familias generadas codifican pocos patrones sintéticos de precedencia y relaciones económicas y de recursos sencillas. No modelan incertidumbre geotécnica, interacción de flota, modelos detallados de bloques, precios cambiantes ni restricciones operativas humanas. El normalizador solo reescala atributos; no corrige un generador débil ni fugas en una variable objetivo. Separar semillas no basta si los casos comparten estructura; por ello el protocolo también particiona familias. La separación familiar es una prueba deliberada de estrés, no una afirmación de que las familias cubran depósitos reales. Una conclusión robusta requiere los experimentos reservados posteriores, intervalos de incertidumbre, el registro de fallas y casos auténticos del producto bajo el diseño de evaluación aprobado."),
            ("Usa tus propios datos", "Usa esta lección para comprender la interfaz, no para pegar datos operacionales en el generador sintético. El esquema actual requiere semilla, familia, tamaño y versión; los modelos reales de bloques no se convierten en observaciones válidas asignándoles esos campos. Un flujo con datos reales requiere documentar su origen, derechos y consentimiento, mapeo de esquema, reglas de valores faltantes, unidades, unidad de partición y validación independiente. Separa por mina o depósito cuando observaciones de un mismo origen puedan aparecer a ambos lados. Mantén identificadores y resultados fuera del ajuste de atributos. Ajusta cada transformación con los casos de entrenamiento, congélala y aplícala sin cambios a validación y prueba.\n\nPara un experimento local con el mismo contrato sintético, cambia la cantidad de filas de entrenamiento seleccionadas o inspecciona otra familia declarada y vuelve a ejecutar todas las comprobaciones. No edites el registro comprometido para adaptar datos personalizados. Un nuevo generador o conjunto de datos necesita un contrato y recibo versionados para distinguirlo del experimento que enseña esta lección."),
            ("Resumen", "Seguiste el recorrido desde una especificación versionada de grafos sintéticos hasta particiones disjuntas del manifiesto, atributos de nodo nombrados, un normalizador ajustado solo con entrenamiento y hashes reproducibles. El subconjunto de la lección es demasiado pequeño para afirmar algo sobre la política. La canalización completa usa todas las filas congeladas de entrenamiento y escribe el recibo y los artefactos del modelo fuera del repositorio de fuentes. Las filas reservadas permanecen invisibles durante el ajuste y la selección.\n\nLa regla práctica es tratar el preprocesamiento como parte del modelo: el orden de atributos, los valores ajustados, las filas de origen y el resumen viajan juntos. Si uno cambia, reconstruye y documenta el artefacto de entrenamiento. Cuando terminen el entrenamiento y la evaluación aprobados por separado, una lección empírica posterior podrá usar esos recibos e informar resultados. Hasta entonces, este notebook solo enseña contratos de datos y preprocesamiento."),
            ("Referencias", "La primera fuente motiva la toma de decisiones estructurada con restricciones de precedencia; la segunda da contexto a métodos de aprendizaje para planificación. Los detalles de implementación demostrados aquí los define la canalización versionada y el manifiesto congelado de PhaseFlow, no se infieren de esos artículos.\n\n- [Actas ICAPS, volumen 33, número 1](https://doi.org/10.1609/icaps.v33i1.27244)\n- [Actas FLAIRS, volumen 35](https://doi.org/10.32473/flairs.v35i.130584)"),
        ],
        "figure_notes": ["El gráfico muestra el rango de tamaños de nodo generado por la muestra pequeña y fija de semillas, agrupada por familia. Los rangos distintos reflejan la regla de muestreo, no el resultado de una política aprendida. Las etiquetas familiares codifican estructuras de precedencia distintas; por eso la evaluación posterior entre ellas prueba transferencia estructural y no solo variación aleatoria. El subconjunto es ilustrativo: describe el protocolo con los conteos del manifiesto, no con esta figura.", "Cada panel muestra el mismo atributo en escalas original y estandarizada para entrenamiento. El centrado y escalado se ajustan solo con el pequeño subconjunto de entrenamiento; el eje vertical representa observaciones de nodos, no minas independientes. La forma sigue siendo informativa después de escalar, por lo que la normalización no debe describirse como alineación de distribuciones. Las familias reservadas pueden seguir siendo muy distintas.", "La familia y la semilla permanecen fijas mientras cambia el tamaño. Las curvas muestran comportamientos asociados al tamaño, como profundidad y grado, mientras atributos acotados de valor y tonelaje pueden conservar escalas similares. Es una vista de sensibilidad del generador, no una prueba de calidad del modelo. Un depósito real puede tener estructuras ajenas a estos patrones; el tamaño por sí solo no demuestra representatividad."],
        "code": None,
    },
}

def markdown(text: str, cell_id: str) -> dict:
    return {"cell_type": "markdown", "id": cell_id, "metadata": {}, "source": text.splitlines(keepends=True)}


def code(text: str, cell_id: str, outputs: list[dict] | None = None) -> dict:
    return {"cell_type": "code", "execution_count": None, "id": cell_id, "metadata": {},
            "outputs": outputs or [], "source": text.splitlines(keepends=True)}


def code_text(language: str, index: int) -> str:
    source = TEXT["en"]["code"][index]
    if language == "es":
        translations = {
            "Lesson sample by training family": "Muestra didáctica por familia de entrenamiento",
            "Nodes per generated graph": "Nodos por grafo generado",
            "raw value_norm": "value_norm original",
            "standardized value_norm": "value_norm estandarizado",
            "Node observations": "Observaciones de nodos",
            "feature order:": "orden de atributos:",
            "raw shape:": "dimensiones originales:",
            "scaled finite:": "escalados finitos:",
            "size, mean depth fraction, mean predecessor fraction:": "tamaño, profundidad media, precedencia media:",
            "Graph size": "Tamaño del grafo",
            "Mean depth_fraction": "Media de fracción de profundidad",
            "Size sensitivity at fixed family": "Sensibilidad al tamaño con familia fija",
            "Frozen manifest remains:": "El manifiesto congelado se mantiene:",
        }
        for english, spanish in translations.items():
            source = source.replace(english, spanish)
    return source


def build(language: str) -> dict:
    text = TEXT[language]
    cells = [markdown(f"# {text['title']}\n\n{text['question_marker']} {text['question']}\n\n{text['level']}", "frontier-data-title")]
    s = text["sections"]
    answer = ("The frozen ledger records 1,000 training, 200 validation, and 500 test rows. "
              if language == "en" else
              "El registro congelado contiene 1.000 filas de entrenamiento, 200 de validación y 500 de prueba. ")
    s[5] = (s[5][0], text["answer_marker"] + " " + answer + s[5][1])
    cells.extend([
        markdown(("## Objectives\n\n" if language == "en" else "## Objetivos\n\n") + s[0][1], "frontier-data-objectives"),
        markdown(("## Setup\n\n" if language == "en" else "## Preparación\n\n") + s[1][1] + "\n\n```bash\npython -m pip install " + " ".join(PACKAGES) + "\n```", "frontier-data-setup"),
        markdown("### Package versions\n\nThe next cell reports installed pins before data processing." if language == "en" else "### Versiones de paquetes\n\nLa siguiente celda informa las versiones instaladas antes de procesar datos.", "frontier-data-version-note"),
        code("# Report exact runtime pins before processing data.\nimport importlib.metadata\nprint({name: importlib.metadata.version(name) for name in ('numpy', 'matplotlib')})", "frontier-data-versions"),
        code(code_text(language, 0), "frontier-data-imports"),
        markdown(("## Data\n\n" if language == "en" else "## Datos\n\n") + s[2][1], "frontier-data-description"),
        code(code_text(language, 1), "frontier-data-manifest"),
        markdown(("## Method\n\n" if language == "en" else "## Método\n\n") + s[3][1] + "\n\n$$z_{ij} = \\frac{x_{ij} - \\mu_j}{\\sigma_j}$$\n\n$$h = \\mathrm{SHA256}(\\mathrm{canonicalJSON}(\\mathrm{normalizer}, h_{train}))$$", "frontier-data-method"),
        code(code_text(language, 2), "frontier-data-sample"),
        code(code_text(language, 3), "frontier-data-figure-families"),
        markdown(("### Reading the family-size figure\n\n" if language == "en" else "### Lectura de tamaños por familia\n\n") + text["figure_notes"][0], "frontier-data-reading-families"),
        code(code_text(language, 4), "frontier-data-fit"),
        code(code_text(language, 5), "frontier-data-transform"),
        code(code_text(language, 6), "frontier-data-figure-feature"),
        markdown(("### Reading the feature-scale figure\n\n" if language == "en" else "### Lectura de escalas de atributos\n\n") + text["figure_notes"][1], "frontier-data-reading-features"),
        markdown(("### Diagnostic views\n\n" if language == "en" else "### Vistas comparativas\n\n") + s[4][1], "frontier-data-comparison"),
        code(code_text(language, 7), "frontier-data-size-summary"),
        code(code_text(language, 8), "frontier-data-figure-size"),
        markdown(("### Reading the size-sensitivity figure\n\n" if language == "en" else "### Lectura de sensibilidad al tamaño\n\n") + text["figure_notes"][2], "frontier-data-reading-size"),
        code(code_text(language, 9), "frontier-data-sensitivity"),
        markdown(("## Results\n\n" if language == "en" else "## Resultados\n\n") + s[5][1], "frontier-data-results"),
        markdown(("### Sensitivity and limits\n\n" if language == "en" else "### Sensibilidad y límites\n\n") + s[6][1], "frontier-data-limits"),
        markdown(("### Use your own data\n\n" if language == "en" else "### Usa tus propios datos\n\n") + s[7][1], "frontier-data-own-data"),
        markdown(("## Summary\n\n" if language == "en" else "## Resumen\n\n") + s[8][1], "frontier-data-summary"),
        markdown(("## References\n\n" if language == "en" else "## Referencias\n\n") + s[9][1], "frontier-data-references"),
    ])
    # Code cells need a preceding markdown explanation with a real comment in code.
    notes = {
        "frontier-data-versions": "Report exact runtime pins before the workflow begins.",
        "frontier-data-imports": "Import the committed engine APIs; this lesson does not reproduce their algorithms.",
        "frontier-data-manifest": "Rebuild and validate the frozen split against the committed product-case index.",
        "frontier-data-sample": "Generate only a small training sample so validation and test values remain untouched.",
        "frontier-data-figure-families": "Plot the sampled training graph sizes by their declared structure.",
        "frontier-data-fit": "Fit the named normalizer on training rows and bind its statistics to source bytes.",
        "frontier-data-transform": "Apply the fitted training statistics to the same sample and check finiteness.",
        "frontier-data-figure-feature": "Compare raw and standardized values without implying distribution alignment.",
        "frontier-data-size-summary": "Vary size at fixed family and seed to inspect generator sensitivity.",
        "frontier-data-figure-size": "Visualize the size response for the declared depth feature.",
        "frontier-data-sensitivity": "Repeat fitting at smaller training counts and retain the frozen manifest digest.",
    }
    notes_es = {
        "frontier-data-versions": "Informa las versiones exactas del entorno antes de procesar datos.",
        "frontier-data-imports": "Importa las API comprometidas del motor; esta lección no copia sus algoritmos.",
        "frontier-data-manifest": "Reconstruye y valida la partición congelada frente al índice de casos.",
        "frontier-data-sample": "Genera una muestra pequeña de entrenamiento y deja intactas las filas reservadas.",
        "frontier-data-figure-families": "Grafica los tamaños de los grafos de entrenamiento por estructura declarada.",
        "frontier-data-fit": "Ajusta el normalizador nombrado y vincula sus estadísticas con los bytes de origen.",
        "frontier-data-transform": "Aplica las estadísticas de entrenamiento y comprueba que los valores sean finitos.",
        "frontier-data-figure-feature": "Compara valores originales y estandarizados sin afirmar alineación de distribuciones.",
        "frontier-data-size-summary": "Varía el tamaño con familia y semilla constantes.",
        "frontier-data-figure-size": "Visualiza la respuesta del atributo de profundidad ante el tamaño.",
        "frontier-data-sensitivity": "Repite el ajuste con menos filas y conserva el resumen del manifiesto.",
    }
    expanded = []
    for cell in cells:
        if cell["cell_type"] == "code":
            explanation = notes[cell["id"]] if language == "en" else notes_es[cell["id"]]
            expanded.append(markdown("### " + explanation, cell["id"] + "-explanation"))
            cell["source"][0] = "# " + explanation + "\n" + cell["source"][0]
        expanded.append(cell)
    cells = expanded
    notebook = {
        "cells": cells,
        "metadata": {
            "kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"},
            "language_info": {"name": "python"},
            "caos": {"beyond": [], "data": [], "language": language, "level": 2, "packages": PACKAGES,
                     "sources": SOURCES, "title": text["title"], "topic": TOPIC},
        },
        "nbformat": 4,
        "nbformat_minor": 5,
    }
    return notebook


def main() -> None:
    for language in ("en", "es"):
        target = ROOT / "notebooks" / language / TOPIC / f"{SLUG}.ipynb"
        target.write_text(json.dumps(build(language), indent=1, ensure_ascii=False) + "\n", encoding="utf-8", newline="\n")
        print(target.relative_to(ROOT))


if __name__ == "__main__":
    main()
