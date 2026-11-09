# Deploy CRUCIBLE on Vercel

Vercel runs the Next.js control plane. You still need a **hosted Postgres** database (Neon is the simplest free option). Redis is optional (rate limiting fails open). Sandboxed Docker execution is **not** available on Vercel — set `EXECUTION_MODE=docker` and attach a separate worker with a Docker daemon for Run/Judge; without it those jobs fail closed.

## 1. Create a Neon Postgres database (free)

1. Go to [https://console.neon.tech](https://console.neon.tech) and create a project.
2. Copy the connection string (`DATABASE_URL`). Prefer the **pooled** URL for serverless (`-pooler` host) and append `?sslmode=require` if missing.

## 2. Deploy from your machine

```bash
npm i -g vercel
vercel login
vercel link   # create/link project

vercel env add DATABASE_URL
vercel env add SESSION_SECRET
vercel env add SETUP_SECRET
vercel env add AI_FALLBACK_MOCK
vercel env add EXECUTION_MODE
vercel env add NEXT_PUBLIC_APP_URL
# optional: OPENAI_API_KEY, APP_URL
# Do NOT set REDIS_URL to redis://localhost — that hangs login on serverless.
# Only set REDIS_URL to a real hosted Redis (e.g. Upstash) if you need rate limits.

vercel --prod
```

Suggested values:

| Env | Example |
|-----|---------|
| `DATABASE_URL` | Neon pooled connection string |
| `SESSION_SECRET` | long random string |
| `SETUP_SECRET` | long random string (for `/api/setup`) |
| `AI_FALLBACK_MOCK` | `true` |
| `EXECUTION_MODE` | `docker` (Run/Judge need a worker; Vercel alone fails closed) |
| `NEXT_PUBLIC_APP_URL` | `https://your-app.vercel.app` |
| `APP_URL` | same as above |
| `REDIS_URL` | omit on Vercel, or use Upstash — never localhost |

Add env vars for **Production**, **Preview**, and **Development** as needed. `DATABASE_URL` must also be available at **build** time so `prisma migrate deploy` can run.

## 3. Seed the database once

After the first successful deploy:

```bash
curl -X POST https://YOUR_APP.vercel.app/api/setup \
  -H 'content-type: application/json' \
  -d '{"secret":"YOUR_SETUP_SECRET","seed":true}'
```

Then open `/login` and use:

- `admin@crucible.local` / `[set via DEMO_ADMIN_PASSWORD]`
- `cyber@crucible.local` / `[set via DEMO_CANDIDATE_PASSWORD]`

## 4. Health check

```bash
curl https://YOUR_APP.vercel.app/api/setup
```

## 403 FORBIDDEN after claiming a temporary URL

Anonymous `*.tmp.now` deploys are public. **Claiming** them into your Vercel account often enables **Deployment Protection** (Vercel Authentication). Browsers then see:

```text
This request was blocked
403 FORBIDDEN
iad1::…
```

That is Vercel’s edge gate — not an app bug.

**Fix (claimed project):** Vercel → Project → **Settings** → **Deployment Protection** → set to **Disabled** (or Standard Protection only for Preview), then hard-refresh.

**Or skip claiming:** use the `*.tmp.now` link as-is (expires ~1 hour), or run locally on port `3847`.

Do **not** claim a temp deploy if you only want a quick public demo URL. Claiming is what turns a working link into `403 FORBIDDEN`.

If you already claimed and need the app immediately: disable Deployment Protection (above), or open the Cloud Agent port `3847` preview / a Cloudflare tunnel to that port instead of the Vercel URL.

## Limits on Vercel (intentional)

- No long-running execution worker / Docker-in-Docker for candidate sandboxes.
- Local `/tmp` storage is ephemeral (workspace file content still lives in Postgres).
- For full isolated grading, run `docker compose` or a dedicated worker host; use Vercel for the UI + API control plane.
