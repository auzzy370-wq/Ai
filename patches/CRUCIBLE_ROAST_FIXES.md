# Crucible roast fixes (apply on Crucible)

This Cloud Agent cannot push to `auzzy370-wq/Crucible`. Patches live here for apply on that repo.

## Patches

1. `crucible-roast-fixes.patch` — round 1 (landing, AI vs Human, judge fail-closed, catalog honesty, …)
2. `crucible-roast-fixes-r3.patch` — round 3 (guest nav, core bank default, profile craft honesty, landing copy; includes wordmark change)
3. `crucible-revert-wordmark.patch` — **revert wordmark** back to original Turkish-ı flame tittle

Apply in order on Crucible `main`:

```bash
cd Crucible
git checkout -b cursor/roast-fixes-8ab9
git am path/to/Ai/patches/crucible-roast-fixes.patch
git am path/to/Ai/patches/crucible-roast-fixes-r3.patch
git am path/to/Ai/patches/crucible-revert-wordmark.patch
npm install && npx tsc --noEmit
git push -u origin cursor/roast-fixes-8ab9
```

## Live demo (ephemeral)

When the agent VM is up: check the active Cloudflare quick tunnel. Prefer local `http://localhost:3847`.

## Jobs + bank (2026-11-09)

Apply `crucible-jobs-bank-expand.patch` on Crucible `cursor/roast-fixes-8ab9` (or main after cherry-pick):

- Guest Jobs: `GUEST_FREE_PREFIXES`, page guard, `/api/jobs`, nav
- +12 hand-authored `lc-*` problems (starters + hidden harness)
- Neon: upsert CODING_PROBLEM_CATALOG (24 `lc-*`)

Production deploy: `vercel --prod` from local Crucible tree (GitHub push 403).

## Full original bank (2026-11-09)

Apply `crucible-full-original-bank.patch`: Practice defaults to the full
~4k question bank for guests; `?view=core` for hand-authored only.

## Landing footnote (2026-11-09)
Apply `crucible-landing-footnote.patch`: remove demo-seed / JUDGE_ONLINE from hero.

## Purple brand (2026-11-09)
Apply `crucible-purple-brand.patch`: orange → purple across tokens + logo.

## Jobs cybersecurity (2026-11-09)
Apply `crucible-jobs-cybersecurity.patch`: cyber focus chip + security keyword fetches.

## Revert purple → orange (2026-11-09)
Apply `crucible-revert-purple-to-orange.patch` after the purple brand patch (or skip purple).

## Jobs yearly pay (2026-11-09)
Apply `crucible-jobs-yearly-pay.patch`: parse and show yearly salary ranges when listed.

## Jobs descriptions + speed (2026-11-09)
Apply `crucible-jobs-desc-speed.patch`: short blurbs, SSR warm, parallel fetches, client filters.

## Jobs remote (2026-11-09)
Apply `crucible-jobs-remote.patch`: remote detect/badge, Remote focus chip, remote keyword + LinkedIn `f_WT=2` fetches.

## Security hardening (2026-11-10)
Apply `crucible-security-hardening.patch`: CSRF middleware, env guards, Jobs rate limits, password session revoke, lesson XSS fix, `/security` page + Settings security checklist.

## SEO boost (2026-11-10)
Apply `crucible-seo-boost.patch`: metadataBase/OG/Twitter, robots+sitemap, JSON-LD, public challenge SEO pages, keyword titles.

## Pro accessible + value loop (2026-11-10)
Apply `crucible-pro-accessible.patch`: $15/mo · $99/yr, no sprint; Prep nav; auth ?next= resume; post-Accepted CTAs; company mock upgrade copy.

## Flash cards (2026-11-10)
Apply `crucible-flashcards.patch`: free decks per published challenge + lesson fallbacks; /flashcards hub; guest access; nav + practice wiring.

## Judge online (2026-11-10)
Apply `crucible-judge-online.patch`:
- Vercel leaves jobs `QUEUED` (no local `processJob` without Docker)
- Execute API fail-closed when `JUDGE_ONLINE!==true`
- Worker regenerates ephemeral harnesses; absolute bind mounts; Node 22 Alpine for TS strip-types
- Ops: set Vercel `JUDGE_ONLINE=true` and run `npm run dev:worker` with production `DATABASE_URL` + Docker

## Hide AI vs Human (2026-11-10)
Apply `crucible-hide-ai-vs-human.patch`: remove Compete nav entry, redirect `/ai-vs-human` → `/learn`, scrub lesson CTAs until the bench ships.

## Study plane = college course (2026-11-10)
Apply `crucible-study-course-feel.patch`: syllabus units/weeks for Interview + AI Craft, course-catalog study plans, lecture-session lesson UX that advances in order.

## Flash card filters (2026-11-10)
Apply `crucible-flashcard-filters.patch`: hub filters for difficulty/domain/pattern/company + sort; in-deck kind filter and hide-known.

## Career paths (2026-11-10)
Apply `crucible-career-paths.patch`: choose a job target; enroll courses/practicums in order; `/career` syllabus that teaches what that role needs.
