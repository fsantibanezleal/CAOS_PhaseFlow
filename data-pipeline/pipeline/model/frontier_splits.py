"""Frozen, disjoint seed/family ledger for the approved frontier-policy experiment."""
from __future__ import annotations

import hashlib
import json

from .frontier_data import GENERATOR_VERSION
from .frontier_policy import validate_split_manifest


def build_split_manifest(product_case_ids: list[str]) -> dict:
    """Build the predeclared 1,000/200/500 development split without product-case access."""
    if not product_case_ids or len(set(product_case_ids)) != len(product_case_ids):
        raise ValueError("the declared product case list must be non-empty and unique")
    train = [
        {"seed": 100_000 + i, "family": "benched" if i < 500 else "branching",
         "size": 32 + (i * 4064 // 999), "generator_version": GENERATOR_VERSION}
        for i in range(1000)
    ]
    validation = [
        {"seed": 200_000 + i, "family": "crosscut",
         "size": 32 + (i * 4064 // 199), "generator_version": GENERATOR_VERSION}
        for i in range(200)
    ]
    test = [
        {"seed": 300_000 + i, "family": "funnel",
         "size": 32 + (i * 8160 // 499), "generator_version": GENERATOR_VERSION}
        for i in range(500)
    ]
    manifest = {
        "schema_version": "1.0.0", "generator_version": GENERATOR_VERSION,
        "train": train, "validation": validation, "test": test,
        "product_case_ids": sorted(product_case_ids),
        "size_contract": {"train": [32, 4096], "validation": [32, 4096], "test": [32, 8192]},
        "family_contract": {"train": ["benched", "branching"],
                            "validation": ["crosscut"], "test": ["funnel"]},
    }
    validate_split_manifest(manifest)
    for split in ("train", "validation", "test"):
        bounds = manifest["size_contract"][split]
        if any(row.get("generator_version") != GENERATOR_VERSION
               or not isinstance(row.get("size"), int)
               or not bounds[0] <= row["size"] <= bounds[1]
               or row.get("family") not in manifest["family_contract"][split]
               for row in manifest[split]):
            raise ValueError(f"{split} rows violate the frozen generator, family or size contract")
    return manifest


def manifest_sha256(manifest: dict) -> str:
    payload = json.dumps(manifest, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


if __name__ == "__main__":
    raise SystemExit("Use scripts/build_frontier_split_manifest.py with the committed case manifest.")
