# sliding-window-scale: proposal guard requirements

Status: proposed. These requirements prevent a design proposal from being represented as shipped functionality. Implementation requirements and gates are approved only after a reviewed feature design.

| ID | EARS requirement | Named verification gate |
|---|---|---|
| WS-001 | THE product SHALL keep larger-case sliding-window scaling as a proposal until repeatable solver-budget measurements and feasibility results on larger cases are implemented and reviewed. | `scripts/check_sdd.py` |
