# Showcase visualization and guided story: requirements

These requirements apply the six-purpose visualization contract to PhaseFlow's scheduling problem. The story uses the
same selected case state as the App and remains evidence-bound to committed contracts.

| ID | EARS requirement | Named verification gate |
|---|---|---|
| SC-001 | WHEN a replay-eligible case is selected, THE App SHALL show its pit geometry with the selected schedule and period, and SHALL keep MineLib cases aggregate-only. | `frontend/scripts/verify-showcase.mjs` |
| SC-002 | WHEN a user selects a bench, section or block, THE App SHALL show the selected component's fields and precedence context and SHALL highlight the same selection in the pit scene. | `frontend/scripts/verify-showcase.mjs` |
| SC-003 | WHEN a user changes the period, THE App SHALL update the capacity and precedence diagram, production series and pit highlighting from the same schedule trace. | `frontend/scripts/verify-showcase.mjs`; `frontend/scripts/gate.mjs` |
| SC-004 | WHEN a case or method changes, THE App SHALL recompute the state and dynamics views from that case's schedule trace and SHALL label units and any unavailable uncertainty evidence. | `frontend/scripts/verify-showcase.mjs`; `frontend/scripts/gate.mjs` |
| SC-005 | WHEN a method is selected, THE App SHALL explain its actual ordering or search steps alongside the corresponding schedule state and feasibility evidence. | `frontend/scripts/verify-showcase.mjs` |
| SC-006 | WHEN methods are compared, THE App SHALL use the same selected case and axes, identify each matching bound and feasibility state, and open the selected result in the pit scene. | `frontend/scripts/verify-showcase.mjs` |
| SC-007 | THE product SHALL provide four directly addressable guided story steps whose numeric headlines, callouts, stage and docked panel are derived from the selected case contracts; story exit SHALL preserve case, method and period. | `frontend/scripts/verify-showcase.mjs` |
| SC-008 | WHEN reduced motion is requested, THE story SHALL reach each final scene state without camera flight or value interpolation, and every story action SHALL remain available by keyboard. | `frontend/scripts/verify-showcase.mjs` |
