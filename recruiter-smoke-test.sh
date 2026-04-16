#!/usr/bin/env bash
set -euo pipefail

BASE_BACKEND="${1:-http://localhost:3001}"
BASE_FRONTEND="${2:-http://localhost:5173}"

pass() { echo "PASS: $1"; }
fail() { echo "FAIL: $1"; exit 1; }

curl -fsS "$BASE_BACKEND/health/live" >/dev/null || fail "health/live unreachable"
pass "Backend liveness endpoint"

READY_JSON="$(curl -sS "$BASE_BACKEND/health/ready")"
echo "$READY_JSON" | grep -q '"status":"ready"' || fail "health/ready is not ready"
pass "Backend readiness endpoint"

PROBLEMS_JSON="$(curl -sS "$BASE_BACKEND/api/problems")"
echo "$PROBLEMS_JSON" | grep -q '"success":true' || fail "Problems endpoint failed"
pass "Problems endpoint"

SESSION_ID="$(curl -sS -X POST "$BASE_BACKEND/api/sessions" -H 'Content-Type: application/json' -d '{"problem_id":"p001","user_fingerprint":"fp_recruiter_smoke"}' | sed -E 's/.*"session_id":"([^"]+)".*/\1/')"
[[ -n "$SESSION_ID" ]] || fail "Session creation failed"
pass "Session creation"

HINT_OUTPUT="$(curl -sS -N -X POST "$BASE_BACKEND/api/hints" -H 'Content-Type: application/json' -d "{\"session_id\":\"$SESSION_ID\",\"hint_level\":1,\"user_code\":\"def two_sum(nums, target):\\n    pass\"}" | sed -n '1,30p')"
echo "$HINT_OUTPUT" | grep -q '"type":"delta"' || fail "Hint streaming did not emit delta"
pass "Hint streaming"

CODE='def two_sum(nums, target):\n    seen = {}\n    for i, n in enumerate(nums):\n        if target - n in seen:\n            return [seen[target - n], i]\n        seen[n] = i\n    return []'
EXEC_JSON="$(curl -sS -X POST "$BASE_BACKEND/api/execute" -H 'Content-Type: application/json' -d "{\"session_id\":\"$SESSION_ID\",\"code\":\"$CODE\",\"run_tests\":true}")"
echo "$EXEC_JSON" | grep -q '"success":true' || true
echo "$EXEC_JSON" | grep -q '"solved":true' || fail "Execute endpoint did not solve known-good test"
pass "Execute + test runner"

curl -fsS "$BASE_FRONTEND" >/dev/null || fail "Frontend root unavailable"
pass "Frontend availability"

curl -fsS "$BASE_FRONTEND/api/problems" >/dev/null || fail "Frontend API proxy unavailable"
pass "Frontend API proxy"

echo "All recruiter smoke checks passed."
