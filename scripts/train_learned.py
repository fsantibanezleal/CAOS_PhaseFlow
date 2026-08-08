#!/usr/bin/env python3
"""Train the two learned methods, evaluate them on HELD-OUT deposits, and export verified ONNX.

    .venv-precompute/Scripts/python.exe scripts/train_learned.py

This is a precompute-lane script. It is never run by CI and never by the deploy: it writes
``models/*.onnx`` and ``models/*.json``, which are committed, and the deploy serves them as-is.

**The split is by DEPOSIT SEED, not by row.** Two scenarios of the same deposit share almost all of
their block-level features, so a row-wise split would let the model memorise the deposit and score
itself on a copy. The train and holdout seed sets are disjoint and the assertion that they are is in
the script rather than in a comment.

**What is measured, and why those metrics.**

- For the expected-time surrogate, **Spearman rank correlation** against the true ``E_b``, because
  the surrogate is used as a SORT KEY: what matters is whether it puts the blocks in the right order,
  not whether it nails the value. Also reported: the NPV of the schedule it produces against the NPV
  of the schedule the true expected times produce, on held-out deposits, which is the only number
  that says whether the surrogate is useful.
- For the bound surrogate, **relative absolute error** against the exact certified bound, because it
  is used to draw a surface whose absolute level matters.
"""

from __future__ import annotations

import json
import sys
import time
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "data-pipeline"))

import oreblocks as ob  # noqa: E402

from pipeline.io.schema import Case, DepositSpec, Scenario  # noqa: E402
from pipeline.model.features import (  # noqa: E402
    BLOCK_FEATURES,
    DEPOSIT_FEATURES,
    block_feature_matrix,
    deposit_feature_vector,
)
from pipeline.model.instances import build_instance  # noqa: E402
from pipeline.model.learned import export_onnx, train_mlp  # noqa: E402

MODELS = ROOT / "models"

TRAIN_SEEDS = [101, 103, 107, 109, 113, 127, 131, 137, 139, 149, 151, 157]
HOLDOUT_SEEDS = [211, 223, 227, 229, 233, 239]
ARCHETYPES = ["porphyry", "vein", "layered", "core_halo"]
SCENARIOS = [
    (6, 0.08, (0.7, 0.45)),
    (8, 0.10, (0.8, 0.5)),
    (8, 0.15, (0.6, 0.4)),
    (10, 0.10, (0.9, 0.6)),
    (12, 0.20, (0.55, 0.35)),
]


def _case(seed: int, archetype: str, sc: tuple) -> Case:
    periods, rate, caps = sc
    return Case(
        id=f"train-{archetype}-{seed}-{periods}-{rate}",
        category="deposit",
        title_en="",
        title_es="",
        deposit=DepositSpec(kind="twin", archetype=archetype, dims=(12, 12, 7), seed=seed),
        scenario=Scenario(
            periods=periods,
            discount_rate=rate,
            capacity_fraction=caps,
            resource_names=("mining", "processing"),
        ),
    )


def collect(seeds: list[int]) -> dict:
    """Solve every (deposit, scenario) pair exactly and record features and targets."""
    xb, yb, xd, yd, meta = [], [], [], [], []
    for seed in seeds:
        for arch in ARCHETYPES:
            for sc in SCENARIOS:
                case = _case(seed, arch, sc)
                inst = build_instance(case)
                rel = ob.cpit_lp_relaxation(inst.cpit, inst.precedence)
                e_true = rel.expected_times()
                bound, _ = ob.cpit_bound_two_resources(inst.cpit, inst.precedence)

                xb.append(
                    block_feature_matrix(
                        values=inst.cpit.value,
                        tonnage=inst.tonnage,
                        grade=inst.grade,
                        level=inst.level,
                        x=inst.x,
                        y=inst.y,
                        in_pit=inst.upit_in_pit,
                        prec=inst.precedence,
                        scenario=case.scenario,
                        dims=inst.dims,
                    )
                )
                yb.append(e_true / (case.scenario.periods + 1))
                xd.append(
                    deposit_feature_vector(
                        values=inst.cpit.value,
                        tonnage=inst.tonnage,
                        grade=inst.grade,
                        in_pit=inst.upit_in_pit,
                        upit_value=inst.upit_value,
                        scenario=case.scenario,
                    )
                )
                yd.append(bound / max(1.0, inst.upit_value))
                meta.append({"seed": seed, "archetype": arch, "scenario": sc,
                             "instance": inst, "case": case, "e_true": e_true, "bound": bound,
                             "relaxation": rel})
                print(f"  {arch:10s} seed {seed:4d} T={sc[0]:2d} r={sc[1]:.2f} -> bound {bound:,.0f}", flush=True)
    return {
        "xb": np.concatenate(xb).astype(np.float64),
        "yb": np.concatenate(yb).astype(np.float64),
        "xd": np.stack(xd).astype(np.float64),
        "yd": np.array(yd, dtype=np.float64),
        "meta": meta,
    }


def spearman(a: np.ndarray, b: np.ndarray) -> float:
    ra = np.argsort(np.argsort(a)).astype(np.float64)
    rb = np.argsort(np.argsort(b)).astype(np.float64)
    return float(np.corrcoef(ra, rb)[0, 1])


def main() -> int:
    assert not (set(TRAIN_SEEDS) & set(HOLDOUT_SEEDS)), "the splits share a deposit seed"
    MODELS.mkdir(parents=True, exist_ok=True)

    print(f"collecting TRAIN ({len(TRAIN_SEEDS)} seeds x {len(ARCHETYPES)} archetypes x {len(SCENARIOS)} scenarios)")
    t0 = time.time()
    tr = collect(TRAIN_SEEDS)
    print(f"collecting HOLDOUT ({len(HOLDOUT_SEEDS)} disjoint seeds)")
    ho = collect(HOLDOUT_SEEDS)
    print(f"data collected in {time.time() - t0:.0f}s: {tr['xb'].shape[0]:,} block rows, {tr['xd'].shape[0]} deposit rows")

    # ---- model 1: expected extraction time
    m1 = train_mlp(tr["xb"], tr["yb"], feature_names=BLOCK_FEATURES, target="expected_time_fraction",
                   hidden=(48, 24), epochs=120, batch=2048, lr=4e-3, seed=17)
    pred = m1.forward(ho["xb"]).reshape(-1)
    rho = spearman(pred, ho["yb"])
    mae = float(np.abs(pred - ho["yb"]).mean())

    # the number that decides whether it is useful: does a schedule built from the SURROGATE reach
    # the NPV of a schedule built from the TRUE expected times, on deposits it never saw?
    ratios = []
    for m in ho["meta"]:
        inst, case = m["instance"], m["case"]
        x = block_feature_matrix(
            values=inst.cpit.value, tonnage=inst.tonnage, grade=inst.grade, level=inst.level,
            x=inst.x, y=inst.y, in_pit=inst.upit_in_pit, prec=inst.precedence,
            scenario=case.scenario, dims=inst.dims,
        )
        e_hat = m1.forward(x.astype(np.float64)).reshape(-1) * (case.scenario.periods + 1)
        s_hat = ob.toposort_schedule(inst.cpit, inst.precedence, weight=-e_hat, allowed=inst.upit_in_pit)
        s_true = ob.toposort_schedule(inst.cpit, inst.precedence, weight="expected",
                                      relaxation=m["relaxation"], allowed=inst.upit_in_pit)
        s_greedy = ob.toposort_schedule(inst.cpit, inst.precedence, weight="greedy", allowed=inst.upit_in_pit)
        ratios.append({
            "case": case.id,
            "learned_npv": float(s_hat.npv),
            "exact_exts_npv": float(s_true.npv),
            "greedy_npv": float(s_greedy.npv),
            "vs_true": s_hat.npv / max(1e-9, s_true.npv),
            # NOT a ratio: greedy can produce a near-zero NPV, and dividing by it yields a number in
            # the 1e14 range that means nothing and would still have looked like a triumph on a slide.
            "beats_greedy": bool(s_hat.npv > s_greedy.npv),
        })
    m1.metrics = {
        "holdout_spearman": rho,
        "holdout_mae_fraction": mae,
        "holdout_npv_vs_exact_exts_median": float(np.median([r["vs_true"] for r in ratios])),
        "holdout_npv_vs_exact_exts_mean": float(np.mean([r["vs_true"] for r in ratios])),
        "holdout_npv_vs_exact_exts_min": float(np.min([r["vs_true"] for r in ratios])),
        "holdout_npv_vs_exact_exts_p10": float(np.quantile([r["vs_true"] for r in ratios], 0.10)),
        # a RATE, not a ratio: greedy sometimes lands near zero NPV and the quotient explodes
        "holdout_beats_greedy_rate": float(np.mean([r["beats_greedy"] for r in ratios])),
        "holdout_worst_case": min(ratios, key=lambda r: r["vs_true"])["case"],
        "n_train_rows": int(tr["xb"].shape[0]),
        "n_holdout_rows": int(ho["xb"].shape[0]),
        "train_seeds": TRAIN_SEEDS,
        "holdout_seeds": HOLDOUT_SEEDS,
        "split": "by deposit seed, never by row",
    }
    export_onnx(m1, MODELS / "expected-time.onnx", sample=ho["xb"][:128])
    print(f"\nexpected-time surrogate: holdout Spearman {rho:.3f}, MAE {mae:.4f}")
    print(f"  NPV vs exact ExTS  median {m1.metrics['holdout_npv_vs_exact_exts_median']:.4f}"
          f"  P10 {m1.metrics['holdout_npv_vs_exact_exts_p10']:.4f}"
          f"  min {m1.metrics['holdout_npv_vs_exact_exts_min']:.4f} ({m1.metrics['holdout_worst_case']})")
    print(f"  beats greedy on   {100 * m1.metrics['holdout_beats_greedy_rate']:.0f}% of held-out cases")

    # ---- model 2: the bound surface
    m2 = train_mlp(tr["xd"], tr["yd"], feature_names=DEPOSIT_FEATURES, target="bound_over_upit",
                   hidden=(24, 12), epochs=3000, batch=64, lr=5e-3, seed=23)
    pred2 = m2.forward(ho["xd"]).reshape(-1)
    rel_err = np.abs(pred2 - ho["yd"]) / np.maximum(1e-9, ho["yd"])
    m2.metrics = {
        "holdout_mean_rel_err": float(rel_err.mean()),
        "holdout_p90_rel_err": float(np.quantile(rel_err, 0.9)),
        "holdout_max_rel_err": float(rel_err.max()),
        "n_train_rows": int(tr["xd"].shape[0]),
        "n_holdout_rows": int(ho["xd"].shape[0]),
        "train_seeds": TRAIN_SEEDS,
        "holdout_seeds": HOLDOUT_SEEDS,
        "split": "by deposit seed, never by row",
    }
    export_onnx(m2, MODELS / "bound.onnx", sample=ho["xd"])
    print(f"\nbound surrogate: holdout mean rel err {rel_err.mean():.4f}, p90 {np.quantile(rel_err, 0.9):.4f}")

    (MODELS / "training-report.json").write_text(
        json.dumps({
            "expected_time": m1.metrics,
            "expected_time_per_case": ratios,
            "bound": m2.metrics,
            "archetypes": ARCHETYPES,
            "scenarios": [{"periods": s[0], "rate": s[1], "capacity_fraction": list(s[2])} for s in SCENARIOS],
            "honesty": (
                "Neither model certifies anything. The certified bound always comes from the critical "
                "multiplier algorithm or from Bienstock-Zuckerberg; these are scored against the exact "
                "quantity they approximate, on deposits they never saw, split by deposit seed."
            ),
        }, indent=2) + "\n",
        encoding="utf-8", newline="\n",
    )
    print(f"\nwrote {MODELS}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
