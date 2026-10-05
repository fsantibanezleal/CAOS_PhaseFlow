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
rung, and with ten periods it is among the slowest cases to bake. Its time-expanded graph for the joint
bound is above the budget, so it keeps the Algorithm 4 bound and says so. There are no destination
economics for KD in a reachable source, so the destination rungs are skipped.

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
