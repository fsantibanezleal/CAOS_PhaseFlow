"""Build the mirrored, executable frontier-state and feasibility-mask notebook pair."""
from __future__ import annotations

from pathlib import Path

import nbformat as nbf

ROOT = Path(__file__).resolve().parents[1]
TOPIC = "04-learned-surrogates"

TEXT = {
    "en": {
        "title": "Construct and inspect a feasible mining frontier",
        "sections": [
            ("Objectives", "Follow one generated block graph from its seeded source through admissible actions to an independently checked schedule. By the end, you can explain why a precedence frontier alone is insufficient, inspect the two resource limits separately, and distinguish a complete horizon from a deliberate early stop. This is an implementation notebook: the calls below import the same product modules used by the planned offline runner. The generated values are synthetic method-development data. They are not MineLib observations, a trained result, or an operating plan. The seed, graph family, feature order and resource units remain visible so another reader can reproduce every displayed count."),
            ("Setup", "The environment needs the repository's pinned NumPy and OreBlocks dependency plus Matplotlib for figures. No model weights are loaded and no training occurs in this experiment. The current 0.11 product bake supplies the frozen comparison baseline; this notebook isolates only the mechanics approved for the separate 0.12 experiment. Keeping those stages separate prevents a demonstration graph from being mistaken for a product benchmark case. All code is deterministic for a fixed generator version, family, size and seed. If a dependency or source file is unavailable, execution should stop at setup rather than silently substitute a different implementation."),
            ("Data", "A graph has a canonical integer index for every block, a directed acyclic predecessor relation, a discounted economic value, two resource consumptions and a capacity vector for each period. The four generator families alter dependency geometry while retaining the same explicit data contract. Here we select the crosscut family, whose nodes can depend on both a previous bench-like row and a neighboring block. Edge thinning is seeded, so graph structure is repeatable. Node features are named and ordered by the generator. They contain value, tonnage, processing share, grade, depth and local graph degrees; identifiers, split labels and outcomes are absent."),
            ("Method", "At a decision state, eligibility requires that every immediate predecessor has already been scheduled no later than the current period. The resource mask then removes any eligible block that would exceed at least one residual limit. A block can therefore be precedence-ready yet inadmissible for capacity. The environment adds explicit stop-period and stop-schedule actions, so a policy can reserve a period or return a valid partial plan. This notebook uses a transparent deterministic score only to inspect transitions. That score is not a learned policy and its output cannot be described as a training or evaluation result."),
            ("Comparison", "The first plot compares the precedence-ready count with the smaller resource-feasible action count at each period boundary. A gap between the lines means that capacity, rather than precedence, removed choices. The second plot shows the selected block values alongside the resulting schedule's per-period resource load. These views answer different questions: one diagnoses the action mask, while the other checks how decisions consume the declared budget. They are derived directly from the generated instance and the validated schedule; no values are copied from a manuscript or typed into a chart."),
            ("Evidence", "The evidence here is intentionally bounded. We report the generator receipt, node-feature shape, frontier counts, schedule length, objective recomputed by the independent validator, tonnage coverage, value coverage and stop reason. The validation call recomputes uniqueness, precedence, period capacity and discounted objective from the exported assignments. Passing that check establishes feasibility of this one generated schedule. It does not measure generalization, compare against another scheduling method, establish a benefit, or evaluate any of the thirteen product cases. Those questions require the frozen test protocol and a completed all-case bake."),
            ("Results", "Use the printed table and figures together. A low feasible-action count is not itself a policy defect; it can be the correct consequence of a binding resource. A partial schedule can be feasible while leaving positive-value blocks and tonnage unmined, which is why coverage is reported in two separate units. The selected demonstration score favors positive value per unit of mining capacity, but it is deliberately simple and has no claim to optimize the multi-period objective. Interpret the output as a worked example of the data path and validator, not as evidence that one score is preferable. **Answer:** In this 96-block example, precedence and capacity create distinct action sets, and the independent schedule check confirms the exported objective."),
            ("Summary", "You have traced a seeded graph into a mask, advanced periods with explicit stop actions, and checked the final assignments independently. The key invariant is that the exported schedule is validated from the original instance rather than trusted because the environment previously exposed a mask. Before training is wired in, this contract will be extended with the train-only normalizer, disjoint split receipt, checkpoint hash and per-member budget record. Product rendering will consume committed, validated traces; the browser will not run PPO or load training weights. The next notebook in the research sequence will inspect the frozen training receipt and held-out evaluation once those artifacts exist. The example is intentionally small enough to audit block by block, but the same independent checks apply at the declared synthetic graph sizes. A successful example is a software check, not statistical evidence. Keep that distinction when adapting the workflow: first freeze the data contract, then run the held-out experiment, and finally report every failed, partial and complete case without selective filtering."),
            ("References", "The graph-policy pattern is informed by resource-constrained project scheduling research, where a policy ranks currently eligible tasks and a schedule-generation procedure enforces feasibility. The transfer boundary matters: those papers optimize different objectives and do not establish PhaseFlow performance. The source below is included for method context only. The implementation shown here is the approved PhaseFlow design under development, and every numerical output in this notebook is generated from the stated synthetic seed rather than taken from that publication."),
        ],
        "cell_labels": ["Load the product implementation", "Generate and audit the graph", "Measure the two-stage action set", "Replay a deterministic illustrative score", "Recompute the schedule independently", "Plot eligibility and resource feasibility", "Plot schedule value and capacity use"],
        "plot1": ("Precedence-ready blocks and resource-feasible actions", "Period", "Available block actions", "Precedence-ready", "After all resource limits"),
        "plot2": ("Illustrative schedule value and resource use", "Period / selected block", "Value or resource use", "Selected block value", "Mining capacity use"),
        "interpret": "The mask can remove a block only after checking all resource dimensions. If the two curves differ, inspect the residual capacity vector before attributing that difference to graph structure. The plot is a state diagnostic, not a performance comparison. The validator result below applies to this schedule and seed alone; it gives no estimate of performance on an unseen graph.",
    },
    "es": {
        "title": "Construir e inspeccionar una frontera minera factible",
        "sections": [
            ("Objetivos", "Sigue un grafo de bloques generado con semilla desde su origen hasta las acciones admisibles y un plan revisado de forma independiente. Al terminar podrás explicar por qué la frontera de precedencia por sí sola no basta, inspeccionar por separado los dos límites de recursos y distinguir el horizonte completo de una detención anticipada deliberada. Este cuaderno ejecuta la implementación: las llamadas importan los mismos módulos del producto previstos para el ejecutor fuera de línea. Los valores generados son datos sintéticos para desarrollar el método. No son observaciones de MineLib, resultados de un modelo entrenado ni un plan operativo. La semilla, familia, orden de variables y unidades quedan visibles para reproducir cada conteo."),
            ("Preparación", "El entorno necesita NumPy y OreBlocks fijados por el repositorio, además de Matplotlib para las figuras. Este experimento no carga pesos ni ejecuta entrenamiento. La versión 0.11 del producto aporta la línea base congelada; este cuaderno aísla la mecánica aprobada para el experimento 0.12, que tendrá versión propia. Separar esas etapas evita confundir un grafo de demostración con un caso de referencia del producto. El código es determinista con una versión de generador, familia, tamaño y semilla constantes. Si falta una dependencia o archivo fuente, la ejecución debe detenerse en preparación y no sustituir la implementación silenciosamente."),
            ("Datos", "El grafo asigna un índice entero canónico a cada bloque, una relación acíclica de predecesores, valor económico descontado, consumo de dos recursos y capacidades por período. Las cuatro familias del generador modifican la geometría de dependencias y conservan el mismo contrato de datos. Aquí elegimos la familia de cruces, cuyos nodos pueden depender tanto de una fila previa como de un bloque vecino. La reducción de aristas usa la semilla y por ello la estructura es reproducible. Las variables de nodo tienen nombres y orden fijos: valor, tonelaje, proporción de procesamiento, ley, profundidad y grados locales del grafo. No incluyen identificadores, etiquetas de partición ni resultados."),
            ("Método", "En cada estado, un bloque es elegible cuando todos sus predecesores inmediatos ya están programados en un período no posterior al actual. La máscara de recursos elimina después cualquier bloque que supere al menos un límite residual. Por tanto, un bloque listo por precedencia puede seguir siendo inadmisible por capacidad. El entorno agrega acciones explícitas para detener el período o el plan, de modo que una política pueda reservar un período o devolver un plan parcial válido. Aquí usamos una puntuación determinista y transparente solo para observar las transiciones. No es una política aprendida y su salida no se describe como resultado de entrenamiento ni de evaluación."),
            ("Comparación", "La primera figura compara la cantidad de bloques listos por precedencia con la cantidad menor que además cabe en los recursos al inicio de cada período. Una diferencia significa que la capacidad, y no la precedencia, eliminó opciones. La segunda figura muestra los valores de los bloques seleccionados y el uso de recursos del plan por período. Las vistas responden preguntas distintas: una diagnostica la máscara de acciones y la otra revisa cómo las decisiones consumen el presupuesto declarado. Se calculan desde la instancia generada y el plan validado; ningún dato se copió de un manuscrito ni se escribió a mano en una gráfica."),
            ("Evidencia", "La evidencia tiene límites explícitos. Informamos el recibo del generador, forma de variables, conteos de frontera, longitud del plan, objetivo recalculado por el validador independiente, cobertura de tonelaje, cobertura de valor y motivo de detención. El validador vuelve a comprobar unicidad, precedencia, capacidad por período y objetivo descontado desde las asignaciones exportadas. Superar esa comprobación establece la factibilidad de este único plan generado. No mide generalización, no compara con otro método de planificación, no establece beneficios ni evalúa los trece casos del producto. Esas preguntas requieren el protocolo de prueba congelado y un rebake completo."),
            ("Resultados", "Interpreta juntos la tabla impresa y los gráficos. Un conteo bajo de acciones factibles no es por sí mismo un defecto de la política: puede ser consecuencia correcta de un recurso vinculante. Un plan parcial puede ser factible y dejar tonelaje o bloques de valor positivo sin extraer; por eso se informan ambas coberturas en unidades separadas. La puntuación de demostración favorece valor positivo por unidad de capacidad minera, pero es intencionalmente simple y no afirma optimizar el objetivo multiperíodo. Lee la salida como un ejemplo trabajado del flujo de datos y del validador, no como evidencia de que una puntuación sea preferible. **Respuesta:** En este ejemplo de 96 bloques, la precedencia y la capacidad forman conjuntos de acciones distintos, y la comprobación independiente confirma el objetivo exportado."),
            ("Resumen", "Trazaste un grafo con semilla hasta la máscara, avanzaste períodos mediante acciones explícitas y verificaste las asignaciones finales de manera independiente. La invariancia central es validar el plan exportado desde la instancia original, en vez de confiar en que el entorno expuso antes una máscara. Antes de integrar el entrenamiento, el contrato sumará normalización exclusiva de entrenamiento, recibo de particiones disjuntas, hash del checkpoint y presupuesto por integrante. La aplicación leerá trazas confirmadas; el navegador no ejecutará PPO ni cargará pesos de entrenamiento. El siguiente cuaderno de investigación revisará el recibo congelado y la evaluación reservada cuando esos artefactos existan. El ejemplo es lo bastante pequeño para auditar cada bloque, pero las mismas comprobaciones independientes rigen los tamaños sintéticos declarados. Un ejemplo exitoso verifica software, no constituye evidencia estadística. Al adaptar el flujo, congela primero el contrato de datos, ejecuta después el experimento reservado y finalmente informa cada caso fallido, parcial y completo sin filtrar resultados."),
            ("Referencias", "El patrón de política sobre grafos toma contexto de la investigación de programación de proyectos con recursos restringidos, donde una política ordena tareas elegibles y un procedimiento de generación mantiene la factibilidad. El límite de transferencia importa: esos trabajos optimizan objetivos distintos y no demuestran desempeño de PhaseFlow. La fuente siguiente aporta contexto metodológico. La implementación mostrada es el diseño aprobado para PhaseFlow que continúa en desarrollo, y cada valor numérico del cuaderno se genera con la semilla sintética declarada en vez de extraerse de la publicación."),
        ],
        "cell_labels": ["Cargar la implementación del producto", "Generar y auditar el grafo", "Medir las dos etapas del conjunto de acciones", "Reproducir una puntuación ilustrativa", "Recalcular el plan de forma independiente", "Graficar elegibilidad y factibilidad de recursos", "Graficar valor del plan y uso de capacidad"],
        "plot1": ("Bloques listos por precedencia y acciones factibles por recursos", "Período", "Acciones disponibles", "Listos por precedencia", "Tras aplicar todos los límites"),
        "plot2": ("Valor ilustrativo del plan y uso de recursos", "Período / bloque seleccionado", "Valor o uso de recursos", "Valor del bloque seleccionado", "Uso de capacidad minera"),
        "interpret": "La máscara elimina un bloque solo después de revisar cada dimensión de recursos. Si las curvas difieren, inspecciona la capacidad residual antes de atribuirlo a la estructura del grafo. Esta figura diagnostica un estado, no compara desempeño. La validación siguiente corresponde únicamente a este plan y esta semilla; no estima el desempeño en grafos desconocidos.",
    },
}

CODE = [
    "from pathlib import Path\nimport sys\nimport numpy as np\nimport matplotlib.pyplot as plt\nROOT = Path.cwd()\nsys.path.insert(0, str(ROOT / 'data-pipeline'))\nfrom pipeline.model.frontier_data import generate_graph, FEATURE_NAMES\nfrom pipeline.model.frontier_policy import feasible_frontier, precedence_frontier, replay_frontier_policy, validate_schedule",
    "SEED, FAMILY, SIZE = 4217, 'crosscut', 96\ngraph = generate_graph(SEED, FAMILY, SIZE, periods=8)\ninstance = graph.instance\nprint({'generator': graph.family_parameters, 'seed': graph.seed, 'blocks': len(instance.values), 'arcs': sum(map(len, instance.predecessors)), 'feature_names': FEATURE_NAMES, 'feature_shape': graph.node_features.shape, 'resource_names': ['mining tonnes', 'processing tonnes']})\nassert np.isfinite(graph.node_features).all()",
    "ready = precedence_frontier(instance, (), 0)\nfeasible = feasible_frontier(instance, (), 0)\nprint({'period': 0, 'precedence_ready_blocks': len(ready), 'resource_feasible_blocks': len(feasible), 'removed_by_capacity': len(ready) - len(feasible), 'ready_indices': ready[:12], 'feasible_indices': feasible[:12]})",
    "def illustrative_score(block, period, assigned):\n    if block < 0:\n        return -1e6\n    return float(instance.values[block] / max(instance.resources[block, 0], 1e-12))\nresult = replay_frontier_policy(instance, illustrative_score, tonnage=graph.tonnage)\nready_counts, feasible_counts, prefix = [], [], []\nfor assignment in result.assignments:\n    ready_counts.append(len(precedence_frontier(instance, prefix, assignment.period)))\n    feasible_counts.append(len(feasible_frontier(instance, prefix, assignment.period)))\n    prefix.append(assignment)\nprint({'assignments': len(result.assignments), 'stopped': result.stopped, 'npv': round(result.npv, 4), 'tonnage_coverage': round(result.tonnage_coverage, 4), 'positive_value_coverage': round(result.positive_value_coverage, 4), 'decision_states': len(ready_counts)})",
    "independent_npv = validate_schedule(instance, result.assignments)\nassert np.isclose(independent_npv, result.npv)\nassert len({a.block for a in result.assignments}) == len(result.assignments)\nprint({'independent_npv': round(independent_npv, 4), 'objective_match': bool(np.isclose(independent_npv, result.npv)), 'schedule_stop_reason': result.stopped})",
    "prefix = []\nfor assignment in result.assignments:\n    assert assignment.block in feasible_frontier(instance, prefix, assignment.period)\n    prefix.append(assignment)\nprint({'assignments_replayed_from_feasible_frontier': len(prefix), 'all_actions_were_admissible': True})",
    "fig, ax = plt.subplots(figsize=(9, 4.8), constrained_layout=True)\ndecisions = np.arange(1, len(ready_counts) + 1)\nax.plot(decisions, ready_counts, marker='o', linewidth=2.2, label='PRECEDENCE_READY')\nax.plot(decisions, feasible_counts, marker='s', linewidth=2.2, label='RESOURCE_FEASIBLE')\nax.set(title='PLOT1_TITLE', xlabel='PLOT1_X', ylabel='PLOT1_Y')\nax.grid(alpha=.25); ax.legend(frameon=False); plt.show()",
    "period_use = np.zeros((len(instance.capacities), instance.resources.shape[1]))\nfor assignment in result.assignments:\n    period_use[assignment.period] += instance.resources[assignment.block]\nselected_values = [instance.values[a.block] for a in result.assignments]\nfig, (value_ax, resource_ax) = plt.subplots(1, 2, figsize=(11, 4.8), constrained_layout=True)\nvalue_ax.bar(np.arange(len(selected_values)), selected_values, color='#4267a9')\nvalue_ax.set(title='VALUE_TITLE', xlabel='VALUE_X', ylabel='VALUE_Y')\nperiods = np.arange(1, len(instance.capacities) + 1)\nresource_ax.plot(periods, period_use[:, 0], marker='o', linewidth=2, label='MINING_USE')\nresource_ax.plot(periods, instance.capacities[:, 0], linestyle='--', label='MINING_CAPACITY')\nresource_ax.set(title='RESOURCE_TITLE', xlabel='RESOURCE_X', ylabel='RESOURCE_Y')\nresource_ax.grid(alpha=.25); resource_ax.legend(frameon=False); value_ax.grid(axis='y', alpha=.25); plt.show()\nprint({'period_mining_use': np.round(period_use[:, 0], 2).tolist(), 'period_mining_capacity': np.round(instance.capacities[:, 0], 2).tolist()})",
]


def build(language: str) -> None:
    text = TEXT[language]
    nb = nbf.v4.new_notebook()
    nb.metadata = {
        "kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"},
        "language_info": {"name": "python"},
        "caos": {"language": language, "topic": TOPIC, "level": 4, "title": text["title"],
                 "packages": ["oreblocks==0.6.6", "numpy==2.5.1", "matplotlib==3.11.2"],
                 "data": [], "sources": ["https://doi.org/10.1609/icaps.v33i1.27244"], "beyond": ["BS-2"]},
    }
    question = ("**Question:** How do precedence and two-resource capacity shape the actions available to a schedule builder?"
                if language == "en" else
                "**Pregunta:** ¿Cómo cambian la precedencia y la capacidad de dos recursos las acciones disponibles para construir un plan?")
    level = ("**Level:** 4 : run product methods on a seeded graph and check the schedule independently."
             if language == "en" else
             "**Nivel:** 4 : ejecuta métodos del producto en un grafo con semilla y verifica el plan de forma independiente.")
    cells = [nbf.v4.new_markdown_cell(f"# {text['title']}\n\n{question}\n\n{level}")]
    cells.append(nbf.v4.new_markdown_cell(f"## {text['sections'][0][0]}\n\n{text['sections'][0][1]}"))
    setup_heading = text['sections'][1][0]
    install_command = "python -m pip install oreblocks==0.6.6 numpy==2.5.1 matplotlib==3.11.2"
    pins = "The exact pins are `oreblocks==0.6.6`, `numpy==2.5.1` and `matplotlib==3.11.2`." if language == "en" else "Las versiones fijadas son `oreblocks==0.6.6`, `numpy==2.5.1` y `matplotlib==3.11.2`."
    setup_text = f"## {setup_heading}\n\n{text['sections'][1][1]}\n\n{pins}\n\n```bash\n{install_command}\n```"
    cells.append(nbf.v4.new_markdown_cell(setup_text))
    cells.append(nbf.v4.new_markdown_cell(
        "Print exact installed versions before importing the method." if language == "en"
        else "Imprime las versiones instaladas antes de importar el método."))
    cells.append(nbf.v4.new_code_cell("""# Confirm exact versions before loading product modules.
import importlib.metadata as metadata
print({name: metadata.version(name) for name in ('oreblocks', 'numpy', 'matplotlib')})"""))
    cells.append(nbf.v4.new_markdown_cell(f"## {text['sections'][2][0]}\n\n{text['sections'][2][1]}"))
    cells.append(nbf.v4.new_markdown_cell(
        "Generate one crosscut graph from the declared seed and inspect its source receipt and feature matrix." if language == "en"
        else "Genera un grafo de cruces con la semilla declarada e inspecciona su recibo de origen y matriz de variables."))
    cells.append(nbf.v4.new_code_cell("""# Generate one reproducible graph and inspect its source contract.
# Locate the repository root from the notebook's working directory.
from pathlib import Path
import sys
import numpy as np
import matplotlib.pyplot as plt
ROOT = next(path for path in (Path.cwd(), *Path.cwd().parents)
            if (path / 'data-pipeline').is_dir())
sys.path.insert(0, str(ROOT / 'data-pipeline'))
from pipeline.model.frontier_data import generate_graph, FEATURE_NAMES
SEED, FAMILY, SIZE = 4217, 'crosscut', 96
graph = generate_graph(SEED, FAMILY, SIZE, periods=8)
instance = graph.instance
print({'generator': graph.family_parameters, 'seed': graph.seed})
print({'blocks': len(instance.values), 'arcs': sum(map(len, instance.predecessors))})
print({'feature_names': FEATURE_NAMES, 'feature_shape': graph.node_features.shape})
if not np.isfinite(graph.node_features).all():
    raise ValueError('the generator emitted non-finite feature values')"""))
    cells.append(nbf.v4.new_markdown_cell(f"## {text['sections'][3][0]}\n\n{text['sections'][3][1]}"))
    cells.append(nbf.v4.new_markdown_cell(
        "Import the product functions, then compare precedence eligibility with both resource limits." if language == "en"
        else "Importa las funciones del producto y compara la elegibilidad por precedencia con ambos límites de recursos."))
    cells.append(nbf.v4.new_code_cell("""# Import the product frontier and validator functions.
from pipeline.model.frontier_policy import (
    feasible_frontier, precedence_frontier, replay_frontier_policy, validate_schedule,
)
ready = precedence_frontier(instance, (), 0)
feasible = feasible_frontier(instance, (), 0)
print({'period': 0, 'precedence_ready': len(ready)})
print({'resource_feasible': len(feasible), 'removed_by_capacity': len(ready) - len(feasible)})
print({'ready_indices': ready[:12], 'feasible_indices': feasible[:12]})"""))
    cells.append(nbf.v4.new_markdown_cell(
        "Replay a transparent score to expose successive policy states. It is a mechanics example, not a learned result." if language == "en"
        else "Reproduce una puntuación transparente para mostrar estados sucesivos. Es un ejemplo mecánico, no un resultado aprendido."))
    cells.append(nbf.v4.new_code_cell("""# Replay value per mining unit as an illustrative deterministic score.
def illustrative_score(block, period, assigned):
    if block < 0:
        return -1e6
    return float(instance.values[block] / max(instance.resources[block, 0], 1e-12))

result = replay_frontier_policy(instance, illustrative_score, tonnage=graph.tonnage)
ready_counts, feasible_counts, prefix = [], [], []
for assignment in result.assignments:
    ready_counts.append(len(precedence_frontier(instance, prefix, assignment.period)))
    feasible_counts.append(len(feasible_frontier(instance, prefix, assignment.period)))
    prefix.append(assignment)
print({'assignments': len(result.assignments), 'stopped': result.stopped})
print({'npv': round(result.npv, 4), 'tonnage_coverage': round(result.tonnage_coverage, 4)})
print({'positive_value_coverage': round(result.positive_value_coverage, 4)})"""))
    cells.append(nbf.v4.new_markdown_cell(
        "Recompute the objective from the original instance and verify each chosen block against its prior feasible frontier." if language == "en"
        else "Recalcula el objetivo desde la instancia original y verifica cada bloque elegido contra su frontera factible anterior."))
    cells.append(nbf.v4.new_code_cell("""# Independently recompute the exported objective from source arrays.
independent_npv = validate_schedule(instance, result.assignments)
print({'independent_npv': round(independent_npv, 4)})
print({'objective_matches': bool(np.isclose(independent_npv, result.npv))})"""))
    cells.append(nbf.v4.new_markdown_cell(
        "Check each assignment against its prior state mask; this probes the transition path, not just final totals." if language == "en"
        else "Verifica cada asignación contra su máscara previa; así se revisan las transiciones, no solo los totales finales."))
    cells.append(nbf.v4.new_code_cell("""# Rebuild each prefix and prove every selected block was admissible.
prefix = []
admissible = []
for assignment in result.assignments:
    admissible.append(assignment.block in feasible_frontier(instance, prefix, assignment.period))
    prefix.append(assignment)
print({'admissible_assignments': sum(admissible), 'schedule_assignments': len(result.assignments)})"""))
    cells.append(nbf.v4.new_markdown_cell(f"## {text['sections'][4][0]}\n\n{text['sections'][4][1]}"))
    cells.append(nbf.v4.new_markdown_cell(
        "Plot precedence-ready and resource-feasible choices at each selected decision." if language == "en"
        else "Grafica las opciones listas por precedencia y factibles por recursos en cada decisión."))
    plot_one = f"""# Plot the number of eligible actions before and after resource filtering.
fig, ax = plt.subplots(figsize=(9, 4.8), constrained_layout=True)
decisions = np.arange(1, len(ready_counts) + 1)
ax.plot(decisions, ready_counts, marker='o', label='{text['plot1'][3]}')
ax.plot(decisions, feasible_counts, marker='s', label='{text['plot1'][4]}')
ax.set_title('{text['plot1'][0]}')
ax.set_xlabel('Decision')
ax.set_ylabel('{text['plot1'][2]}')
ax.grid(alpha=.25)
ax.legend(frameon=False)
plt.show()"""
    cells.append(nbf.v4.new_code_cell(plot_one))
    cells.append(nbf.v4.new_markdown_cell(f"## {text['sections'][5][0]}\n\n{text['sections'][5][1]}"))
    cells.append(nbf.v4.new_markdown_cell(
        "Compare selected signed values with mining use and the period limit; those axes have different units." if language == "en"
        else "Compara los valores firmados con el uso minero y su límite por período; los ejes usan unidades distintas."))
    plot = f"""# Compare signed selected values with mining use and the declared limits.
period_use = np.zeros((len(instance.capacities), instance.resources.shape[1]))
for assignment in result.assignments:
    period_use[assignment.period] += instance.resources[assignment.block]
selected_values = [instance.values[a.block] for a in result.assignments]
fig, (value_ax, resource_ax) = plt.subplots(1, 2, figsize=(11, 4.8))
value_ax.bar(np.arange(len(selected_values)), selected_values, color='#4267a9')
value_ax.set_title('{text['plot2'][0]}')
value_ax.set_xlabel('Selected block')
value_ax.set_ylabel('NPV contribution')
periods = np.arange(1, len(instance.capacities) + 1)
resource_ax.plot(periods, period_use[:, 0], marker='o', label='{text['plot2'][3]}')
resource_ax.plot(periods, instance.capacities[:, 0], linestyle='--', label='{text['plot2'][4]}')
resource_ax.set_title('{text['plot2'][0]}')
resource_ax.set_xlabel('{text['plot2'][1]}')
resource_ax.set_ylabel('Mining tonnes')
resource_ax.grid(alpha=.25)
resource_ax.legend(frameon=False)
value_ax.grid(axis='y', alpha=.25)
plt.show()
print(dict(mining_use_by_period=np.round(period_use[:, 0], 2).tolist()))
print(dict(mining_limit_by_period=np.round(instance.capacities[:, 0], 2).tolist()))"""
    cells.append(nbf.v4.new_code_cell(plot))
    cells.append(nbf.v4.new_markdown_cell(text["interpret"]))
    cells.append(nbf.v4.new_markdown_cell(f"## {text['sections'][6][0]}\n\n{text['sections'][6][1]}"))
    cells.append(nbf.v4.new_markdown_cell(f"## {text['sections'][7][0]}\n\n{text['sections'][7][1]}"))
    cells.append(nbf.v4.new_markdown_cell(
        f"## {text['sections'][8][0]}\n\n{text['sections'][8][1]}\n\n"
        "[Teichteil-Königsbuch et al., ICAPS 2023](https://doi.org/10.1609/icaps.v33i1.27244)."))
    nb.cells = cells
    path = ROOT / "notebooks" / language / TOPIC / "03-frontier-state-and-feasibility-mask.ipynb"
    path.parent.mkdir(parents=True, exist_ok=True)
    nbf.write(nb, path)
    print(path.relative_to(ROOT))


if __name__ == "__main__":
    for lang in ("en", "es"):
        build(lang)
