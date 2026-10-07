#!/usr/bin/env python3
"""Write the parity fixture that holds the browser's surrogates to the trained Python models.

The browser evaluates both learned models with its own forward pass and, for the expected-time model,
its own feature builder. Without a fixture computed by the Python side, "the browser runs the trained
model" is a claim nobody checks: in 0.07.006 the bound surrogate ran tanh hidden layers and a linear
head in the browser while the model was trained with ReLU and a sigmoid, and the sensitivity surface
drew ratios from -1.6 to 1.7 where the model gives 0.2 to 0.9.

Output: ``models/surrogate-parity.json`` with
- ``bound``: seeded deposit-feature vectors around the training mean and the Python outputs;
- ``expectedTime``: the same for block-feature vectors;
- ``features``: for one committed twin case, the block features Python computes from the trace's own
  arrays, so the browser's feature builder is checked against the definition, not against itself.

Run after training (``scripts/train_learned.py``) or after a rebake of the fixture case. It reads
committed files only and writes one file.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "data-pipeline"))

import oreblocks as ob  # noqa: E402

from pipeline.io.schema import Scenario  # noqa: E402
from pipeline.model.features import block_feature_matrix  # noqa: E402
from pipeline.model.learned import Mlp  # noqa: E402

FIXTURE_CASE = "twin-porphyry-s"


def _samples(model: Mlp, n: int, seed: int) -> list[list[float]]:
    rng = np.random.default_rng(seed)
    x = model.mu + rng.normal(size=(n, model.mu.shape[0])) * np.where(model.sigma > 1e-8, model.sigma, 1.0)
    return x.tolist()


def main() -> int:
    models = ROOT / "models"
    bound = Mlp.from_json(json.loads((models / "bound.json").read_text(encoding="utf-8")))
    etime = Mlp.from_json(json.loads((models / "expected-time.json").read_text(encoding="utf-8")))

    xb = _samples(bound, 64, 5)
    xe = _samples(etime, 64, 6)

    trace = json.loads((ROOT / "data" / "derived" / FIXTURE_CASE / "trace.json").read_text(encoding="utf-8"))
    blk = trace["blocks"]
    dims = tuple(trace["instance"]["dims"])
    grid = ob.BlockGrid(*dims)
    prec = ob.build_precedence(grid, float(trace["scenario"].get("slopeDeg", 45.0)))
    res = trace["scenario"]["resources"]
    value = np.asarray(blk["value"], dtype=np.float64)
    in_pit = np.asarray(blk["inPit"], dtype=bool)
    tonnage = np.asarray(blk["tonnage"], dtype=np.float64)
    process = np.asarray(blk["processTonnage"], dtype=np.float64)
    coefs = [tonnage, process]
    fracs = []
    for r, resource in enumerate(res):
        per_period = float(coefs[r][in_pit].sum()) / trace["scenario"]["periods"]
        fracs.append(float(np.mean(resource["limitPerPeriod"])) / per_period)
    sc = Scenario(periods=int(trace["scenario"]["periods"]), discount_rate=float(trace["scenario"]["discountRate"]),
                  capacity_fraction=tuple(fracs), resource_names=tuple(r["name"] for r in res))
    feats = block_feature_matrix(
        values=value, tonnage=tonnage, grade=np.asarray(blk["grade"], dtype=np.float64),
        level=np.asarray(blk["level"]), x=np.asarray(blk["x"]), y=np.asarray(blk["y"]),
        in_pit=in_pit, prec=prec, scenario=sc, dims=dims,
    ).astype(np.float64)
    rows = np.linspace(0, feats.shape[0] - 1, 48).astype(int)

    out = {
        "schema": "phaseflow.surrogate-parity/v1",
        "note": "computed by scripts/export_surrogate_parity.py from the committed models and trace",
        "bound": {"x": xb, "y": bound.forward(np.asarray(xb)).reshape(-1).tolist()},
        "expectedTime": {"x": xe, "y": etime.forward(np.asarray(xe)).reshape(-1).tolist()},
        "features": {
            "case": FIXTURE_CASE,
            "capacityFraction": fracs,
            "rows": rows.tolist(),
            "values": feats[rows].tolist(),
            "prediction": etime.forward(feats[rows]).reshape(-1).tolist(),
        },
    }
    path = models / "surrogate-parity.json"
    path.write_text(json.dumps(out, indent=1) + "\n", encoding="utf-8", newline="\n")
    print(f"wrote {path.relative_to(ROOT)}: 64 bound, 64 expected-time, {rows.size} feature rows of {FIXTURE_CASE}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
