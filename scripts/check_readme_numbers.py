#!/usr/bin/env python3
"""The README's trust-anchor table must equal the committed artifact. And no control bytes anywhere.

Two things shipped that this catches.

The trust-anchor table went two releases stale. It quoted a bound of 24,487,410 when the bound in use
was 24,486,184, a best schedule of 23,873,589 when the best was 23,875,617, a gap of 2.51 percent when
it was 2.49, and a sentence saying the exact local search was NOT implemented while that rung was
number nine of twelve and the best method on that very case. The README is the first and often the
only surface a reader sees, and nothing compared it to anything.

And the PowerShell quickstart shipped with raw NUL, SOH and ETX bytes in it, because a script that
wrote the block had its backslash escapes collapsed on the way in: `\\00_install` arrived as a NUL
byte followed by `0_install`. Three commands that could not be run, in the block a Windows reader
starts from, invisible in every renderer.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
README = ROOT / "README.md"
ANCHOR_CASE = "newman1-published"

#: Everything below 0x20 that is not a tab or a newline. A README is text.
CONTROL = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f]")


def _money(v: float) -> str:
    return f"{round(v):,}"


def main() -> int:
    fail: list[str] = []
    text = README.read_text(encoding="utf-8")

    for m in CONTROL.finditer(text):
        line = text[: m.start()].count("\n") + 1
        fail.append(f"README.md:{line}: control byte U+{ord(m.group()):04X} in a text file")

    manifest = json.loads(
        (ROOT / "data" / "derived" / "manifests" / f"{ANCHOR_CASE}.json").read_text(encoding="utf-8")
    )
    trace = json.loads(
        (ROOT / "data" / "derived" / ANCHOR_CASE / "trace.json").read_text(encoding="utf-8")
    )
    best_name = manifest["best"]["method"]
    best = next(m for m in trace["methods"] if m["method"] == best_name)
    bound = trace["bound"]["joint"] or trace["bound"]["algorithm4"]
    published = trace["published"]

    expected = {
        "ultimate pit": _money(trace["instance"]["upitValue"]),
        "certified bound": _money(bound),
        "best feasible": _money(best["npv"]),
        "gap": f"{best['gapPct']:.2f}%",
        "published bound": _money(published["lp_bound"]),
        "published best": _money(published["best_known"]),
        "published gap": f"{published['best_known_gap_pct']:.2f}%",
        "best method": best_name,
    }
    for what, value in expected.items():
        if value not in text:
            fail.append(f"README.md: the {what} is {value} in the artifact and does not appear")

    # the claim that outlived its own release
    for dead in ("no exact local search", "not implementing the `C-PIT[D]`"):
        if dead in text:
            fail.append(f"README.md: still says {dead!r}, and that rung ships as {best_name}")

    if fail:
        for f in fail:
            print(f"::error::{f}", file=sys.stderr)
        return 1
    print(
        f"README numbers OK: the trust-anchor table matches {ANCHOR_CASE} "
        f"(best {best_name} at {expected['gap']}), no control bytes"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
