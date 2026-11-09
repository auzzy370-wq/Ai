import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { challengeAcceptanceStats, relatedCodingProblems, synthesizeHints } from "@/lib/practice";
import { jsonOk, withHandler } from "@/server/auth/api";
import { getSessionUser } from "@/server/auth/session";

/** Practice metadata for a coding problem: hints, live acceptance, related, bookmark, history. */
export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  return withHandler(async () => {
    const { slug } = await ctx.params;
    const user = await getSessionUser();
    const challenge = await prisma.challenge.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        title: true,
        summary: true,
        difficulty: true,
        tags: true,
        track: true,
        type: true,
        hints: true,
        publicRequirements: true,
        isPremium: true,
        editorials: { select: { slug: true }, take: 1 },
      },
    });
    if (!challenge) throw new AppError("Not found", 404, "NOT_FOUND");

    const [stats, related, bookmark, history] = await Promise.all([
      challengeAcceptanceStats(challenge.id),
      relatedCodingProblems({
        challengeId: challenge.id,
        tags: challenge.tags,
        track: challenge.track,
        take: 6,
      }),
      user
        ? prisma.problemBookmark.findUnique({
            where: { userId_challengeId: { userId: user.id, challengeId: challenge.id } },
          })
        : Promise.resolve(null),
      user
        ? prisma.executionJob.findMany({
            where: {
              type: { in: ["test", "hidden_test"] },
              workspace: {
                assignment: {
                  candidateId: user.id,
                  assessment: { challengeId: challenge.id },
                },
              },
            },
            orderBy: { createdAt: "desc" },
            take: 30,
            select: {
              id: true,
              type: true,
              status: true,
              createdAt: true,
              finishedAt: true,
              workspaceId: true,
              testRun: {
                select: {
                  passed: true,
                  failed: true,
                  hiddenPassed: true,
                  hiddenFailed: true,
                  results: true,
                },
              },
            },
          })
        : Promise.resolve([]),
    ]);

    const hints = synthesizeHints({
      hints: challenge.hints,
      title: challenge.title,
      summary: challenge.summary,
      publicRequirements: challenge.publicRequirements,
      tags: challenge.tags,
    });

    return jsonOk({
      challenge: {
        id: challenge.id,
        slug: challenge.slug,
        title: challenge.title,
        difficulty: challenge.difficulty,
        tags: challenge.tags,
        type: challenge.type,
        isPremium: challenge.isPremium,
        editorialSlug: challenge.editorials[0]?.slug ?? null,
      },
      hints,
      stats,
      related,
      bookmarked: Boolean(bookmark),
      history: history.map((h) => {
        const results = h.testRun?.results as {
          runtimeMs?: number;
          memoryKb?: number;
        } | null;
        const passed = h.testRun
          ? h.testRun.passed + h.testRun.hiddenPassed
          : null;
        const total = h.testRun
          ? h.testRun.passed + h.testRun.failed + h.testRun.hiddenPassed + h.testRun.hiddenFailed
          : null;
        return {
          id: h.id,
          type: h.type,
          status: h.status,
          passed,
          total,
          runtimeMs: results?.runtimeMs ?? null,
          memoryKb: results?.memoryKb ?? null,
          createdAt: h.createdAt.toISOString(),
          finishedAt: h.finishedAt?.toISOString() ?? null,
          workspaceId: h.workspaceId,
        };
      }),
    });
  });
}
