"""The case matrix. Each case is a deposit plus a scenario plus a ROLE in the argument.

Categories:

- ``published``   a real MineLib instance solved as published, scored against the published gap. The
                  trust anchor: everything else is measured against our own bound, this one is
                  measured against somebody else's.
- ``declared``    a real MineLib block model under a scenario we declare, because the published
                  ``.cpit`` for it is not reachable. Honest, and NOT comparable to a published gap.
- ``deposit``     seeded synthetic twins across the four archetypes. License-free, so the full
                  per-block schedule ships to the browser.
- ``regime``      the same twin under scenarios that change what binds: mill-bound, mining-bound,
                  abundant. This is where the schedule visibly changes shape.
- ``control``     the degenerate and negative controls. A product that cannot fail its own controls
                  is not being checked.
"""

from __future__ import annotations

from ..io.schema import Case, DepositSpec, Scenario

_TWO = ("mining", "processing")

CASES: list[Case] = [
    # ------------------------------------------------------------------ published
    Case(
        id="newman1-published",
        category="published",
        title_en="Newman1, as published",
        title_es="Newman1, tal como se publica",
        deposit=DepositSpec(kind="minelib", minelib_id="newman1", tonnage_col=6),
        scenario=Scenario(
            periods=6,
            discount_rate=0.08,
            capacity_fraction=(1.0, 1.0),
            resource_names=_TWO,
            absolute_limits=((2_000_000.0,) * 6, (1_100_000.0,) * 6),
        ),
        role_en=(
            "The trust anchor. A published MineLib instance solved with its own periods, its own "
            "discount rate and its own two capacities, scored against the published best-known gap."
        ),
        role_es=(
            "El ancla de confianza. Una instancia publicada de MineLib resuelta con sus propios "
            "periodos, su propia tasa y sus dos capacidades, medida contra la brecha publicada."
        ),
        published={
            "upit_optimum": 26_086_899,
            "lp_bound": 24_486_549,
            "best_known": 24_176_861,
            "best_known_gap_pct": 1.26,
            "source": "Jelvez, Morales and Nancel-Penard, MPES 2018, doi:10.1007/978-3-319-99220-4_18",
        },
    ),
    # ------------------------------------------------------------------ declared
    Case(
        id="zuck-small-declared",
        category="declared",
        title_en="Zuck small, declared scenario",
        title_es="Zuck small, escenario declarado",
        deposit=DepositSpec(kind="minelib", minelib_id="zuck_small", tonnage_col=6, process_col=7),
        scenario=Scenario(
            periods=8, discount_rate=0.10, capacity_fraction=(0.85, 0.55), resource_names=_TWO
        ),
        role_en=(
            "A real block model at ten times the scale, under a scenario we declare because the "
            "published .cpit for it is not reachable. The gap here is against OUR bound, not a "
            "published one."
        ),
        role_es=(
            "Un modelo de bloques real a diez veces la escala, bajo un escenario que declaramos "
            "porque el .cpit publicado no es alcanzable. La brecha es contra NUESTRA cota."
        ),
        published={"upit_optimum": 1_422_726_898},
    ),
    Case(
        id="kd-declared",
        category="declared",
        title_en="KD, declared scenario",
        title_es="KD, escenario declarado",
        deposit=DepositSpec(kind="minelib", minelib_id="kd", tonnage_col=4),
        scenario=Scenario(
            periods=10, discount_rate=0.10, capacity_fraction=(0.8, 0.5), resource_names=_TWO
        ),
        role_en="A copper deposit from Arizona, again under a declared scenario. Scale check.",
        role_es="Un yacimiento de cobre de Arizona, tambien bajo escenario declarado. Prueba de escala.",
        published={"upit_optimum": 652_195_037},
    ),
    # ------------------------------------------------------------------ deposits
    Case(
        id="twin-porphyry-l",
        category="deposit",
        title_en="Porphyry twin, large",
        title_es="Gemelo portico, grande",
        deposit=DepositSpec(kind="twin", archetype="porphyry", dims=(28, 28, 14), seed=7),
        scenario=Scenario(
            periods=10, discount_rate=0.10, capacity_fraction=(0.72, 0.45), resource_names=_TWO
        ),
        role_en=(
            "The hero case. Big enough that the pit wall reads as benches rather than voxels, and "
            "license-free, so its whole per-block schedule ships to the browser."
        ),
        role_es=(
            "El caso principal. Suficientemente grande para que la pared se lea como bancos y no "
            "como voxeles, y libre de licencia, asi que su plan por bloque completo viaja al navegador."
        ),
        default=True,
    ),
    Case(
        id="twin-porphyry-s",
        category="deposit",
        title_en="Porphyry twin, small",
        title_es="Gemelo portico, pequeno",
        deposit=DepositSpec(kind="twin", archetype="porphyry", dims=(24, 24, 12), seed=7),
        scenario=Scenario(
            periods=8, discount_rate=0.10, capacity_fraction=(0.8, 0.5), resource_names=_TWO
        ),
        role_en="The fast case: small enough that every method re-solves in the browser instantly.",
        role_es="El caso rapido: tan pequeno que cada metodo se resuelve al instante en el navegador.",
    ),
    Case(
        id="twin-vein",
        category="deposit",
        title_en="Vein twin",
        title_es="Gemelo veta",
        deposit=DepositSpec(kind="twin", archetype="vein", dims=(30, 30, 16), seed=11),
        scenario=Scenario(
            periods=10, discount_rate=0.10, capacity_fraction=(0.7, 0.4), resource_names=_TWO
        ),
        role_en=(
            "A narrow high-grade body. The stress test for spatial coherence: the optimiser wants "
            "the vein and the vein is not a workable shape."
        ),
        role_es=(
            "Un cuerpo angosto de alta ley. La prueba de coherencia espacial: el optimizador quiere "
            "la veta y la veta no es una forma operable."
        ),
    ),
    Case(
        id="twin-layered",
        category="deposit",
        title_en="Layered twin",
        title_es="Gemelo estratificado",
        deposit=DepositSpec(kind="twin", archetype="layered", dims=(30, 30, 16), seed=13),
        scenario=Scenario(
            periods=10, discount_rate=0.10, capacity_fraction=(0.7, 0.45), resource_names=_TWO
        ),
        role_en="Strong stratification: the pushbacks come out as benches rather than as cones.",
        role_es="Estratificacion fuerte: los pushbacks salen como bancos y no como conos.",
    ),
    Case(
        id="twin-core-halo",
        category="deposit",
        title_en="Core and halo twin",
        title_es="Gemelo nucleo y halo",
        deposit=DepositSpec(kind="twin", archetype="core_halo", dims=(30, 30, 16), seed=17),
        scenario=Scenario(
            periods=10, discount_rate=0.10, capacity_fraction=(0.7, 0.45), resource_names=_TWO
        ),
        role_en=(
            "Concentric grade. Nested pits look entirely sensible on this deposit and the schedule "
            "still does something different, which is the whole point of solving rather than nesting."
        ),
        role_es=(
            "Ley concentrica. Los pits anidados se ven razonables en este deposito y el plan igual "
            "hace algo distinto, que es exactamente el punto de resolver en vez de anidar."
        ),
    ),
    # ------------------------------------------------------------------ regimes
    Case(
        id="regime-mill-bound",
        category="regime",
        title_en="Mill-bound regime",
        title_es="Regimen limitado por planta",
        deposit=DepositSpec(kind="twin", archetype="porphyry", dims=(24, 24, 12), seed=7),
        scenario=Scenario(
            periods=12, discount_rate=0.10, capacity_fraction=(1.4, 0.32), resource_names=_TWO
        ),
        role_en=(
            "Plant capacity binds every period while the shovels idle. This is the regime where a "
            "stockpile would pay, and where the app says why it is not offering one."
        ),
        role_es=(
            "La planta limita cada periodo mientras las palas sobran. Es el regimen donde un acopio "
            "pagaria, y donde la aplicacion explica por que no lo ofrece."
        ),
    ),
    Case(
        id="regime-mining-bound",
        category="regime",
        title_en="Mining-bound regime",
        title_es="Regimen limitado por mina",
        deposit=DepositSpec(kind="twin", archetype="porphyry", dims=(24, 24, 12), seed=7),
        scenario=Scenario(
            periods=12, discount_rate=0.10, capacity_fraction=(0.45, 0.9), resource_names=_TWO
        ),
        role_en="The fleet binds and the plant idles: the mirror image, and a different pit shape.",
        role_es="La flota limita y la planta sobra: la imagen espejo, y otra forma de rajo.",
    ),
    Case(
        id="regime-high-discount",
        category="regime",
        title_en="Impatient capital",
        title_es="Capital impaciente",
        deposit=DepositSpec(kind="twin", archetype="porphyry", dims=(24, 24, 12), seed=7),
        scenario=Scenario(
            periods=8, discount_rate=0.20, capacity_fraction=(0.8, 0.5), resource_names=_TWO
        ),
        role_en=(
            "Twenty percent per period. High grade is pulled forward hard and the early pit is a "
            "visibly different shape from the ten percent case on the same deposit."
        ),
        role_es=(
            "Veinte por ciento por periodo. La alta ley se adelanta con fuerza y el rajo temprano "
            "tiene una forma visiblemente distinta al caso de diez por ciento en el mismo deposito."
        ),
    ),
    # ------------------------------------------------------------------ controls
    Case(
        id="ctrl-degenerate",
        category="control",
        title_en="Control: rate zero, capacity unlimited",
        title_es="Control: tasa cero, capacidad ilimitada",
        deposit=DepositSpec(kind="twin", archetype="porphyry", dims=(24, 24, 12), seed=7),
        scenario=Scenario(periods=1, discount_rate=0.0, capacity_fraction=(50.0,), resource_names=("mining",)),
        role_en=(
            "The degenerate case. CPIT collapses to the ultimate pit: the mined set must equal the "
            "exact pit block for block and the bound must equal its value. A failure here is a bug, "
            "not a result."
        ),
        role_es=(
            "El caso degenerado. CPIT colapsa al pit final: el conjunto extraido debe igualar al pit "
            "exacto bloque a bloque y la cota debe igualar su valor. Fallar aqui es un error, no un "
            "resultado."
        ),
    ),
    Case(
        id="ctrl-abundant",
        category="control",
        title_en="Control: capacity barely binds",
        title_es="Control: la capacidad casi no limita",
        deposit=DepositSpec(kind="twin", archetype="porphyry", dims=(24, 24, 12), seed=7),
        scenario=Scenario(
            periods=8, discount_rate=0.10, capacity_fraction=(2.5, 2.0), resource_names=_TWO
        ),
        role_en=(
            "Negative control on the method comparison. With capacity this loose every method finds "
            "nearly the same plan, so the spread between them must collapse. A product that still "
            "shows a large spread here is measuring its own noise."
        ),
        role_es=(
            "Control negativo de la comparacion de metodos. Con esta holgura todos los metodos "
            "encuentran casi el mismo plan, asi que la dispersion debe colapsar. Un producto que "
            "aqui muestra dispersion grande esta midiendo su propio ruido."
        ),
    ),
]
