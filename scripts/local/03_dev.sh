#!/usr/bin/env bash
# 03 - run the site locally on http://localhost:5173
set -euo pipefail
cd "$(dirname "$0")/../../frontend"
[ -d node_modules ] || npm install
node copy-data.mjs                     # overlay data/derived into public/data
npm run dev
