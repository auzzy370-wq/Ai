# Crucible roast fixes (apply on Crucible, not Ai)

This Cloud Agent run is attached to **`auzzy370-wq/Ai`** and **cannot push** to `auzzy370-wq/Crucible` (`cursor[bot]` is denied write access there).

The patch in `crucible-roast-fixes.patch` was developed against Crucible `main` @ `9964e1c`.

## Apply on Crucible

```bash
git clone git@github.com:auzzy370-wq/Crucible.git
cd Crucible
git checkout -b cursor/roast-fixes-8ab9
git am path/to/crucible-roast-fixes.patch
# or: git apply path/to/crucible-roast-fixes.patch && git commit ...
npm install
npx tsc --noEmit
git push -u origin cursor/roast-fixes-8ab9
```

Or start a **new Cloud Agent on the Crucible repo** and tell it to apply this patch.

## What it fixes

1. **Homepage** — guests get the real marketing landing; signed-in users go to role home (`/learn` or `/dashboard`).
2. **AI vs Human** — restores the client page (no longer a redirect stub); Compete nav + access rules.
3. **Typography** — IBM Plex Serif for `.font-serif-display` / `--font-serif`.
4. **Guest arcade XP** — today’s arcade task shows `ARCADE_CLEAR_XP` instead of 0.
5. **Hidden judge fallback** — fail closed when Docker harness output is missing (no keyword/TODO grep passes).
6. **Catalog honesty** — generated coding bank drops fake company tags; README/docs describe procedural fill vs hand-authored.
7. **Jobs / Premium copy** — career-board aggregator and demo-Premium messaging made explicit.
8. **PUBLIC_URL.md** — stop treating expired Cloudflare tunnels as the live site.
