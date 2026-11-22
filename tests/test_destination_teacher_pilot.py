import json
from pathlib import Path

from scripts.pilot_destination_teacher import MAX_VARIABLES, TIME_LIMIT_SECONDS

ROOT = Path(__file__).resolve().parents[1]


def test_adversarial_teacher_receipt_refuses_uncertified_over_budget_pilot():
    receipt = json.loads(
        (ROOT / "docs/design/features/learned-destination/teacher-pilot.json").read_text(encoding="utf-8")
    )
    assert receipt["oreblocks_version"] == "0.6.4"
    assert receipt["variable_budget"] == MAX_VARIABLES == 40_000
    assert receipt["time_limit_seconds"] == TIME_LIMIT_SECONDS == 60.0
    assert {row["archetype"] for row in receipt["rows"]} == {"porphyry", "vein", "layered", "core_halo"}
    assert all(row["variables"] <= MAX_VARIABLES for row in receipt["rows"])
    assert all(not row["certified_optimal"] for row in receipt["rows"])
    assert all(not row["feasible_schedule"] or row["incumbent_npv"] == 0 for row in receipt["rows"])
    assert not receipt["all_optimal"]
    assert not receipt["all_within_time_budget"]
