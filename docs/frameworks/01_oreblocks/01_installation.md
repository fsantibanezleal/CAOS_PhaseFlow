# oreblocks · 01 · Installation

PhaseFlow consumes the engine as a pinned dependency; it never vendors it.

```bash
# from the repository root, inside the project's own virtual environment
python -m venv .venv
. .venv/bin/activate            # Windows PowerShell: .\.venv\Scripts\Activate.ps1
pip install -r requirements.txt  # brings oreblocks[milp]==0.6.1, numpy, scipy (HiGHS)
python -c "import oreblocks; print(oreblocks.__version__)"   # 0.6.1
```

`scripts/local/01_init.sh` / `01_init.ps1` do exactly this plus the development requirements, `npm ci` and a
first sandbox bake; the offline training and export add `requirements-precompute.txt` (onnx, onnxruntime).
Never install into a global interpreter.

## The extras

| install | what it adds | what needs it |
|---|---|---|
| `oreblocks` | numpy only: maximum closure, the critical multiplier algorithm, TopoSort, shifts, coherence, IO | the browser-equivalent subset; enough for bounds and rounding |
| `oreblocks[milp]` | scipy (HiGHS MILP and LP, the compiled max-flow) | BZ, the sliding window, C-PIT[D], the PCPSP LP, OPBSP-[D] |

## Developing against a local checkout

When a change is needed in the engine, it is made in the engine's repository and released; PhaseFlow then
bumps its pin. While developing both together, install the checkout in editable mode into PhaseFlow's
environment:

```bash
pip install -e "/path/to/CAOS_OreBlocks[milp]"
```

A bake made that way records the checkout's `__version__` in every manifest (`engine.oreblocks`), and
`scripts/check_artifacts.py` fails if that differs from the pin in `requirements.txt`, so an artifact baked
from an unreleased engine cannot be committed under a released pin by accident.
