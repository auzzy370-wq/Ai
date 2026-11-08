# Architecture

## Modules

- `src/app` — Next.js App Router UI + REST route handlers
- `src/server` — domain services (auth, candidates, assessments, execution, AI, scoring, reviews, teams, incidents, analytics)
- `src/components` — UI primitives and feature surfaces
- `worker` — background execution poller
- `prisma` — PostgreSQL schema + seed
- `challenges` / catalog — challenge definitions including cybersecurity track

## Data stores

- PostgreSQL — relational system of record
- Redis — rate limits / job coordination
- Local/S3-compatible storage — résumés, workspace snapshots

## Assessment engine

Assignments bind candidates to challenges with adaptive levels gated on **verified** test results. Scoring policies differ by track (`SOFTWARE_ENGINEERING`, `CYBERSECURITY`, `SECURE_FULL_STACK`). AI evaluation consumes observed artifacts only and labels facts vs inferences vs unknowns.

## Extensibility

New languages: add starter templates + execution image tags.  
New AI providers: `AiProviderConfig` rows + env keys.  
New challenges: extend `CHALLENGE_CATALOG` / admin APIs.
