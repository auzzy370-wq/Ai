import { seedDatabase } from "../src/server/bootstrap-seed";
import { prisma } from "../src/lib/db";

seedDatabase()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
