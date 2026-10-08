# 04 · Use the app

The site opens on the **App**: one case at a time, its schedule as a pit that excavates itself year by
year, and every number of the case beside it. The five reading pages (Introduction, Methodology,
Implementation, Experiments, Benchmark) explain and measure; the App is where the cases are worked.

## The App

The rail holds the case selector, the method selector (any rung; the default is the case's best comparable
plan; each method shows its gap to the bound of its own problem and, for the learned rung, its measured
share of the exact plan) and the period cursor with play (the animation starts paused; every view follows
one cursor). The workbench has six tabs:

| tab | what it shows |
|---|---|
| **3D pit** | the pit excavating itself; modes: schedule (pit walls coloured by the year that exposed them), grade, mined blocks; a section cut at a northing to look inside |
| **Profile and plan** | the pit profile at a northing and the bench plan at a level, coloured by period: the drawings the discipline reads |
| **Production and NPV** | ore and waste per period with cumulative NPV and the certified bound; capacity utilisation; head grade and strip ratio (strip ratio alone where the case has no grade); spatial coherence per period |
| **Methods** | the bound as the track and each CPIT plan's captured NPV as the fill, with its gap; the full table of every rung, destination plans included (they solve PCPSP against their own bound, so they are not in the bars) |
| **Analysis** | the bounds of the case (Algorithm 4, joint LP, PCPSP LP) and what separates them; the learned lane's measured record; the sensitivity surface of the bound over rate and plant capacity; the risk readout across the ensemble |
| **Controls** | each control with what it asserts, what was measured on this case, and the verdict; the contract flags |

A **published** case (`newman1`) shows numbers and charts but no 3D replay, because MineLib's per-block data
is not redistributed; the page says so.

## The focus view: live re-solving

On a live case (the synthetic twins), the focus view (`/focus/<case>`, entered from the App) lets you change
the discount rate, the capacities and the slope, and **re-solves**: within about 0.1 to 0.25 s the learned plan is drawn; when the control has been still
for 220 ms a worker computes the bounds and the exact plans, the exact plan replaces the learned one, and the
HUD shows the learned plan's share of it and how much sooner it came, plus the measured solve time
([methodologies/07](../methodologies/07_learned.md)). Nothing is fetched from a pre-baked grid of answers.

## The reading pages

Full-width topics, each with its argument, equations, a figure, the data that answers it (read from the
committed manifests, never typed), its limits and references. The Benchmark page can also re-solve a baked
case in your browser and set every quantity beside the trace.

## Language, theme, architecture

EN/ES and light/dark from the header; the architecture modal ("how it was built") explains the lanes, the
science, the rendering rule and the contracts. All of it is the shared shell
([frameworks/07](../frameworks/07_caos-app-shell.md)).
