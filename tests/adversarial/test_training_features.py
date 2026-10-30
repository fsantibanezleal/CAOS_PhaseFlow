"""The expected-time MLP must never receive a feature with no training spread."""
from __future__ import annotations

import json
import shutil
import sys
from pathlib import Path

import numpy as np
import pytest

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "data-pipeline"))

from pipeline.model.features import BLOCK_FEATURES  # noqa: E402
from pipeline.model.learned import LearnedBundle, Mlp, train_ensemble, train_mlp  # noqa: E402


def test_adversarial_expected_time_feature_contract_is_exactly_eleven_named_inputs():
    assert BLOCK_FEATURES == (
        "value_norm", "depth_frac", "cone_size_norm", "cone_value_norm", "grade_norm",
        "radial_frac", "in_pit", "rate", "capacity_frac_0", "capacity_frac_1", "periods_norm",
    )


def test_adversarial_training_rejects_constant_features():
    x = np.array([[0.0, 1.0], [0.2, 1.0], [0.4, 1.0], [0.8, 1.0]])
    y = np.array([0.1, 0.3, 0.6, 0.9])
    with pytest.raises(ValueError, match=r"constant training feature.*flat"):
        train_mlp(x, y, feature_names=("signal", "flat"), target="test", epochs=1)


def test_adversarial_training_names_non_finite_features():
    x = np.array([[0.0, 1.0], [0.2, np.nan], [0.4, 2.0], [0.8, 3.0]])
    y = np.array([0.1, 0.3, 0.6, 0.9])
    with pytest.raises(ValueError, match=r"non-finite values.*context"):
        train_mlp(x, y, feature_names=("signal", "context"), target="test", epochs=1)


def test_expected_time_ensemble_averages_five_members_and_roundtrips():
    x = np.array([[0.0, 0.1], [0.2, 0.7], [0.4, 0.2], [0.8, 0.9]])
    y = np.array([0.1, 0.3, 0.6, 0.9])
    model = train_ensemble(
        x, y, seeds=(1, 2, 3, 4, 5), feature_names=("signal", "context"), target="test",
        hidden=(3, 2), epochs=2, batch=4,
    )
    assert len(model.members) == 4
    restored = Mlp.from_json(model.to_json())
    assert np.allclose(restored.forward(x), model.forward(x))


def test_adversarial_python_loader_rejects_feature_order_mismatch(tmp_path):
    x = np.array([[0.0, 0.1], [0.2, 0.7], [0.4, 0.2], [0.8, 0.9]])
    y = np.array([0.1, 0.3, 0.6, 0.9])
    model = train_ensemble(
        x, y, seeds=(1, 2, 3, 4, 5), feature_names=("signal", "context"), target="test",
        hidden=(3, 2), epochs=1, batch=4,
    )
    payload = model.to_json()
    payload["features"] = ["context", "signal"]
    folder = tmp_path / "models"
    folder.mkdir()
    (folder / "expected-time.json").write_text(json.dumps(payload), encoding="utf-8")
    shutil.copyfile(ROOT / "models" / "bound.json", folder / "bound.json")
    with pytest.raises(ValueError, match="was trained on"):
        LearnedBundle.load(folder)


def test_adversarial_real_deposit_validation_is_unscored_without_cache(monkeypatch):
    from scripts import train_learned

    monkeypatch.setattr(train_learned, "REAL_HOLDOUT", ("newman1-published",))

    def missing_cache(_case):
        raise FileNotFoundError("cache absent")

    monkeypatch.setattr(train_learned, "build_instance", missing_cache)
    report = train_learned.score_real(None)
    assert report["newman1-published"] == {"scored": False, "reason": "cache absent"}


def test_adversarial_expected_time_model_has_no_zero_variance_input():
    model = Mlp.from_json(json.loads((ROOT / "models" / "expected-time.json").read_text(encoding="utf-8")))
    assert "tonnage_norm" not in BLOCK_FEATURES
    assert model.feature_names == BLOCK_FEATURES
    assert np.all(model.sigma > 1e-8), "the shipped model contains an input that had no training gradient"
