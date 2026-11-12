"""Build or verify a prospectively frozen independent frontier-policy test sample."""
from __future__ import annotations

import argparse
import copy
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "data-pipeline"))

from pipeline.model.frontier_policy import validate_split_manifest  # noqa: E402
from pipeline.model.frontier_splits import build_split_manifest, manifest_sha256  # noqa: E402

INDEX = ROOT / "data/derived/manifests/index.json"
ORIGINAL = ROOT / "docs/design/features/learned-frontier/split-manifest.json"
OUTPUT = ROOT / "docs/design/features/learned-frontier/test-split-recovery-02.json"
SEED_START = 600_000
SCHEMA = "phaseflow.frontier-test-recovery/v1"


def build_recovery_payload(original_payload: dict) -> dict:
    """Keep the frozen development partitions and test design, replacing only consumed test seeds."""
    if not isinstance(original_payload, dict) or set(original_payload) != {"sha256", "manifest"}:
        raise ValueError("the original split file must contain only its digest and manifest")
    original = original_payload["manifest"]
    original_digest = manifest_sha256(original)
    if original_payload["sha256"] != original_digest:
        raise ValueError("the original frozen split digest does not match its manifest")
    validate_split_manifest(original)
    if len(original["test"]) != 500:
        raise ValueError("the approved test design must contain exactly 500 cases")

    recovery = copy.deepcopy(original)
    for index, row in enumerate(recovery["test"]):
        row["seed"] = SEED_START + index
    validate_split_manifest(recovery)

    original_test = original["test"]
    recovery_test = recovery["test"]
    if any(
        (new["family"], new["size"], new["generator_version"])
        != (old["family"], old["size"], old["generator_version"])
        for old, new in zip(original_test, recovery_test, strict=True)
    ):
        raise ValueError("the recovery test sample must preserve each predeclared family and size")
    if recovery["train"] != original["train"] or recovery["validation"] != original["validation"]:
        raise ValueError("the recovery sample may not alter the frozen training or validation partitions")
    old_test_seeds = {row["seed"] for row in original_test}
    new_test_seeds = {row["seed"] for row in recovery_test}
    if old_test_seeds & new_test_seeds:
        raise ValueError("the recovery test sample overlaps the consumed test sample")

    recovery_digest = manifest_sha256(recovery)
    return {
        "schema": SCHEMA,
        "replaces_consumed_test_split_sha256": original_digest,
        "training_split_sha256": original_digest,
        "test_split_sha256": recovery_digest,
        "seed_start": SEED_START,
        "seed_end_inclusive": SEED_START + len(recovery_test) - 1,
        "manifest": recovery,
    }


def expected_payload() -> dict:
    if not INDEX.is_file() or not ORIGINAL.is_file():
        raise ValueError("the committed product index and original split manifest are required")
    index = json.loads(INDEX.read_text(encoding="utf-8"))
    case_ids = [row["case_id"] for row in index["cases"]]
    expected_original = build_split_manifest(case_ids)
    original_payload = {"sha256": manifest_sha256(expected_original), "manifest": expected_original}
    if json.loads(ORIGINAL.read_text(encoding="utf-8")) != original_payload:
        raise ValueError("the original split manifest differs from the approved product index or generator")
    return build_recovery_payload(original_payload)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="verify the committed recovery split")
    args = parser.parse_args()
    payload = expected_payload()
    rendered = json.dumps(payload, ensure_ascii=False, sort_keys=True, indent=2) + "\n"
    if args.check:
        if not OUTPUT.is_file() or OUTPUT.read_text(encoding="utf-8") != rendered:
            raise SystemExit("frontier recovery split differs from the frozen test design")
        print(f"frontier recovery split verified: {payload['test_split_sha256']}")
    else:
        OUTPUT.parent.mkdir(parents=True, exist_ok=True)
        OUTPUT.write_text(rendered, encoding="utf-8")
        print(f"wrote {OUTPUT.relative_to(ROOT)} sha256={payload['test_split_sha256']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
