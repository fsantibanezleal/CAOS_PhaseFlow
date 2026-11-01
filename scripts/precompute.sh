#!/usr/bin/env bash
# Run the offline pipeline in .venv-pipeline. Pass --output with an external candidate root.
set -euo pipefail
cd "$(dirname "$0")/.."
VP=".venv-pipeline/bin/python"; [ -x "$VP" ] || VP=".venv-pipeline/Scripts/python.exe"
"$VP" data-pipeline/run.py "$@"
