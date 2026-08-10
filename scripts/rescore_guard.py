#!/usr/bin/env python3
"""Re-run the failure-mode study on the rows already recorded, without re-solving anything.

    .venv/Scripts/python.exe scripts/rescore_guard.py

`train_learned.py` records every scored case, both splits, into `models/learned-failure-modes.json`.
Choosing which rule to ship is arithmetic over those rows, so it does not need the forty minutes of
LP relaxations that produced them. This script exists because the conclusion changed twice under
measurement and re-deriving it has to be cheap enough to actually do:

- with a five-scenario sweep that ran rate and capacity together at a correlation of -0.735, the
  training failures were all `core_halo` and the held-out ones looked like they refuted that in
  favour of the discount rate;
- with a crossed nine-scenario sweep, the orebody is the signal on BOTH splits and the scenario rule
  falls to a recall of 0.44.

It rewrites the study, the shipped rule and the metrics the app reads. It never touches the weights.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))

from train_learned import FAILURE_BELOW, characterise_failures  # noqa: E402

MODELS = ROOT / "models"


def main() -> int:
    study_path = MODELS / "learned-failure-modes.json"
    old = json.loads(study_path.read_text(encoding="utf-8"))
    train_rows = old["train"]["rows"]
    holdout_rows = old["holdout"]["rows"]
    print(f"rescoring {len(train_rows)} training and {len(holdout_rows)} held-out cases")

    study = characterise_failures(train_rows, holdout_rows)
    study_path.write_text(json.dumps(study, indent=1), encoding="utf-8", newline="\n")

    shipped = study["rules"][study["shipped_rule"]]
    print(f"\nfailure line: below {100 * FAILURE_BELOW:.0f} percent of the exact plan")
    print(f"REFUTED / confirmed: {study['refuted']}\n")
    for name, rule in study["rules"].items():
        c = rule["holdout"]
        mark = "  <- SHIPPED" if name == study["shipped_rule"] else ""
        pr = "-" if c["precision"] is None else f"{c['precision']:.2f}"
        rc = "-" if c["recall"] is None else f"{c['recall']:.2f}"
        print(f"  {name:20s} {rule['statement']}{mark}")
        print(f"      held out: flags {c['flagged']:3d}/{study['holdout']['n']}, precision {pr}, "
              f"recall {rc}, worst UNflagged {c['worst_unflagged']:.4f}")

    # the metrics the app reads travel with the model
    for name in ("expected-time.json", "training-report.json"):
        f = MODELS / name
        d = json.loads(f.read_text(encoding="utf-8"))
        target = d.get("metrics", d)
        if "holdout_spearman" not in target and "expected_time" in d:
            target = d["expected_time"].get("metrics", d["expected_time"])
        target["failure_rule"] = shipped["statement"]
        target["failure_rule_precision"] = shipped["holdout"]["precision"]
        target["failure_rule_recall"] = shipped["holdout"]["recall"]
        target["failure_rule_worst_unflagged"] = shipped["holdout"]["worst_unflagged"]
        target["failure_rule_flagged_share"] = shipped["holdout"]["flagged"] / study["holdout"]["n"]
        target["refuted"] = study["refuted"]
        f.write_text(json.dumps(d, indent=1) + "\n", encoding="utf-8", newline="\n")
        print(f"\nupdated {name}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
