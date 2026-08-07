"""PhaseFlow's repo-local build tooling: the offline pipeline that bakes the committed evidence.

This is NOT a package. Per conventions/no-internal-packages.md and ADR-0057, a product declares no
package of its own; if an engine is required it is a separate repo with a published PyPI project.
PhaseFlow's engine is `oreblocks`, consumed as a pinned dependency. Everything here is repo-local
tooling invoked by path: `python data-pipeline/run.py`.
"""

__version__ = "0.01.000"  # display X.XX.XXX; the frontend manifest carries the semver form
