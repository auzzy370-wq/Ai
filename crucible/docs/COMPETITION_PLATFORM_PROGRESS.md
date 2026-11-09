# Competition Platform — Progress

**Updated:** 2026-11-05 (America/New_York)

## Shipped this phase

| Area | Status |
|------|--------|
| Schema: Contest.mode/status, ChallengeVersion, AiModel, AiBenchmarkRun, Challenge competition fields | Done (`prisma db push`) |
| Adversarial seeded generator + public meta | `src/server/competition/adversarial.ts` |
| AI benchmark (public prompt only; mocked = experimental) | `ai-benchmark.ts` + `/api/competition/benchmark` |
| Research Frontier D10 seeds | `research-frontier.ts` + `/research-frontier` |
| Leaderboards human/AI/team | `/leaderboards` + API |
| Tournaments list/register/create | `/tournaments` + API |
| AI vs Human UI | `/ai-vs-human` |
| Benchmark reports | `/benchmarks` |
| Diagnostics on execute GET + IDE | `diagnostics.ts` wired |
| Admin Competition analytics tab | `/api/competition/analytics` |
| Challenge list strips hidden/reference for non-admins | `/api/challenges` |
| Unit tests | `scripts/competition-unit.ts` (via `npm run test:unit`) |

## Policy locks

- Hidden tests / reference solutions never sent to AI models.
- Single AI fail ≠ “model cannot solve.”
- Mocked runs labeled experimental; verified only when API-backed.
- Broken harness → infrastructure diagnostic, not contestant failure.
- D10 Research Frontier remains objectively testable.

## Free AI providers (site-hosted)

Preferred for AI vs Human — no ChatGPT scrape, no local Ollama required:

| Env | Provider | Models |
|-----|----------|--------|
| `GROQ_API_KEY` | Groq free tier | `llama-3.1-8b-instant`, `llama-3.3-70b-versatile` |
| `OPENROUTER_API_KEY` | OpenRouter `:free` | Llama 3.2 3B, Gemma 2 9B |

`runAiBenchmark` routes through the selected `AiModel` (`baseUrl` + `apiKeyEnv`). Provider auto-prefers Groq → OpenRouter → OpenAI when keys exist.

## Remaining dependencies

- Full sandbox re-judge of AI-generated code (currently signature/heuristic + counts; human path uses ExecutionJob).
- Add `GROQ_API_KEY` (or OpenRouter) in Cursor Secrets for live verified runs.
- Tournament brackets UI beyond standings JSON.
- Live calibrated difficulty from large submission samples.
