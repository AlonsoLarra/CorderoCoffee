#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"

echo "Running smoke checks against ${BASE_URL}"

check_get() {
  local path="$1"
  local expected="$2"
  local code
  code=$(curl -s -o /tmp/cordero_smoke_body -w "%{http_code}" "${BASE_URL}${path}")

  if [[ "$code" != "$expected" ]]; then
    echo "[FAIL] GET ${path} expected ${expected}, got ${code}"
    cat /tmp/cordero_smoke_body
    exit 1
  fi

  echo "[OK] GET ${path} -> ${code}"
}

check_post() {
  local path="$1"
  local expected="$2"
  local payload="$3"
  local code
  code=$(curl -s -o /tmp/cordero_smoke_body -w "%{http_code}" -X POST "${BASE_URL}${path}" -H "Content-Type: application/json" -d "$payload")

  if [[ "$code" != "$expected" ]]; then
    echo "[FAIL] POST ${path} expected ${expected}, got ${code}"
    cat /tmp/cordero_smoke_body
    exit 1
  fi

  echo "[OK] POST ${path} -> ${code}"
}

check_get "/" "200"
check_get "/acceso" "200"
check_get "/pedido" "200"
check_get "/admin" "307"
check_get "/pedido/confirmacion" "200"

# Intentional bad payload should fail cleanly.
check_post "/api/orders" "400" '{}'

echo "Smoke checks finished successfully."
