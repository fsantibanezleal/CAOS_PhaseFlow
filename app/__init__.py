"""DORMANT FastAPI backend (ADR-0057). Present but inactive: most products are static deterministic-replay and
never run this. Activate only on an ADR-0002 trigger. A thin read-only layer over data/derived, never a
re-implementation of the engine."""

from pathlib import Path

__version__ = (Path(__file__).resolve().parents[1] / "VERSION").read_text(encoding="utf-8").strip()
