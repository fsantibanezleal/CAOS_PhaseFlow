#!/usr/bin/env python3
"""Validate the frozen frontier training contract or train its five CPU PPO members."""
from __future__ import annotations

import argparse
from dataclasses import asdict
import hashlib
import importlib.metadata
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import time
from typing import Callable

import numpy as np
import torch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "data-pipeline"))

from pipeline.model.frontier_data import FEATURE_NAMES, GENERATOR_VERSION, generate_graph  # noqa: E402
from pipeline.model.frontier_features import (  # noqa: E402
    feature_contract_sha256,
    fit_training_normalizer,
    normalizer_contract,
)
from pipeline.model.frontier_policy import validate_split_manifest  # noqa: E402
from pipeline.model.frontier_ppo import (  # noqa: E402
    FrontierPolicyEnv,
    MaskedGraphActorCritic,
    PPOConfig,
    train_member,
)
from pipeline.model.frontier_splits import build_split_manifest, manifest_sha256  # noqa: E402
from pipeline.model.frontier_release import validate_training_members  # noqa: E402

MANIFEST_PATH = ROOT / "docs/design/features/learned-frontier/split-manifest.json"
CASE_INDEX = ROOT / "data/derived/manifests/index.json"
MEMBER_SEEDS = (1103, 2207, 3301, 4409, 5519)
MAX_TRANSITIONS = 1_000_000
MAX_CPU_SECONDS = 7_200.0
MAX_TOTAL_WALL_SECONDS = 86_400.0
VALIDATION_INTERVAL = 32_768
PATIENCE = 5
RUN_NAME = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$")


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _under(path: Path, parent: Path) -> bool:
    try:
        path.resolve().relative_to(parent.resolve())
        return True
    except ValueError:
        return False


def _manifest() -> tuple[dict, str]:
    if not CASE_INDEX.is_file() or not MANIFEST_PATH.is_file():
        raise ValueError("the committed product case index and approved frontier split manifest are required")
    index = json.loads(CASE_INDEX.read_text(encoding="utf-8"))
    expected = build_split_manifest([row["case_id"] for row in index["cases"]])
    expected_payload = {"sha256": manifest_sha256(expected), "manifest": expected}
    actual = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    if actual != expected_payload:
        raise ValueError("the committed split manifest differs from the frozen generator or current product case list")
    manifest = actual["manifest"]
    validate_split_manifest(manifest)
    if manifest.get("generator_version") != GENERATOR_VERSION:
        raise ValueError("the split manifest generator version differs from the implementation")
    for part in ("train", "validation", "test"):
        for row in manifest[part]:
            if row.get("generator_version") != GENERATOR_VERSION:
                raise ValueError(f"{part} includes a row from a different graph-generator version")
    return manifest, actual["sha256"]


def _target_version() -> str:
    amendment = ROOT / "docs/design/features/learned-frontier/SDD-amendment-0.12.000.md"
    match = re.match(r"^# PhaseFlow SDD amendment (\d+\.\d{2}\.\d{3}):", amendment.read_text(encoding="utf-8"))
    if not match:
        raise ValueError("the approved frontier SDD amendment does not declare a release version")
    return match.group(1)


def _check_environment() -> None:
    if not torch.__version__.startswith("2.14.1"):
        raise ValueError(f"frontier training requires torch 2.14.1 CPU; found {torch.__version__}")
    if torch.cuda.is_available():
        raise ValueError("CUDA is outside the frozen CPU training protocol")
    if importlib.metadata.version("oreblocks") != "0.6.6":
        raise ValueError("frontier training receipts require the frozen oreblocks 0.6.6 pin")
    if tuple(FEATURE_NAMES) != (
        "value_norm", "tonnage_norm", "plant_use_fraction", "grade_norm", "depth_fraction",
        "predecessor_count", "successor_count",
    ):
        raise ValueError("the implemented node features differ from the frozen SDD contract")


def check_contract() -> tuple[dict, str]:
    _check_environment()
    manifest, digest = _manifest()
    counts = validate_split_manifest(manifest)
    print(
        "frontier training contract: OK; "
        f"generator={GENERATOR_VERSION}; split={digest}; "
        f"train={counts['train']}, validation={counts['validation']}, test={counts['test']}, "
        f"sealed product cases={counts['product_cases']}; CPU torch={torch.__version__}"
    )
    return manifest, digest


def _validate_external_paths(args: argparse.Namespace) -> tuple[Path, Path]:
    model_root = Path(args.model_root).expanduser().resolve()
    approved_model_root = Path(args.approved_model_root).expanduser().resolve()
    data_root = Path(args.data_root).expanduser().resolve()
    approved_data_root = Path(args.approved_data_root).expanduser().resolve()
    if not _under(model_root, approved_model_root) or _under(model_root, ROOT):
        raise ValueError("training checkpoints must stay under the approved external model root")
    if not _under(data_root, approved_data_root) or _under(data_root, ROOT):
        raise ValueError("training receipts must stay under the approved external data root")
    if _under(model_root, data_root) or _under(data_root, model_root):
        raise ValueError("model and data roots must be separate external directories")
    if not RUN_NAME.fullmatch(args.run_name):
        raise ValueError("run name must use 1 to 64 alphanumeric, dot, underscore or dash characters")
    model_run = model_root / args.run_name
    data_run = data_root / args.run_name
    if model_run.exists() or data_run.exists():
        raise ValueError("run outputs already exist; choose a new run name instead of overwriting evidence")
    return model_run, data_run


def _episode_factory(rows: list[dict]):
    # The sequence is deterministic and reaches each frozen seed before cycling.
    cursor = 0

    def make() -> FrontierPolicyEnv:
        nonlocal cursor
        row = rows[cursor % len(rows)]
        cursor += 1
        graph = generate_graph(row["seed"], row["family"], row["size"])
        return FrontierPolicyEnv(graph.instance, graph.node_features)

    return make


def _validate_member(
    model: MaskedGraphActorCritic, rows: list[dict], budget_check: Callable[[], bool],
) -> dict | None:
    total = 0.0
    feasible = 0
    count = 0
    model.eval()
    try:
        for row in rows:
            if not budget_check():
                return None
            graph = generate_graph(row["seed"], row["family"], row["size"])
            env = FrontierPolicyEnv(graph.instance, graph.node_features)
            observation = env.observation()
            graph_embedding = model.encode_graph(observation)
            while not env.terminated:
                if not budget_check():
                    return None
                action, _, _ = model.select_action(
                    observation, deterministic=True, graph_embedding=graph_embedding,
                )
                observation, _, _, _ = env.step(action)
                if observation is not None and observation.num_blocks != len(graph.instance.values):
                    raise ValueError("validation state graph changed within an episode")
            result = env.result(graph.tonnage)
            normalizer = max(float(np.abs(graph.instance.values).sum()), 1e-12)
            total += result.npv / normalizer
            feasible += int(np.isfinite(result.npv))
            count += 1
    finally:
        model.train()
    if not count or not budget_check():
        return None
    return {"mean_normalized_npv": total / count, "all_feasible": feasible == count, "cases": count}


def _atomic_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".pending")
    temporary.write_text(json.dumps(payload, sort_keys=True, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)


def train(args: argparse.Namespace) -> int:
    manifest, split_hash = check_contract()
    target_version = _target_version()
    if (ROOT / "VERSION").read_text(encoding="utf-8").strip() != target_version:
        raise ValueError(f"the frontier training run is released only from the frozen {target_version} source")
    dirty = subprocess.run(["git", "status", "--porcelain"], cwd=ROOT, capture_output=True, text=True, check=True)
    if dirty.stdout.strip():
        raise ValueError("training requires a clean, committed source snapshot")
    source_commit = subprocess.run(
        ["git", "rev-parse", "HEAD"], cwd=ROOT, capture_output=True, text=True, check=True,
    ).stdout.strip()
    model_run, data_run = _validate_external_paths(args)

    normalizer, training_data_hash = fit_training_normalizer(manifest["train"])
    normalization = normalizer_contract(normalizer)
    feature_hash = feature_contract_sha256(normalizer, training_data_hash)
    training_contract = {
        "generator_version": GENERATOR_VERSION,
        "feature_names": list(FEATURE_NAMES),
        "feature_contract_sha256": feature_hash,
        "training_split_sha256": split_hash,
        "training_data_sha256": training_data_hash,
        "normalization": normalization,
    }
    (data_run / "feature-normalizer.json").parent.mkdir(parents=True, exist_ok=True)
    _atomic_json(data_run / "feature-normalizer.json", normalization)
    _atomic_json(data_run / "training-contract.json", training_contract)

    config = PPOConfig()
    total_started = time.monotonic()
    members: list[dict] = []
    for seed in MEMBER_SEEDS:
        remaining_wall = MAX_TOTAL_WALL_SECONDS - (time.monotonic() - total_started)
        if remaining_wall <= 0:
            members.append({"seed": seed, "status": "not-started-wall-cap"})
            continue
        try:
            model = MaskedGraphActorCritic(len(FEATURE_NAMES), 5)
            model.set_feature_normalizer(normalizer.mean, normalizer.scale)
            run = train_member(
                model,
                _episode_factory(manifest["train"]),
                lambda candidate, budget_check: _validate_member(candidate, manifest["validation"], budget_check),
                seed=seed,
                model_root=model_run,
                approved_model_root=Path(args.approved_model_root).expanduser().resolve(),
                repository_root=ROOT,
                max_transitions=MAX_TRANSITIONS,
                max_cpu_seconds=MAX_CPU_SECONDS,
                max_wall_seconds=remaining_wall,
                validation_interval=VALIDATION_INTERVAL,
                patience=PATIENCE,
                config=config,
                training_contract=training_contract,
            )
            members.append({
                "seed": seed, "status": "trained-to-stop-rule", "transitions": run.transitions,
                "cpu_seconds": run.cpu_seconds, "wall_seconds": run.wall_seconds,
                "stop_reason": run.stop_reason, "checkpoint": run.selected_checkpoint,
                "checkpoint_sha256": run.selected_checkpoint_sha256,
                "final_checkpoint_sha256": run.final_checkpoint_sha256,
                "validation_history": list(run.validation_history),
            })
        except Exception as exc:
            # Preserve the failed member and keep the frozen ensemble receipt auditable.
            members.append({
                "seed": seed, "status": "failed", "failure_type": type(exc).__name__,
                "failure_reason": str(exc),
            })
        _atomic_json(data_run / "member-ledger.json", {"source_commit": source_commit, "members": members})

    elapsed = time.monotonic() - total_started
    receipt = {
        "schema_version": "1.0.0", "method": "frontier-policy", "product_version": target_version,
        "source_commit": source_commit, "engine_version": "oreblocks==0.6.6",
        "checkpoint_root": str(model_run), "data_root": str(data_run),
        "split_sha256": split_hash, "training_data_sha256": training_data_hash,
        "feature_contract_sha256": feature_hash, "normalization": normalization,
        "training_contract": training_contract,
        "seeds": list(MEMBER_SEEDS), "max_transitions_per_member": MAX_TRANSITIONS,
        "max_cpu_seconds_per_member": MAX_CPU_SECONDS,
        "max_wall_seconds_all_members": MAX_TOTAL_WALL_SECONDS,
        "validation_interval": VALIDATION_INTERVAL, "patience": PATIENCE,
        "ppo_config": asdict(config), "elapsed_wall_seconds": elapsed,
        "runtime": {"device": "cpu", "torch": torch.__version__, "numpy": np.__version__},
        "members": members,
        "complete": False,
    }
    try:
        validate_training_members(members, list(MEMBER_SEEDS))
        receipt["complete"] = True
    except ValueError:
        pass
    _atomic_json(data_run / "ensemble-receipt.json", receipt)
    print(f"frontier policy run recorded at {data_run}; complete={receipt['complete']}")
    return 0 if receipt["complete"] else 2


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="check the frozen split, features and CPU environment without training")
    parser.add_argument("--run-name", help="new immutable run identifier, required for training")
    parser.add_argument("--model-root", help="external root for checkpoints")
    parser.add_argument("--approved-model-root", help="approved device model root containing --model-root")
    parser.add_argument("--data-root", help="external root for normalizer and receipts")
    parser.add_argument("--approved-data-root", help="approved device data root containing --data-root")
    args = parser.parse_args()
    try:
        if args.check:
            check_contract()
            return 0
        required = (args.run_name, args.model_root, args.approved_model_root, args.data_root, args.approved_data_root)
        if any(value is None for value in required):
            parser.error("training requires --run-name, --model-root, --approved-model-root, --data-root and --approved-data-root")
        return train(args)
    except (ValueError, OSError, subprocess.SubprocessError, KeyError, TypeError) as exc:
        print(f"frontier training: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
