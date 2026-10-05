# oreblocks · 03 · Applying it to your own block model

The engine works on any instance in the MineLib family without PhaseFlow. A minimal end-to-end script on
your own files, with a declared scenario:

```python
import numpy as np
import oreblocks as ob

blocks = ob.read_blocks("my_mine.blocks")            # whitespace columns: id, x, y, z, ...
n = blocks["x"].shape[0]
prec = ob.read_prec("my_mine.prec", n)               # immediate predecessors, arcs pointing UP
value = ob.read_upit("my_mine.upit", n)              # net value at the best destination

tonnage = blocks["free"][:, 2]                       # YOUR column: check it is strictly positive
assert np.isfinite(tonnage).all() and (tonnage > 0).all()

pit = ob.solve_upit(value, prec)
periods, rate = 8, 0.10
coef = np.stack([tonnage, np.where(value > 0, tonnage, 0.0)])          # mining, processing
limit = np.stack([0.8 * coef[0][pit.in_pit].sum() / periods * np.ones(periods),
                  0.5 * coef[1][pit.in_pit].sum() / periods * np.ones(periods)])
cpit = ob.Cpit(name="my_mine", n_blocks=n, n_periods=periods, discount_rate=rate, value=value,
               limit=limit, sense=np.full(limit.shape, "L", dtype="<U1"), coef=coef,
               period_one_undiscounted=True)

bound, relaxations = ob.cpit_bound_two_resources(cpit, prec)
plan = ob.toposort_schedule(cpit, prec, weight="expected",
                            relaxation=min(relaxations, key=lambda r: r.bound), allowed=pit.in_pit)
print(f"plan {plan.npv:,.0f}, bound {bound:,.0f}, gap {100 * (bound - plan.npv) / bound:.2f}%")
```

## What to check on your data before trusting a number

1. **The vertical convention.** MineLib levels increase upward and predecessors sit above; a file read
   upside down grows the pit from the bottom. PhaseFlow's ingestion gate rejects it
   ([data-contract/02](../../data-contract/02_ingestion-gate.md)); outside PhaseFlow, check it yourself.
2. **The tonnage column.** Per instance, never guessed: strictly positive, and zero exactly where nothing
   is mined.
3. **Sentinels.** Values at or below `-1e18` forbid a destination; never sum them.
4. **The discount convention.** `period_one_undiscounted=True` is the MineLib convention; get it wrong and
   the bound sits below a published LP bound, which is impossible for a correct relaxation.
5. **The controls.** At rate 0 with unlimited capacity, `solve_cpit` must return the exact ultimate pit
   block for block; `oreblocks.run_controls` asserts it, and it is the cheapest way to catch an engine
   misuse.

## Going further

- With destination economics, build a `Pcpsp` and use the re-cut
  ([methodologies/09](../../methodologies/09_destinations.md)).
- For the full ladder, controls, artifacts and the web view, point PhaseFlow's pipeline at the instance
  instead ([guides/02](../../guides/02_bring-your-own-data.md)).
