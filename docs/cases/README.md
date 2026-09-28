# Cases

Each case is a deposit plus a scenario plus a ROLE in the argument. A case with no role is a case
nobody needs, so every row states what it is for.

## Categories

| category | what it proves |
|---|---|
| `published` | a real MineLib CPIT instance under its published scenario. PhaseFlow scores plans against its own certified bound, then identifies external CPIT and PCPSP references separately. |
| `declared` | a real MineLib block model under a scenario we declare, because the published `.cpit` for it is not reachable. Honest, and NOT comparable to a published gap. |
| `deposit` | the four seeded archetypes. License-free, so the full per-block schedule ships to the browser. |
| `regime` | the same deposit under scenarios that change WHICH constraint binds. |
| `control` | an exact one-period, zero-rate identity and a loose-capacity sensitivity diagnostic. The former has a zero-gap oracle; the latter measures how methods differ after capacities are relaxed. |

## The matrix

| case | category | data | periods | rate | role |
|---|---|---|---|---|---|
| `newman1-published` | published | real | 6 | 0.08 | The trust anchor. The published MineLib CPIT scenario is preserved. The 2018 PCPSP result is a distinct cross-problem comparison; an external notebook reports a separate CPIT integer optimum. |
| `zuck-small-declared` | declared | real | 8 | 0.10 | A real block model under a declared capacity scenario. Its source has no block grade, so the grade-dependent learned rung is skipped and the chart shows strip ratio only. |
| `kd-declared` | declared | real | 10 | 0.10 | A copper deposit from Arizona, again under a declared scenario. Scale check. |
| `twin-porphyry-l` | deposit | synthetic | 10 | 0.10 | The largest seeded porphyry case. Its block arrays and schedules are redistributable, so the browser can replay the actual case geometry. |
| `twin-porphyry-s` | deposit | synthetic | 8 | 0.10 | The fast case: small enough that every method re-solves in the browser instantly. |
| `twin-vein` | deposit | synthetic | 10 | 0.10 | A narrow high-grade body. The stress test for spatial coherence: the optimiser wants the vein and the vein is not a workable shape. |
| `twin-layered` | deposit | synthetic | 10 | 0.10 | Strong stratification: the pushbacks come out as benches rather than as cones. |
| `twin-core-halo` | deposit | synthetic | 10 | 0.10 | Concentric grade. Nested pits look entirely sensible on this deposit and the schedule still does something different, which is the whole point of solving rather than nesting. |
| `regime-mill-bound` | regime | synthetic | 12 | 0.10 | Plant capacity binds every period while the shovels idle. This is the regime where a stockpile would pay, and where the app says why it is not offering one. |
| `regime-mining-bound` | regime | synthetic | 12 | 0.10 | The fleet binds and the plant idles: the mirror image, and a different pit shape. |
| `regime-high-discount` | regime | synthetic | 8 | 0.20 | Twenty percent per period. High grade is pulled forward hard and the early pit is a visibly different shape from the ten percent case on the same deposit. |
| `ctrl-degenerate` | control | synthetic | 1 | 0.00 | The degenerate case. CPIT collapses to the ultimate pit: the mined set must equal the exact pit block for block and the bound must equal its value. A failure here is a bug, not a result. |
| `ctrl-abundant` | control | synthetic | 8 | 0.10 | Loose-capacity diagnostic. The best comparable schedule is 0.26% below the certified bound, while classical schedules range from 5.57% to 7.02%. Discounted timing and precedence still matter. The PCPSP destination row is excluded from CPIT comparison. `ctrl-degenerate` is the exact collapse control. |

The [Newman1 source comparison](newman1-external-optimum.md) separates the LP bound,
an externally reported integer optimum and PhaseFlow's feasible schedule.

## Data availability, checked 2026-09-28

The ignored local cache contains the published `.cpit` and `.pcpsp` model files for `newman1`.
The cached `zuck_small` and `kd` cases use block, precedence and UPIT files with capacities and
periods declared by PhaseFlow. [MineLib lists model downloads for all three](https://minelib.org/v1/Datasets.xhtml),
but the declared results here are not scores against those published CPIT or PCPSP scenarios.
The destination rung is skipped on the declared cases until a matching source model and scenario
can be verified.

MineLib grants an academic download and not redistribution. Instances are cached under a git-ignored
path and only AGGREGATE results are committed; the pipeline's validate stage asserts that a
non-redistributable case never carries per-block data.
