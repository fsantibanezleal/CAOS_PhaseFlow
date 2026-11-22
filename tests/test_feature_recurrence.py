"""Keep the learned predecessor recurrences distinct from exact cone statistics."""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import oreblocks as ob

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "data-pipeline"))

from pipeline.model.features import _cone_stats  # noqa: E402


def test_shared_ancestor_is_not_deduplicated_as_an_exact_transitive_cone():
    # 0 -> {1, 2} -> 3, with 4 depending on both 0 and 3. The exact
    # ancestor set of 4 is {0, 1, 2, 3}; its shared path is deliberately
    # counted differently by the frozen immediate-predecessor recurrence.
    prec = ob.Precedence(
        pstart=np.array([0, 0, 1, 2, 4, 6], dtype=np.int64),
        plist=np.array([0, 0, 1, 2, 0, 3], dtype=np.int64),
    )
    values = np.array([1.0, 2.0, 3.0, 5.0, 7.0])

    size, value = _cone_stats(prec, values)

    assert size.tolist() == [0.0, 1.0, 1.0, 3.0, 5.0]
    assert value.tolist() == [0.0, 1.0, 1.0, 6.0, 12.0]
    assert size[4] != 4  # exact unique ancestor count
    assert value[4] != 11.0  # exact unique ancestor value: 1 + 2 + 3 + 5
