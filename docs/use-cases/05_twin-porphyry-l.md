# 05 · Porphyry twin, large (`twin-porphyry-l`)

**Family:** `deposit`. The case the app opens on. **Role in the argument**, as the case source states it:

> The hero case. Big enough that the pit wall reads as benches rather than voxels, and license-free, so its whole per-block schedule ships to the browser.

## The instance

- **deposit**: seeded `porphyry` twin, 28 x 28 x 14 = 10,976 blocks, seed 7, 45-degree slopes
- **data**: synthetic, license-free; the per-block schedule ships to the browser
- **scenario**: 10 periods at a rate of 0.10, first period undiscounted; capacity mining 0.72, processing 0.45 of the pit's per-period resource

## The default case

The largest porphyry (28 x 28 x 14 = 10,976 blocks, seed 7) under ten periods at ten percent, mining 0.72
and plant 0.45 of the pit's per-period resource. It opens the app: big enough that the pit wall reads as
benches rather than voxels, and license-free, so its whole schedule replays and re-solves in the browser.

## What to read in it

The same ladder as the small porphyry at a size where the expensive rungs show their cost (the PCPSP LP
and the two sliding windows dominate the bake). Its time-expanded graph (109,760 nodes) fits the joint
bound's budget, so its CPIT gaps are measured against the joint LP.

## Bounds

<!-- generated:case-bounds:twin-porphyry-l -->
<!-- /generated -->

## Every method on this case

The best plan is marked; destination plans are measured against the PCPSP LP, every other plan against the
CPIT bound the case uses. Coherence is the mean over periods of the connected components and the share of
the largest one.

<!-- generated:case:twin-porphyry-l -->
<!-- /generated -->

*Tables generated from `data/derived/manifests/twin-porphyry-l.json` by `scripts/docs_tables.py`.*
