#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 1 ]; then
  echo "usage: scripts/setup-frontier-training.sh <external-venv-path>" >&2
  exit 2
fi
REPO="$(cd "$(dirname "$0")/.." && pwd -P)"
TARGET="$(realpath -m "$1")"
case "$TARGET" in
  "$REPO"|"$REPO"/*)
    echo "the frontier training environment must be outside the repository: $TARGET" >&2
    exit 2
    ;;
esac
PYTHON_BIN="${PYTHON:-python3}"
if [ -e "$TARGET" ]; then
  if [ ! -x "$TARGET/bin/python" ]; then
    echo "the requested path exists but is not a POSIX virtual environment: $TARGET" >&2
    exit 2
  fi
else
  "$PYTHON_BIN" -m venv "$TARGET"
fi
"$TARGET/bin/python" -m pip install --disable-pip-version-check -r "$REPO/requirements-frontier-training.txt"
"$TARGET/bin/python" -c "import torch; assert torch.__version__.startswith('2.14.1'); assert not torch.cuda.is_available(); print('frontier training environment:', torch.__version__, 'CPU')"
