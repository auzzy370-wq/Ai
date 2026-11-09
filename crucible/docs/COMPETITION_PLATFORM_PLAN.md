# Elite AI vs Human Competition Platform — Integration Plan

**Date:** 2026-11-05 (America/New_York)  
**Rule:** Extend Crucible in place. Reuse challenge bank, Monaco IDE, execution jobs, integrity engine, contests, admin.

## Existing (reuse)

| Pillar need | Already in Crucible |
|-------------|---------------------|
| Challenge engine D1–D10, languages, hidden tests | `Challenge`, coding bank, harnesses, IDE |
| Integrity before publish | Challenge Integrity Engine |
| Sandbox execution | `ExecutionJob` + docker/process runner |
| Human contests / streaks | `Contest`, daily/weekly |
| AI provider interface | `src/server/ai/provider.ts` (OpenAI + mock) |
| Teams | `EngineeringTeam` |
| Admin analytics | `/admin`, `/analytics` |

## Gaps shipped (this phase)

1. **AI vs Human bench** — `AiModel`, `AiBenchmarkRun`; identical public prompt only; hidden tests never sent to models; human vs AI comparison reports. → `/ai-vs-human`, `/api/competition/benchmark`
2. **Adversarial test generation** — seeded generator; public meta only; reproducible. → `adversarial.ts`
3. **Research Frontier** — `/research-frontier` + D10 curated seeds (`rf-*`).
4. **Split leaderboards** — `/leaderboards` human / AI / team tabs with transparent scoring.
5. **Tournaments** — Contest.mode/status, registration API, live standings. → `/tournaments`
6. **Failure diagnostics** — structured judge categories on execute GET + IDE.
7. **Admin competition analytics** — Admin → Competition tab; `/api/competition/analytics`.

See [COMPETITION_PLATFORM_PROGRESS.md](./COMPETITION_PLATFORM_PROGRESS.md).

## Non-goals this phase

- Claiming any model “cannot” solve a problem from one fail.
- Exposing API keys or hidden fixtures to clients.
- Rewriting the IDE or employer assessment flows.
- Full in-process sandbox re-judge of AI code (human path remains ExecutionJob).
