# 02 · Zuck small, declared scenario (`zuck-small-declared`)

**Family:** `declared`. **Role in the argument**, as the case source states it:

> A real block model with nearly nine times the blocks of newman1, under a scenario declared here because its published scheduling file is not reachable. The gap is against this product's certified bound, not a published one; the ultimate pit is still comparable with the published optimum.

## The instance

- **deposit**: MineLib `zuck_small`, 9,400 blocks; copper, the Whittle 4X example; block, precedence and UPIT files reachable, scheduling files not
- **published UPIT optimum**: 1,422,726,898
- **data**: real; academic download, not redistributed (aggregate results only)
- **scenario**: 8 periods at a rate of 0.10, first period undiscounted; capacity mining 0.85, processing 0.55 of the pit's per-period resource

## Why a declared scenario

Its published scheduling files are not reachable from a script (the canonical MineLib site sits behind an
expired certificate and a WAF challenge, and the mirrors carry UPIT files only), so the periods, rate and
capacities are declared here: eight periods at ten percent, mining capacity 0.85 and plant capacity 0.55
of the pit's per-period resource. Every gap on this case is against this product's own certified bound on
this product's own scenario, and it is **not** comparable with MineLib's published CPIT gap for `zuck_small`.
What IS comparable is the ultimate pit: the exact UPIT value in the bounds table can be set against
MineLib's published optimum, 1,422,726,898.

## What the case exercises

- **Scale on a real precedence graph**: nearly nine times the blocks of `newman1` and 145,640 arcs; the
  critical multiplier bound and the sliding window are the expensive steps.
- **No grade field.** Zuck Small publishes cost, value, rock tonnes and ore tonnes but no grade; value per
  tonne is not grade, so the grade-dependent learned rung is skipped (with the reason in the trace) and the
  charts show strip ratio without a grade curve.
- **No destination economics.** There is no source PCPSP model and no declared processing economics, so
  the destination rungs are skipped rather than invented from the CPIT value.

## Bounds

<!-- generated:case-bounds:zuck-small-declared -->
| bound | value | time | detail |
| --- | ---: | ---: | --- |
| ultimate pit (UPIT, exact, undiscounted) | 1,422,726,898 |  | 9,399 of 9,400 blocks; no time, no capacity |
| Algorithm 4 (min over single-resource LPs) | 719,234,226 | 10.3 min | 251 maximum closures |
| joint LP (Bienstock-Zuckerberg) | 719,234,226 | 2.0 min | 16 iterations on 75,200 nodes, 1,230,920 edges; slack of Algorithm 4: 0.0000% |
| used for every CPIT gap on this case | joint LP |  |  |
<!-- /generated -->

## Every method on this case

The best plan is marked; destination plans are measured against the PCPSP LP, every other plan against the
CPIT bound the case uses. Coherence is the mean over periods of the connected components and the share of
the largest one.

<!-- generated:case:zuck-small-declared -->
| method | rung | NPV | measured against | gap | time | components / largest share (mean per period) |
| --- | --- | ---: | --- | ---: | ---: | --- |
| `bench-by-bench` | classical | 346,832,457 | joint LP | 51.78% | 319 ms | 8.9 / 84% |
| `nested-shells` | classical | 495,393,570 | joint LP | 31.12% | 312 ms | 63.2 / 72% |
| `toposort-greedy` | classical | 386,377,893 | joint LP | 46.28% | 294 ms | 48.0 / 66% |
| `toposort-gershon` | classical | 483,991,843 | joint LP | 32.71% | 866 ms | 104.0 / 52% |
| `toposort-expected` | sota | 565,706,313 | joint LP | 21.35% | 10.3 min | 35.0 / 75% |
| `exts-two-resource` | sota | 566,520,496 | joint LP | 21.23% | 10.3 min | 55.1 / 61% |
| `shift-local-search` | sota | 594,985,768 | joint LP | 17.28% | 463 ms | 43.9 / 83% |
| `sliding-window` **(best)** | sota | 698,987,493 | joint LP | 2.81% | 2.21 h | 58.9 / 72% |
| `cpitD-local-search` | sota | 597,620,803 | joint LP | 16.91% | 722 ms | 48.1 / 78% |
| `min-width` | beyond | 696,204,895 | joint LP | 3.20% | 496 ms | 29.2 / 83% |
| `learned-expected-time` | - | not run | - | - | - | no source grade field for the learned input features |
| `destination-toposort` | - | not run | - | - | - | no matching source PCPSP model or synthetic destination economics |
| `destination-sliding-window` | - | not run | - | - | - | no matching source PCPSP model or synthetic destination economics |
| `destination-local-search` | - | not run | - | - | - | no matching source PCPSP model or synthetic destination economics |
<!-- /generated -->

*Tables generated from `data/derived/manifests/zuck-small-declared.json` by `scripts/docs_tables.py`.*
