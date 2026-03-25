#!/usr/bin/env bash
set -euo pipefail

IOS_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REPO_ROOT="$(cd "$IOS_ROOT/../.." && pwd)"

GO_DIR="$REPO_ROOT/backend/go"
BFF_DIR="$REPO_ROOT/backend/bff"

GO_PORT="${GO_PORT:-1029}"
BFF_PORT="${BFF_PORT:-25500}"

GO_LOG="${GO_LOG:-/tmp/yuexiang_go_${GO_PORT}.log}"
BFF_LOG="${BFF_LOG:-/tmp/yuexiang_bff_${BFF_PORT}.log}"
GO_HEALTH_URL="${GO_HEALTH_URL:-http://127.0.0.1:${GO_PORT}/health}"
BFF_HEALTH_URL="${BFF_HEALTH_URL:-http://127.0.0.1:${BFF_PORT}/api/openclaw/config}"

is_port_listening() {
  local port="$1"
  lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1
}

is_http_ready() {
  local url="$1"
  curl -sS --max-time 2 "$url" >/dev/null 2>&1
}

wait_port() {
  local port="$1"
  local retries="${2:-30}"
  local sleep_secs="${3:-1}"
  for ((i=1; i<=retries; i++)); do
    if is_port_listening "$port"; then
      return 0
    fi
    sleep "$sleep_secs"
  done
  return 1
}

wait_http() {
  local url="$1"
  local retries="${2:-30}"
  local sleep_secs="${3:-1}"
  for ((i=1; i<=retries; i++)); do
    if is_http_ready "$url"; then
      return 0
    fi
    sleep "$sleep_secs"
  done
  return 1
}

restart_port_listener() {
  local port="$1"
  local pids
  pids="$(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)"
  if [[ -n "$pids" ]]; then
    echo "[backend] Restarting listeners on :$port (pid: $pids)"
    kill $pids >/dev/null 2>&1 || true
    sleep 1
    local leftover
    leftover="$(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)"
    if [[ -n "$leftover" ]]; then
      kill -9 $leftover >/dev/null 2>&1 || true
    fi
  fi
}

start_go() {
  echo "[backend] Starting Go API on :$GO_PORT"
  (
    cd "$GO_DIR"
    nohup env GO_API_PORT="$GO_PORT" REDIS_ENABLED=false DB_DRIVER=sqlite DB_DSN=data/yuexiang.db \
      go run ./cmd/main.go >"$GO_LOG" 2>&1 &
  )
}

start_bff() {
  echo "[backend] Starting BFF on :$BFF_PORT"
  (
    cd "$BFF_DIR"
    nohup env GO_API_URL="http://127.0.0.1:${GO_PORT}" BFF_PORT="$BFF_PORT" \
      node src/index.js >"$BFF_LOG" 2>&1 &
  )
}

if is_port_listening "$GO_PORT" && is_http_ready "$GO_HEALTH_URL"; then
  echo "[backend] Go API already healthy on :$GO_PORT"
else
  restart_port_listener "$GO_PORT"
  if is_port_listening "$GO_PORT"; then
    echo "[backend] Go API port :$GO_PORT still occupied, waiting existing process to recover"
  else
    start_go
  fi
fi

if ! wait_port "$GO_PORT" 40 1; then
  echo "[backend] ERROR: Go API failed to become healthy on :$GO_PORT"
  echo "[backend] log: $GO_LOG"
  exit 1
fi

if ! wait_http "$GO_HEALTH_URL" 40 1; then
  echo "[backend] ERROR: Go API health check failed: $GO_HEALTH_URL"
  echo "[backend] log: $GO_LOG"
  exit 1
fi
echo "[backend] Go API ready on :$GO_PORT"

if is_port_listening "$BFF_PORT" && is_http_ready "$BFF_HEALTH_URL"; then
  echo "[backend] BFF already healthy on :$BFF_PORT"
else
  restart_port_listener "$BFF_PORT"
  if is_port_listening "$BFF_PORT"; then
    echo "[backend] BFF port :$BFF_PORT still occupied, waiting existing process to recover"
  else
    start_bff
  fi
fi

if ! wait_port "$BFF_PORT" 40 1; then
  echo "[backend] ERROR: BFF failed to become ready on :$BFF_PORT"
  echo "[backend] log: $BFF_LOG"
  exit 1
fi

if ! wait_http "$BFF_HEALTH_URL" 40 1; then
  echo "[backend] ERROR: BFF health check failed: $BFF_HEALTH_URL"
  echo "[backend] log: $BFF_LOG"
  exit 1
fi
echo "[backend] BFF ready: http://127.0.0.1:${BFF_PORT}"
echo "[backend] Done."
