import { prisma } from "../src/lib/db";
import { logger } from "../src/lib/logger";
import { pollQueuedJobs } from "../src/server/execution/runner";
import { ensureRedis } from "../src/lib/redis";

const INTERVAL_MS = 2000;

async function tick() {
  try {
    await ensureRedis().catch(() => undefined);
    const n = await pollQueuedJobs(5);
    if (n > 0) logger.info("Processed execution jobs", { count: n });
  } catch (err) {
    logger.error("Worker tick failed", { err: err instanceof Error ? err.message : String(err) });
  }
}

async function main() {
  logger.info("CRUCIBLE execution worker starting", {
    mode: process.env.EXECUTION_MODE ?? "docker",
  });
  await tick();
  setInterval(tick, INTERVAL_MS);

  // Keep process alive
  process.on("SIGINT", async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
