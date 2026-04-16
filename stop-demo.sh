#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUN_DIR="$ROOT_DIR/.run"

kill_port() {
  local port="$1"
  local ids
  ids="$(lsof -ti tcp:"$port" 2>/dev/null || true)"
  if [[ -n "$ids" ]]; then
    kill -9 $ids >/dev/null 2>&1 || true
  fi
}

if [[ -f "$RUN_DIR/backend.pid" ]]; then
  kill "$(cat "$RUN_DIR/backend.pid")" >/dev/null 2>&1 || true
fi
if [[ -f "$RUN_DIR/frontend.pid" ]]; then
  kill "$(cat "$RUN_DIR/frontend.pid")" >/dev/null 2>&1 || true
fi

kill_port 3001
kill_port 5173
kill_port 5174

echo "Demo servers stopped."
