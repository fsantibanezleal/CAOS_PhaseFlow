#!/usr/bin/env python3
"""Re-export and re-verify the committed ONNX graphs from the committed JSON weights. No training.

`export_onnx` folds the standardisation into the graph, runs it under onnxruntime and compares it with
the numpy forward pass before writing; the comparison result is `onnx_parity_max_abs_err` in the model
file. Run this after a change to the export or its check, so the committed graphs and the recorded
parity error describe the committed weights, without the hours a retrain costs.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "data-pipeline"))

from pipeline.model.learned import Mlp, export_onnx  # noqa: E402

MODELS = ROOT / "models"


def main() -> int:
    for name in ("expected-time", "bound"):
        src = MODELS / f"{name}.json"
        model = Mlp.from_json(json.loads(src.read_text(encoding="utf-8")))
        export_onnx(model, MODELS / f"{name}.onnx")
        err = json.loads(src.read_text(encoding="utf-8"))["onnx_parity_max_abs_err"]
        print(f"{name}: ONNX parity max abs error {err}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
