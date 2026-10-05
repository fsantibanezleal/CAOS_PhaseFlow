#!/usr/bin/env python3
"""Measure the SHIPPED learned guard on a THIRD, never-seen seed set.

    .venv/Scripts/python.exe scripts/validate_guard.py

Why this script exists, and why it is separate from training.

`train_learned.py` reads a candidate rule off the training deposits and measures it on the held-out
ones. That is the right discipline for DISCOVERING a rule, and it is not enough for REPORTING one,
because the held-out set did two jobs at once: it refuted the archetype rule, and it therefore also
motivated choosing the rule that shipped. Numbers from a set that influenced the choice are optimistic
and the docs said so.

So: a third seed set, disjoint from both, and NO choosing here. The rule is read from the trained
model's own metrics and applied. Nothing in this file is allowed to pick a threshold, compare
candidates, or tune anything; it computes one confusion matrix and writes it down. If the numbers come
out worse than the held-out ones, that is the answer and it goes on the page.

The result is committed as `models/guard-validation.json` and quoted in
`docs/methodologies/08_when-the-surrogate-fails.md`.
"""

from __future__ import annotations

import json
import sys
import time
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "data-pipeline"))


from pipeline.model.learned import LearnedBundle, json_safe  # noqa: E402

sys.path.insert(0, str(ROOT / "scripts"))
from train_learned import (  # noqa: E402
    ARCHETYPES,
    HOLDOUT_SEEDS,
    SCENARIOS,
    SIZES,
    TRAIN_SEEDS,
    collect,
    score_cases,
)

MODELS = ROOT / "models"

#: A third disjoint set. Primes, like the other two, and chosen once: re-rolling these until the
#: numbers improve would put this script back in the business the whole file exists to avoid.
VALIDATION_SEEDS = [241, 251, 257, 263, 269, 271]


def main() -> int:
    overlap = set(VALIDATION_SEEDS) & (set(TRAIN_SEEDS) | set(HOLDOUT_SEEDS))
    assert not overlap, f"the validation seeds are not new: {sorted(overlap)}"

    bundle = LearnedBundle.load(MODELS)
    metrics = bundle.expected_time.metrics
    failure_below = float(metrics["failure_below"])
    rule = str(metrics["failure_rule"])
    print(f"shipped rule: {rule}, failure below {failure_below}")

    def flagged(archetype: str, rate: float) -> bool:
        """Apply whatever rule shipped. It has been a scenario rule and is now an orebody rule, and
        a validator that hardcodes one of them stops validating the moment the study moves."""
        if rule == "no rule":
            return False
        if rule.startswith("archetype =="):
            return archetype == rule.split("==", 1)[1].strip()
        if rule.startswith("archetype in"):
            return archetype in rule
        if "discount rate >=" in rule:
            return rate >= float(rule.split(">=", 1)[1].split(",")[0])
        raise ValueError(f"the validator does not know how to apply {rule!r}")
    print(f"held out: precision {metrics.get('failure_rule_precision')}, "
          f"recall {metrics.get('failure_rule_recall')}")
    n_cases = len(VALIDATION_SEEDS) * len(ARCHETYPES) * len(SCENARIOS) * len(SIZES)
    print(f"\nvalidating on {len(VALIDATION_SEEDS)} fresh seeds x {len(ARCHETYPES)} archetypes "
          f"x {len(SCENARIOS)} scenarios x {len(SIZES)} sizes = {n_cases} cases")

    t0 = time.time()
    data = collect(VALIDATION_SEEDS)
    scored = score_cases(bundle.expected_time, data)
    rows = []
    for r in scored:
        ratio = r["vs_true"]
        rows.append({
            "case": r["case"],
            "seed": r["seed"],
            "archetype": r["archetype"],
            "n_blocks": r["n_blocks"],
            "periods": r["periods"],
            "rate": r["rate"],
            "vs_true": ratio,
            "failed": bool(ratio < failure_below),
            "flagged": flagged(r["archetype"], r["rate"]),
        })
    print(f"\ncollected and scored in {time.time() - t0:.0f}s")

    tp = sum(1 for r in rows if r["flagged"] and r["failed"])
    fp = sum(1 for r in rows if r["flagged"] and not r["failed"])
    fn = sum(1 for r in rows if not r["flagged"] and r["failed"])
    tn = sum(1 for r in rows if not r["flagged"] and not r["failed"])
    unflagged = [r["vs_true"] for r in rows if not r["flagged"]]

    out = {
        "purpose": (
            "a THIRD disjoint seed set, used only to measure the rule that already shipped. No "
            "threshold is chosen here: the held-out set that refuted the archetype rule also "
            "motivated the rule that replaced it, so its numbers are optimistic by construction."
        ),
        "rule": rule,
        "failure_below": failure_below,
        "validation_seeds": VALIDATION_SEEDS,
        "train_seeds": TRAIN_SEEDS,
        "holdout_seeds": HOLDOUT_SEEDS,
        "n": len(rows),
        "failures": tp + fn,
        "flagged": tp + fp,
        "true_positive": tp,
        "false_positive": fp,
        "false_negative": fn,
        "true_negative": tn,
        "precision": (tp / (tp + fp)) if tp + fp else None,
        "recall": (tp / (tp + fn)) if tp + fn else None,
        "worst_unflagged": float(min(unflagged)) if unflagged else None,
        "worst_overall": float(min(r["vs_true"] for r in rows)),
        "median": float(np.median([r["vs_true"] for r in rows])),
        "median_by_size": {
            str(n): float(np.median([r["vs_true"] for r in rows if r["n_blocks"] == n]))
            for n in sorted({r["n_blocks"] for r in rows})
        },
        "p10": float(np.quantile([r["vs_true"] for r in rows], 0.10)),
        "holdout_for_comparison": {
            "precision": metrics.get("failure_rule_precision"),
            "recall": metrics.get("failure_rule_recall"),
            "worst_unflagged": metrics.get("failure_rule_worst_unflagged"),
        },
        "rows": rows,
    }
    (MODELS / "guard-validation.json").write_text(
        json.dumps(json_safe(out), indent=1, allow_nan=False), encoding="utf-8", newline="\n"
    )

    print("\nTHIRD SPLIT, the clean measurement")
    print(f"  cases              {out['n']}")
    print(f"  failures           {out['failures']}")
    print(f"  flagged            {out['flagged']}")
    print(f"  precision          {out['precision']}")
    print(f"  recall             {out['recall']}")
    print(f"  worst UNflagged    {out['worst_unflagged']}")
    print(f"  worst overall      {out['worst_overall']:.4f}")
    print(f"  median             {out['median']:.4f}   P10 {out['p10']:.4f}")
    print(f"\n  held out, for comparison: precision {out['holdout_for_comparison']['precision']}, "
          f"recall {out['holdout_for_comparison']['recall']}, "
          f"worst unflagged {out['holdout_for_comparison']['worst_unflagged']}")
    print(f"\nwrote {MODELS / 'guard-validation.json'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
