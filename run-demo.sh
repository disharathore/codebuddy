#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
RUN_DIR="$ROOT_DIR/.run"

mkdir -p "$RUN_DIR"

kill_port() {
  local port="$1"
  local ids
  ids="$(lsof -ti tcp:"$port" 2>/dev/null || true)"
  if [[ -n "$ids" ]]; then
    kill -9 $ids >/dev/null 2>&1 || true
  fi
}

cleanup() {
  echo ""
  echo "Stopping demo servers..."
  if [[ -f "$RUN_DIR/backend.pid" ]]; then
    kill "$(cat "$RUN_DIR/backend.pid")" >/dev/null 2>&1 || true
  fi
  if [[ -f "$RUN_DIR/frontend.pid" ]]; then
    kill "$(cat "$RUN_DIR/frontend.pid")" >/dev/null 2>&1 || true
  fi
  kill_port 3001
  kill_port 5173
  kill_port 5174
}

trap cleanup EXIT INT TERM

if [[ ! -f "$BACKEND_DIR/.env" ]]; then
  echo "Missing backend/.env. Create it first (copy from backend/.env.example)."
  exit 1
fi

if [[ ! -f "$FRONTEND_DIR/.env" ]]; then
  cp "$FRONTEND_DIR/.env.example" "$FRONTEND_DIR/.env"
fi

kill_port 3001
kill_port 5173
kill_port 5174

if [[ ! -d "$BACKEND_DIR/node_modules" ]]; then
  echo "Installing backend dependencies..."
  npm --prefix "$BACKEND_DIR" install
fi

if [[ ! -d "$FRONTEND_DIR/node_modules" ]]; then
  echo "Installing frontend dependencies..."
  npm --prefix "$FRONTEND_DIR" install
fi

echo "Starting backend..."
node "$BACKEND_DIR/server.js" > "$RUN_DIR/backend.log" 2>&1 &
echo $! > "$RUN_DIR/backend.pid"

echo "Starting frontend..."
npm --prefix "$FRONTEND_DIR" run dev > "$RUN_DIR/frontend.log" 2>&1 &
echo $! > "$RUN_DIR/frontend.pid"

for _ in {1..40}; do
  if curl -fsS http://localhost:3001/health/ready >/dev/null 2>&1; then
    break
  fi
  sleep 0.5
done

FRONTEND_URL=""
for _ in {1..30}; do
  if curl -fsS http://localhost:5173 >/dev/null 2>&1; then
    FRONTEND_URL="http://localhost:5173"
    break
  fi
  if curl -fsS http://localhost:5174 >/dev/null 2>&1; then
    FRONTEND_URL="http://localhost:5174"
    break
  fi
  sleep 0.5
done

echo ""
echo "Demo is running"
echo "Backend health:  http://localhost:3001/health"
echo "Backend ready:   http://localhost:3001/health/ready"
echo "Frontend:        ${FRONTEND_URL:-http://localhost:5173}"
echo ""
echo "Logs"
echo "Backend:  $RUN_DIR/backend.log"
echo "Frontend: $RUN_DIR/frontend.log"
echo ""
echo "Press Ctrl+C to stop both servers."

wait
