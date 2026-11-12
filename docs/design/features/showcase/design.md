# Showcase visualization and guided story: design

## State and route model

The story reads the case, method and period already selected in the App state. Its four slugs are stable URL values:
`deposit`, `method`, `constraints` and `compare`. Case and method are encoded in the existing query state; period uses
the shared cursor. Changing a step changes only the view, never the scientific selection. Browser back/forward restores
the prior step and selection, and exiting returns to `/app` with the same case, method and period.

The app loads `case-manifest` for case provenance and geometry availability and `schedule-trace` for method schedules,
period values, resource use and objective. The selected step builds a single primary stage and one docked evidence
panel. A story headline is rendered from values already present in those contracts; it never hard-codes a result or
labels a missing value as zero. The stage and panel use the shell's `StoryFrame`, `SceneCallouts` and linked-view store.

## Six problem views

The stage is a 3D block model for replay-eligible cases, sized to the pit's authored bounds. Period scrubbing changes
the same block colours and the production/capacity panels. The 2D section exposes bench membership and slope-precedence
context. Capacity and precedence are drawn with their own axes and resource units. A method panel narrates its real
constructor or search and points to the corresponding selected schedule. Comparisons hold the case, axes and units
fixed; selecting a method loads that schedule into the 3D stage. Every visual states the case, method and evidence lane.

Three scene callouts report the selected case's number of scheduled blocks, the current period's mined tonnage and its
capacity share, each with a unit or explicit unitless label and a source note. For a static/aggregate-only case, the
callout set uses its committed aggregate result and the stage says why block geometry is unavailable. The
MineLib licence boundary takes precedence over visual completeness.

## Motion, accessibility and limits

Step changes stage the camera, highlight, panel and value transition in reading order. Camera pose is fitted to the
selected geometry; motion is interruptible, bounded, and disabled under `prefers-reduced-motion`. Story controls use
semantic links and buttons, expose focus, support arrows/Home/End/Space, stop on any direct interaction and pause at the
last step. At phone width, the stage remains above the panel and the callouts reduce to the three required labels.

This story is a walkthrough of a reproducible computational workbench, not an operational digital twin. It has no live
telemetry, geologic uncertainty realization or authority to recommend a mine plan. Synthetic geometry is labelled as
synthetic. Aggregate-only published cases do not gain fabricated block-level detail.
