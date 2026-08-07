#!/usr/bin/env python3
"""Fetch a MineLib instance into the local, git-ignored cache.

MineLib (Espinoza, Goycoolea, Moreno and Newman, Annals of Operations Research 206(1):93-114, 2013,
doi:10.1007/s10479-012-1258-3) grants an ACADEMIC DOWNLOAD. It does not grant redistribution, so:

- instances land under ``data/raw/minelib/`` which is git-ignored;
- only AGGREGATE results for a MineLib case are ever committed, never per-block data;
- this script downloads, it does not vendor.

The canonical site (mansci-web.uai.cl/minelib) has an expired TLS certificate and sits behind a web
application firewall that rejects programmatic clients, measured 2026-08-06. The mirrors below are
public GitHub repositories that carry the same files. Exactly one instance, ``newman1``, is mirrored
WITH its ``.cpit`` and ``.pcpsp`` scheduling model files; the others are ultimate-pit data only, which
is why PhaseFlow declares a scenario for them and says so on screen.

    python scripts/fetch_minelib.py newman1
    python scripts/fetch_minelib.py --all
"""
from __future__ import annotations

import argparse
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / "data" / "raw" / "minelib"

AMPL = "https://raw.githubusercontent.com/ampl/colab.ampl.com/master/authors/eduardosalaz/minelib/data"
WHATTLE = "https://raw.githubusercontent.com/qarth/whattle/master/test/minelib"

SOURCES: dict[str, tuple[str, tuple[str, ...]]] = {
    "newman1": (AMPL, ("blocks", "prec", "upit", "cpit", "pcpsp")),
    "zuck_small": (WHATTLE, ("blocks", "prec", "upit")),
    "kd": (WHATTLE, ("blocks", "prec", "upit")),
}


def fetch(instance: str) -> int:
    if instance not in SOURCES:
        print(f"unknown instance {instance!r}; known: {sorted(SOURCES)}", file=sys.stderr)
        return 2
    base, exts = SOURCES[instance]
    out = CACHE / instance
    out.mkdir(parents=True, exist_ok=True)
    for ext in exts:
        url = f"{base}/{instance}/{instance}.{ext}"
        dest = out / f"{instance}.{ext}"
        if dest.exists():
            print(f"  have {dest.name} ({dest.stat().st_size:,} bytes)")
            continue
        print(f"  get  {url}")
        with urllib.request.urlopen(url, timeout=180) as r:  # noqa: S310 (pinned https mirrors)
            dest.write_bytes(r.read())
        print(f"       -> {dest} ({dest.stat().st_size:,} bytes)")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(prog="fetch_minelib")
    ap.add_argument("instance", nargs="?", help="newman1 | zuck_small | kd")
    ap.add_argument("--all", action="store_true")
    args = ap.parse_args()
    if args.all:
        rc = 0
        for name in SOURCES:
            print(f"{name}:")
            rc |= fetch(name)
        return rc
    if not args.instance:
        ap.error("give an instance or --all")
    print(f"{args.instance}:")
    return fetch(args.instance)


if __name__ == "__main__":
    raise SystemExit(main())
