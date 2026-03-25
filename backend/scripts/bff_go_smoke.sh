#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
GO_PORT="${GO_PORT:-1029}"
BFF_PORT="${BFF_PORT:-25500}"
TMP_DIR="${TMPDIR:-/tmp}"
GO_LOG="${TMP_DIR%/}/go_smoke_${GO_PORT}.log"
BFF_LOG="${TMP_DIR%/}/bff_smoke_${BFF_PORT}.log"
RESP_BODY="${TMP_DIR%/}/bff_smoke_resp_$$.txt"

GO_PID=""
BFF_PID=""

cleanup() {
  local code=$?
  if [[ -n "${BFF_PID}" ]]; then
    kill "${BFF_PID}" >/dev/null 2>&1 || true
    wait "${BFF_PID}" >/dev/null 2>&1 || true
  fi
  if [[ -n "${GO_PID}" ]]; then
    kill "${GO_PID}" >/dev/null 2>&1 || true
    wait "${GO_PID}" >/dev/null 2>&1 || true
  fi
  rm -f "${RESP_BODY}"
  return ${code}
}
trap cleanup EXIT

wait_http() {
  local url="$1"
  local max_attempts="${2:-40}"
  local sleep_sec="${3:-0.5}"

  for ((i=1; i<=max_attempts; i++)); do
    if curl -sS -m 2 "$url" >/dev/null 2>&1; then
      return 0
    fi
    sleep "$sleep_sec"
  done

  echo "[FAIL] Timeout waiting for ${url}"
  return 1
}

request_status() {
  local method="$1"
  local url="$2"
  local data="${3:-}"

  if [[ -n "$data" ]]; then
    curl -sS -o "$RESP_BODY" -w "%{http_code}" -X "$method" \
      -H 'Content-Type: application/json' \
      -d "$data" \
      "$url"
  else
    curl -sS -o "$RESP_BODY" -w "%{http_code}" -X "$method" "$url"
  fi
}

assert_status() {
  local name="$1"
  local status="$2"
  shift 2
  local expected=("$@")

  for code in "${expected[@]}"; do
    if [[ "$status" == "$code" ]]; then
      echo "[PASS] ${name}: ${status}"
      return 0
    fi
  done

  echo "[FAIL] ${name}: got ${status}, expected one of: ${expected[*]}"
  if [[ -f "$RESP_BODY" ]]; then
    echo "------ response body ------"
    cat "$RESP_BODY"
    echo
    echo "---------------------------"
  fi
  return 1
}

echo "[INFO] Starting Go API on :${GO_PORT}"
(
  cd "${ROOT_DIR}/go"
  nohup env \
    GO_API_PORT="${GO_PORT}" \
    REDIS_ENABLED=false \
    DB_DRIVER=sqlite \
    DB_DSN=data/yuexiang.db \
    go run ./cmd/main.go >"${GO_LOG}" 2>&1 &
  GO_PID=$!
  echo "${GO_PID}" > "${TMP_DIR%/}/go_smoke_pid_$$.txt"
)
GO_PID="$(cat "${TMP_DIR%/}/go_smoke_pid_$$.txt")"
rm -f "${TMP_DIR%/}/go_smoke_pid_$$.txt"

wait_http "http://127.0.0.1:${GO_PORT}/health" 60 0.5

echo "[INFO] Starting BFF on :${BFF_PORT}, forwarding to Go :${GO_PORT}"
(
  cd "${ROOT_DIR}/bff"
  nohup env \
    GO_API_URL="http://127.0.0.1:${GO_PORT}" \
    BFF_PORT="${BFF_PORT}" \
    node src/index.js >"${BFF_LOG}" 2>&1 &
  BFF_PID=$!
  echo "${BFF_PID}" > "${TMP_DIR%/}/bff_smoke_pid_$$.txt"
)
BFF_PID="$(cat "${TMP_DIR%/}/bff_smoke_pid_$$.txt")"
rm -f "${TMP_DIR%/}/bff_smoke_pid_$$.txt"

wait_http "http://127.0.0.1:${BFF_PORT}/health" 60 0.5

status="$(request_status GET "http://127.0.0.1:${BFF_PORT}/health")"
assert_status "BFF health" "$status" 200

status="$(request_status GET "http://127.0.0.1:${BFF_PORT}/api/shops")"
assert_status "BFF -> Go shops" "$status" 200

status="$(request_status GET "http://127.0.0.1:${BFF_PORT}/api/verify-token")"
assert_status "BFF verify-token (unauthorized expected)" "$status" 401

status="$(request_status POST "http://127.0.0.1:${BFF_PORT}/api/auth/login" '{"phone":"13800138000","password":"invalid","loginType":"password"}')"
assert_status "BFF login passthrough" "$status" 400 401

echo
printf '[DONE] Smoke passed. Go log: %s\n' "$GO_LOG"
printf '[DONE] Smoke passed. BFF log: %s\n' "$BFF_LOG"
