# Cases

Each case is a deposit plus a scenario plus a ROLE in the argument. A case with no role is a case
nobody needs, so every row states what it is for.

## Categories

| category | what it proves |
|---|---|
| `published` | a real MineLib instance solved AS PUBLISHED, scored against the published gap. The trust anchor: everything else is measured against our own bound, this one against somebody else's. |
| `declared` | a real MineLib block model under a scenario we declare, because the published `.cpit` for it is not reachable. Honest, and NOT comparable to a published gap. |
| `deposit` | the four seeded archetypes. License-free, so the full per-block schedule ships to the browser. |
| `regime` | the same deposit under scenarios that change WHICH constraint binds. |
| `control` | the degenerate and negative controls. A product that cannot fail its own controls is not being checked. |

## The matrix

| case | category | data | periods | rate | role |
|---|---|---|---|---|---|
| `newman1-published` | published | real | 6 | 0.08 | The trust anchor. A published MineLib instance solved with its own periods, its own discount rate and its own two capacities, scored against the published best-known gap. |
| `zuck-small-declared` | declared | real | 8 | 0.10 | A real block model at ten times the scale, under a scenario we declare because the published .cpit for it is not reachable. The gap here is against OUR bound, not a published one. |
| `kd-declared` | declared | real | 10 | 0.10 | A copper deposit from Arizona, again under a declared scenario. Scale check. |
| `twin-porphyry-l` | deposit | synthetic | 10 | 0.10 | The hero case. Big enough that the pit wall reads as benches rather than voxels, and license-free, so its whole per-block schedule ships to the browser. |
| `twin-porphyry-s` | deposit | synthetic | 8 | 0.10 | The fast case: small enough that every method re-solves in the browser instantly. |
| `twin-vein` | deposit | synthetic | 10 | 0.10 | A narrow high-grade body. The stress test for spatial coherence: the optimiser wants the vein and the vein is not a workable shape. |
| `twin-layered` | deposit | synthetic | 10 | 0.10 | Strong stratification: the pushbacks come out as benches rather than as cones. |
| `twin-core-halo` | deposit | synthetic | 10 | 0.10 | Concentric grade. Nested pits look entirely sensible on this deposit and the schedule still does something different, which is the whole point of solving rather than nesting. |
| `regime-mill-bound` | regime | synthetic | 12 | 0.10 | Plant capacity binds every period while the shovels idle. This is the regime where a stockpile would pay, and where the app says why it is not offering one. |
| `regime-mining-bound` | regime | synthetic | 12 | 0.10 | The fleet binds and the plant idles: the mirror image, and a different pit shape. |
| `regime-high-discount` | regime | synthetic | 8 | 0.20 | Twenty percent per period. High grade is pulled forward hard and the early pit is a visibly different shape from the ten percent case on the same deposit. |
| `ctrl-degenerate` | control | synthetic | 1 | 0.00 | The degenerate case. CPIT collapses to the ultimate pit: the mined set must equal the exact pit block for block and the bound must equal its value. A failure here is a bug, not a result. |
| `ctrl-abundant` | control | synthetic | 8 | 0.10 | Negative control on the method comparison. With capacity this loose every method finds nearly the same plan, so the spread between them must collapse. A product that still shows a large spread here is measuring its own noise. |

## Data availability, measured 2026-08-06

Exactly ONE MineLib instance with published `.cpit` and `.pcpsp` model files is reachable from a
script: `newman1`, through the AMPL mirror. The canonical site has an expired TLS certificate and a
web application firewall that rejects programmatic clients. `zuck_small` and `kd` are reachable in
ultimate-pit form only, which is why their scenarios are declared and labelled as such in the App.

MineLib grants an academic download and not redistribution. Instances are cached under a git-ignored
path and only AGGREGATE results are committed; the pipeline's validate stage asserts that a
non-redistributable case never carries per-block data.
