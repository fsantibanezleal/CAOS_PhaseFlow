# 03 · KD, declared scenario (`kd-declared`)

**Family:** `declared`. **Role in the argument**, as the case source states it:

> A copper deposit from Arizona, again under a declared scenario. Scale check.

## The instance

- **deposit**: MineLib `kd`, 14,153 blocks; copper, Arizona, blocks 20 x 20 x 15 m; published with one waste and two process destinations, a 10 Mt plant and no mining limit (Morales et al. 2015, Table 1); block, precedence and UPIT files reachable, scheduling files not
- **published UPIT optimum**: 652,195,037
- **data**: real; academic download, not redistributed (aggregate results only)
- **scenario**: 10 periods at a rate of 0.10, first period undiscounted; capacity mining 0.80, processing 0.50 of the pit's per-period resource

## Why a declared scenario

As for `zuck_small`, the published scheduling files are not reachable, so the scenario is declared: ten
periods at ten percent, mining capacity 0.80 and plant capacity 0.50 of the pit's per-period resource. The
gaps are against this product's bound on this scenario, not MineLib's; the exact UPIT value can be set
against the published optimum, 652,195,037. MineLib documents KD's copper percentage column, which is the
grade field here.

## What the case exercises

The largest real precedence graph in the matrix (about 220,000 arcs): it is the scale check for every
rung, and the slowest case to bake. Its time-expanded graph for the joint bound is above the budget, so it
keeps the Algorithm 4 bound and says so. There are no destination economics for KD in a reachable source,
so the destination rungs are skipped. Three things to read in it:

- **The sliding window is the rung that pays, and what it costs.** It takes the best gap from 15.02
  percent (the exact neighbourhood search) to 6.23 percent, and it took 632 minutes of the case's eleven
  hours: its last full window, three capacity-bound periods with no tail over the remaining candidates,
  alone ran for hours. That is the cost the bake guides state.
- **Gershon's weight loses to greedy here** (51.7 against 31.9 percent), as on the vein: a dense, deep
  precedence graph rewards opening what unlocks much and pays for the cover early.
- **The learned rung fails on this real model.** It reaches 41 percent of the exact ExTS plan and is
  flagged. The 0.07.006 model reached 86 percent; measured with both models and both capacity inputs, the
  drop comes from the retrained model, not from the capacity fix (0.47 with the old input), while the same
  retrain lifted every twin and `newman1`. The learned lane is trained and validated on twins; this case is
  the measurement that says so ([08](../methodologies/08_when-the-surrogate-fails.md)).

## Bounds

<!-- generated:case-bounds:kd-declared -->
<!-- /generated -->

## Every method on this case

The best plan is marked; destination plans are measured against the PCPSP LP, every other plan against the
CPIT bound the case uses. Coherence is the mean over periods of the connected components and the share of
the largest one.

<!-- generated:case:kd-declared -->
<!-- /generated -->

*Tables generated from `data/derived/manifests/kd-declared.json` by `scripts/docs_tables.py`.*
