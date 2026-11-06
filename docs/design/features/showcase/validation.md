# Showcase visualization and guided story: validation

| requirement | adversarial check | gate |
|---|---|---|
| SC-001 | Plant a case id that disagrees with the loaded trace and an aggregate-only MineLib contract; verify the route refuses foreign selection and does not mount block geometry. | `frontend/scripts/verify-showcase.mjs`; `frontend/test/showcase-adversarial.test.ts::adversarial: a mismatched case URL cannot apply another trace selection` |
| SC-002 | Select a bench with missing geometry and an unknown level; verify the linked highlight accepts only a level in the loaded replay trace. | `frontend/scripts/verify-showcase.mjs`; `frontend/test/showcase-adversarial.test.ts::adversarial: an unknown bench level cannot select absent geometry` |
| SC-003 | Plant a negative, fractional and non-numeric period; verify malformed cursor values are rejected and out-of-horizon values are bounded. | `frontend/scripts/verify-showcase.mjs`; `frontend/test/showcase-adversarial.test.ts::adversarial: malformed or unsafe period input cannot reach the schedule cursor` |
| SC-004 | Plant a method id absent from the selected trace and a mismatched case id; verify neither can drive another case's result. | `frontend/scripts/verify-showcase.mjs`; `frontend/test/showcase-adversarial.test.ts::adversarial: an unknown method cannot replace the case method` |
| SC-005 | Plant an unknown method in the URL; verify the method explanation cannot claim a method absent from the committed trace. | `frontend/scripts/verify-showcase.mjs`; `frontend/test/showcase-adversarial.test.ts::adversarial: an unknown method cannot replace the case method` |
| SC-006 | Plant a comparison row with no matching method id; verify URL selection is refused and the displayed comparison remains trace-derived. | `frontend/scripts/verify-showcase.mjs`; `frontend/test/showcase-adversarial.test.ts::adversarial: an unknown method cannot replace the case method` |
| SC-007 | Plant an unknown story slug with malformed case/method/period query state; verify fallback and selection parsing remain bounded. | `frontend/scripts/verify-showcase.mjs`; `frontend/test/showcase-adversarial.test.ts::adversarial: an unknown story slug falls back to a valid direct step` |
| SC-008 | Plant unsafe period values while reduced motion is active; verify no malformed cursor reaches a stage and keyboard movement still visits valid story links. | `frontend/scripts/verify-showcase.mjs`; `frontend/test/showcase-adversarial.test.ts::adversarial: a period above the horizon is bounded to the final committed row` |

Release review also captures each story step at 1280x800 and 390x844, in both themes and languages. Review records the
six catalog views, evidence source and units, stage/panel share, callout placement, reduced-motion state and route
navigation. Passing structural gates alone does not establish scientific truth, frame rate or responsiveness.
