# 11 · Mining-bound regime (`regime-mining-bound`)

**Family:** `regime`. **Role in the argument**, as the case source states it:

> The fleet binds and the plant idles: the mirror image, and a different pit shape.

## The instance

- **deposit**: seeded `porphyry` twin, 24 x 24 x 12 = 6,912 blocks, seed 7, 45-degree slopes
- **data**: synthetic, license-free; the per-block schedule ships to the browser
- **scenario**: 12 periods at a rate of 0.10, first period undiscounted; capacity mining 0.45, processing 0.90 of the pit's per-period resource

## The fleet binds and the plant idles

The mirror image: twelve periods at ten percent with mining capacity 0.45 and plant capacity 0.90. A
different pit shape, because tonnes moved, not tonnes processed, are what each period can afford.

## A sanity check on the destination bound

With the fleet as the bottleneck, Lane's cutoff is break-even: ore and waste consume a mining hour alike, so
the opportunity cost cancels and choosing destinations should be worth nothing. The PCPSP LP must then equal
the CPIT bound, and in the bounds table it does; the destination rungs end at or near the best CPIT plan.

## Bounds

<!-- generated:case-bounds:regime-mining-bound -->
<!-- /generated -->

## Every method on this case

The best plan is marked; destination plans are measured against the PCPSP LP, every other plan against the
CPIT bound the case uses. Coherence is the mean over periods of the connected components and the share of
the largest one.

<!-- generated:case:regime-mining-bound -->
<!-- /generated -->

*Tables generated from `data/derived/manifests/regime-mining-bound.json` by `scripts/docs_tables.py`.*
