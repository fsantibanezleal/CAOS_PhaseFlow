# 07 · Deploy

**GitHub Pages, static** (ADR-0055). `.github/workflows/deploy-pages.yml` installs the pinned requirements,
runs the gates (artifacts, content standards, template residue, README numbers, docs tables), builds the SPA
(`copy-data.mjs` overlays `data/derived` into `public/`), and publishes `frontend/dist`. Nothing runs at
request time. Live at **https://phaseflow.fasl-work.com**, HTTPS enforced; the custom-domain steps and their
gotchas are recorded in the management repository's deployment notes.

The VPS path in `deploy/` is **dormant**: it activates only with an `app/` backend, which PhaseFlow does not
have.

## What CI enforces on every push to the trunk (cheap checks only, ADR-0074)

`ci.yml`: install the pinned requirements; `ruff`; `check_artifacts.py` (CONTRACT 2 on the committed
evidence); the frontend build, the engine and parity tests and the architecture-bounds check; guards against a
tracked `.env`, a tracked virtual environment, a native or heavy binary, raw data or a leaked machine path;
template residue; content standards (no em-dash or emoji); the README trust anchor; the docs tables; the CI
budget (trunk-only triggers, no training). CI does not run pytest (it bakes cases and runs MILPs) and never
trains; those run locally ([guides/05](../guides/05_run-the-checks.md)).

Because CI installs `requirements.txt`, a pin to an engine version not yet on PyPI fails CI; the engine is
released first, then the product.

`npm test` uses Node's default test discovery rather than a list of files: a list once named four files of
which two existed, Node skipped the missing ones on Windows and failed on Linux, and the local run was green
for the wrong reason.

## What CI cannot see, and what covers it

CI cannot see the page. Defects have shipped through a green CI and a green HTTP check: two copies of
`react-router` so every shell hook threw, a pit rendered upside down, every block rendered black, a route
that unmounted the app on click. The browser gates catch that class (`frontend/scripts/verify-*.mjs` in this
repository, and the shared gate in the management repository): the routes fit the viewport or scroll inside
their own container; the stage draws at a measured size and waits for a reported frame; what it draws
carries period colour, measured as saturation; nothing sits on the border of the canvas; the focus view opens
by clicking, re-solves, and comes back; no console errors.
