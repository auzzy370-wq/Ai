import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

let seeding: Promise<void> | null = null;

/**
 * First-boot seed for published / empty databases so any registered learner
 * can use AI vs Human and the coding bank without a manual /api/setup call.
 */
export async function ensurePlatformSeeded() {
  const challenges = await prisma.challenge.count();
  if (challenges > 0) return;

  if (!seeding) {
    seeding = (async () => {
      logger.warn("Empty database detected — running bootstrap seed");
      const { seedDatabase } = await import("@/server/bootstrap-seed");
      await seedDatabase({ includeDemoAccounts: false });
      const { ensureDefaultAiModels } = await import("@/server/competition/ai-benchmark");
      await ensureDefaultAiModels();
    })().finally(() => {
      seeding = null;
    });
  }
  await seeding;
}
