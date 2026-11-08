# Advancement progress

**Updated:** 2026-11-05 (America/New_York)

## Completed

| Area | What shipped |
|------|----------------|
| Challenge Integrity Engine | Detectors + publish gate + admin Integrity tab + CLI; sector-logic harness binding so `q-*-logic-*` uses real `solve()` judges |
| Audit | `docs/ADVANCEMENT_AUDIT.md` inventory + LeetCode parity matrix + phased plan |
| Bookmarks | `ProblemBookmark` + `/api/bookmarks` + problemset ★ + IDE bookmark |
| Live acceptance | `/api/practice/acceptance` (≥3 hidden submits) + problemset Acc live/est. |
| Practice API | `/api/practice/[slug]` — hints, history, related, stats, bookmark state |
| IDE assist | Hints (progressive), History, Custom cases, Related, Discuss |
| Custom tests | Sandboxed harness (`custom-harness.ts`) via execute `customCases` |
| Shortcuts | Ctrl/⌘+Enter Run, Ctrl/⌘+Shift+Enter Submit, Ctrl/⌘+Shift+F Format |
| Discussions | `ProblemDiscussion` + `/api/discussions/[slug]` |
| Integrity | Similarity scan on submit → `IntegrityEvent`; `/api/admin/integrity` |
| Adaptive roadmap | `/roadmap` + `/api/learn/roadmap` skill tree + weak tags |
| Follows | `DeveloperFollow` + `/api/social/follow` |
| Advanced missions | 8 realistic missions (payments, incident, OAuth BFF, pipeline, k8s, RAG, outbox, N+1) |

## Remaining (highest impact next)

- Contest seasons / skill-specific leaderboards UX
- Reputation scores + richer community (articles, team challenges)
- Full AI tutor (beyond hints) with assessment AI gates
- Team / Enterprise billing tiers + assessment credits
- Runtime/memory charts on every judge result
- Deeper mission starter repos (multi-file packs per advanced mission)
- Employer multi-stage assessment builder polish

## Blocked / external

- Real LLM tutoring needs provider keys (mock fallback already supported)
- Docker/Firecracker isolation on managed hosts without a worker pool
- Stripe Team/Enterprise products need dashboard configuration

## How to apply schema + missions

```bash
npx prisma db push
npx prisma generate
npx tsx scripts/upsert-advanced-missions.ts
```
