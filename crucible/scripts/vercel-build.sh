#!/usr/bin/env bash
set -euo pipefail
prisma generate
if [[ -n "${DATABASE_URL_UNPOOLED:-}" ]]; then
  DATABASE_URL="$DATABASE_URL_UNPOOLED" prisma db push --accept-data-loss
elif [[ -n "${DATABASE_URL:-}" ]]; then
  prisma db push --accept-data-loss
else
  echo "Skipping db sync (no DATABASE_URL)"
fi
next build
