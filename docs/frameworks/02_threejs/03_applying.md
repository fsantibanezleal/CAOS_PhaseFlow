# three.js · 03 · Applying the stage to other data

`ScheduleView3D` takes plain arrays, so any block model with a schedule can be drawn:

| prop | content |
|---|---|
| `x`, `y`, `level` | integer grid indices per block (level increasing upward) |
| `grade`, `inPit` | per block; `inPit` from the ultimate pit |
| `periodOfBlock` | 0-based period per block, -1 for never mined |
| `dims` | `[nx, ny, nz]` |
| `nPeriods`, `cursor` | the horizon and the period shown |
| `mode` | `schedule` (the void boundary), `grade`, or `mined` |
| `sectionY` | cut everything above a y index, to look inside |

A PhaseFlow trace of a synthetic case carries exactly these arrays (`trace.blocks` and a method's
`periodOfBlock`), which is how the app feeds it. To show another per-block quantity (a destination, an
uncertainty), add a mode that maps it to a colour in the cursor effect; keep the build effect untouched, so
the camera and renderer survive every change.

Mind the budget: the gate makes a case live only up to 30,000 blocks
([architecture/03](../../architecture/03_the-gate.md)), and an instanced mesh far beyond that stops being
interactive on a laptop GPU.
