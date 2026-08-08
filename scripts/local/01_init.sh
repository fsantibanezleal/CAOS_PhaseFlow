#!/usr/bin/env bash
# 01 - one-stop setup from a fresh clone. Idempotent: safe to run again at any time.
#
# ONE virtualenv. The archetype's two-venv split exists for products whose offline lane pulls heavy
# wheels the runtime lane must not have; PhaseFlow's offline lane needs numpy, oreblocks, scipy, onnx
# and onnxruntime, and a second environment would only be a second thing to keep in sync.
set -euo pipefail
cd "$(dirname "$0")/../.."

PY="${PYTHON:-python3}"
command -v "$PY" >/dev/null 2>&1 || PY=python

[ -d .venv ] || "$PY" -m venv .venv
VENV=".venv/bin/python"; [ -x "$VENV" ] || VENV=".venv/Scripts/python.exe"

echo "[01] python deps (offline lane + dev)"
"$VENV" -m pip install --upgrade pip -q
"$VENV" -m pip install -q -r requirements-precompute.txt -r requirements-dev.txt

echo "[01] frontend packages"
( cd frontend && if [ -f package-lock.json ]; then npm ci; else npm install; fi )

# PhaseFlow is a static replay site with no backend and no secrets: .env exists so the archetype's
# dormant app/ lane has one, and it is copied from the committed example rather than a vault.
if [ ! -f .env ] && [ -f .env.example ]; then
  cp .env.example .env
  echo "[01] .env created from .env.example (no secrets: this product has none)"
fi

if [ ! -f data/derived/manifests/index.json ]; then
  echo "[01] no artifacts on disk yet -> running 02_generate-data.sh into the sandbox"
  ./scripts/local/02_generate-data.sh
fi

echo
echo "Next:  ./scripts/local/03_dev.sh"
