#!/usr/bin/env bash
# Starts the API and the web server; if either stops, the container stops (and the host restarts it).
set -euo pipefail
APP="$(cd "$(dirname "$0")" && pwd)"
export PORT="${PORT:-7860}"
export SECRET_KEY="${SECRET_KEY:-$(python -c 'import secrets; print(secrets.token_hex(32))')}"
(cd "$APP/backend" && exec python -m uvicorn app.main:app --host 127.0.0.1 --port 8000) &
# Seeding the demo patients takes a few seconds; open the site once the API answers.
for _ in $(seq 1 120); do
  python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/health', timeout=1)" 2>/dev/null && break
  sleep 0.5
done
(cd "$APP/web" && HOSTNAME=0.0.0.0 exec node server.js) &
wait -n
exit 1
