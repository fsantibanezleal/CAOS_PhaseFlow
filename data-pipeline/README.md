# PhaseFlow data pipeline

The repository-local Python package under `pipeline/` is the sole implementation of the offline bake and scientific evaluation. It reads declared source data, validates the selected model bundle, runs the methods and emits versioned traces and manifests into a required external output stage. Only a validated compact candidate is promoted into `data/derived/`. The browser consumes those artifacts; it does not reimplement offline scheduling for real cases.

## Layout

- `pipeline/io/`: source readers, normalization and input contracts.
- `pipeline/model/`: shared feasibility, economics and learned-model features.
- `pipeline/core/`: trace, manifest, random-seed and lane contracts.
- `pipeline/stages/`: preprocessing, training, inference, evaluation and export.
- `pipeline/cases/`: case definitions and supported scenarios.
- `run.py`: deterministic CLI entry point.

Install the isolated scientific environment with `scripts/setup.ps1` (Windows) or `scripts/setup.sh`, then read [the pipeline guide](../docs/guides/01_bake-the-artifacts.md) before baking. Raw MineLib source files belong outside the repository; only licensed, compact derived evidence is committed.
