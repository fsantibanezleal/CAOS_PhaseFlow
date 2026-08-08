#!/usr/bin/env bash
# 00 - SYSTEM prerequisites. CHECKS by default; installing is the reader's job on Linux and macOS,
# where a script that reaches for a package manager is a script that breaks a working machine.
# Versions are the ones CI pins (.github/workflows/ci.yml), so passing here means passing there.
set -euo pipefail

PY_MIN="3.12"
NODE_MIN="20"
ok=0

have() { command -v "$1" >/dev/null 2>&1; }
ver_ge() { [ "$(printf '%s\n%s\n' "$2" "$1" | sort -V | head -1)" = "$2" ]; }

if have python3 || have python; then
  PY=$(command -v python3 || command -v python)
  v=$("$PY" -c 'import sys;print("%d.%d"%sys.version_info[:2])')
  if ver_ge "$v" "$PY_MIN"; then echo "ok    python $v ($PY)"; else echo "FAIL  python $v, CI pins $PY_MIN"; ok=1; fi
else
  echo "FAIL  python not found; CI pins $PY_MIN"; ok=1
fi

if have node; then
  v=$(node -v | tr -d v)
  if ver_ge "$v" "$NODE_MIN"; then echo "ok    node $v"; else echo "FAIL  node $v, CI pins $NODE_MIN"; ok=1; fi
else
  echo "FAIL  node not found; CI pins $NODE_MIN"; ok=1
fi

if have git; then echo "ok    git $(git --version | awk '{print $3}')"; else echo "FAIL  git not found"; ok=1; fi

if [ "$ok" -ne 0 ]; then
  echo
  echo "Install the missing prerequisites, then run this again."
  exit 1
fi
echo
echo "Next:  ./scripts/local/01_init.sh"
