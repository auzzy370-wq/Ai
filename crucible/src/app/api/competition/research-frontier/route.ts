import { prisma } from "@/lib/db";
import { jsonOk, withHandler } from "@/server/auth/api";
import { requireUser } from "@/server/auth/session";
import { upsertResearchFrontier } from "@/server/competition/research-frontier";
import { publicAdversarialMeta, generateNumericArraySuite } from "@/server/competition/adversarial";

export async function GET() {
  return withHandler(async () => {
    await requireUser();
    await upsertResearchFrontier();

    const challenges = await prisma.challenge.findMany({
      where: {
        OR: [{ researchFrontier: true }, { difficulty: 10, type: "CODING_PROBLEM" }],
        isPublished: true,
      },
      // Curated rf-* seeds first, then other D10
      orderBy: [{ slug: "asc" }, { difficulty: "desc" }],
      take: 80,
      select: {
        id: true,
        slug: true,
        title: true,
        summary: true,
        difficulty: true,
        tags: true,
        functionSignature: true,
        expectedComplexity: true,
        timeLimitMs: true,
        memoryLimitMb: true,
        researchFrontier: true,
        contentVersion: true,
        adversarialMeta: true,
      },
    });

    // Ensure adversarial meta seeds exist (public-safe only)
    for (const c of challenges.slice(0, 20)) {
      if (!c.adversarialMeta) {
        const suite = generateNumericArraySuite({
          challengeSlug: c.slug,
          contentVersion: c.contentVersion ?? c.slug,
        });
        const meta = publicAdversarialMeta(suite);
        await prisma.challenge.update({
          where: { id: c.id },
          data: { adversarialMeta: meta },
        });
        c.adversarialMeta = meta;
      }
    }

    // Prefer curated Research Frontier seeds at the top of the list
    const sorted = [...challenges].sort((a, b) => {
      const ar = a.slug.startsWith("rf-") ? 0 : 1;
      const br = b.slug.startsWith("rf-") ? 0 : 1;
      if (ar !== br) return ar - br;
      return a.title.localeCompare(b.title);
    });

    return jsonOk({
      challenges: sorted,
      policy: {
        difficulty: "D10 Research Frontier — objectively testable; never contradictory",
        hidden: "Private fixtures isolated from clients and AI prompts",
      },
    });
  });
}
