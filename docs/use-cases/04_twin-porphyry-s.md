# 04 · Porphyry twin, small (`twin-porphyry-s`)

**Family:** `deposit`. **Role in the argument**, as the case source states it:

> The smaller porphyry: the browser re-solves its bound and three plans in about two seconds and draws the learned plan at once, so it is the case to drag the controls on.

## The instance

- **deposit**: seeded `porphyry` twin, 24 x 24 x 12 = 6,912 blocks, seed 7, 45-degree slopes
- **data**: synthetic, license-free; the per-block schedule ships to the browser
- **scenario**: 8 periods at a rate of 0.10, first period undiscounted; capacity mining 0.80, processing 0.50 of the pit's per-period resource

## The case to drag the controls on

A seeded porphyry (24 x 24 x 12 blocks, seed 7, 45-degree slopes) under eight periods at ten percent, with
mining capacity 0.80 and plant capacity 0.50 of the pit's per-period resource. It is license-free, so the
whole per-block schedule ships to the browser, and small enough that the browser re-solves its bound and
three plans in about two seconds after drawing the learned plan at once. It is the case the parity tests
hold the browser engine to.

## What to read in it

- The step from greedy and Gershon to the expected-time rungs, then the sliding window's look-ahead on top:
  the clearest ladder in the matrix.
- The destination rungs at full size: the plant takes half the pit's ore tonnage, so which ore it gets is
  the decision, and the re-cut on the PCPSP LP is where that value shows (compare the destination plans with
  the best CPIT plan in the table).
- The joint LP equals Algorithm 4 here (one resource determines the LP), so the CPIT gaps are pure plan
  distance plus integrality.

## Bounds

<!-- generated:case-bounds:twin-porphyry-s -->
<!-- /generated -->

## Every method on this case

The best plan is marked; destination plans are measured against the PCPSP LP, every other plan against the
CPIT bound the case uses. Coherence is the mean over periods of the connected components and the share of
the largest one.

<!-- generated:case:twin-porphyry-s -->
<!-- /generated -->

*Tables generated from `data/derived/manifests/twin-porphyry-s.json` by `scripts/docs_tables.py`.*
