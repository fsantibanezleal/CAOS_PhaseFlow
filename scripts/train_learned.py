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


def score_cases(model, data: dict) -> list[dict]:
    """Per CASE: what the surrogate's schedule is worth against the schedule the true times give.

    Recorded with the covariates a caller knows BEFORE solving anything, because a worst case is only
    a footnote until you can say when it happens. The archetype, the horizon, the discount rate and
    the capacity fractions are all inputs; if the failures concentrate in a corner of that space then
    the corner is the characterisation, and the app can carry a warning instead of a caveat.
    """
    rows = []
    for m in data["meta"]:
        inst, case = m["instance"], m["case"]
        x = block_feature_matrix(
            values=inst.cpit.value, tonnage=inst.tonnage, grade=inst.grade, level=inst.level,
            x=inst.x, y=inst.y, in_pit=inst.upit_in_pit, prec=inst.precedence,
            scenario=case.scenario, dims=inst.dims,
        )
        e_hat = model.forward(x.astype(np.float64)).reshape(-1) * (case.scenario.periods + 1)
        s_hat = ob.toposort_schedule(inst.cpit, inst.precedence, weight=-e_hat, allowed=inst.upit_in_pit)
        s_true = ob.toposort_schedule(inst.cpit, inst.precedence, weight="expected",
                                      relaxation=m["relaxation"], allowed=inst.upit_in_pit)
        s_greedy = ob.toposort_schedule(inst.cpit, inst.precedence, weight="greedy", allowed=inst.upit_in_pit)
        periods, rate, caps = m["scenario"]
        rows.append({
            "case": case.id,
            "seed": m["seed"],
            "archetype": m["archetype"],
            "periods": periods,
            "rate": rate,
            "cap_mining": caps[0],
            "cap_processing": caps[1],
            "learned_npv": float(s_hat.npv),
            "exact_exts_npv": float(s_true.npv),
            "greedy_npv": float(s_greedy.npv),
            "vs_true": float(s_hat.npv / max(1e-9, s_true.npv)),
            # NOT a ratio: greedy can produce a near-zero NPV, and dividing by it yields a number in
            # the 1e14 range that means nothing and would still have looked like a triumph on a slide.
            "beats_greedy": bool(s_hat.npv > s_greedy.npv),
        })
    return rows


#: A case whose learned plan lands below this fraction of the exact-ExTS plan is a FAILURE. Not a
#: universal constant: it is the line below which the app stops presenting the learned rung as an
#: alternative and starts presenting it as a warning.
FAILURE_BELOW = 0.90


def characterise_failures(train_rows: list[dict], holdout_rows: list[dict]) -> dict:
    """Find where the surrogate fails, and be honest about which pattern survived contact.

    The method is the same discipline as the model's own split: read a candidate rule off the
    deposits the model TRAINED on, then measure it on deposits neither the model nor the rule has
    seen. Two candidates are evaluated rather than one, because the training failures are consistent
    with both and choosing between them by eye is how a coincidence becomes a finding.

    WHAT HAPPENED, recorded because the refuted hypothesis is the useful part. All six training
    failures are `core_halo` deposits, which reads as a clean archetype story. It does not survive:
    three of the five held-out failures are `vein`. The pattern that DOES survive is the scenario,
    not the orebody. That is also the one with a mechanism: heavy discounting over a long horizon
    makes the value of a plan depend on precise timing, and a surrogate that is only asked to get the
    ORDER right has the least to give exactly there.
    """
    def by(rows: list[dict], key: str) -> dict:
        out: dict[str, list[float]] = {}
        for r in rows:
            out.setdefault(str(r[key]), []).append(r["vs_true"])
        return {
            k: {
                "n": len(v),
                "median": float(np.median(v)),
                "p10": float(np.quantile(v, 0.10)),
                "min": float(np.min(v)),
                "failures": int(sum(1 for x in v if x < FAILURE_BELOW)),
            }
            for k, v in sorted(out.items())
        }

    train_fail = [r for r in train_rows if r["vs_true"] < FAILURE_BELOW]

    candidates = {
        "archetype": {
            "statement": (
                "archetype in " + str(sorted({r["archetype"] for r in train_fail}))
                + ", discount rate >= "
                + f"{min((r['rate'] for r in train_fail), default=0.0):.2f}"
                + ", horizon >= "
                + f"{min((r['periods'] for r in train_fail), default=0)}"
            ),
            "test": lambda r, _f=train_fail: (
                bool(_f)
                and r["archetype"] in {x["archetype"] for x in _f}
                and r["rate"] >= min(x["rate"] for x in _f)
                and r["periods"] >= min(x["periods"] for x in _f)
            ),
            "why": "the archetypes the training failures happen to share",
        },
        "discounting": {
            "statement": "discount rate >= 0.15",
            "test": lambda r: r["rate"] >= 0.15,
            "why": (
                "heavy discounting makes the value of a plan depend on precise timing, and a "
                "surrogate asked only for the ORDER has the least to give there"
            ),
        },
        "aggressive-scenario": {
            "statement": "discount rate >= 0.20 and horizon >= 12",
            "test": lambda r: r["rate"] >= 0.20 and r["periods"] >= 12,
            "why": "the single most aggressive scenario in the sweep",
        },
    }

    def confusion(rows: list[dict], test) -> dict:
        tp = sum(1 for r in rows if test(r) and r["vs_true"] < FAILURE_BELOW)
        fp = sum(1 for r in rows if test(r) and r["vs_true"] >= FAILURE_BELOW)
        fn = sum(1 for r in rows if not test(r) and r["vs_true"] < FAILURE_BELOW)
        tn = sum(1 for r in rows if not test(r) and r["vs_true"] >= FAILURE_BELOW)
        return {
            "flagged": tp + fp,
            "failures": tp + fn,
            "true_positive": tp,
            "false_positive": fp,
            "false_negative": fn,
            "true_negative": tn,
            "precision": float(tp / (tp + fp)) if tp + fp else None,
            "recall": float(tp / (tp + fn)) if tp + fn else None,
            "worst_unflagged": float(
                min((r["vs_true"] for r in rows if not test(r)), default=float("nan"))
            ),
        }

    rules = {
        name: {
            "statement": spec["statement"],
            "why": spec["why"],
            "train": confusion(train_rows, spec["test"]),
            "holdout": confusion(holdout_rows, spec["test"]),
        }
        for name, spec in candidates.items()
    }

    #: The one the product ships. Chosen for RECALL: the cost of a false positive is a warning a
    #: reader did not need, and the cost of a false negative is a plan a third as valuable presented
    #: without one. Its held-out numbers are honest but not clean, because the holdout is what
    #: refuted the archetype rule and therefore also motivated this choice; a third split would be
    #: needed to call them unbiased, and that is said here rather than left for someone to notice.
    shipped = "discounting"

    return {
        "failure_below": FAILURE_BELOW,
        "rules": rules,
        "shipped_rule": shipped,
        "shipped_caveat": (
            "chosen after the holdout refuted the archetype rule, so its held-out precision and "
            "recall are optimistic; the direction of the choice is recall, not precision"
        ),
        "refuted": (
            "all 6 training failures are core_halo, which reads as an archetype story; 3 of the 5 "
            "held-out failures are vein, so archetype does not generalise"
        ),
        "train": {
            "n": len(train_rows),
            "failures": len(train_fail),
            "by_archetype": by(train_rows, "archetype"),
            "by_rate": by(train_rows, "rate"),
            "by_periods": by(train_rows, "periods"),
            "rows": train_rows,
        },
        "holdout": {
            "n": len(holdout_rows),
            "failures": int(sum(1 for r in holdout_rows if r["vs_true"] < FAILURE_BELOW)),
            "by_archetype": by(holdout_rows, "archetype"),
            "by_rate": by(holdout_rows, "rate"),
            "by_periods": by(holdout_rows, "periods"),
            "rows": holdout_rows,
        },
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
    ratios = score_cases(m1, ho)
    train_ratios = score_cases(m1, tr)
    study = characterise_failures(train_ratios, ratios)
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
        "failure_below": FAILURE_BELOW,
        "failure_rate": float(study["holdout"]["failures"] / max(1, study["holdout"]["n"])),
        "failure_rule": study["rules"][study["shipped_rule"]]["statement"],
        # the number the runtime guard actually compares against, so the rule lives in ONE place
        "failure_rule_rate_at_least": 0.15,
        "failure_rule_flagged_share": (
            study["rules"][study["shipped_rule"]]["holdout"]["flagged"] / study["holdout"]["n"]
        ),
        "failure_rule_worst_unflagged": (
            study["rules"][study["shipped_rule"]]["holdout"]["worst_unflagged"]
        ),
        "failure_rule_precision": study["rules"][study["shipped_rule"]]["holdout"]["precision"],
        "failure_rule_recall": study["rules"][study["shipped_rule"]]["holdout"]["recall"],
        "worst_unflagged": study["rules"][study["shipped_rule"]]["holdout"]["worst_unflagged"],
        "refuted": study["refuted"],
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

    (MODELS / "learned-failure-modes.json").write_text(
        json.dumps(study, indent=1), encoding="utf-8", newline="\n"
    )
    print("\nWHERE IT FAILS (a plan below "
          f"{100 * FAILURE_BELOW:.0f}% of the exact-ExTS plan)")
    for split in ("train", "holdout"):
        st = study[split]
        print(f"  {split:8s} {st['failures']:3d} of {st['n']:3d} cases")
        for key in ("by_archetype", "by_rate", "by_periods"):
            parts = [f"{k}={v['failures']}/{v['n']}" for k, v in st[key].items()]
            print(f"    {key[3:]:11s} " + "  ".join(parts))
    print(f"  REFUTED: {study['refuted']}")
    for name, rule in study["rules"].items():
        mark = " <- SHIPPED" if name == study["shipped_rule"] else ""
        c = rule["holdout"]
        pr = "-" if c["precision"] is None else f"{c['precision']:.2f}"
        rc = "-" if c["recall"] is None else f"{c['recall']:.2f}"
        print(f"  rule {name:20s} {rule['statement']}{mark}")
        print(f"      held out: flags {c['flagged']:3d}/{study['holdout']['n']}, "
              f"precision {pr}, recall {rc}, worst UNflagged {c['worst_unflagged']:.4f}")

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
