"""Offline pipeline orchestrator and CLI.

    python data-pipeline/run.py                          # bake every case (canonical)
    python data-pipeline/run.py twin-porphyry-s          # one case
    python data-pipeline/run.py all --output build/smoke # sandbox: never touches committed evidence

The canonical bake is an explicit release operation. Tests and CI smoke runs must pass ``--output``
so they cannot mutate committed scientific evidence.

Stages, in order, each with real typed inputs and outputs:

``ingest`` (CONTRACT 1 on the assembled instance) ``preprocess`` (block model, precedence, values,
capacities) ``feature_extraction`` (the learned methods' inputs) ``train`` (the two learned models,
leakage-safe by deposit seed) ``infer`` (the method ladder) ``evaluate`` (the three controls plus the
held-out learned scores) ``export`` (trace, manifest, index) ``validate`` (re-read what was written
and check it against the contract).
"""

from __future__ import annotations

import argparse
import json
import time
from dataclasses import dataclass
from pathlib import Path

from . import __version__, registry
from .core.gate import classify_lane
from .core.manifest import build_case_manifest, build_index
from .core.trace import build_trace
from .io.formats import write_json
from .model.instances import build_instance
from .stages import evaluate as evaluate_stage
from .stages import solve as solve_stage

REPO_ROOT = Path(__file__).resolve().parents[2]
DERIVED = REPO_ROOT / "data" / "derived"
MANIFESTS = DERIVED / "manifests"
MODELS = REPO_ROOT / "models"


@dataclass(frozen=True)
class PipelinePaths:
    root: Path
    manifests: Path
    models: Path

    @classmethod
    def from_output(cls, output: str | Path | None = None) -> PipelinePaths:
        if output is None:
            return cls(root=DERIVED, manifests=MANIFESTS, models=MODELS)
        root = Path(output).resolve()
        return cls(root=root, manifests=root / "manifests", models=root / "models")


def _engine_versions() -> dict:
    import numpy
    import oreblocks

    return {"oreblocks": oreblocks.__version__, "numpy": numpy.__version__}


def precompute(case_id: str, *, output_root: str | Path | None = None, learned=None) -> dict:
    """Bake one case: instance, ladder, controls, trace, manifest."""
    paths = PipelinePaths.from_output(output_root)
    case = registry.get_case(case_id)

    t0 = time.perf_counter()
    instance = build_instance(case)
    predictions = None if learned is None else learned.for_instance(instance)
    results, relaxations, bound_report = solve_stage.run_ladder(instance, learned=predictions)
    controls = evaluate_stage.run_controls(instance, results)
    ensemble = evaluate_stage.run_ensemble(instance, results)
    offline_ms = (time.perf_counter() - t0) * 1000.0

    trace = build_trace(
        case=case,
        instance=instance,
        results=results,
        controls=controls,
        published=case.published,
        bound_report=bound_report,
        ensemble=ensemble,
        learned=None if learned is None else learned.report(),
    )
    artifact_rel = f"{case.id}/trace.json"
    artifact_path = paths.root / artifact_rel
    write_json(artifact_path, trace)
    trace_bytes = artifact_path.stat().st_size

    gate = classify_lane(
        n_blocks=instance.n_blocks,
        n_arcs=int(instance.precedence.n_arcs),
        trace_bytes=trace_bytes,
        offline_ms=offline_ms,
        redistributable=instance.synthetic,
    )
    manifest = build_case_manifest(
        case=case,
        instance=instance,
        results=results,
        artifact_rel=artifact_rel,
        trace_bytes=trace_bytes,
        gate=gate,
        controls=controls,
        engine_versions=_engine_versions(),
    )
    write_json(paths.manifests / f"{case.id}.json", manifest)
    _validate(artifact_path, paths.manifests / f"{case.id}.json")
    return manifest


def _validate(artifact_path: Path, manifest_path: Path) -> None:
    """The ``validate`` stage: re-read what was written and check the contract holds on disk."""
    trace = json.loads(artifact_path.read_text(encoding="utf-8"))
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    if trace["schema"] != "phaseflow.schedule-trace/v1":
        raise AssertionError(f"{artifact_path}: wrong trace schema {trace['schema']}")
    if trace["caseId"] != manifest["case_id"]:
        raise AssertionError("manifest and trace disagree on the case id")
    if not trace["methods"]:
        raise AssertionError(f"{artifact_path}: no method produced a result")
    for m in trace["methods"]:
        if m["npv"] > m["bound"] * (1 + 1e-9) + 1e-6:
            raise AssertionError(f"{m['method']}: feasible {m['npv']} exceeds bound {m['bound']}")
        if len(m["periods"]) != trace["scenario"]["periods"]:
            raise AssertionError(f"{m['method']}: period rows do not match the declared horizon")
    if trace["instance"]["synthetic"] != (trace["instance"]["source"] == "twin"):
        raise AssertionError("synthetic flag and source disagree")
    if not trace["instance"]["synthetic"] and "blocks" in trace:
        raise AssertionError(
            "a non-redistributable instance must never commit per-block data (MineLib licence)"
        )


def run_all(*, output_root: str | Path | None = None, learned=None) -> list[dict]:
    paths = PipelinePaths.from_output(output_root)
    entries = []
    for c in registry.list_cases():
        m = precompute(c.id, output_root=output_root, learned=learned)
        entries.append(
            {
                "case_id": c.id,
                "category": c.category,
                "manifest_path": f"manifests/{c.id}.json",
                "default": c.default,
                "lane": m["lane"],
                "title": {"en": c.title_en, "es": c.title_es},
            }
        )
    write_json(paths.manifests / "index.json", build_index(entries))
    return entries


def main() -> None:
    ap = argparse.ArgumentParser(prog="phaseflow-pipeline")
    ap.add_argument("case", nargs="?", default="all", help="a case id, or 'all'")
    ap.add_argument("--output", type=Path, help="sandbox output root; omit only for a release bake")
    ap.add_argument("--skip-minelib", action="store_true",
                    help="skip cases that need a MineLib cache that is not present")
    ap.add_argument("--learned", action="store_true", help="include the learned methods (needs models/)")
    args = ap.parse_args()
    paths = PipelinePaths.from_output(args.output)

    learned = None
    if args.learned:
        from .model.learned import LearnedBundle

        learned = LearnedBundle.load(paths.models)

    if args.case == "all":
        cases = registry.list_cases()
        if args.skip_minelib:
            from .model.instances import MINELIB_CACHE

            cases = [
                c
                for c in cases
                if c.deposit.synthetic
                or (MINELIB_CACHE / c.deposit.minelib_id / f"{c.deposit.minelib_id}.blocks").exists()
            ]
            registry.restrict(([c.id for c in cases]))
        entries = run_all(output_root=args.output, learned=learned)
        print(f"phaseflow {__version__}: baked {len(entries)} cases -> {paths.root}")
        for e in entries:
            print(f"  {e['case_id']:22s} [{e['category']:9s}] lane={e['lane']}")
    else:
        m = precompute(args.case, output_root=args.output, learned=learned)
        best = m["best"]
        print(
            f"{args.case}: lane={m['lane']} bytes={m['artifact']['bytes']} "
            f"best={best['method']} gap={best['gap_pct']:.2f}% -> {paths.root / m['artifact']['path']}"
        )


if __name__ == "__main__":
    main()
