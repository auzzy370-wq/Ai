# Crucible Advancement Audit

**Date:** 2026-11-05 (America/New_York)  
**Scope:** Existing platform vs LeetCode parity + differentiation  
**Rule:** Preserve architecture, branding, data, and working features. Improve in place.

## Executive summary

Crucible already exceeds LeetCode on **missions, employer assessments, multi-track sectors, human review, and verified profiles**. It is behind on classic **community/practice UX**: bookmarks, real acceptance rates, submission history surfaces, progressive hints, discussions, custom tests, and richer contest seasons.

**Strategy:** Keep the dual learn/hire core. Close LeetCode practice gaps first, then deepen missions, adaptive learning, integrity, and community — without a rewrite.

---

## 1. Feature inventory

Legend: **F** Fully · **P** Partially · **M** Missing · **B** Broken · **I** Needs improvement

### Frontend / routes
| Item | Status | Notes / paths |
|------|--------|---------------|
| Landing (learn + hire) | F | `src/components/marketing/landing.tsx` |
| Auth pages | F | `src/app/(auth)/login`, `register` |
| Role-gated app shell | F | `src/components/layout/app-shell.tsx`, `src/lib/access.ts` |
| Dashboard (learner + hiring) | F/I | `src/app/(app)/dashboard` — clear journeys; can add practice stats |
| Problem bank | F/I | `challenges/page.tsx`, `problemset.tsx` — search/filter strong; no bookmarks |
| Workspace IDE | F/I | `components/workspace/ide.tsx` — Monaco, multi-file, run/submit, premium debug |
| Daily / weekly / contest | P | Routes exist; contest leaderboard basic |
| Study plans / interview / playgrounds | P | Present; depth uneven |
| Editorials | P | `/editorials` — not deep per-problem progressive hints |
| Employer assessments/reviews | F | `/assessments`, `/reviews`, scorecards |
| Admin control plane + analytics | F | `/admin`, `/analytics` |
| Public profiles | F | `/u/[slug]` |
| Discussions / social | M | No problem discussion model |
| Bookmarks | M | No schema/UI |
| Mobile shell | F/I | Bottom nav + responsive; IDE still dense on small screens |

### Auth & roles
| Item | Status | Notes |
|------|--------|-------|
| Session cookies | F | `server/auth/session.ts` |
| Register/login/logout | F | Role CANDIDATE on register |
| Role RBAC pages/APIs | F | Staff vs learner guards |
| Password + session revoke | F | Settings |
| OAuth/SSO | M | Email/password only |

### Database (Prisma)
| Item | Status | Notes |
|------|--------|-------|
| Users, sessions, profiles, skills | F | Rich skill sources |
| Challenges, assessments, assignments | F | Large catalog |
| Workspace files, jobs, test runs | F | |
| Submissions | P | Exists but thin UX aggregation |
| Contests, daily, streaks, editorials | F | Models present |
| Bookmarks, discussions, follows | M | Not in schema |
| Integrity / plagiarism events | M | |

### Coding library
| Item | Status | Notes |
|------|--------|-------|
| Large searchable library | F | ~4k coding + ~6.7k missions; 27 tracks |
| Easy/Medium/Hard (+ deeper bands) | F | Difficulty 1–10 + bands |
| Tags / companies / languages | F | Problemset filters |
| SQL-as-first-class practice | P | DB missions + sql-logic family; no dedicated SQL lab UX |
| System design prep | P | Architecture package + mission types |

### Editor / execution / judging
| Item | Status | Notes |
|------|--------|-------|
| Monaco + syntax highlight | F | |
| Multi-file workspace | F | WorkspaceFile |
| Public + hidden tests | F | Runner + harnesses |
| Multi-language | F | TS/JS/Python/Go/Rust/Java |
| Sandbox limits | F | CPU/mem/timeout/network |
| Debugger | P | Premium; simplified |
| Custom input / user tests | M | |
| Runtime & memory metrics UI | P | Limits exist; not LeetCode-style stats panel |
| Submission history UI | P | Jobs/test runs in DB; no problem-centric history page |
| Acceptance stats | P | **Illustrative** (`lib/acceptance.ts`) until live density |
| Drafts / autosave beyond files | P | Files persist; no “draft submission” concept |
| Format / shortcuts / AI complete | P | Premium AI complete; format partial |

### Learning / community / contests
| Item | Status | Notes |
|------|--------|-------|
| Daily + streaks | F | |
| Contests + entries | P | Basic leaderboard |
| Study plans | P | |
| Interview sims | P | |
| Knowledge pinpoint | P | diagnostics + knowledgeMap JSON |
| Adaptive skill trees | P/M | Map exists; not full tree UX |
| Discussions / follows / reputation | M | |
| Solution sharing | P | Editorials; not community solutions |

### Employer / verification
| Item | Status | Notes |
|------|--------|-------|
| Assign timed assessments | F | |
| Review queue + human decision | F | AI cannot hire alone (documented) |
| Scorecards / ATS export | F | |
| Multi-stage custom rubrics UI | P | Policies exist; builder UX limited |
| Integrity / similarity detection | M | |

### AI / billing / admin / security
| Item | Status | Notes |
|------|--------|-------|
| AI providers + mock fallback | F | Admin configurable |
| AI grading / evals | P | |
| Tutoring / progressive hints AI | M/P | |
| Stripe + mock upgrade | P | Free/Premium; Team/Enterprise thin |
| Admin users/jobs/library/audit | F | |
| Untrusted code isolation | F/I | process/docker modes; no Docker-on-Vercel |

---

## 2. LeetCode parity matrix (priority)

| Capability | LeetCode | Crucible now | Action |
|------------|----------|--------------|--------|
| Problem library + search | Yes | Yes (stronger multi-track) | Improve filters/bookmarks |
| Difficulty bands | Yes | Yes (richer) | Keep |
| Multi-language judge | Yes | Yes (6 langs) | Keep; document |
| Editor | Yes | Monaco + multi-file **ahead** | Custom tests, history |
| Hidden tests | Yes | Yes | Keep |
| Submission history | Yes | Partial | **Build** |
| Runtime/memory panel | Yes | Partial | **Build** |
| Live acceptance % | Yes | Illustrative | **Build** from TestRuns |
| Editorials | Yes | Partial | Deepen + hints |
| Hints | Yes | Missing UX | **Build** |
| Discussions | Yes | Missing | Phase 2 |
| Bookmarks | Yes | Missing | **Build** |
| Progress / streaks / daily | Yes | Yes | Keep |
| Contests / leaderboards | Yes | Partial | Expand later |
| Company prep | Yes | Partial (tags + interview) | Improve |
| SQL practice | Yes | Partial | Dedicated surface later |
| System design | Weak | Missions + architecture **ahead** | Deepen |
| Mock interviews | Yes | Partial | Improve |
| Profiles | Rating-centric | Verified evidence **ahead** | Keep differentiating |
| Employer assessments | Assessments | Missions + human review **ahead** | Rubrics/integrity |

---

## 3. Architecture notes

**Strengths**
- Clear learn vs hire product split with RBAC
- Evidence model (public/hidden, deploy, incident, architecture, human review)
- Massive seeded catalog + multi-sector tracks
- Workspace/job/test pipeline already exists

**Weaknesses**
- Acceptance stats not wired to live submits
- Practice UX missing LeetCode “muscle memory” features (bookmarks, history, hints, discussions)
- Community layer absent
- Illustrative metrics can undermine credibility if not labeled (already labeled — good)

**Performance risks**
- Large challenge lists — already lean-select on challenges page; keep pagination
- Analytics loading all score reports — watch admin analytics
- Seed/catalog generation heavy at build time

**Security**
- Do not run untrusted code on app server without sandbox (already job-based)
- Integrity/plagiarism not yet implemented

---

## 4. Prioritized implementation plan

### Phase 1 — Practice parity — **DONE**
1. Bookmarks (schema + API + problemset UI) ✅
2. Problem submission history API + panel in IDE ✅ (`PracticeAssist`)
3. Live acceptance rate when ≥3 submits; else illustrative ✅
4. Progressive hints on coding problems ✅ (stored or synthesized)
5. Custom test input in coding IDE ✅ (sandboxed custom harness)
6. Related problem recommendations ✅
7. IDE shortcuts (Run / Submit / Format) ✅

### Phase 2 — Depth — **IN PROGRESS**
7. Problem discussions ✅ (API + IDE Discuss tab)
8. Runtime/memory summary on test results — partial (history shows runtimeMs when present)
9. Stronger contest seasons / track leaderboards — remaining
10. Adaptive roadmap UI ✅ (`/roadmap` + `/api/learn/roadmap`)
11. Integrity similarity checks on submit ✅ (advisory `IntegrityEvent`, admin API)

### Phase 3 — Moat — **STARTED**
12. AI progressive tutor (gated in assessments) — remaining (hints exist; full tutor remaining)
13. Community follows ✅ (`DeveloperFollow` + `/api/social/follow`); reputation remaining
14. Team/enterprise billing tiers — remaining
15. Mission engine deepening ✅ (8 advanced missions: payments, incident, OAuth BFF, data pipeline, k8s, RAG eval, outbox, N+1)

---

## 5. Non-goals

- No greenfield rewrite
- No new framework/stack for its own sake
- No deleting demos, dual auth, or employer flows
- No AI-only hiring decisions
