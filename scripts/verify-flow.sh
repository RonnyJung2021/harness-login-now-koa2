#!/usr/bin/env bash
# 串行验收：注册随机用户 → 登录 → /me → logout → /me 应 401
# 依赖：curl；服务已启动（默认 http://127.0.0.1:4000，可用 BASE_URL 覆盖）
set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:4000}"
COOKIE_JAR="$(mktemp "${TMPDIR:-/tmp}/verify-flow-cookies.XXXXXX")"
cleanup() { rm -f "$COOKIE_JAR"; }
trap cleanup EXIT

USERNAME="verify_$(date +%s)_${RANDOM}_$$"

expect_http() {
  local step="$1"
  local want="$2"
  local got="$3"
  if [[ "$got" != "$want" ]]; then
    echo "verify-flow: 失败 — ${step} 期望 HTTP ${want}，实际 ${got}" >&2
    exit 1
  fi
}

# 1) 注册
code="$(curl -sS -o /dev/null -w '%{http_code}' \
  -H 'Content-Type: application/json' \
  -d "{\"username\":\"${USERNAME}\",\"password\":\"VerifyPass1\"}" \
  "${BASE_URL}/register")"
expect_http "POST /register" 201 "$code"

# 2) 登录（写入 Cookie 罐）
code="$(curl -sS -o /dev/null -w '%{http_code}' \
  -c "$COOKIE_JAR" \
  -H 'Content-Type: application/json' \
  -d "{\"username\":\"${USERNAME}\",\"password\":\"VerifyPass1\"}" \
  "${BASE_URL}/login")"
expect_http "POST /login" 200 "$code"

# 3) 带 Cookie 访问 /me
code="$(curl -sS -o /dev/null -w '%{http_code}' \
  -b "$COOKIE_JAR" \
  "${BASE_URL}/me")"
expect_http "GET /me（已登录）" 200 "$code"

# 4) 登出（读写 Cookie 罐以接收 Set-Cookie 清除）
code="$(curl -sS -o /dev/null -w '%{http_code}' \
  -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
  -X POST \
  "${BASE_URL}/logout")"
expect_http "POST /logout" 200 "$code"

# 5) 再访问 /me 应未授权
code="$(curl -sS -o /dev/null -w '%{http_code}' \
  -b "$COOKIE_JAR" \
  "${BASE_URL}/me")"
expect_http "GET /me（登出后）" 401 "$code"

echo "verify-flow: 通过（用户 ${USERNAME}）"
