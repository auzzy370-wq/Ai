#!/usr/bin/env bash
set -euo pipefail
# Requires: vercel login + vercel link, and env vars exported (see vercel-env.example.sh)

need() { [[ -n "${!1:-}" ]] || { echo "Missing $1"; exit 1; }; }
need DATABASE_URL
need SESSION_SECRET
need SETUP_SECRET
need NEXT_PUBLIC_APP_URL

add() {
  local key="$1" val="$2"
  printf '%s' "$val" | vercel env add "$key" production --force
  printf '%s' "$val" | vercel env add "$key" preview --force
}

add DATABASE_URL "$DATABASE_URL"
add SESSION_SECRET "$SESSION_SECRET"
add SETUP_SECRET "$SETUP_SECRET"
add AI_FALLBACK_MOCK "${AI_FALLBACK_MOCK:-true}"
add EXECUTION_MODE "${EXECUTION_MODE:-docker}"
add NEXT_PUBLIC_APP_URL "$NEXT_PUBLIC_APP_URL"
add APP_URL "${APP_URL:-$NEXT_PUBLIC_APP_URL}"

echo "Env pushed. Deploy with: vercel --prod"
echo "Then seed: curl -X POST \"\$NEXT_PUBLIC_APP_URL/api/setup\" -H 'content-type: application/json' -d \"{\\\"secret\\\":\\\"$SETUP_SECRET\\\",\\\"seed\\\":true}\""
