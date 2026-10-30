# deposit-statistics-guard: validation boundary

The statistical feature remains a proposal, not an implementation of a statistical model. `scripts/check_sdd.py` checks that the design and requirement records remain structurally complete. It does not claim that the proposed statistical method exists or that its scientific gates have passed. The negative-path eligibility gate is implemented for existing label-rule candidates.

| requirement | adversarial check | gate |
|---|---|---|
| SG-001 | Plant a proposal status while implementation is absent and verify the proposal guard rejects claims of shipped behavior. | `tests/test_feature_proposals.py::test_adversarial_proposals_remain_unimplemented_until_evidence_exists` |
