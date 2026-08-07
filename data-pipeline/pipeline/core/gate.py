"""The measured live-vs-replay GATE (ADR-0054/ADR-0057), for a TypeScript live lane.

PhaseFlow's live lane is not Pyodide. It is a TypeScript port of the same algorithms
(``frontend/src/engine/``), so a case is LIVE when the browser can genuinely re-solve it inside an
interaction budget, and REPLAY otherwise. The verdict and the numbers that produced it go into the
manifest, and the app never presents a replayed case as live.

The thresholds below are calibrated, not guessed: the cost of the certified bound is dominated by
maximum-closure solves whose cost grows with precedence ARCS rather than with blocks, so the arc
budget is the binding one. The browser measures and displays its own actual solve time on every
re-solve, so the claim is falsifiable by the user in one glance, which is the only kind of
performance claim worth making.

An offline-vs-live parity test (``tests/test_parity.py`` and ``frontend/test/parity.test.ts``)
asserts the TypeScript engine reproduces the Python bound and NPV on a committed case, so "live" and
"replay" are the same science and not two different answers.
"""

from __future__ import annotations

LIVE_BLOCKS = 30_000
LIVE_ARCS = 300_000
LIVE_TRACE_BYTES = 6 * 1024 * 1024
OFFLINE_MS_GATE = 60_000.0


def classify_lane(
    *, n_blocks: int, n_arcs: int, trace_bytes: int, offline_ms: float, redistributable: bool
) -> dict:
    reasons: list[str] = []
    live = True
    if not redistributable:
        live = False
        reasons.append(
            "instance is not redistributable (MineLib academic-download grant), so the browser has "
            "no per-block data to solve; aggregate results only"
        )
    if n_blocks > LIVE_BLOCKS:
        live = False
        reasons.append(f"{n_blocks} blocks exceeds the {LIVE_BLOCKS} live budget")
    if n_arcs > LIVE_ARCS:
        live = False
        reasons.append(f"{n_arcs} precedence arcs exceeds the {LIVE_ARCS} live budget")
    if trace_bytes > LIVE_TRACE_BYTES:
        live = False
        reasons.append(f"trace of {trace_bytes} bytes exceeds the {LIVE_TRACE_BYTES} budget")
    if offline_ms > OFFLINE_MS_GATE:
        reasons.append(f"offline solve took {offline_ms:.0f} ms, above the {OFFLINE_MS_GATE:.0f} ms note")
    return {
        "lane": "live" if live else "replay",
        "n_blocks": n_blocks,
        "n_arcs": n_arcs,
        "trace_bytes": trace_bytes,
        "offline_ms": round(offline_ms, 1),
        "budgets": {
            "blocks": LIVE_BLOCKS,
            "arcs": LIVE_ARCS,
            "trace_bytes": LIVE_TRACE_BYTES,
        },
        "reasons": reasons,
    }
