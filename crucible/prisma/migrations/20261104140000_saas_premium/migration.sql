DO $$ BEGIN
  CREATE TYPE "PlanTier" AS ENUM ('FREE', 'PREMIUM');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "plan" "PlanTier" NOT NULL DEFAULT 'FREE';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "planExpiresAt" TIMESTAMP(3);

ALTER TABLE "Challenge" ADD COLUMN IF NOT EXISTS "companies" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Challenge" ADD COLUMN IF NOT EXISTS "frequency" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Challenge" ADD COLUMN IF NOT EXISTS "avgMinutes" INTEGER NOT NULL DEFAULT 60;
ALTER TABLE "Challenge" ADD COLUMN IF NOT EXISTS "isPremium" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "Playground" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "folder" TEXT NOT NULL DEFAULT 'Inbox',
  "language" TEXT NOT NULL DEFAULT 'typescript',
  "content" TEXT NOT NULL DEFAULT '// Crucible Playground' || E'\n',
  "layout" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Playground_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "InterviewSimulation" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "company" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "challengeId" TEXT NOT NULL,
  "timedMinutes" INTEGER NOT NULL DEFAULT 45,
  "status" TEXT NOT NULL DEFAULT 'READY',
  "startedAt" TIMESTAMP(3),
  "finishedAt" TIMESTAMP(3),
  "score" DOUBLE PRECISION,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InterviewSimulation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Playground_userId_folder_idx" ON "Playground"("userId", "folder");
CREATE INDEX IF NOT EXISTS "InterviewSimulation_userId_company_idx" ON "InterviewSimulation"("userId", "company");

DO $$ BEGIN
  ALTER TABLE "Playground" ADD CONSTRAINT "Playground_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "InterviewSimulation" ADD CONSTRAINT "InterviewSimulation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "InterviewSimulation" ADD CONSTRAINT "InterviewSimulation_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
