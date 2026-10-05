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
from pipeline.pipeline import _validate, precompute  # noqa: E402
from pipeline.stages.solve import _as_pcpsp, _period_rows  # noqa: E402


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


def _with_arcs(inst, extra: dict[int, list[int]]):
    """The instance's predecessor lists with extra predecessors appended to some blocks."""
    pstart, plist = inst.precedence.pstart, inst.precedence.plist
    lists = [list(plist[pstart[b]:pstart[b + 1]]) + extra.get(b, []) for b in range(pstart.shape[0] - 1)]
    new_start = np.concatenate([[0], np.cumsum([len(x) for x in lists])]).astype(pstart.dtype)
    return new_start, np.array([a for x in lists for a in x], dtype=plist.dtype)


def _same_level_pair(inst):
    lv = inst.level
    a = int(np.nonzero(lv == lv.max())[0][0])
    b = int(np.nonzero(lv == lv.max())[0][1])
    return a, b


def test_contract_rejects_a_cycle_hidden_among_flat_arcs():
    """Arcs that strictly rise cannot close a loop; two flat arcs can, and the share check alone
    (99 percent upward) lets them through. A cycle would leave its blocks silently unmined."""
    inst = build_instance(_tiny_case())
    a, b = _same_level_pair(inst)
    pstart, plist = _with_arcs(inst, {a: [b], b: [a]})
    rep = validate_instance(values=inst.cpit.value, pstart=pstart, plist=plist, level=inst.level,
                            coef=inst.cpit.coef, limit=inst.cpit.limit, discount_rate=0.1)
    assert not rep.ok
    assert any(r["code"] == "prec-cycle" for r in rep.rejected)


def test_contract_flags_flat_arcs_that_close_no_cycle():
    inst = build_instance(_tiny_case())
    a, b = _same_level_pair(inst)
    pstart, plist = _with_arcs(inst, {a: [b]})
    rep = validate_instance(values=inst.cpit.value, pstart=pstart, plist=plist, level=inst.level,
                            coef=inst.cpit.coef, limit=inst.cpit.limit, discount_rate=0.1)
    assert rep.ok
    assert any(f["code"] == "prec-not-upward" for f in rep.flagged)


def test_destination_rungs_never_end_below_cpit_and_stay_under_the_pcpsp_lp():
    """The re-cut rungs are PCPSP plans: under the PCPSP LP, and the local search, which starts from
    the best of them and the best CPIT plan, never below that CPIT plan."""
    from pipeline.stages.solve import run_ladder

    inst = build_instance(_tiny_case())
    results, _, rep = run_ladder(inst, learned=None, joint_bound=False)
    by = {r.method: r for r in results}
    for name in ("destination-toposort", "destination-sliding-window", "destination-local-search"):
        assert name in by, f"{name} did not run: {rep['skipped_methods'].get(name)}"
        assert by[name].npv <= rep["pcpsp_lp"] * (1 + 1e-7)
        assert by[name].bound == pytest.approx(rep["pcpsp_lp"])
    best_cpit = max(r.npv for r in results if r.rung in ("classical", "sota", "learned"))
    assert by["destination-local-search"].npv >= best_cpit - 1e-6 * abs(best_cpit)
    assert by["destination-local-search"].npv >= max(by["destination-toposort"].npv,
                                                     by["destination-sliding-window"].npv) - 1e-6


def test_above_the_row_budget_the_pcpsp_bound_is_the_lagrangian_dual(monkeypatch):
    """The same case through the Lagrangian path: the method is recorded, the bound sits on the HiGHS
    LP within its slack, and the destination rungs still run and stay under it."""
    from pipeline.stages import solve

    inst = build_instance(_tiny_case())
    _, _, rep_lp = solve.run_ladder(inst, learned=None, joint_bound=False)
    monkeypatch.setattr(solve, "PCPSP_LP_MAX_ROWS", 10)
    results, _, rep = solve.run_ladder(inst, learned=None, joint_bound=False)
    assert rep_lp["pcpsp_lp_method"] == "highs-lp"
    assert rep["pcpsp_lp_method"] == "lagrangian" and "Lagrangian dual" in rep["pcpsp_lp_note"]
    assert rep["pcpsp_lp"] >= rep_lp["pcpsp_lp"] * (1 - 1e-9)
    assert rep["pcpsp_lp"] <= rep_lp["pcpsp_lp"] + 2 * rep["pcpsp_lp_slack"] + 1e-5 * rep_lp["pcpsp_lp"]
    by = {r.method: r for r in results}
    for name in ("destination-toposort", "destination-sliding-window", "destination-local-search"):
        assert name in by
        assert by[name].npv <= rep["pcpsp_lp"] * (1 + 1e-9)


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


def test_destination_periods_use_chosen_destination_values_and_resources():
    """A block sent to waste cannot consume plant capacity or earn plant revenue."""
    import oreblocks as ob

    inst = build_instance(_tiny_case())
    negative_plant = (inst.cpit.coef[1] > 0) & (inst.cpit.value < 0)
    assert negative_plant.any(), "fixture must include plant-bound blocks with negative net value"
    pcpsp = _as_pcpsp(inst)
    reduced = pcpsp.to_cpit()
    assert np.allclose(reduced.coef, inst.cpit.coef)
    result = ob.destination_toposort(pcpsp, inst.precedence, grade=inst.grade)
    rows = _period_rows(
        inst, inst.cpit, result.period_of_block, pcpsp=pcpsp,
        destination_of_block=result.destination_of_block,
    )
    dumped_ore = ((result.period_of_block >= 0) &
                  (result.destination_of_block == 0) & (inst.cpit.value > 0))
    assert dumped_ore.any(), "fixture must exercise an ore block sent to waste"
    assert sum(row.disc_cash_flow for row in rows) == pytest.approx(result.npv, abs=0.01)
    for row in rows:
        for used, limit in zip(row.resource_use, row.resource_limit, strict=True):
            assert used <= limit + 1e-6
    assert sum(row.ore_tonnes for row in rows) < sum(row.mined_tonnes for row in rows)


def test_artifact_validator_holds_every_rung_to_its_own_bound(tmp_path):
    trace_path = tmp_path / "trace.json"
    manifest_path = tmp_path / "manifest.json"
    period = {"t": 1, "resourceUse": [5.0], "resourceLimit": [6.0]}
    trace = {
        "schema": "phaseflow.schedule-trace/v1", "caseId": "tiny",
        "scenario": {"periods": 1}, "instance": {"synthetic": True, "source": "twin"},
        "methods": [{"method": "min-width", "rung": "beyond", "npv": 11,
                     "bound": 10, "periods": [period]}],
    }
    manifest_path.write_text(json.dumps({"case_id": "tiny"}), encoding="utf-8")
    # min-width keeps the capacities, so the CPIT bound applies to it like any other plan
    trace_path.write_text(json.dumps(trace), encoding="utf-8")
    with pytest.raises(AssertionError, match="exceeds bound"):
        _validate(trace_path, manifest_path)
    # a destination plan carries the PCPSP LP, the bound of the problem it solves
    trace["methods"] = [{"method": "destination-local-search", "rung": "beyond", "npv": 11,
                         "bound": 12, "periods": [period]}]
    trace_path.write_text(json.dumps(trace), encoding="utf-8")
    _validate(trace_path, manifest_path)
    # and a plan that breaks a capacity is rejected whatever its rung
    trace["methods"][0]["periods"] = [{"t": 1, "resourceUse": [7.0], "resourceLimit": [6.0]}]
    trace_path.write_text(json.dumps(trace), encoding="utf-8")
    with pytest.raises(AssertionError, match="uses 7.0 of 6.0"):
        _validate(trace_path, manifest_path)


def test_bake_writes_a_valid_trace_into_a_sandbox(tmp_path):
    # The degenerate control bakes every rung, destinations included, in about two minutes. This test
    # baked `twin-porphyry-s` until 0.08.000, which with the PCPSP LP and two sliding windows is about
    # two and a half hours; the whole-case bake is exercised by every release bake anyway.
    case_id = "ctrl-degenerate"
    canonical = ROOT / "data" / "derived" / case_id / "trace.json"
    canonical_before = canonical.read_bytes()
    registry.restrict([case_id])
    try:
        m = precompute(case_id, output_root=tmp_path)
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


def test_learned_inference_reads_the_capacity_the_case_declares():
    """The model was trained on each scenario's capacity fractions; inference must feed the same numbers.

    Until 0.08.000 the ladder fed a fixed (1.0, 1.0) to every case, so every baked learned plan was scored
    on inputs outside its training distribution.
    """
    from pipeline.model.learned import capacity_fractions

    case = _tiny_case()
    inst = build_instance(case)
    got = capacity_fractions(inst.cpit, inst.upit_in_pit)
    assert got == pytest.approx(case.scenario.capacity_fraction, rel=1e-12)


def test_onnx_parity_refuses_a_sample_that_saturates_the_output(tmp_path):
    """Raw standard-normal features sit far from the means the model standardises around, so every
    sigmoid saturates and float32 and float64 agree exactly: the check must refuse that sample, and
    pass on the model's own input distribution with a real, nonzero error."""
    pytest.importorskip("onnx")
    pytest.importorskip("onnxruntime")
    from pipeline.model.learned import Mlp, export_onnx

    model = Mlp.from_json(json.loads((ROOT / "models" / "expected-time.json").read_text(encoding="utf-8")))
    raw = np.random.default_rng(0).normal(size=(64, model.w[0].shape[0]))
    with pytest.raises(AssertionError, match="saturated"):
        export_onnx(model, tmp_path / "raw.onnx", sample=raw)
    export_onnx(model, tmp_path / "own.onnx")
    err = json.loads((tmp_path / "own.json").read_text(encoding="utf-8"))["onnx_parity_max_abs_err"]
    assert 0.0 < err < 1e-5
