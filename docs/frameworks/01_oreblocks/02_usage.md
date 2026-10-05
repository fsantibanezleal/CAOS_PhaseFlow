# oreblocks · 02 · How PhaseFlow uses it

Every engine call the pipeline makes, in the order `data-pipeline/pipeline/stages/solve.py::run_ladder`
makes them, with the settings it uses.

## Building the instance

```python
import oreblocks as ob

# a seeded twin: grid, grade, tonnage, economics, slope precedence and its ultimate pit
twin = ob.make_twin("porphyry", dims=(24, 24, 12), seed=7, slope_deg=45.0)

# or a MineLib instance from the machine's data folder
blocks = ob.read_blocks(stem.with_suffix(".blocks"))
prec = ob.read_prec(stem.with_suffix(".prec"), n_blocks)
cpit = ob.read_cpit(stem.with_suffix(".cpit"))        # periods, rate, limits, coefficients
pcpsp = ob.read_pcpsp(stem.with_suffix(".pcpsp"))     # values and coefficients per destination
assert np.allclose(pcpsp.to_cpit().value, cpit.value) # the published PCPSP must reduce to the CPIT

pit = ob.solve_upit(cpit.value, prec)                 # exact ultimate pit (maximum closure)
```

## The bounds

```python
alg4, relaxations = ob.cpit_bound_two_resources(cpit, prec)   # critical multiplier per resource, min
tight = min(relaxations, key=lambda r: r.bound)               # its expected times seed ExTS
bz = ob.solve_gpcp_lp(...)                                    # joint LP on the time-expanded graph, under a budget
pb = ob.pcpsp_lp_bound(pcpsp, prec, max_rows=1_600_000, solution=True)   # PCPSP LP (HiGHS) and its solution
```

## The ladder

```python
ob.toposort_schedule(cpit, prec, weight=w_bench, allowed=pit.in_pit)        # bench-by-bench
ob.toposort_schedule(cpit, prec, weight=w_shells, allowed=pit.in_pit)       # nested-shells (max_closure_within)
ob.toposort_schedule(cpit, prec, weight="greedy", allowed=pit.in_pit)
ob.toposort_schedule(cpit, prec, weight="gershon", allowed=pit.in_pit)
ob.toposort_schedule(cpit, prec, weight="expected", relaxation=tight, allowed=pit.in_pit)
improved = ob.improve_schedule(cpit, prec, best_exts)                         # shift search
ob.sliding_window_schedule(cpit, prec, window=3, fix=1, allowed=pit.in_pit, relaxation=tight,
                           cand_max=6000, cover=1.6, mip_gap=3e-2)
ob.exact_local_search(cpit, prec, improved, d_max=180, rounds=16, time_limit=None, mip_gap=1e-4, seed=11)
```

## The destination rungs (the re-cut)

```python
cut = ob.restrict_destinations(pcpsp, pb.preferred_destination())   # the LP's destinations fixed
rcpit = cut.to_cpit()                                               # a CPIT whose plans are PCPSP plans
_, rrels = ob.cpit_bound_two_resources(rcpit, prec)
rexts = ob.toposort_schedule(rcpit, prec, weight="expected", relaxation=min(rrels, key=lambda r: r.bound), ...)
plan = ob.lift_to_pcpsp(cut, prec, rexts.period_of_block)          # read back as a PCPSP plan
lifted = ob.lift_to_pcpsp(pcpsp, prec, best_cpit.period_of_block)   # the best CPIT plan, as PCPSP
ob.exact_destination_local_search(pcpsp, prec, max(starts, key=npv), d_max=160, rounds=16,
                                  seed=11, time_limit=None, mip_gap=1e-4)
```

## Operability and uncertainty

```python
smoothed, report = ob.enforce_min_width(cpit, best_plan, x, y, level, prec, target_width=3)
coherence = ob.schedule_coherence(period_of_block, x, y, level, n_periods)   # per period

# the ensemble: 12 correlated, mean-preserving realisations (6 above 25,000 blocks, none above 60,000)
ens = ob.perturb_values(values, x, y, level, n=12, sigma=0.25, seed=31)        # a RealisationSet
plans = {r.method: r.period_of_block for r in results if r.rung != "beyond"}
optima = [...]   # one cheap re-solve per realisation: solve_cpit(..., bound=False) on Gershon weights
outcome = ob.evaluate_across(cpit, ens, plans, per_realisation_optimum=np.array(optima))
```

## What the pipeline adds on top

The engine returns plans; the pipeline checks each one (precedence in every period, every capacity,
below the bound of its own problem) before it can be recorded, accounts its period rows under the model
that produced it, runs the controls, and writes the trace and manifest. None of that is in the engine.
