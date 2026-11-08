# CRUCIBLE

**Release 1.4** — **Learn the craft. Hire the proof.**

Crucible is a **learning arena** and **employer testing floor**. Learners practice with short lessons and a **hand-authored** problem bank; employers assign timed assessments and review scorecards. Coding judges (TypeScript, JavaScript, Python, Go, Rust, Java) run in **Docker** when a worker is attached (`JUDGE_ONLINE=true`). Without a worker, Run/Submit stay **offline** (fail closed).

Core loop: **Learn → Practice → timed assessment → qualification profile.**

Optional competition surfaces (`/tournaments`, `/leaderboards`, `/ai-vs-human`, …) exist but stay secondary until the learner loop is solid. Plan notes: [docs/COMPETITION_PLATFORM_PLAN.md](docs/COMPETITION_PLATFORM_PLAN.md).

## Learning

| Path | Route | What you get |
|------|-------|----------------|
| **Learning hub** | `/learn` | Level, XP, streak; today’s goals; craft paths |
| **Learn Arcade** | `/learn/games` | Four hand-built games |
| **Interview Craft** | `/learn/interview` | Interview loop + patterns |
| **AI Craft** | `/learn/ai` | Prompting → agents → evals |
| **Problem bank** | `/challenges` | Hand-authored core by default |
| **Company mocks** | `/interview` | Timed rounds (signed-in) |
| **Jobs** | `/jobs` | Aggregated official career links |

Guests can use **Learn** + **Practice**. Mocks, jobs, and compete require sign-in.

## Challenge library

- **Hand-authored core** — curated projects + coding problems (default UI).
- **Generated practice volume** — procedural `q-*` / `exp-*` variants for signed-in users who opt in. Not claimed as company interview transcripts.

## Tracks (assessment focus)

Core hiring/practice tracks: Software Engineering, Cybersecurity, Secure Full-Stack, Platform/SRE, Data/ML, Mobile, Privacy — plus industry packs when seeded. Skills on profiles: **claimed**, **portfolio**, **assessment-verified**, **human-reviewed**.

## Elite scoring (100)

Default engineering weights: Frontend 10 · Backend 15 · Database 10 · Architecture 15 · Infrastructure 10 · Security 10 · Testing 10 · Problem-solving 10 · Performance 5 · Collaboration 5.

Qualification requires strong category scores, harness evidence when the judge is online, and **human reviewer approval** where configured.

## Deploy (stable)

### Cursor Publish

Publish the app folder with `cursor-app.json` (`"database": "postgres"`). Set secrets: `SESSION_SECRET`, `SETUP_SECRET`, `DEMO_SKIP_EMAIL_VERIFY` (demo only), leave `ALLOW_MOCK_BILLING` unset in production, leave `JUDGE_ONLINE` unset until a Docker worker exists.

### Vercel + Neon

See **[docs/VERCEL.md](docs/VERCEL.md)**.

```bash
vercel login && vercel link
vercel env add DATABASE_URL   # Neon pooled URL
vercel env add SESSION_SECRET
vercel env add SETUP_SECRET
vercel env add EXECUTION_MODE   # docker
vercel env add NEXT_PUBLIC_APP_URL
# Do NOT set ALLOW_MOCK_BILLING or JUDGE_ONLINE until ready
vercel --prod
curl -X POST https://YOUR_APP.vercel.app/api/setup \
  -H 'content-type: application/json' \
  -d '{"secret":"YOUR_SETUP_SECRET","seed":true}'
```

## Quick start (local)

```bash
cp .env.example .env
# Start Postgres (+ Redis optional)
npm install
npx prisma db push
npm run db:seed
npm run dev          # http://localhost:3847
# Optional: JUDGE_ONLINE=true + npm run dev:worker when Docker is available
```

## Accounts

Register at `/register`. With `DEMO_SKIP_EMAIL_VERIFY=true`, registration signs you in immediately (local/demo only).

Demo staff/candidate accounts are **optional** (`ALLOW_DEMO_ACCOUNTS=true` + `DEMO_*` passwords) — never commit those values.

## Hiring loop (keep lean)

1. Create assessment → 2. Assign candidate → 3. Candidate completes workspace → 4. Review / scorecard.

Admin competition auto-run / AI plane stay behind `NEXT_PUBLIC_ENABLE_ADMIN_SPRAWL=true` until this path is crisp.
