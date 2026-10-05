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
<!-- /generated -->

## Every method on this case

The best plan is marked; destination plans are measured against the PCPSP LP, every other plan against the
CPIT bound the case uses. Coherence is the mean over periods of the connected components and the share of
the largest one.

<!-- generated:case:zuck-small-declared -->
<!-- /generated -->

*Tables generated from `data/derived/manifests/zuck-small-declared.json` by `scripts/docs_tables.py`.*
