"""PhaseFlow's repo-local build tooling: the offline pipeline that bakes the committed evidence.

This is NOT a package. Per conventions/no-internal-packages.md and ADR-0057, a product declares no
package of its own; if an engine is required it is a separate repo with a published PyPI project.
PhaseFlow's engine is `oreblocks`, consumed as a pinned dependency. Everything here is repo-local
tooling invoked by path: `python data-pipeline/run.py`.
"""

# Read from the repo's VERSION file rather than restated here. A second copy of a version is a
# second thing to forget: this one was a release behind and stamped 0.01.000 onto every artifact of
# the 0.02.000 bake, including the cache-busting query the frontend appends to each fetch.
import pathlib

__version__ = (
    (pathlib.Path(__file__).resolve().parents[2] / "VERSION").read_text(encoding="utf-8").strip()
)
