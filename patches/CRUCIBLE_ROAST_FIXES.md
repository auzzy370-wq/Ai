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
