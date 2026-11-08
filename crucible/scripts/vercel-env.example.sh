#!/usr/bin/env bash
# Copy, fill, then: source scripts/vercel-env.local.sh && ./scripts/push-vercel-env.sh
# Or set these in the Vercel dashboard → Project → Settings → Environment Variables

export DATABASE_URL='postgresql://USER:PASSWORD@HOST/db?sslmode=require'
export SESSION_SECRET="$(openssl rand -hex 32)"
export SETUP_SECRET="$(openssl rand -hex 16)"
export AI_FALLBACK_MOCK='true'
export EXECUTION_MODE='docker'
export NEXT_PUBLIC_APP_URL='https://YOUR_PROJECT.vercel.app'
export APP_URL='https://YOUR_PROJECT.vercel.app'
