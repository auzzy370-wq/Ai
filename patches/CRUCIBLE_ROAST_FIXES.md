# Crucible roast fixes (apply on Crucible)

This Cloud Agent cannot push to `auzzy370-wq/Crucible`. Patches live here for apply on that repo.

## Patches

1. `crucible-roast-fixes.patch` — round 1 (landing, AI vs Human, judge fail-closed, catalog honesty, …)
2. `crucible-roast-fixes-r3.patch` — round 3 (guest nav, wordmark, core bank default, profile craft honesty, landing copy)

Apply in order on Crucible `main`:

```bash
cd Crucible
git checkout -b cursor/roast-fixes-8ab9
git am path/to/Ai/patches/crucible-roast-fixes.patch
git am path/to/Ai/patches/crucible-roast-fixes-r3.patch
npm install && npx tsc --noEmit
git push -u origin cursor/roast-fixes-8ab9
```

## Live demo (ephemeral)

When the agent VM is up: check the active Cloudflare quick tunnel. Prefer local `http://localhost:3847`.
