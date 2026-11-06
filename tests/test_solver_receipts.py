import json
from pathlib import Path
import sys

from jsonschema import Draft202012Validator

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "data-pipeline"))
from pipeline.core.solver_receipts import reported_node_count


def test_unknown_solver_node_count_is_null_and_negative_sentinel_is_rejected():
    schema = json.loads((ROOT / "docs/contracts/schemas/trace.schema.json").read_text(encoding="utf-8"))
    neighborhood = {
        "round": 1, "backend": "highspy", "status": "error: MemoryError", "seconds": 1.0,
        "nodes": None, "usedStart": True, "improved": False, "certifiedOptimal": False,
    }
    validator = Draft202012Validator(schema["$defs"]["neighborhoodReceipt"])
    assert not list(validator.iter_errors(neighborhood))
    assert list(validator.iter_errors({**neighborhood, "nodes": -1}))
    assert reported_node_count(-1) is None
    assert reported_node_count(0) == 0
    assert reported_node_count(43) == 43

