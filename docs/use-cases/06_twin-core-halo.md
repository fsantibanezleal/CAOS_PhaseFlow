# 06 · Core and halo twin (`twin-core-halo`)

**Family:** `deposit`. **Role in the argument**, as the case source states it:

> Concentric grade. Nested pits look sensible on this deposit and the schedule still does something different, which is the point of solving rather than nesting. With the vein it is one of the two archetypes on which the learned rung is measured to fail most: a thin rich core makes the order of extraction delicate.

## The instance

- **deposit**: seeded `core_halo` twin, 30 x 30 x 16 = 14,400 blocks, seed 17, 45-degree slopes
- **data**: synthetic, license-free; the per-block schedule ships to the browser
- **scenario**: 10 periods at a rate of 0.10, first period undiscounted; capacity mining 0.70, processing 0.45 of the pit's per-period resource

## Concentric grade

A thin rich core inside a low-grade halo (30 x 30 x 16 = 14,400 blocks, seed 17), ten periods at ten percent,
mining 0.70 and plant 0.45. Nested pits look sensible on this deposit and the schedule still does something
different, which is the point of solving rather than nesting.

## What to read in it

- **The learned rung's hard case.** A thin core makes the order of extraction delicate, and it is one of the
  two archetypes where the surrogate is measured to fail most ([08](../methodologies/08_when-the-surrogate-fails.md));
  the measured share of the exact ExTS plan is in the case table.
- **Greedy against Gershon.** The greedy order chases the core and pays for the halo late; Gershon's set sum
  sees what the core unlocks.
- **The joint bound does not run.** The time-expanded graph is 144,000 nodes and 1,291,200 edges, above the
  certification budget, so the case keeps Algorithm 4 and its gaps include whatever slack that bound has.

## Bounds

<!-- generated:case-bounds:twin-core-halo -->
<!-- /generated -->

## Every method on this case

The best plan is marked; destination plans are measured against the PCPSP LP, every other plan against the
CPIT bound the case uses. Coherence is the mean over periods of the connected components and the share of
the largest one.

<!-- generated:case:twin-core-halo -->
<!-- /generated -->

*Tables generated from `data/derived/manifests/twin-core-halo.json` by `scripts/docs_tables.py`.*
