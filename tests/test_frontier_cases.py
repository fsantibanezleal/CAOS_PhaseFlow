from __future__ import annotations

from types import SimpleNamespace

import numpy as np
import pytest

from pipeline.model.frontier_cases import adapt_product_case, validate_product_result
from pipeline.model.frontier_policy import Assignment


def _case(*, resources: int = 2, grade_source: str | None = "synthetic-twin"):
    return SimpleNamespace(
        case_id="adapter-fixture",
        cpit=SimpleNamespace(
            n_blocks=3, n_resources=resources, n_periods=2,
            value=np.array([10.0, -2.0, 6.0]),
            coef=np.array([[2.0, 1.0, 3.0], [0.5, 0.0, 1.0]])[:resources],
            limit=np.array([[4.0, 6.0], [1.0, 2.0]])[:resources],
            discount_rate=0.1, period_one_undiscounted=True,
        ),
        precedence=SimpleNamespace(pstart=np.array([0, 0, 1, 2]), plist=np.array([0, 1]), n_arcs=2),
        tonnage=np.array([2.0, 1.0, 3.0]),
        grade=np.array([0.4, 0.2, 0.8]), grade_source=grade_source,
    )


def test_product_adapter_preserves_source_economics_and_builds_declared_features():
    adapted = adapt_product_case(_case())
    assert adapted.case_id == "adapter-fixture"
    assert adapted.instance.predecessors == ((), (0,), (1,))
    assert adapted.node_features.shape == (3, 7)
    assert adapted.source_contract["grade_source"] == "synthetic-twin"
    assert len(adapted.source_contract["instance_sha256"]) == 64
    np.testing.assert_array_equal(adapted.instance.values, [10.0, -2.0, 6.0])
    np.testing.assert_array_equal(adapted.instance.capacities, [[4.0, 1.0], [6.0, 2.0]])


def test_product_adapter_fails_closed_on_resource_or_grade_contract_drift():
    with pytest.raises(ValueError, match="two-resource"):
        adapt_product_case(_case(resources=1))
    with pytest.raises(ValueError, match="source-backed grade"):
        adapt_product_case(_case(grade_source=None))
    sentinel_case = _case()
    sentinel_case.cpit.value[0] = -1e18
    with pytest.raises(ValueError, match="forbidden-value sentinel"):
        adapt_product_case(sentinel_case)


def test_adapter_computes_depth_independent_of_block_index_order():
    case = _case()
    case.precedence = SimpleNamespace(
        pstart=np.array([0, 1, 1, 1]), plist=np.array([2]), n_arcs=1,
    )
    adapted = adapt_product_case(case)
    assert adapted.instance.predecessors == ((2,), (), ())
    np.testing.assert_array_equal(adapted.node_features[:, 4], [1.0, 0.0, 0.0])


def test_product_instance_digest_changes_when_source_economics_change():
    first = adapt_product_case(_case())
    second_case = _case()
    second_case.cpit.value = np.array([10.0, -2.0, 6.1])
    second = adapt_product_case(second_case)
    assert first.source_contract["instance_sha256"] != second.source_contract["instance_sha256"]


def test_product_result_recomputes_objective_and_reports_partial_coverage():
    adapted = adapt_product_case(_case())
    assignments = (Assignment(0, 0), Assignment(1, 0))
    result = validate_product_result(adapted, assignments, expected_npv=8.0)
    assert result.npv == pytest.approx(8.0)
    assert result.tonnage_coverage == pytest.approx(0.5)
    assert result.positive_value_coverage == pytest.approx(10.0 / 16.0)
    with pytest.raises(ValueError, match="independent product CPIT"):
        validate_product_result(adapted, assignments, expected_npv=8.1)
