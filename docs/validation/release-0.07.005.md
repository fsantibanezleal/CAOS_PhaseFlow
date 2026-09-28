# PhaseFlow 0.07.005 validation record

Date: 2026-09-28. Baseline: released 0.07.004. Candidate: the thirteen committed
cases under `data/derived/`. This release changes scientific outputs, so the
metadata-only comparison used for 0.07.004 is not an appropriate acceptance gate.

## Scientific changes and source boundary

- The published Newman1 CPIT scenario is compared with CPIT methods and its own
  certified bound. The Jélvez et al. 2018 Table 3/4 values are labelled PCPSP;
  an attributed external CPIT integer result is shown separately. See
  [the case audit](../cases/newman1-external-optimum.md).
- `ctrl-abundant` ranks only capacity-feasible CPIT methods. Its best comparable
  gap is 0.2579644%; the PCPSP destination result does not enter the CPIT
  envelope. `ctrl-degenerate` retains its zero-gap collapse.
- Published Newman1 destination inputs come from its source `.pcpsp` file.
  Synthetic destination inputs come from their seeded economics. Declared
  scenarios without source destination economics record an explicit skip.
- The per-period destination ledger now uses the selected plant or waste cash
  and resource coefficients. The browser live model uses the same process
  tonnage, including negative-net-value plant blocks.
- Zuck small has no source block grade; its trace and chart omit grade. Newman1
  and KD grade displays state the MineLib source fields.

Source artifacts: [MineLib Newman1](https://minelib.org/v1/newman1.xhtml),
[MineLib KD](https://minelib.org/v1/kd.xhtml),
[MineLib Zuck small](https://minelib.org/v1/zuck_small.xhtml),
[Jélvez et al. 2018](https://www.delphoslab.cl/Publicaciones/2018/Jelvez_et_al_MPES2018.pdf),
and the [attributed AMPL CPIT run](https://colab.ampl.com/notebooks/minelib-in-ampl-and-amplpy.html).
The external integer result is an attributed reference, not a PhaseFlow certificate.

## Gates executed on the merged candidate

| Gate | Result |
|---|---|
| `python scripts/check_artifacts.py` | PASS: 13 cases; schemas, source roles, controls, period cash and capacities checked |
| `python scripts/check_readme_numbers.py` | PASS: Newman1 and control wiki numbers match artifacts |
| `.venv/Scripts/python.exe -m pytest -q` | PASS: 12 Python tests |
| `.venv/Scripts/python.exe -m ruff check data-pipeline scripts tests` | PASS |
| `npm test` | PASS: 20 frontend tests and 52 architecture labels within viewBox |
| `npm run build` | PASS: TypeScript, Vite and 19 materialized routes |
| `npm run verify:profile` | PASS: bounded plot sizing and shrink/restore at 1600, 1280, 768, 390 and 320 px; EN/ES |
| `npm run verify:grade` | PASS: Zuck no-grade and Newman1 sourced-grade EN/ES |
| `npm run verify:focus` | PASS: live capacity slider changes NPV; one-resource control omits plant slider |

Rendered desktop EN and ES dark pages, plus the ES phone Profile and plan page,
were inspected. Engine-authored English method notes remain visibly tagged as
source text in the Spanish UI. The bound surrogate in the learned lane still
uses its historical positive-net-value tonnage proxy; its sensitivity surface
is explicitly exploratory. New learned destination, deposit-statistics and
sliding-window features are specified in `docs/design/` and await the ADR-0075
design review; this release does not claim those features.

`min-width` is an operability illustration that does not reimpose capacity. The
artifact gate reports its overshoots as declared; its largest is 154.49% on
`regime-mining-bound`, and it is excluded from comparable CPIT rankings.
