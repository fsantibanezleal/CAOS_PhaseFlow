# Run PhaseFlow locally

Numbered because the order is the point: a reader with no context runs `00`, then `01`, then `03`.
Each script ends by printing the next command, and refuses with the command that fixes it when a
prerequisite is missing. Every script ships as a matched pair, `.ps1` and `.sh`.

```powershell
.\scripts\local\00_install-prereqs.ps1     # check python 3.12+, node 20+, git
.\scripts\local\01_init.ps1                # venv, deps, frontend packages, .env, artifacts if empty
.\scripts\local\03_dev.ps1                 # http://localhost:5173
```

```bash
./scripts/local/00_install-prereqs.sh
./scripts/local/01_init.sh
./scripts/local/03_dev.sh
```

## What each one does

| Script | Does | Options |
|---|---|---|
| `00_install-prereqs` | Checks the versions CI pins. Does not touch a working machine. | PowerShell: `-Install` installs the missing ones through winget. On Linux and macOS it only reports; installing is yours. |
| `01_init` | One virtualenv, the offline and dev requirements, `npm ci`, `.env` from `.env.example`, and a sandbox bake if `data/derived/` is empty. Idempotent. | `PYTHON=/path/to/python` to pick an interpreter |
| `02_generate-data` | Bakes the artifacts. **Sandbox by default** (`build/local`). | `<case-id>` for one case; `-Release` / `--release` to write the committed `data/derived/` |
| `03_dev` | Overlays `data/derived` into the frontend and starts Vite. | - |

There is no `04`: PhaseFlow has no backend. The `app/` folder is the archetype's dormant API lane and
carries a README saying so.

## Why `02` refuses a partial release bake

A release bake writes `data/derived/`, which is the committed evidence the deployed site replays. The
index is built from the manifests ON DISK, so a tree that mixes two engine versions is internally
consistent and passes every per-case check there is. `-Release` therefore only accepts the whole case
set. All thirteen take about ninety minutes and print a line per case as each lands.

## The gates, before you push

```powershell
.\.venv\Scripts\python.exe -m pytest              # the pipeline tests
.\.venv\Scripts\python.exe -m ruff check .        # lint
.\.venv\Scripts\python.exe scripts\check_artifacts.py    # CONTRACT 2 on disk
cd frontend; npm test; npm run build              # engine parity, contract, tokens, then the bundle
```

The browser gate lives in the management repo, because it is the same gate for every product on this
line:

```bash
# from the visual-verify toolbox (kept outside this repo, it is shared across the product line)
node _pf-gate.mjs https://phaseflow.fasl-work.com <screenshot-dir>
```

It drives the pointer, samples the canvas pixels, and asserts what a status code cannot: that the
stage draws, that what it draws carries period colour, that nothing is clipped by its own frame, and
that the focus route round-trips by clicking.
