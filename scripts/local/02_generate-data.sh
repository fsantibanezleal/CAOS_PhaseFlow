#!/usr/bin/env bash
# 02 - bake the artifacts.
#
# SANDBOX BY DEFAULT. Writing into data/derived/ overwrites the committed evidence the site ships, so
# it takes an explicit --release. Pass a case id to bake one; omit it for all thirteen. The whole set
# takes hours, not minutes: the PCPSP LP and the two sliding windows on the 14,400-block twins run for
# hours each, so the cases are baked side by side, PHASEFLOW_BAKE_JOBS at a time (default 4; the 0.08
# release ran 8 on a 32-core, 48 GB workstation). It prints a line per case as each lands.
#
#   ./scripts/local/02_generate-data.sh                     # all cases -> build/local
#   ./scripts/local/02_generate-data.sh twin-porphyry-l     # one case  -> build/local
#   ./scripts/local/02_generate-data.sh --release           # all cases -> data/derived  (a RELEASE bake)
set -euo pipefail
cd "$(dirname "$0")/../.."
VENV=".venv/bin/python"; [ -x "$VENV" ] || VENV=".venv/Scripts/python.exe"

RELEASE=0
ARGS=()
for a in "$@"; do
  if [ "$a" = "--release" ]; then RELEASE=1; else ARGS+=("$a"); fi
done
CASE="${ARGS[0]:-all}"

if [ "$RELEASE" -eq 1 ]; then
  if [ "$CASE" != "all" ]; then
    echo "refusing: a release bake must be the WHOLE case set."
    echo "A tree mixing two engine versions passes every per-case check there is."
    exit 1
  fi
  echo "[02] RELEASE bake -> data/derived (the committed artifacts)"
  "$VENV" -u data-pipeline/run.py all --learned --jobs "${PHASEFLOW_BAKE_JOBS:-4}"
  "$VENV" scripts/check_artifacts.py
else
  echo "[02] sandbox bake -> build/local (pass --release to write the committed artifacts)"
  if [ "$CASE" = "all" ]; then
    "$VENV" -u data-pipeline/run.py all --learned --output build/local --jobs "${PHASEFLOW_BAKE_JOBS:-4}"
  else
    "$VENV" -u data-pipeline/run.py "$CASE" --learned --output build/local
  fi
fi

echo
echo "Next:  ./scripts/local/03_dev.sh"
