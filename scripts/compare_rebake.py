#!/usr/bin/env python3
"""Compare a release bake with committed evidence without hiding scientific drift.

Only presentation metadata, the product stamp, byte counts, and measured wall times may
change silently. A changed NPV, bound, schedule, capacity, control, or lane fails the check.
This is a release check, not a substitute for ``check_artifacts.py`` on the candidate.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
from pathlib import Path


def _read(path: Path) -> tuple[dict, str]:
    data = path.read_bytes()
    return json.loads(data), hashlib.sha256(data).hexdigest()


def _allowed(kind: str, path: str, old: dict, new: dict) -> bool:
    parts = path.strip("/").split("/")
    if kind == "index":
        return path == "/engine_version" or (
            len(parts) == 4 and parts[0] == "cases" and parts[2] == "title" and parts[3] in {"en", "es"}
        )
    if kind == "manifest":
        note = r"offline solve took \d+ ms, above the 60000 ms note"
        if path == "/gate/reasons":
            return all(
                re.fullmatch(note, reason)
                for reasons in (old["gate"]["reasons"], new["gate"]["reasons"])
                for reason in reasons
            )
        if len(parts) == 3 and parts[:2] == ["gate", "reasons"]:
            previous = old["gate"]["reasons"][int(parts[2])]
            current = new["gate"]["reasons"][int(parts[2])]
            return bool(re.fullmatch(note, previous) and re.fullmatch(note, current))
        return (
            path in {"/engine/version", "/gate/offline_ms", "/gate/trace_bytes", "/artifact/bytes"}
            or len(parts) == 3 and parts[0] == "scoreboard" and parts[2] == "runtime_ms"
        )
    if kind == "trace":
        return (
            len(parts) == 2 and parts[0] in {"title", "role"} and parts[1] in {"en", "es"}
            or path in {"/bound/algorithm4_ms", "/bound/joint_ms"}
            or len(parts) == 3 and parts[0] == "methods" and parts[2] == "runtimeMs"
        )
    raise ValueError(kind)


def _changes(old: object, new: object, path: str = "") -> list[str]:
    if type(old) is not type(new):
        return [path or "/"]
    if isinstance(old, dict):
        keys = set(old) | set(new)
        return [
            changed
            for key in sorted(keys)
            for changed in (
                [f"{path}/{key}"] if key not in old or key not in new
                else _changes(old[key], new[key], f"{path}/{key}")
            )
        ]
    if isinstance(old, list):
        if len(old) != len(new):
            return [path or "/"]
        return [changed for i, (a, b) in enumerate(zip(old, new, strict=True))
                for changed in _changes(a, b, f"{path}/{i}")]
    return [] if old == new else [path or "/"]


def compare(baseline: Path, candidate: Path) -> dict:
    baseline = baseline.resolve()
    candidate = candidate.resolve()
    old_index, _ = _read(baseline / "manifests/index.json")
    new_index, _ = _read(candidate / "manifests/index.json")
    old_ids = {entry["case_id"] for entry in old_index["cases"]}
    new_ids = {entry["case_id"] for entry in new_index["cases"]}
    if old_ids != new_ids:
        raise ValueError(f"case sets differ: baseline={sorted(old_ids)}, candidate={sorted(new_ids)}")
    entries = [("index", "manifests/index.json")]
    for cid in sorted(old_ids):
        entries.extend([("manifest", f"manifests/{cid}.json"), ("trace", f"{cid}/trace.json")])
    files = []
    for kind, rel in entries:
        old, old_hash = _read(baseline / rel)
        new, new_hash = _read(candidate / rel)
        changed = _changes(old, new)
        unexpected = [path for path in changed if not _allowed(kind, path, old, new)]
        files.append({
            "path": rel,
            "baseline_sha256": old_hash,
            "candidate_sha256": new_hash,
            "allowed_changes": [path for path in changed if path not in unexpected],
            "unexpected_changes": unexpected,
        })
    return {
        "schema": "phaseflow.rebake-comparison/v1",
        "case_count": len(old_ids),
        "scientific_outputs_unchanged": all(not row["unexpected_changes"] for row in files),
        "files": files,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("candidate", type=Path)
    parser.add_argument("--baseline", type=Path, default=Path("data/derived"))
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    report = compare(args.baseline, args.candidate)
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    for row in report["files"]:
        if row["unexpected_changes"]:
            print(f"FAIL {row['path']}: {', '.join(row['unexpected_changes'])}")
    if report["scientific_outputs_unchanged"]:
        changed = sum(bool(row["allowed_changes"]) for row in report["files"])
        print(f"{report['case_count']} cases, scientific outputs unchanged; {changed} files have allowed metadata or timing changes")
        return 0
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
