# Guides: run it, bake it, extend it

| # | guide | for |
|---|---|---|
| 01 | [bake the artifacts](guides/01_bake-the-artifacts.md) | a sandbox or release bake, what it costs, `--jobs`, what to run after |
| 02 | [bring your own block model](guides/02_bring-your-own-data.md) | a new deposit through CONTRACT 1 into the app |
| 03 | [retrain, re-score or re-verify the learned models](guides/03_retrain-the-learned-models.md) | the offline learned-lane scripts, in order |
| 04 | [use the app](guides/04_use-the-app.md) | the App's six tabs, the focus view's live re-solve, the reading pages |
| 05 | [run the checks locally](guides/05_run-the-checks.md) | everything CI runs, and the slower checks it does not |

Running it locally from a fresh clone is [`scripts/local/README.md`](../scripts/local/README.md): numbered
scripts (00 prerequisites, 01 init, 02 bake, 03 dev server), each printing the next command, in `.sh` and
`.ps1`.

There is no API guide and no GPU guide: PhaseFlow has no backend, and the bake is a sequence of dependent
closures and MILPs, which a GPU would not speed up.
