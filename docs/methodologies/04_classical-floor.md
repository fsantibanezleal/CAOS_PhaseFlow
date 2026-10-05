# The classical rungs

What a planner, a textbook, or a commercial package would do. They are here so the SOTA rungs have
something to beat: a method comparison with no floor in it is a marketing chart.

## 1. `bench-by-bench`

Mine the top bench out completely, then the next. It is the floor, and it is here on purpose. Its
weight is the level index, so the topological order is a strict descent through the benches.

It is not a straw man: it is what a schedule degenerates to when nobody optimises, and its gap is the
number every other rung is implicitly claiming to improve on.

## 2. `nested-shells`: the industry's four-step chain

Chicoisne, Espinoza, Goycoolea, Moreno and Rubio describe the practice in four steps
([doi:10.1287/opre.1120.1050](https://doi.org/10.1287/opre.1120.1050), section 1):

1. a decreasing sequence of cost vectors `pi^1 > pi^2 > ... > pi^k` is chosen, and `UPL(pi^i)` is
   solved to optimality for each. It is well known (Lerchs and Grossmann 1965, Matheron 1975) that
   this yields **nested** pits `P^1 subset P^2 subset ... subset P^k`.
2. **pushbacks** are the differences of consecutive pits, `F^i = P^i - P^(i-1)`.
3. pushbacks are subdivided into **bench-phases**.
4. bench-phases are assigned a **time period** so that capacity limits hold.

PhaseFlow implements this as a block weight: solve the ultimate pit for twelve descending revenue
factors, take a block's shell index as its priority, and let the same TopoSort machinery do the
sequencing. Descending order matters for cost as well as correctness: each pit is contained in the
previous one, so every solve after the first runs on the shrinking difference.

**What this implementation gives the classical method that reality does not.** Every shell is taken,
in order, with no manual pushback selection and no smoothing. That is the most FAVOURABLE reading of
the classical chain, which is the right way to build a baseline you intend to beat. In practice, as
Morales et al. record (APCOM 2015), steps 1 and 3 are algorithms and the pushback selection is a
person, and constraint compliance is that person's responsibility rather than the model's.

**The gap problem.** Meagher, Dimitrakopoulos and Avis
([doi:10.1134/S1062739114030132](https://doi.org/10.1134/S1062739114030132)) review why the nested-pit
route caps what a schedule can achieve: pit sizes "jump around" erratically between revenue factors, a
single pushback may have "multiple sections that are physically far from each other", and the designer
manages it by hand with unknown effects on optimality. Their conclusion is the sentence that justifies
this whole product: *"It is impossible to generate a truly optimal production schedule using
sub-optimally designed pushbacks."*

## 3. `toposort-greedy` (GrTS)

`w_b = p_b`. Mine the most valuable available block first. The obvious baseline, and the one whose
failure mode is instructive: on the AsiaMine instance with two resource constraints, Chicoisne et al.
measured greedy weights at **0.138** of the LP bound where expected-time weights reached **0.972**,
using the same scheduling code. The ordering is the whole algorithm.

## 4. `toposort-gershon` (GeTS)

`w_b = p_b + the total value of the whole successor cone` (Gershon 1987a). A block is worth mining
early not only for its own value but for what it unlocks beneath it. Computed by a reverse topological
sweep, so it is the sum over the entire cone rather than the immediate successors.

## 5. `sliding-window`: the industrial baseline

Cullenbine, Wood and Newman
([doi:10.1007/s11590-011-0306-2](https://doi.org/10.1007/s11590-011-0306-2)). Enforce every constraint
inside a window of a few periods, treat the rest as an aggregated tail, fix the first period or two,
slide, repeat.

This is not an academic curiosity: it is what industrial platforms run, and it is what Rio Tinto's
system uses to seed its large neighbourhood search (Blom, Pearce and Cote, arXiv:2403.18213).

**The bug this shipped with, and it is worth recording.** The first version re-planned blocks that had
already consumed capacity in an earlier window. The plan quietly double-booked the fleet, the objective
collapsed to a third of its value, and every feasibility check still passed because each window was
internally consistent. Only the frozen prefix is a decision; everything after it must be released
before the next slide. The test that guards it asserts the result is within a fifth of expected-time
TopoSort, which the broken version was not.
