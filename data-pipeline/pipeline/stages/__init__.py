"""The named stages. `solve` runs the method ladder; `evaluate` runs the controls and the held-out
learned scores. Ingest, preprocess and feature extraction live with the domain in `model/`, and
export/validate are in the orchestrator, so every stage has a real body and none is a no-op shim.
"""
