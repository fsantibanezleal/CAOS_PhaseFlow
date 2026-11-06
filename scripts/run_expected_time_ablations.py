#!/usr/bin/env python3
"""Run deposit-disjoint ablations for the expected-time schedule model.

Training arrays and candidate weights stay under the configured external data/model roots. The
script reads the exact frozen train and holdout cache produced by ``train_learned.py``, retrains
feature and data-size ablations with the declared seeds, evaluates every candidate with the same
PhaseFlow schedule constructor, and writes a hash-bound result receipt to the requested output path.
It never opens a MineLib test case and never writes into ``models/``.

Example::

    $env:PHASEFLOW_TRAIN_CACHE = 'E:\\_Datos\\CAOS_PhaseFlow\\train-cache'
    .venv-pipeline/Scripts/python.exe scripts/run_expected_time_ablations.py \
      --output-dir E:\\_Datos\\CAOS_PhaseFlow\\expected-time-ablations

The output directory is an external training/model location. Promote only the validated compact
summary and generated paper tables back into the repository.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path
from typing import Any

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "data-pipeline"))
sys.path.insert(0, str(ROOT))

from pipeline.model.features import BLOCK_FEATURES, block_feature_matrix  # noqa: E402
from pipeline.model.instances import build_instance  # noqa: E402
from pipeline.model.learned import Mlp, train_ensemble  # noqa: E402

import scripts.train_learned as trainer  # noqa: E402

ENSEMBLE_SEEDS = (17, 29, 41, 53, 67)
EPOCHS = 10
BATCH = 2048
LEARNING_RATE = 4e-3
FAILURE_THRESHOLD = 0.90
BOOTSTRAP_SEED = 260611
BOOTSTRAP_SAMPLES = 20_000

_WORKER_MODELS: list[tuple[str, Mlp, list[int]]] = []


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def read_cache(path: Path, expected_seeds: set[int]) -> dict[str, Any]:
    with np.load(path, allow_pickle=True) as cached:
        required = {"xb", "yb", "meta"}
        if not required.issubset(cached.files):
            raise ValueError(f"{path.name} is missing cache arrays: {sorted(required - set(cached.files))}")
        x = cached["xb"].astype(np.float64)
        y = cached["yb"].astype(np.float64).reshape(-1)
        meta = [dict(row) for row in cached["meta"].tolist()]
    if x.ndim != 2 or x.shape[0] != y.shape[0] or x.shape[1] != len(BLOCK_FEATURES):
        raise ValueError(f"{path.name} does not match the current expected-time feature contract")
    if not np.isfinite(x).all() or not np.isfinite(y).all():
        raise ValueError(f"{path.name} contains non-finite model inputs or targets")
    if {int(row["seed"]) for row in meta} != expected_seeds:
        raise ValueError(f"{path.name} seed set differs from the frozen split")
    if len({row["case"] for row in meta}) != len(meta):
        raise ValueError(f"{path.name} contains duplicate case metadata")
    if sum(int(row["n_blocks"]) for row in meta) != x.shape[0]:
        raise ValueError(f"{path.name} feature rows do not reconcile with case metadata")
    return {"x": x, "y": y, "meta": meta, "sha256": sha256(path)}


def segment_rows(meta: list[dict], selected_seeds: set[int]) -> np.ndarray:
    """Return row offsets for complete deposit-seed groups in the cache's stable case order."""
    chosen: list[int] = []
    start = 0
    for row in meta:
        stop = start + int(row["n_blocks"])
        if int(row["seed"]) in selected_seeds:
            chosen.extend(range(start, stop))
        start = stop
    return np.asarray(chosen, dtype=np.int64)


def cluster_summary(ratios: np.ndarray, seeds: np.ndarray) -> dict[str, Any]:
    """Summarize cases and a seed-cluster bootstrap; seeds are the independent split units."""
    ratios = np.asarray(ratios, dtype=np.float64)
    seeds = np.asarray(seeds, dtype=np.int64)
    if ratios.ndim != 1 or ratios.shape != seeds.shape or not np.isfinite(ratios).all():
        raise ValueError("ratios and seed labels must be finite aligned one-dimensional arrays")
    grouped = {int(seed): ratios[seeds == seed] for seed in np.unique(seeds)}
    seed_means = {str(seed): float(values.mean()) for seed, values in grouped.items()}
    means = np.asarray(list(grouped.values()), dtype=np.float64)
    rng = np.random.default_rng(BOOTSTRAP_SEED)
    draws = rng.integers(0, len(means), size=(BOOTSTRAP_SAMPLES, len(means)))
    boot = means[draws].mean(axis=1)
    return {
        "cases": int(ratios.size),
        "deposit_seeds": len(grouped),
        "median": float(np.median(ratios)),
        "mean": float(np.mean(ratios)),
        "p10": float(np.quantile(ratios, 0.10)),
        "minimum": float(np.min(ratios)),
        "failure_count_below_0_90": int(np.sum(ratios < FAILURE_THRESHOLD)),
        "failure_fraction_below_0_90": float(np.mean(ratios < FAILURE_THRESHOLD)),
        "deposit_seed_mean_ratios": seed_means,
        "deposit_seed_mean_sample_sd": float(np.std(means, ddof=1)) if len(means) > 1 else None,
        "deposit_seed_mean_cluster_bootstrap_95_percentile_interval": [
            float(np.quantile(boot, 0.025)), float(np.quantile(boot, 0.975))
        ],
    }


def worker_init(model_files: list[dict[str, str]]) -> None:
    global _WORKER_MODELS
    from pipeline.model.learned import Mlp as WorkerMlp

    _WORKER_MODELS = []
    for spec in model_files:
        payload = json.loads(Path(spec["path"]).read_text(encoding="utf-8"))
        model = WorkerMlp.from_json(payload)
        indices = [BLOCK_FEATURES.index(name) for name in model.feature_names]
        _WORKER_MODELS.append((spec["name"], model, indices))


def score_case(meta: dict) -> tuple[str, int, dict[str, float]]:
    """Build each holdout instance once, then score all models through the same feasibility path."""
    case = trainer._case(meta["seed"], meta["archetype"], meta["scenario"], tuple(meta["dims"]))
    instance = build_instance(case)
    features = block_feature_matrix(
        values=instance.cpit.value,
        grade=instance.grade,
        level=instance.level,
        x=instance.x,
        y=instance.y,
        in_pit=instance.upit_in_pit,
        prec=instance.precedence,
        scenario=case.scenario,
        dims=instance.dims,
    ).astype(np.float64)
    values: dict[str, float] = {}
    for name, model, indices in _WORKER_MODELS:
        predicted = model.forward(features[:, indices]).reshape(-1) * (case.scenario.periods + 1)
        schedule = trainer.ob.toposort_schedule(
            instance.cpit, instance.precedence, weight=-predicted, allowed=instance.upit_in_pit
        )
        values[name] = float(schedule.npv)
    return str(meta["case"]), int(meta["seed"]), values


def save_model(path: Path, model: Mlp) -> None:
    path.write_text(json.dumps(model.to_json(), separators=(",", ":"), allow_nan=False), encoding="utf-8")


def build_candidates(train: dict, output: Path, baseline_path: Path) -> list[dict[str, str]]:
    feature_names = tuple(BLOCK_FEATURES)
    candidates: list[dict[str, str]] = []
    baseline = Mlp.from_json(json.loads(baseline_path.read_text(encoding="utf-8")))
    if baseline.feature_names != feature_names or len(baseline._weight_sets()) != len(ENSEMBLE_SEEDS):
        raise ValueError("committed expected-time artifact is not the five-member model for this feature contract")
    baseline_file = output / "models" / "full-ensemble.json"
    baseline_file.parent.mkdir(parents=True, exist_ok=True)
    save_model(baseline_file, baseline)
    candidates.append({"name": "full_ensemble", "path": str(baseline_file)})

    for index, (weights, biases) in enumerate(baseline._weight_sets(), 1):
        single = Mlp(w=weights, b=biases, feature_names=baseline.feature_names, target=baseline.target,
                     mu=baseline.mu, sigma=baseline.sigma)
        path = output / "models" / f"single_member_{index}.json"
        save_model(path, single)
        candidates.append({"name": f"single_member_{index}", "path": str(path)})

    variants = {
        "drop_predecessor_recurrence": {
            "seeds": set(trainer.TRAIN_SEEDS),
            "keep": [n for n in feature_names if n not in {"cone_size_norm", "cone_value_norm"}],
        },
        "drop_depth_grade_radial": {
            "seeds": set(trainer.TRAIN_SEEDS),
            "keep": [n for n in feature_names if n not in {"depth_frac", "grade_norm", "radial_frac"}],
        },
        "half_deposit_seeds": {
            "seeds": set(trainer.TRAIN_SEEDS[: len(trainer.TRAIN_SEEDS) // 2]),
            "keep": list(feature_names),
        },
    }
    for name, variant in variants.items():
        indices = segment_rows(train["meta"], variant["seeds"])
        names = tuple(variant["keep"])
        columns = [feature_names.index(key) for key in names]
        model = train_ensemble(
            train["x"][indices][:, columns], train["y"][indices], seeds=ENSEMBLE_SEEDS,
            feature_names=names, target="expected_time_fraction", hidden=(48, 24),
            epochs=EPOCHS, batch=BATCH, lr=LEARNING_RATE,
        )
        path = output / "models" / f"{name}.json"
        save_model(path, model)
        candidates.append({"name": name, "path": str(path)})
    return candidates


def run(cache_dir: Path, model_path: Path, output_dir: Path, workers: int) -> Path:
    train_path = cache_dir / f"collect-{_cache_key(trainer.TRAIN_SEEDS)}.npz"
    holdout_path = cache_dir / f"collect-{_cache_key(trainer.HOLDOUT_SEEDS)}.npz"
    train = read_cache(train_path, set(trainer.TRAIN_SEEDS))
    holdout = read_cache(holdout_path, set(trainer.HOLDOUT_SEEDS))
    if set(trainer.TRAIN_SEEDS) & set(trainer.HOLDOUT_SEEDS):
        raise ValueError("frozen training and holdout deposit seeds overlap")
    output_dir.mkdir(parents=True, exist_ok=True)
    model_specs = build_candidates(train, output_dir, model_path)
    names = [item["name"] for item in model_specs]
    case_outputs: dict[str, dict[str, Any]] = {}
    with ProcessPoolExecutor(max_workers=workers, initializer=worker_init, initargs=(model_specs,)) as pool:
        for done, (case, seed, scores) in enumerate(pool.map(score_case, holdout["meta"], chunksize=1), 1):
            case_meta = next(row for row in holdout["meta"] if row["case"] == case)
            baseline_npv = float(case_meta["exact_exts_npv"])
            if baseline_npv <= 0 or not np.isfinite(baseline_npv):
                raise ValueError(f"non-positive exact expected-time comparator for {case}")
            case_outputs[case] = {
                "seed": seed,
                "archetype": case_meta["archetype"],
                "n_blocks": int(case_meta["n_blocks"]),
                "periods": int(case_meta["scenario"][0]),
                "rate": float(case_meta["scenario"][1]),
                "ratios": {name: float(value / baseline_npv) for name, value in scores.items()},
            }
            if done % 24 == 0 or done == len(holdout["meta"]):
                print(f"scored {done}/{len(holdout['meta'])} held-out cases", flush=True)
    seed_labels = np.asarray([case_outputs[row["case"]]["seed"] for row in holdout["meta"]], dtype=np.int64)
    results = {}
    for name in names:
        ratios = np.asarray([case_outputs[row["case"]]["ratios"][name] for row in holdout["meta"]])
        results[name] = cluster_summary(ratios, seed_labels)
    single_names = [f"single_member_{i}" for i in range(1, len(ENSEMBLE_SEEDS) + 1)]
    results["single_member_seed_mean"] = {
        "members": single_names,
        "median_of_member_medians": float(np.median([results[n]["median"] for n in single_names])),
        "member_median_range": [float(min(results[n]["median"] for n in single_names)),
                                float(max(results[n]["median"] for n in single_names))],
        "mean_case_ratio_across_members": float(np.mean([
            case_outputs[row["case"]]["ratios"][name]
            for row in holdout["meta"] for name in single_names
        ])),
    }
    receipt = {
        "schema": "phaseflow.expected-time-ablations/v1",
        "claim_boundary": "synthetic deposit-disjoint evaluation; two MineLib cases are not part of this ablation",
        "cache_sha256": {"train": train["sha256"], "holdout": holdout["sha256"]},
        "baseline_model_sha256": sha256(model_path),
        "train_seeds": trainer.TRAIN_SEEDS,
        "holdout_seeds": trainer.HOLDOUT_SEEDS,
        "member_seeds": ENSEMBLE_SEEDS,
        "model_configuration": {"hidden": [48, 24], "epochs": EPOCHS, "batch": BATCH,
                                "learning_rate": LEARNING_RATE, "failure_threshold": FAILURE_THRESHOLD},
        "candidate_feature_sets": {item["name"]: Mlp.from_json(json.loads(Path(item["path"]).read_text(
            encoding="utf-8"))).feature_names for item in model_specs},
        "results": results,
        "paired_case_ratios": case_outputs,
    }
    receipt_path = output_dir / "expected-time-ablations.json"
    receipt_path.write_text(json.dumps(receipt, indent=2, allow_nan=False) + "\n", encoding="utf-8")
    print(f"wrote {receipt_path}")
    return receipt_path


def _cache_key(seeds: list[int]) -> str:
    payload = [seeds, trainer.ARCHETYPES, trainer.SCENARIOS, trainer.SIZES,
               list(trainer.BLOCK_FEATURES), list(trainer.DEPOSIT_FEATURES)]
    return hashlib.sha256(json.dumps(payload).encode()).hexdigest()[:16]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--cache-dir", type=Path, default=Path(os.environ["PHASEFLOW_TRAIN_CACHE"])
                        if os.environ.get("PHASEFLOW_TRAIN_CACHE") else None,
                        help="external cache directory used by train_learned.py")
    parser.add_argument("--model", type=Path, default=ROOT / "models" / "expected-time.json",
                        help="committed five-member baseline model")
    parser.add_argument("--output-dir", type=Path, required=True,
                        help="external candidate-model/receipt directory")
    parser.add_argument("--workers", type=int, default=trainer.WORKERS)
    args = parser.parse_args()
    if args.cache_dir is None:
        parser.error("--cache-dir or PHASEFLOW_TRAIN_CACHE must name the external training cache")
    if args.workers < 1:
        parser.error("--workers must be positive")
    run(args.cache_dir.resolve(), args.model.resolve(), args.output_dir.resolve(), args.workers)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
