#!/usr/bin/env python3
"""Replay frozen policy checkpoints on their validation split for descriptive diagnostics only.

This command never reads the synthetic test partition or product cases, never changes model
selection, and writes its output under the external run data directory. The validation rows were
used to select the checkpoints, so the output is not independent performance evidence.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "data-pipeline"))

from pipeline.model.frontier_data import generate_graph  # noqa: E402
from pipeline.model.frontier_ppo import MaskedGraphActorCritic, replay_frontier_ensemble  # noqa: E402
from pipeline.model.frontier_splits import manifest_sha256  # noqa: E402

PROTECTED = (
    "data-pipeline/pipeline/model/frontier_data.py",
    "data-pipeline/pipeline/model/frontier_features.py",
    "data-pipeline/pipeline/model/frontier_policy.py",
    "data-pipeline/pipeline/model/frontier_ppo.py",
    "data-pipeline/pipeline/model/frontier_release.py",
    "data-pipeline/pipeline/model/frontier_splits.py",
    "scripts/train_frontier_policy.py",
)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def assert_frozen_source(source_commit: str) -> None:
    for relative in PROTECTED:
        frozen = subprocess.run(
            ["git", "show", f"{source_commit}:{relative}"], cwd=ROOT,
            capture_output=True, check=True,
        ).stdout
        if frozen != (ROOT / relative).read_bytes():
            raise ValueError(f"frozen training method source differs at {relative}")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data-root", type=Path, required=True,
                        help="external data root containing the immutable training run")
    args = parser.parse_args()
    run = args.data_root.expanduser().resolve()
    receipt_path = run / "ensemble-receipt.json"
    split_path = ROOT / "docs/design/features/learned-frontier/split-manifest.json"
    receipt = json.loads(receipt_path.read_text(encoding="utf-8"))
    split_record = json.loads(split_path.read_text(encoding="utf-8"))
    manifest = split_record["manifest"]
    if split_record.get("sha256") != manifest_sha256(manifest):
        raise ValueError("committed split manifest digest is invalid")
    if receipt.get("split_sha256") != split_record["sha256"]:
        raise ValueError("training receipt and committed split manifest differ")
    if receipt.get("complete") is not True or len(receipt.get("members", [])) != 5:
        raise ValueError("a complete five-member frozen training receipt is required")
    if not receipt.get("source_commit"):
        raise ValueError("training source commit is absent")
    assert_frozen_source(receipt["source_commit"])

    import torch

    if not torch.__version__.startswith("2.14.1"):
        raise ValueError(f"the frozen CPU runtime is PyTorch 2.14.1, found {torch.__version__}")
    models = []
    for member in receipt["members"]:
        checkpoint = Path(member["checkpoint"]).resolve()
        if sha256(checkpoint) != member["checkpoint_sha256"]:
            raise ValueError(f"seed {member['seed']}: selected checkpoint hash differs from receipt")
        payload = torch.load(checkpoint, map_location="cpu", weights_only=True)
        model = MaskedGraphActorCritic(
            int(payload["node_features"]), int(payload["state_features"]), int(payload["hidden"]),
        )
        model.load_state_dict(payload["state_dict"], strict=True)
        models.append(model.eval())

    rows: list[dict] = []
    for split_row in manifest["validation"]:
        graph = generate_graph(split_row["seed"], split_row["family"], split_row["size"])
        result = replay_frontier_ensemble(
            graph.instance, graph.node_features, models, tonnage=graph.tonnage,
        )
        rows.append({
            "seed": split_row["seed"],
            "family": split_row["family"],
            "size": split_row["size"],
            "normalized_npv": result.npv / max(float(abs(graph.instance.values).sum()), 1e-12),
            "tonnage_coverage": result.tonnage_coverage,
            "positive_value_coverage": result.positive_value_coverage,
            "assigned_blocks": len(result.assignments),
            "block_count": len(graph.instance.values),
            "independent_schedule_validation": "passed",
        })
    import numpy as np

    values = np.asarray([row["normalized_npv"] for row in rows], dtype=np.float64)
    tonnage = np.asarray([row["tonnage_coverage"] for row in rows], dtype=np.float64)
    positive = np.asarray([row["positive_value_coverage"] for row in rows], dtype=np.float64)
    assigned = np.asarray([row["assigned_blocks"] for row in rows], dtype=np.float64)
    summary = {
        "schema": "phaseflow.frontier-validation-diagnostic/v1",
        "interpretation": "post-selection validation diagnostic; not independent performance evidence",
        "training_source_commit": receipt["source_commit"],
        "training_run": run.name,
        "split_sha256": split_record["sha256"],
        "checkpoint_sha256": [row["checkpoint_sha256"] for row in receipt["members"]],
        "partition": "validation",
        "cases": len(rows),
        "all_schedules_independently_validated": all(
            row["independent_schedule_validation"] == "passed" for row in rows
        ),
        "mean_normalized_npv": float(values.mean()),
        "median_normalized_npv": float(np.median(values)),
        "min_normalized_npv": float(values.min()),
        "max_normalized_npv": float(values.max()),
        "nonempty_schedule_fraction": float(np.mean(assigned > 0)),
        "mean_assigned_blocks": float(assigned.mean()),
        "median_tonnage_coverage": float(np.median(tonnage)),
        "median_positive_value_coverage": float(np.median(positive)),
        "min_positive_value_coverage": float(positive.min()),
        "max_positive_value_coverage": float(positive.max()),
        "case_results": rows,
    }
    out = run / "validation-diagnostic.json"
    if out.exists():
        raise FileExistsError(f"refusing to overwrite existing diagnostic: {out}")
    out.write_text(json.dumps(summary, sort_keys=True, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({key: value for key, value in summary.items() if key != "case_results"}, indent=2))
    print(f"wrote validation-only diagnostic: {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
