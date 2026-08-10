"""Offline pipeline tests. Every one runs in a sandbox: committed evidence is never touched."""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
import pytest

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "data-pipeline"))

from pipeline import registry  # noqa: E402
from pipeline.io.contract import validate_instance  # noqa: E402
from pipeline.io.schema import Case, DepositSpec, Scenario  # noqa: E402
from pipeline.model.instances import build_instance  # noqa: E402
from pipeline.pipeline import precompute  # noqa: E402


def _tiny_case(**kw) -> Case:
    return Case(
        id="tiny", category="deposit", title_en="t", title_es="t",
        deposit=DepositSpec(kind="twin", archetype="porphyry", dims=(8, 8, 5), seed=3),
        scenario=Scenario(periods=4, discount_rate=0.10, capacity_fraction=(0.8, 0.5),
                          resource_names=("mining", "processing")),
        **kw,
    )


def test_every_case_declares_a_role_and_exactly_one_is_default():
    cases = registry.list_cases()
    assert len(cases) >= 12, "the case matrix must span the argument, not sample it"
    assert sum(1 for c in cases if c.default) == 1
    for c in cases:
        assert c.role_en and c.role_es, f"{c.id} has no role; a case with no role is a case nobody needs"
        assert c.category in {"published", "declared", "deposit", "regime", "control"}


def test_contract_rejects_downward_precedence():
    """MineLib levels increase UPWARD. A file whose arcs point down is a different problem."""
    inst = build_instance(_tiny_case())
    rep = validate_instance(
        values=inst.cpit.value, pstart=inst.precedence.pstart, plist=inst.precedence.plist,
        level=-inst.level,  # flipped: now every arc points "down"
        coef=inst.cpit.coef, limit=inst.cpit.limit, discount_rate=0.1,
    )
    assert not rep.ok
    assert any(r["code"] == "prec-direction" for r in rep.rejected)


def test_contract_rejects_a_zero_tonnage_block():
    inst = build_instance(_tiny_case())
    coef = inst.cpit.coef.copy()
    coef[0][0] = 0.0
    rep = validate_instance(
        values=inst.cpit.value, pstart=inst.precedence.pstart, plist=inst.precedence.plist,
        level=inst.level, coef=coef, limit=inst.cpit.limit, discount_rate=0.1,
    )
    assert not rep.ok
    assert any(r["code"] == "zero-tonnage" for r in rep.rejected)


def test_contract_flags_a_capacity_that_can_never_exhaust_the_pit():
    inst = build_instance(_tiny_case())
    rep = validate_instance(
        values=inst.cpit.value, pstart=inst.precedence.pstart, plist=inst.precedence.plist,
        level=inst.level, coef=inst.cpit.coef, limit=inst.cpit.limit * 1e-4, discount_rate=0.1,
    )
    assert rep.ok, "an under-capacity scenario is legal, it is not a rejection"
    assert any(f["code"] == "capacity-cannot-exhaust" for f in rep.flagged)


def test_bake_writes_a_valid_trace_into_a_sandbox(tmp_path):
    canonical = ROOT / "data" / "derived" / "twin-porphyry-s" / "trace.json"
    canonical_before = canonical.read_bytes()
    registry.restrict(["twin-porphyry-s"])
    try:
        m = precompute("twin-porphyry-s", output_root=tmp_path)
    finally:
        registry.restrict([c.id for c in registry._ALL])  # noqa: SLF001
    trace = json.loads((tmp_path / m["artifact"]["path"]).read_text(encoding="utf-8"))
    assert trace["schema"] == "phaseflow.schedule-trace/v1"
    assert trace["controls"]["allPass"]
    assert len(trace["methods"]) >= 6
    for meth in trace["methods"]:
        assert meth["npv"] <= meth["bound"] * (1 + 1e-9)
        assert len(meth["periods"]) == trace["scenario"]["periods"]
    # The committed trace must be BYTE-IDENTICAL after a sandbox bake. The previous form of this
    # assertion compared the file's mtime against 1e18 seconds since the epoch, roughly the year
    # 3.17e10 AD: it was False for every reachable filesystem state, so `not False` passed always. If
    # `precompute` ever defaulted its output root back to `data/derived`, it would have rewritten all
    # thirteen committed traces and stayed green.
    assert canonical.read_bytes() == canonical_before, (
        "the sandbox bake overwrote the committed evidence"
    )


def test_committed_evidence_passes_its_own_drift_guard():
    import subprocess
    r = subprocess.run([sys.executable, str(ROOT / "scripts" / "check_artifacts.py")],
                       capture_output=True, text=True)
    assert r.returncode == 0, r.stderr


@pytest.mark.parametrize("case_id", ["ctrl-degenerate", "ctrl-abundant"])
def test_the_controls_are_actually_in_the_committed_evidence(case_id):
    m = json.loads((ROOT / "data" / "derived" / "manifests" / f"{case_id}.json").read_text(encoding="utf-8"))
    assert m["controls"]["dualitySetMatches"]
    assert m["controls"]["boundGeqFeasible"]
    assert m["controls"]["orderInvariant"]
    assert np.isclose(m["controls"]["dualityBoundError"], 0.0, atol=1e-5)
