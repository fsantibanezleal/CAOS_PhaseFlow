# Deploy

**GitHub Pages, static** (ADR-0055). `.github/workflows/deploy-pages.yml` builds the SPA, overlays
`data/derived` with `copy-data.mjs`, and publishes `frontend/dist`. Nothing runs at request time.

Live at **https://phaseflow.fasl-work.com**, HTTPS enforced. The custom domain and the two-step
go-live are recorded in `deployments/phaseflow.md` in the management repo, including the gotcha that a
`CNAME` file does NOT set the domain on an Actions deploy: it takes `gh api PUT .../pages -f cname=...`
and then a redeploy.

The VPS path in `deploy/` is **dormant**. It activates only if `app/` does, which needs an ADR-0002
trigger PhaseFlow does not have.

## What CI enforces on every push

`ci.yml`: ruff, pytest, a bake smoke, `check_artifacts.py` for CONTRACT 2, the frontend build, and the
frontend gates (engine, parity, contract, coherence, design tokens), plus guards that fail on a
tracked `.env`, a tracked venv, a native or heavy binary, raw data, or a leaked machine path.

## What CI cannot enforce, and what covers it

CI cannot see the page. Several defects have shipped through a green CI and a green HTTP check: two
copies of `react-router` so every shell hook threw, a pit rendered upside down, every block rendered
black, and a route that unmounted the whole app on click. The browser gate is what catches that class.
It lives in the management repo (`tools/visual-verify/_pf-gate.mjs`) because it is the same discipline
for every product on this line, and it drives the pointer, samples the canvas, and asserts what the
stage actually DREW:

- the six routes fit the viewport, or scroll inside a container of their own
- the stage draws, at a measured size, and WAITS for the renderer to report a frame rather than
  sleeping a fixed time
- what it draws carries period colour, measured as saturation, because a distinct-colour count once
  passed 98 on an all-black pit
- nothing sits on the border of the canvas: a pit clipped by its own frame reads as a wall
- the App route gives the instrument at least half the viewport, the focus route at least 80 percent
- the focus route opens by CLICKING, its controls re-solve, and it comes back
- no console errors, with the SPA-fallback 404 filtered, because a gate that disagrees with a working
  app gets ignored
