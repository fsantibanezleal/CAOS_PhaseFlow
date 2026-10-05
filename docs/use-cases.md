# Use cases: the thirteen cases and the role of each

Each case is a deposit plus a scenario plus a ROLE in the argument. A case with no role is a case nobody
needs, so every page states what it is for, what to read in its results, and every bound and plan it
produced. The pages are numbered in the order the argument is made, which is also the order of every case
table in the app and in this wiki: published, declared, deposits, regimes, controls.

## The families

| family | what it proves |
|---|---|
| `published` | a real MineLib CPIT instance under its published scenario: the one case scored against somebody else's numbers (a published LP bound, an external integer optimum, a published PCPSP result), each named with its source |
| `declared` | a real MineLib block model under a scenario declared here, because its published scheduling file is not reachable; the gaps are against this product's bound, never comparable with a published gap; the ultimate pit IS comparable |
| `deposit` | four seeded archetypes; license-free, so the whole per-block schedule ships to the browser and re-solves there |
| `regime` | the same deposit under scenarios that change WHICH constraint binds (plant, fleet, discount) |
| `control` | an exact collapse identity (`ctrl-degenerate`) and a loose-capacity diagnostic (`ctrl-abundant`) |

## The matrix

<!-- generated:cases -->
<!-- /generated -->

The capacity fraction is the per-period limit over the pit's resource total per period: below 1 the
resource binds, above 1 it has room. `newman1` publishes absolute limits, which the manifest converts to the
same scale.

## Read in order

1. [newman1, as published](use-cases/01_newman1-published.md): the trust anchor, and the only case whose gap
   can be split into bound slack, integrality and method loss.
2. [Zuck small](use-cases/02_zuck-small-declared.md) and [KD](use-cases/03_kd-declared.md): real block models
   at scale, declared scenarios, no grade or destination source where there is none.
3. [porphyry small](use-cases/04_twin-porphyry-s.md), [porphyry large](use-cases/05_twin-porphyry-l.md) (the
   default), [core and halo](use-cases/06_twin-core-halo.md), [layered](use-cases/07_twin-layered.md),
   [vein](use-cases/08_twin-vein.md): one archetype each, chosen for what each one stresses.
4. [impatient capital](use-cases/09_regime-high-discount.md), [mill-bound](use-cases/10_regime-mill-bound.md),
   [mining-bound](use-cases/11_regime-mining-bound.md): the same deposit, a different binding constraint.
5. [capacity barely binds](use-cases/12_ctrl-abundant.md) and [rate zero, capacity
   unlimited](use-cases/13_ctrl-degenerate.md): the controls.

## Data availability, and the licence rule

MineLib grants an academic download and not redistribution. The instances are fetched by
`scripts/fetch_minelib.py` into the machine's data folder (`$PHASEFLOW_DATA_DIR/minelib`, or the git-ignored
`data/raw/minelib` of a clone) and only aggregate results are committed; the pipeline's validate stage and
`scripts/check_artifacts.py` both fail if a non-redistributable case carries per-block data. Exactly one
MineLib instance has its `.cpit` and `.pcpsp` model files reachable from a script (`newman1`, through the
AMPL mirror); `zuck_small` and `kd` are reachable in UPIT form only, which is why their scenarios are
declared. The licence text itself could not be read (the canonical site is behind an expired certificate and
a WAF challenge); a secondary summary says CC BY-SA 3.0 and is recorded as unverified, and the conservative
rule stands until the text is in hand. See [data contract 04](data-contract/04_licences.md).
