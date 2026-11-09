ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT;

CREATE TABLE IF NOT EXISTS "StudyPlanEnrollment" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "planSlug" TEXT NOT NULL,
  "completedSlugs" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StudyPlanEnrollment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "DailyChallenge" (
  "id" TEXT NOT NULL,
  "dateKey" TEXT NOT NULL,
  "challengeId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DailyChallenge_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "DailyChallengeCompletion" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "dailyChallengeId" TEXT NOT NULL,
  "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DailyChallengeCompletion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "UserStreak" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "currentStreak" INTEGER NOT NULL DEFAULT 0,
  "longestStreak" INTEGER NOT NULL DEFAULT 0,
  "lastDateKey" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserStreak_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "StudyPlanEnrollment_userId_planSlug_key" ON "StudyPlanEnrollment"("userId", "planSlug");
CREATE INDEX IF NOT EXISTS "StudyPlanEnrollment_userId_idx" ON "StudyPlanEnrollment"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "DailyChallenge_dateKey_key" ON "DailyChallenge"("dateKey");
CREATE UNIQUE INDEX IF NOT EXISTS "DailyChallengeCompletion_userId_dailyChallengeId_key" ON "DailyChallengeCompletion"("userId", "dailyChallengeId");
CREATE INDEX IF NOT EXISTS "DailyChallengeCompletion_userId_idx" ON "DailyChallengeCompletion"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "UserStreak_userId_key" ON "UserStreak"("userId");

DO $$ BEGIN
  ALTER TABLE "StudyPlanEnrollment" ADD CONSTRAINT "StudyPlanEnrollment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "DailyChallenge" ADD CONSTRAINT "DailyChallenge_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "DailyChallengeCompletion" ADD CONSTRAINT "DailyChallengeCompletion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "DailyChallengeCompletion" ADD CONSTRAINT "DailyChallengeCompletion_dailyChallengeId_fkey" FOREIGN KEY ("dailyChallengeId") REFERENCES "DailyChallenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "UserStreak" ADD CONSTRAINT "UserStreak_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
