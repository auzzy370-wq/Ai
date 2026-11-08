#!/usr/bin/env bash
# Run AFTER you claimed Neon + Vercel into your own accounts.
# Usage:
#   export DATABASE_URL='postgresql://...neon.tech/neondb?sslmode=require'
#   export VERCEL_PROJECT_URL='https://your-app.vercel.app'   # optional until after first deploy
#   ./scripts/finish-claimed-setup.sh

set -euo pipefail
cd "$(dirname "$0")/.."

need() { [[ -n "${!1:-}" ]] || { echo "Missing env: $1"; exit 1; }; }
need DATABASE_URL

echo "==> Prisma migrate + seed on claimed Neon"
npx prisma migrate deploy
npm run db:seed

if ! npx vercel whoami >/dev/null 2>&1; then
  echo "==> Log into Vercel (browser)"
  npx vercel login
fi

echo "==> Link / create project (pick a NEW name, not your old site)"
npx vercel link --yes || true

SETUP_SECRET="${SETUP_SECRET:-$(openssl rand -hex 16)}"
SESSION_SECRET="${SESSION_SECRET:-$(openssl rand -hex 32)}"
APP_URL="${VERCEL_PROJECT_URL:-}"

add_env() {
  local key="$1" val="$2"
  printf '%s' "$val" | npx vercel env add "$key" production --force >/dev/null
  printf '%s' "$val" | npx vercel env add "$key" preview --force >/dev/null
  echo "  set $key"
}

echo "==> Push env vars"
add_env DATABASE_URL "$DATABASE_URL"
add_env SESSION_SECRET "$SESSION_SECRET"
add_env SETUP_SECRET "$SETUP_SECRET"
add_env AI_FALLBACK_MOCK true
add_env EXECUTION_MODE docker

echo "==> Deploy production"
npx vercel --prod --yes | tee /tmp/vercel-prod.out
PROD_URL="$(grep -Eo 'https://[^ ]+\.vercel\.app' /tmp/vercel-prod.out | tail -1 || true)"
if [[ -n "$PROD_URL" ]]; then
  add_env NEXT_PUBLIC_APP_URL "$PROD_URL"
  add_env APP_URL "$PROD_URL"
  echo "==> Redeploy with APP_URL"
  npx vercel --prod --yes | tee /tmp/vercel-prod2.out
  PROD_URL="$(grep -Eo 'https://[^ ]+\.vercel\.app' /tmp/vercel-prod2.out | tail -1 || true)"
fi

echo
echo "DONE"
echo "  App:   ${PROD_URL:-check Vercel dashboard}"
echo "  Login: register at /register (set DEMO_* env for local demos)"
echo "  SETUP_SECRET saved for this shell: $SETUP_SECRET"
echo "  If users missing: curl -X POST \"\$APP/api/setup\" -H 'content-type: application/json' -d '{\"secret\":\"$SETUP_SECRET\",\"seed\":true}'"
echo
echo "  If the browser shows 403 FORBIDDEN (iad1::…):"
echo "    Vercel → Project → Settings → Deployment Protection → Disabled"
echo "    Claiming a *.tmp.now URL turns protection on; that is not an app bug."
