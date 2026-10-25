# sliding-window-scale: validation boundary

This folder contains a proposal, not an implementation. `scripts/check_sdd.py` checks that the design and requirement records remain structurally complete. It does not claim that the proposed method exists or that its future scientific gates have passed. The proposal must be reviewed, expanded with executable feature-specific validation, and approved before implementation begins.

| requirement | adversarial check | gate |
|---|---|---|
| WS-001 | Confirm the proposal explicitly remains unimplemented and makes no performance claim. | `tests/test_feature_proposals.py::test_adversarial_proposals_remain_unimplemented_until_evidence_exists`; `scripts/check_sdd.py` |
