# Crucible honest product loop (Nov 2026)

Crucible remote push is denied for `cursor[bot]` — ship via this tree + Cursor Publish.

## Included

- `crucible/` — full Next.js app (no `node_modules` / `.env`)
- `patches/crucible-honest-product-loop.patch` — apply on Crucible `cursor/roast-fixes-8ab9`

## Product changes

1. Landing: one primary CTA (“Start learning free”); hiring footnote; no IDE theater
2. Judge offline unless `JUDGE_ONLINE=true` + Docker worker (fail closed)
3. Generated `q-`/`exp-` behind signed-in “Practice volume”
4. Guest Learn+Practice; strong Save progress after 1 lesson/problem
5. `DEMO_SKIP_EMAIL_VERIFY` for demos; mock Premium only with `ALLOW_MOCK_BILLING=true`
6. Admin competition/AI sprawl behind `NEXT_PUBLIC_ENABLE_ADMIN_SPRAWL`
7. Elite seed includes craft/arcade progress; README matches ~dozens of real missions

## Publish

```bash
# from crucible/
# cursor-app.json already declares postgres
# Bind: SESSION_SECRET, SETUP_SECRET (optional DEMO_SKIP_EMAIL_VERIFY for demos)
# Do not set ALLOW_MOCK_BILLING or JUDGE_ONLINE on public hosts without Stripe/worker
```

## Permanent Vercel URL (live)

**https://crucible-arena-rho.vercel.app**

- Team: `slop15` · Project: `crucible-arena`
- Neon Postgres attached (`crucible-arena-db`)
- SSO deployment protection disabled
- Judge offline (`JUDGE_ONLINE` unset/false); mock billing off
- Demo seed applied (hand-authored + volume bank in DB; UI defaults to core)
