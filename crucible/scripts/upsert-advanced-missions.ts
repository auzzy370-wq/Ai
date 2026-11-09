import { prisma } from "../src/lib/db";
import { upsertAdvancedMissions } from "../src/server/challenges/mission-advanced";

upsertAdvancedMissions(prisma)
  .then((n) => {
    console.log(`Upserted ${n} advanced missions`);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
