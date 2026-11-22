"""Resolve model candidates without allowing scripts to write into the checkout."""
from __future__ import annotations

import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def external_model_root() -> Path:
    value = os.environ.get("CAOS_MODELS_ROOT", "").strip()
    if not value:
        raise SystemExit("Set CAOS_MODELS_ROOT to an external model candidate directory.")
    path = Path(value).expanduser().resolve()
    if path.is_relative_to(ROOT):
        raise SystemExit("CAOS_MODELS_ROOT must resolve outside the product repository.")
    if not path.is_dir():
        raise SystemExit(f"CAOS_MODELS_ROOT is not an existing model candidate directory: {path}")
    return path
