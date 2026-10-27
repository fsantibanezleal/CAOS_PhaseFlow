# learned-destination: proposal guard requirements

Status: proposed. These requirements prevent a design proposal from being represented as shipped functionality. Implementation requirements and gates are approved only after a reviewed feature design.

| ID | EARS requirement | Named verification gate |
|---|---|---|
| LD-001 | THE product SHALL keep learned destination selection as a proposal until a source-backed teacher, held-out validation, period-resource reconciliation and an independent evaluation are implemented and reviewed. | `scripts/check_sdd.py` |
