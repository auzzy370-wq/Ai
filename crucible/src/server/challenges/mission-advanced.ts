import type { AssessmentTrack, ChallengeType } from "@prisma/client";

/**
 * Advanced engineering missions — realistic repo-style assessments.
 * Used by seed / admin library upsert. Does not replace existing catalog.
 */
export type AdvancedMissionDef = {
  slug: string;
  title: string;
  summary: string;
  description: string;
  type: ChallengeType;
  track: AssessmentTrack;
  difficulty: number;
  tags: string[];
  estimatedDays: number;
  publicRequirements: string[];
  hiddenRequirements: string[];
  gradingRubric: Record<string, string>;
  languages: string[];
};

export const ADVANCED_MISSIONS: AdvancedMissionDef[] = [
  {
    slug: "mission-payments-idempotent-ledger",
    title: "Idempotent Payment Ledger",
    summary: "Design a payment API with idempotency keys, double-entry ledger, and webhook reconciliation.",
    description: `## Mission
Build a payments service that accepts charges, records a double-entry ledger, and reconciles provider webhooks.

## Constraints
- Idempotency-Key header required on POST /charges
- Ledger entries are append-only
- Webhooks may arrive out of order or twice
- Never trust client-provided balances

## Deliverables
- OpenAPI for charge + webhook endpoints
- Schema for accounts, entries, idempotency records
- Test suite covering replay and out-of-order webhooks
- Runbook for a stuck "pending" charge`,
    type: "BACKEND",
    track: "FINTECH",
    difficulty: 7,
    tags: ["payments", "idempotency", "ledger", "webhooks"],
    estimatedDays: 5,
    publicRequirements: [
      "Idempotent charge creation",
      "Double-entry ledger writes",
      "Webhook handler with signature check stub",
      "Public tests for replay safety",
    ],
    hiddenRequirements: [
      "Out-of-order webhook settles correctly",
      "Concurrent identical Idempotency-Key yields one charge",
      "No negative balance without overdraft flag",
    ],
    gradingRubric: {
      correctness: "Ledger invariants hold",
      security: "Webhook authenticity considered",
      architecture: "Clear bounded context",
    },
    languages: ["typescript", "python"],
  },
  {
    slug: "mission-incident-cache-stampede",
    title: "Incident: Cache Stampede at Peak",
    summary: "Diagnose and mitigate a production cache stampede during a traffic spike.",
    description: `## Incident
p99 latency spiked 40× after a deploy. Origin DB CPU is saturated. Cache hit rate collapsed.

## Your job
- Triage from metrics + logs (provided stubs)
- Identify stampede vs cold-start vs bad TTL
- Ship a mitigation (singleflight / probabilistic early expire / request coalescing)
- Write a postmortem with timeline and action items`,
    type: "PRODUCTION_INCIDENT",
    track: "PLATFORM_SRE",
    difficulty: 6,
    tags: ["incident", "cache", "sre", "performance"],
    estimatedDays: 2,
    publicRequirements: [
      "Root cause hypothesis documented",
      "Mitigation implemented in service stub",
      "Postmortem with timeline",
    ],
    hiddenRequirements: [
      "Mitigation prevents thundering herd in load test",
      "No silent data inconsistency after recovery",
    ],
    gradingRubric: {
      diagnosis: "Evidence-backed",
      mitigation: "Prevents recurrence under load",
      communication: "Clear postmortem",
    },
    languages: ["typescript", "go"],
  },
  {
    slug: "mission-secure-oauth-bff",
    title: "Secure OAuth BFF",
    summary: "Implement a browser backend-for-frontend with PKCE, rotated refresh cookies, and CSRF defenses.",
    description: `## Mission
Replace fragile SPA token storage with a BFF that holds refresh tokens in HttpOnly cookies.

## Requirements
- Authorization code + PKCE
- Refresh token rotation
- CSRF protection on cookie-authenticated mutating routes
- Session revocation endpoint`,
    type: "APPSEC",
    track: "CYBERSECURITY",
    difficulty: 7,
    tags: ["oauth", "bff", "csrf", "appsec"],
    estimatedDays: 4,
    publicRequirements: ["PKCE login flow", "HttpOnly refresh cookie", "CSRF on mutations", "Logout revokes session"],
    hiddenRequirements: [
      "Stolen refresh cookie alone cannot call APIs without CSRF token",
      "Reuse of old refresh token invalidates family",
    ],
    gradingRubric: {
      security: "Token handling safe for browsers",
      correctness: "Auth flows complete",
      clarity: "Threat model notes",
    },
    languages: ["typescript"],
  },
  {
    slug: "mission-data-pipeline-exactly-once",
    title: "Exactly-Once Ingest Pipeline",
    summary: "Build a streaming ingest path with dedupe keys, dead-letter queue, and late-data policy.",
    description: `## Mission
Ingest events from a queue into a warehouse-ready table with at-least-once delivery upstream.

## Deliverables
- Consumer with idempotent writes
- DLQ for poison messages
- Late data window policy
- Observability counters`,
    type: "DATA_PIPELINE",
    track: "DATA_ML",
    difficulty: 6,
    tags: ["streaming", "dedupe", "dlq", "data"],
    estimatedDays: 4,
    publicRequirements: ["Idempotent upsert by event id", "DLQ path", "Metrics hooks", "Docs for late data"],
    hiddenRequirements: ["Duplicate burst does not double-count aggregates", "Poison message does not block partition"],
    gradingRubric: {
      reliability: "No silent drops",
      performance: "Backpressure aware",
      ops: "Runnable locally",
    },
    languages: ["python", "typescript"],
  },
  {
    slug: "mission-k8s-safe-rollout",
    title: "Safe Kubernetes Rollout",
    summary: "Define a progressive delivery strategy with probes, PDB, and automated rollback triggers.",
    description: `## Mission
Ship a service update without customer-visible downtime.

## Deliverables
- Deployment + PDB + probes
- Canary or blue/green sketch
- Rollback criteria tied to SLOs
- Runbook`,
    type: "INFRASTRUCTURE",
    track: "PLATFORM_SRE",
    difficulty: 5,
    tags: ["kubernetes", "rollout", "slo", "devops"],
    estimatedDays: 3,
    publicRequirements: ["Probes configured", "PDB present", "Rollback documented", "SLO burn alert sketch"],
    hiddenRequirements: ["Rollout pauses when error budget exhausted", "No single-replica availability gap"],
    gradingRubric: {
      reliability: "Safe defaults",
      clarity: "Operators can execute",
    },
    languages: ["typescript"],
  },
  {
    slug: "mission-ai-rag-eval-harness",
    title: "RAG Evaluation Harness",
    summary: "Build an evaluation harness for a retrieval-augmented answer service with groundedness checks.",
    description: `## Mission
Create an offline eval that scores retrieval hit-rate, answer groundedness, and latency.

## Constraints
- Deterministic fixtures
- No network calls in CI
- Report must separate retrieval vs generation failures`,
    type: "ML_PLATFORM",
    track: "AI_MLOPS",
    difficulty: 6,
    tags: ["rag", "eval", "ai", "quality"],
    estimatedDays: 3,
    publicRequirements: ["Fixture suite", "Groundedness scorer stub", "Latency report", "README for adding cases"],
    hiddenRequirements: ["Hallucinated citation fails groundedness", "Empty retrieval yields abstain path"],
    gradingRubric: {
      measurement: "Metrics are meaningful",
      engineering: "CI-friendly",
    },
    languages: ["python", "typescript"],
  },
  {
    slug: "mission-distributed-outbox",
    title: "Transactional Outbox + Consumers",
    summary: "Implement the outbox pattern so domain events publish reliably after DB commits.",
    description: `## Mission
Ensure side effects (emails, search index, analytics) cannot be lost when the app crashes after commit.

## Deliverables
- Outbox table + writer in the same transaction as domain change
- Poller/publisher with at-least-once delivery
- Consumer idempotency
- Failure injection test`,
    type: "DISTRIBUTED_SYSTEMS",
    track: "SOFTWARE_ENGINEERING",
    difficulty: 7,
    tags: ["outbox", "messaging", "distributed", "reliability"],
    estimatedDays: 4,
    publicRequirements: ["Transactional outbox writes", "Publisher loop", "Idempotent consumer", "Chaos test notes"],
    hiddenRequirements: ["Crash between commit and publish still delivers", "Duplicate publish does not double-apply"],
    gradingRubric: {
      correctness: "No lost events",
      architecture: "Clear ownership of outbox",
    },
    languages: ["typescript", "go"],
  },
  {
    slug: "mission-perf-nplusone-api",
    title: "Kill the N+1 API",
    summary: "Profile and fix an API that issues N+1 queries under a realistic fixture set.",
    description: `## Mission
A list endpoint times out at 2k rows. Fix query patterns without breaking pagination contracts.

## Deliverables
- Baseline query count evidence
- Fix (joins / dataloader / denorm — justify choice)
- Regression test on query budget`,
    type: "PERFORMANCE",
    track: "SOFTWARE_ENGINEERING",
    difficulty: 5,
    tags: ["performance", "sql", "api", "profiling"],
    estimatedDays: 2,
    publicRequirements: ["Baseline measurement", "Fixed endpoint", "Query budget test"],
    hiddenRequirements: ["Budget holds at 10k rows fixture", "Pagination totals remain correct"],
    gradingRubric: {
      performance: "Measurable improvement",
      correctness: "Contract preserved",
    },
    languages: ["typescript", "python"],
  },
];

export async function upsertAdvancedMissions(db: typeof import("@/lib/db").prisma) {
  // Prefer a stable hiring user; fall back to any admin/hiring account.
  const creator =
    (await db.user.findFirst({
      where: { role: { in: ["HIRING_MANAGER", "SUPER_ADMIN"] } },
      select: { id: true },
      orderBy: { createdAt: "asc" },
    })) ?? (await db.user.findFirst({ select: { id: true } }));
  if (!creator) return 0;

  for (const m of ADVANCED_MISSIONS) {
    const challenge = await db.challenge.upsert({
      where: { slug: m.slug },
      create: {
        slug: m.slug,
        title: m.title,
        summary: m.summary,
        description: m.description,
        type: m.type,
        track: m.track,
        difficulty: m.difficulty,
        tags: m.tags,
        estimatedDays: m.estimatedDays,
        publicRequirements: m.publicRequirements,
        hiddenRequirements: m.hiddenRequirements,
        gradingRubric: m.gradingRubric,
        languages: m.languages,
        isPublished: true,
        frequency: 40 + m.difficulty,
        avgMinutes: m.estimatedDays * 45,
      },
      update: {
        title: m.title,
        summary: m.summary,
        description: m.description,
        publicRequirements: m.publicRequirements,
        hiddenRequirements: m.hiddenRequirements,
        gradingRubric: m.gradingRubric,
        isPublished: true,
      },
    });

    const existing = await db.assessment.findFirst({
      where: { challengeId: challenge.id },
      select: { id: true },
    });
    if (!existing) {
      await db.assessment.create({
        data: {
          id: `assess-adv-${m.slug}`.slice(0, 64),
          title: m.title,
          description: m.summary,
          challengeId: challenge.id,
          track: m.track,
          status: "PUBLISHED",
          timedMinutes: Math.min(480, m.estimatedDays * 60),
          multiDay: m.estimatedDays > 1,
          progressiveDiff: true,
          createdById: creator.id,
        },
      });
    } else {
      await db.assessment.update({
        where: { id: existing.id },
        data: { title: m.title, description: m.summary, status: "PUBLISHED" },
      });
    }
  }
  return ADVANCED_MISSIONS.length;
}
