#!/usr/bin/env bash
# Runs the API (port 8000) and the web app (port 3000) together. Ctrl+C stops both.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

cd "$ROOT/backend"
if [ ! -d .venv ]; then
  python3 -m venv .venv
  .venv/bin/pip install -q -r requirements.txt pytest
fi
.venv/bin/uvicorn app.main:app --reload --port 8000 &
API=$!

cd "$ROOT/web"
[ -d node_modules ] || npm install --no-audit --no-fund
npx next dev -p 3000 &
WEB=$!

trap 'kill $API $WEB 2>/dev/null' EXIT INT TERM
echo "DrishtiSaathi: http://localhost:3000  (API http://localhost:8000/docs)"
wait
