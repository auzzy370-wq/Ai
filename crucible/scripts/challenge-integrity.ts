/**
 * Challenge Integrity Engine — CLI
 *
 * Usage:
 *   npx tsx scripts/challenge-integrity.ts
 *   npx tsx scripts/challenge-integrity.ts --take 50
 *   npx tsx scripts/challenge-integrity.ts --slug lc-two-sum
 *   npx tsx scripts/challenge-integrity.ts --all --take 200
 */
import { prisma } from "../src/lib/db";
import { scanChallengeIntegrity, scanChallengeLibrary } from "../src/server/integrity/challenge-engine";

async function main() {
  const args = process.argv.slice(2);
  const takeIdx = args.indexOf("--take");
  const take = takeIdx >= 0 ? Number(args[takeIdx + 1]) : 80;
  const slugIdx = args.indexOf("--slug");
  const slug = slugIdx >= 0 ? args[slugIdx + 1] : null;
  const all = args.includes("--all");

  if (slug) {
    const c = await prisma.challenge.findUnique({ where: { slug } });
    if (!c) {
      console.error(`Challenge not found: ${slug}`);
      process.exit(1);
    }
    const result = await scanChallengeIntegrity(c.id, { persist: true });
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.status === "fail" ? 2 : 0);
  }

  console.log(`Scanning up to ${take} challenges${all ? " (all types)" : " (coding)"}…`);
  const out = await scanChallengeLibrary({ take, all, persist: true });
  console.log("\nSummary:", out.summary);
  const fails = out.results.filter((r) => r.status === "fail").slice(0, 25);
  if (fails.length) {
    console.log("\nTop failures:");
    for (const f of fails) {
      const errs = f.findings.filter((x) => x.severity === "error");
      console.log(`- ${f.slug}: ${errs.map((e) => e.code).join(", ")}`);
    }
  }
  process.exit(out.summary.fail > 0 ? 2 : 0);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
