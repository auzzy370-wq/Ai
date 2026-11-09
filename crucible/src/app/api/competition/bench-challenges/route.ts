import { prisma } from "@/lib/db";
import { jsonOk, withHandler } from "@/server/auth/api";
import { requireUser } from "@/server/auth/session";
import { canJudgeAiSlug } from "@/server/competition/ai-local-judge";
import { ensurePlatformSeeded } from "@/server/platform/ensure-seeded";

/** Coding challenges with a real local harness for AI vs Human. */
export async function GET() {
  return withHandler(async () => {
    await requireUser();
    await ensurePlatformSeeded();
    const curated = await prisma.challenge.findMany({
      where: {
        isPublished: true,
        type: "CODING_PROBLEM",
      },
      orderBy: [{ frequency: "desc" }, { difficulty: "asc" }],
      take: 120,
      select: {
        id: true,
        slug: true,
        title: true,
        summary: true,
        difficulty: true,
        tags: true,
        frequency: true,
      },
    });
    const ready = curated.filter((c) => canJudgeAiSlug(c.slug)).slice(0, 60);
    // Prefer Two Sum first — clearest smoke test for the bench UI
    ready.sort((a, b) => {
      if (a.slug === "lc-two-sum") return -1;
      if (b.slug === "lc-two-sum") return 1;
      return (b.frequency ?? 0) - (a.frequency ?? 0) || a.difficulty - b.difficulty;
    });
    return jsonOk({ challenges: ready, defaultSlug: ready[0]?.slug ?? null });
  });
}
