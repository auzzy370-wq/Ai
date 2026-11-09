-- Ensure Contest exists before ALTER (was missing from earlier migrations)
CREATE TABLE IF NOT EXISTS "Contest" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "isPremium" BOOLEAN NOT NULL DEFAULT false,
    "mode" TEXT NOT NULL DEFAULT 'HUMAN',
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "bracketJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Contest_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Contest_slug_key" ON "Contest"("slug");

CREATE TABLE IF NOT EXISTS "ContestProblem" (
    "id" TEXT NOT NULL,
    "contestId" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "ordinal" INTEGER NOT NULL DEFAULT 0,
    "points" INTEGER NOT NULL DEFAULT 100,
    CONSTRAINT "ContestProblem_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ContestProblem_contestId_challengeId_key" ON "ContestProblem"("contestId", "challengeId");
CREATE INDEX IF NOT EXISTS "ContestProblem_contestId_idx" ON "ContestProblem"("contestId");

CREATE TABLE IF NOT EXISTS "ContestEntry" (
    "id" TEXT NOT NULL,
    "contestId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "solvedCount" INTEGER NOT NULL DEFAULT 0,
    "penaltyMin" INTEGER NOT NULL DEFAULT 0,
    "rank" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ContestEntry_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ContestEntry_contestId_userId_key" ON "ContestEntry"("contestId", "userId");
CREATE INDEX IF NOT EXISTS "ContestEntry_contestId_score_idx" ON "ContestEntry"("contestId", "score");

CREATE TABLE IF NOT EXISTS "WeeklyChallenge" (
    "id" TEXT NOT NULL,
    "weekKey" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "synopsis" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WeeklyChallenge_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "WeeklyChallenge_weekKey_key" ON "WeeklyChallenge"("weekKey");

CREATE TABLE IF NOT EXISTS "WeeklyChallengeCompletion" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weeklyChallengeId" TEXT NOT NULL,
    "score" DOUBLE PRECISION,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WeeklyChallengeCompletion_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "WeeklyChallengeCompletion_userId_weeklyChallengeId_key" ON "WeeklyChallengeCompletion"("userId", "weeklyChallengeId");
CREATE INDEX IF NOT EXISTS "WeeklyChallengeCompletion_userId_idx" ON "WeeklyChallengeCompletion"("userId");

CREATE TABLE IF NOT EXISTS "Editorial" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "bodyMd" TEXT NOT NULL,
    "approach" TEXT,
    "complexity" TEXT,
    "isPremium" BOOLEAN NOT NULL DEFAULT true,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Editorial_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Editorial_slug_key" ON "Editorial"("slug");
CREATE INDEX IF NOT EXISTS "Editorial_challengeId_idx" ON "Editorial"("challengeId");

-- Competition platform: AI vs Human, Research Frontier, tournaments

ALTER TABLE "Challenge" ADD COLUMN IF NOT EXISTS "calibratedDifficulty" INTEGER;
ALTER TABLE "Challenge" ADD COLUMN IF NOT EXISTS "expectedComplexity" TEXT;
ALTER TABLE "Challenge" ADD COLUMN IF NOT EXISTS "timeLimitMs" INTEGER NOT NULL DEFAULT 2000;
ALTER TABLE "Challenge" ADD COLUMN IF NOT EXISTS "memoryLimitMb" INTEGER NOT NULL DEFAULT 256;
ALTER TABLE "Challenge" ADD COLUMN IF NOT EXISTS "functionSignature" TEXT;
ALTER TABLE "Challenge" ADD COLUMN IF NOT EXISTS "researchFrontier" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Challenge" ADD COLUMN IF NOT EXISTS "adversarialMeta" JSONB;

ALTER TABLE "Contest" ADD COLUMN IF NOT EXISTS "mode" TEXT NOT NULL DEFAULT 'HUMAN';
ALTER TABLE "Contest" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'SCHEDULED';
ALTER TABLE "Contest" ADD COLUMN IF NOT EXISTS "bracketJson" JSONB;

CREATE TABLE IF NOT EXISTS "ChallengeVersion" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "contentVersion" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "difficulty" INTEGER NOT NULL,
    "functionSignature" TEXT,
    "timeLimitMs" INTEGER NOT NULL,
    "memoryLimitMb" INTEGER NOT NULL,
    "expectedComplexity" TEXT,
    "publicRequirements" JSONB,
    "snapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChallengeVersion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ChallengeVersion_challengeId_version_key" ON "ChallengeVersion"("challengeId", "version");
CREATE INDEX IF NOT EXISTS "ChallengeVersion_challengeId_idx" ON "ChallengeVersion"("challengeId");

CREATE TABLE IF NOT EXISTS "AiModel" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "baseUrl" TEXT,
    "apiKeyEnv" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "isOpenSource" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AiModel_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AiModel_slug_key" ON "AiModel"("slug");

CREATE TABLE IF NOT EXISTS "AiBenchmarkRun" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "aiModelId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "resultClass" TEXT NOT NULL DEFAULT 'experimental',
    "promptTokens" INTEGER,
    "completionTokens" INTEGER,
    "latencyMs" INTEGER,
    "runtimeMs" INTEGER,
    "memoryKb" INTEGER,
    "passedPublic" INTEGER NOT NULL DEFAULT 0,
    "totalPublic" INTEGER NOT NULL DEFAULT 0,
    "passedHidden" INTEGER NOT NULL DEFAULT 0,
    "totalHidden" INTEGER NOT NULL DEFAULT 0,
    "correct" BOOLEAN NOT NULL DEFAULT false,
    "solutionCode" TEXT,
    "diagnostics" JSONB,
    "mocked" BOOLEAN NOT NULL DEFAULT false,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    CONSTRAINT "AiBenchmarkRun_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AiBenchmarkRun_challengeId_createdAt_idx" ON "AiBenchmarkRun"("challengeId", "createdAt");
CREATE INDEX IF NOT EXISTS "AiBenchmarkRun_aiModelId_createdAt_idx" ON "AiBenchmarkRun"("aiModelId", "createdAt");
CREATE INDEX IF NOT EXISTS "AiBenchmarkRun_correct_challengeId_idx" ON "AiBenchmarkRun"("correct", "challengeId");

DO $$ BEGIN
  ALTER TABLE "ChallengeVersion" ADD CONSTRAINT "ChallengeVersion_challengeId_fkey"
    FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "AiBenchmarkRun" ADD CONSTRAINT "AiBenchmarkRun_challengeId_fkey"
    FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "AiBenchmarkRun" ADD CONSTRAINT "AiBenchmarkRun_aiModelId_fkey"
    FOREIGN KEY ("aiModelId") REFERENCES "AiModel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
