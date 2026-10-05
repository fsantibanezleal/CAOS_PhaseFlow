# 01 · oreblocks: the engine

**What it is.** The open-pit block-model and scheduling engine: MineLib IO, the ultimate pit by maximum
closure (pure-Python Dinic and a compiled path), the critical multiplier algorithm and Algorithm 4,
Bienstock-Zuckerberg, the TopoSort family, the sliding time window, the shift and exact local searches,
the PCPSP LP and the destination methods, Lane's cutoffs, operability and the uncertainty ensemble.

**Pin.** `oreblocks[milp]==0.6.1` in `requirements.txt`. The `milp` extra brings scipy (and with it HiGHS),
because five rungs need a solver: the BZ restricted master, the sliding window, the exact C-PIT[D]
re-solve, the PCPSP LP and the exact OPBSP-[D] search. Without it those rungs record NOT RUN with the
reason rather than quietly substituting a weaker method.

**Why a separate repo.** PhaseFlow declares no package of its own (`conventions/no-internal-packages.md`).
A reusable engine gets its OWN repo with a published PyPI project, named for the domain rather than for
the product that first needed it: [pypi.org/project/oreblocks](https://pypi.org/project/oreblocks/),
[github.com/fsantibanezleal/CAOS_OreBlocks](https://github.com/fsantibanezleal/CAOS_OreBlocks).

**What it does not do.** No rendering, no web surface, no PhaseFlow case registry. Anything that knows
about PhaseFlow's cases, contracts or artifacts lives in `data-pipeline/`; the engine must never import a
case id, a file path or an artifact schema.

**Versions that mattered.** 0.3.1 added `solve_cpit(..., bound=False)`, after the ensemble computed the
bound once per realisation and never read it (a four-hour bake that finished one case). 0.4.0 made the joint
bound affordable on a real deposit (compiled pricing, one exact certifying solve). 0.4.1 removed wall-clock
limits from the exact search, so bakes reproduce. 0.5.0 replaced a sliding window that was a greedy wearing
the name. 0.5.1 corrected Lane's market-limiting cutoff. 0.6.0 fixed four defects measured on this product's
cases: Gershon's weight counted paths instead of successors, `min-width` broke capacity, the destination
rung lost to CPIT, and the sliding window refused on twelve of thirteen cases. 0.6.1 added the PCPSP LP's
solution and the destination restriction that make the re-cut ([methodologies/09](../methodologies/09_destinations.md)).

**What would make us change it.** Nothing on the horizon: it is ours, so a missing capability is a version
bump. The risk is the opposite one, product logic leaking into the engine.

| page | content |
|---|---|
| [installation](01_oreblocks/01_installation.md) | the pin, the extras, a development install against a local checkout |
| [usage](01_oreblocks/02_usage.md) | every engine call the pipeline makes, in order, with the arguments it uses |
| [applying](01_oreblocks/03_applying.md) | the engine on your own MineLib files, outside PhaseFlow |
