#!/usr/bin/env bash
# Start the What-If Lab dev server on a fixed port.
#
#   ./scripts/dev.sh            start on http://localhost:5050
#   ./scripts/dev.sh --clean    also delete .next first (use after `npm run build`)
#   PORT=5060 ./scripts/dev.sh  use another port
#
# If something is already listening on the port, the script stops it when it is
# a Next.js server and refuses otherwise, so it never kills an unrelated app.
set -euo pipefail

PORT="${PORT:-5050}"
cd "$(dirname "$0")/.."

if [[ "${1:-}" == "--clean" ]]; then
  echo "Removing .next"
  rm -rf .next
fi

pids="$(lsof -nP -tiTCP:"$PORT" -sTCP:LISTEN 2>/dev/null || true)"
for pid in $pids; do
  cmd="$(ps -o command= -p "$pid" 2>/dev/null || true)"
  if [[ "$cmd" == *next* ]]; then
    echo "Stopping old Next.js server on port $PORT (pid $pid)"
    kill "$pid"
  else
    echo "Port $PORT is used by another program: $cmd" >&2
    echo "Free it or run with another port, e.g. PORT=5060 ./scripts/dev.sh" >&2
    exit 1
  fi
done

# Wait for the port to free up.
for _ in {1..20}; do
  lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1 || break
  sleep 0.25
done

[[ -d node_modules ]] || npm install

echo "What-If Lab → http://localhost:$PORT  (Ctrl+C to stop)"
exec npx next dev -p "$PORT"
