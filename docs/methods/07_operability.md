# Operability: the number nobody reports

A block-level schedule is free to pick blocks anywhere in the model, and it does. The authors of the
algorithm say so themselves, in the Final Remarks of the paper that introduced it
([doi:10.1287/opre.1120.1050](https://doi.org/10.1287/opre.1120.1050)):

> "It is likely that the C-PIT solutions are such that blocks scheduled in a same time period are
> scattered throughout the mine. This might lead to schedules that require manual intervention by
> mining engineers to consider additional operational constraints [...] exacerbated by the fact that
> our minimal planning units are blocks rather than bench-phases."

A schedule with a high NPV and forty disconnected fragments per year is not a mine plan. **No NPV chart
shows the difference**, which is exactly why this is measured rather than hoped for.

## What is measured, every period, every case

- **connected components**, 6-neighbour. Two blocks touching only along an edge or a corner are not
  the same mining front.
- **the share of the period held by the largest component**. One coherent pushback with a few satellite
  fragments is operable; five equal blobs are five simultaneous mining fronts.
- **the narrowest run** of consecutive mined blocks along a bench, a crude proxy for minimum mining
  width.

Bai, Marcotte, Gamache, Gregory and Lapworth
([doi:10.17159/2411-9717/2018/v118n5a8](https://doi.org/10.17159/2411-9717/2018/v118n5a8)) give the
operational reason: conventional methods produce pushbacks with "narrow benches and pit bottom,
irregular boundaries, and multiple separated components", and manual post-modification "destroys value
and violates resource constraints". Their width target is about 100 m.

## `min-width`: absorbing the slivers, and what it costs

An adaptive opening. A mined cell whose bench run is narrower than the target is deferred to the period
its majority 4-neighbours belong to, provided precedence still holds in **both** directions.

The report is the point:

- how many mined blocks sat in a run narrower than the target, before and after
- the NPV before and after, and the percentage that operability cost

An operable plan is worth **less on paper** than an inoperable one. A product that smooths a schedule
and shows only the smoothed picture has quietly improved its own appearance; showing the cost is what
makes it a measurement.

**It is a view, not a replacement.** Capacity is not re-imposed after the moves, so the smoothed plan is
labelled `beyond` and is not NPV-comparable with the scheduling rungs. That is stated on the rung and in
the app.

## The bug that made it honest

The first version checked only predecessors. Moving a block LATER can be overtaken by a successor
already scheduled ahead of it, so the smoothed plan mined blocks before the rock above them while every
value check still passed. Precedence cuts both ways; the test asserts both.

## Why the minimum is not the headline

The minimum width across a whole period is dominated by a handful of pathological cells: an isolated
block whose neighbours are all unmined has nothing to vote for it and no smoothing can absorb it. So
the reported figure is the **count of blocks below target**, which actually moves, with the minimum
kept alongside it for reference. A metric that cannot improve is not a metric, it is a decoration.
