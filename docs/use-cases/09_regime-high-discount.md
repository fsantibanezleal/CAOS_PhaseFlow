# 09 · Impatient capital (`regime-high-discount`)

**Family:** `regime`. **Role in the argument**, as the case source states it:

> Twenty percent per period. High grade is pulled forward hard and the early pit is a visibly different shape from the ten percent case on the same deposit.

## The instance

- **deposit**: seeded `porphyry` twin, 24 x 24 x 12 = 6,912 blocks, seed 7, 45-degree slopes
- **data**: synthetic, license-free; the per-block schedule ships to the browser
- **scenario**: 8 periods at a rate of 0.20, first period undiscounted; capacity mining 0.80, processing 0.50 of the pit's per-period resource

## Impatient capital

The small porphyry under twenty percent per period over eight periods (mining 0.80, plant 0.50). High grade
is pulled forward hard and the early pit is a visibly different shape from the ten percent case on the same
deposit (`twin-porphyry-s`): compare the period-one geometry of the two in the app. Discounting this steep
also makes a plan's value depend on precise timing, which is where a rank-only surrogate has least to give.

## Bounds

<!-- generated:case-bounds:regime-high-discount -->
<!-- /generated -->

## Every method on this case

The best plan is marked; destination plans are measured against the PCPSP LP, every other plan against the
CPIT bound the case uses. Coherence is the mean over periods of the connected components and the share of
the largest one.

<!-- generated:case:regime-high-discount -->
<!-- /generated -->

*Tables generated from `data/derived/manifests/regime-high-discount.json` by `scripts/docs_tables.py`.*
