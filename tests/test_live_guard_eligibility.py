from __future__ import annotations

import json
import shutil
from pathlib import Path

from pipeline.model.learned import LearnedBundle

ROOT = Path(__file__).resolve().parents[1]


def test_failed_third_split_keeps_the_archetype_candidate_out_of_live_use() -> None:
    bundle = LearnedBundle.load(ROOT / "models")

    status = bundle.live_guard_status()

    assert status["available"] is False
    assert "recall" in status["reason"]
    assert "precision" in status["reason"]
    assert "worst_unflagged" in status["reason"]
    assert bundle.unreliable_here(None, archetype="vein") is None


def test_guard_requires_matching_rule_and_all_independent_thresholds(tmp_path: Path) -> None:
    for name in ("expected-time.json", "bound.json"):
        shutil.copy2(ROOT / "models" / name, tmp_path / name)
    model_path = tmp_path / "expected-time.json"
    model = json.loads(model_path.read_text(encoding="utf-8"))
    rule = model["metrics"]["failure_rule"]
    (tmp_path / "guard-validation.json").write_text(
        json.dumps(
            {
                "rule": rule,
                "failure_below": 0.90,
                "train_seeds": [101],
                "holdout_seeds": [211],
                "validation_seeds": [241],
                "n": 1,
                "rows": [{"seed": 241}],
                "recall": 0.818,
                "precision": 0.667,
                "worst_unflagged": 0.7852,
            }
        ),
        encoding="utf-8",
    )

    bundle = LearnedBundle.load(tmp_path)

    assert bundle.live_guard_status() == {
        "available": True,
        "reason": "the frozen rule passed all third-split thresholds",
    }
    assert bundle.unreliable_here(None, archetype="vein") is not None


def test_malformed_receipt_fails_closed_without_raising(tmp_path: Path) -> None:
    for name in ("expected-time.json", "bound.json"):
        shutil.copy2(ROOT / "models" / name, tmp_path / name)
    model = json.loads((tmp_path / "expected-time.json").read_text(encoding="utf-8"))
    (tmp_path / "guard-validation.json").write_text(
        json.dumps(
            {
                "rule": model["metrics"]["failure_rule"],
                "failure_below": 0.90,
                "train_seeds": [101],
                "holdout_seeds": [211],
                "validation_seeds": [241],
                "n": "1",
                "rows": [{}],
                "recall": 0.9,
                "precision": 0.9,
                "worst_unflagged": 0.9,
            }
        ),
        encoding="utf-8",
    )

    bundle = LearnedBundle.load(tmp_path)

    assert bundle.live_guard_status() == {
        "available": False,
        "reason": "the validation receipt has inconsistent case counts",
    }


def test_receipt_must_cover_every_validation_seed(tmp_path: Path) -> None:
    for name in ("expected-time.json", "bound.json"):
        shutil.copy2(ROOT / "models" / name, tmp_path / name)
    model = json.loads((tmp_path / "expected-time.json").read_text(encoding="utf-8"))
    (tmp_path / "guard-validation.json").write_text(
        json.dumps(
            {
                "rule": model["metrics"]["failure_rule"],
                "failure_below": 0.90,
                "train_seeds": [101],
                "holdout_seeds": [211],
                "validation_seeds": [241, 243],
                "n": 1,
                "rows": [{"seed": 241}],
                "recall": 0.9,
                "precision": 0.9,
                "worst_unflagged": 0.9,
            }
        ),
        encoding="utf-8",
    )

    bundle = LearnedBundle.load(tmp_path)

    assert bundle.live_guard_status() == {
        "available": False,
        "reason": "the validation receipt does not cover every third-split seed",
    }
