# deposit-statistics-guard: proposal guard requirements

Status: proposed. These requirements prevent a design proposal from being represented as shipped functionality. Implementation requirements and gates are approved only after a reviewed feature design.

| ID | EARS requirement | Named verification gate |
|---|---|---|
| SG-001 | THE product SHALL keep the deposit-statistics guard as a proposal until real-deposit inputs, disjoint-seed evaluation, abstention behavior and an independent evidence report are implemented and reviewed. | `scripts/check_sdd.py` |
