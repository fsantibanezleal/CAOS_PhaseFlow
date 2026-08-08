# oreblocks

**What it is.** The open-pit block-model and scheduling engine: MineLib IO, the ultimate pit by
maximum closure, the critical multiplier algorithm, Bienstock-Zuckerberg, the TopoSort family, the
local searches, destinations, operability and the uncertainty ensemble.

**Pin.** `oreblocks[milp]==0.3.1` in `requirements.txt`. The `milp` extra brings scipy, because three
rungs need a solver: the BZ restricted master, the exact C-PIT[D] re-solve, and the exact OPBSP
destination model. Without it those rungs record NOT RUN with the reason rather than quietly
substituting a weaker method.

**Why it is a separate repo.** PhaseFlow declares no package of its own
(`conventions/no-internal-packages.md`). A reusable engine gets its OWN repo with a valid published
PyPI project, named for the DOMAIN rather than for the product that first needed it. `oreblocks` is
that repo: https://pypi.org/project/oreblocks/ and https://github.com/fsantibanezleal/CAOS_OreBlocks.

**What it does not do.** It has no rendering, no web surface and no PhaseFlow-specific case registry.
Anything that knows about PhaseFlow's cases, contracts or artifacts lives here, in `data-pipeline/`.

**What would make us change it.** Nothing on the horizon: it is ours, so a missing capability is a
version bump rather than a migration. The relevant risk is the opposite one, product logic leaking
INTO the engine, and the rule that keeps it out is that `oreblocks` must never import a case id, a
file path, or an artifact schema.

**A version that mattered.** 0.3.1 added `solve_cpit(..., bound=False)`. The uncertainty ensemble was
computing the certified bound once per realisation and never reading it, which made a thirteen-case
bake run four hours and finish one case.
