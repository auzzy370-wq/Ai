import { prisma } from "@/lib/db";
import { jsonOk, withHandler } from "@/server/auth/api";
import { requireUser, canReview } from "@/server/auth/session";
import { AppError } from "@/lib/errors";

export async function GET(req: Request) {
  return withHandler(async () => {
    const user = await requireUser();
    if (!canReview(user.role)) throw new AppError("Forbidden", 403, "FORBIDDEN");

    const url = new URL(req.url);
    const days = Math.min(Number(url.searchParams.get("days") || 30), 365);
    const since = new Date(Date.now() - days * 86400000);
    const difficulty = url.searchParams.get("difficulty");
    const language = url.searchParams.get("language");

    const challengeWhere = {
      ...(difficulty ? { difficulty: Number(difficulty) } : {}),
      ...(language ? { languages: { has: language } } : {}),
    };

    const [
      totalChallenges,
      byDifficulty,
      frontierCount,
      submissions,
      aiRuns,
      contests,
      integrityFail,
      hardest,
    ] = await Promise.all([
      prisma.challenge.count({ where: { isPublished: true, ...challengeWhere } }),
      prisma.challenge.groupBy({
        by: ["difficulty"],
        where: { isPublished: true, ...challengeWhere },
        _count: true,
        orderBy: { difficulty: "asc" },
      }),
      prisma.challenge.count({ where: { researchFrontier: true, isPublished: true } }),
      prisma.executionJob.count({
        where: { createdAt: { gte: since }, type: { in: ["test", "hidden_test"] } },
      }),
      prisma.aiBenchmarkRun.findMany({
        where: { createdAt: { gte: since } },
        select: { correct: true, mocked: true, resultClass: true, status: true, runtimeMs: true },
      }),
      prisma.contest.count(),
      prisma.challenge.count({ where: { integrityStatus: "fail" } }),
      prisma.challenge.findMany({
        where: { isPublished: true, difficulty: { gte: 8 } },
        orderBy: [{ difficulty: "desc" }, { frequency: "asc" }],
        take: 10,
        select: { slug: true, title: true, difficulty: true, calibratedDifficulty: true, integrityStatus: true },
      }),
    ]);

    const humanJobs = await prisma.executionJob.findMany({
      where: { createdAt: { gte: since }, type: "hidden_test", status: { in: ["SUCCEEDED", "FAILED", "TIMEOUT"] } },
      select: { status: true },
      take: 2000,
    });
    const humanOk = humanJobs.filter((j) => j.status === "SUCCEEDED").length;
    const infra = await prisma.executionJob.count({
      where: {
        createdAt: { gte: since },
        OR: [{ stderr: { contains: "harness" } }, { stderr: { contains: "ENOENT" } }],
      },
    });

    const verifiedAi = aiRuns.filter((r) => r.resultClass === "verified" && !r.mocked && r.status === "COMPLETED");
    const experimentalAi = aiRuns.filter((r) => r.mocked || r.resultClass === "experimental");
    const aiPool = verifiedAi.length ? verifiedAi : experimentalAi;
    const aiOk = aiPool.filter((r) => r.correct).length;
    const avgRuntime = aiPool.filter((r) => r.runtimeMs != null);
    const avgExec =
      avgRuntime.length > 0
        ? Math.round(avgRuntime.reduce((s, r) => s + (r.runtimeMs ?? 0), 0) / avgRuntime.length)
        : null;

    return jsonOk({
      windowDays: days,
      totals: {
        challenges: totalChallenges,
        researchFrontier: frontierCount,
        submissions,
        tournaments: contests,
        integrityFailures: integrityFail,
        infrastructureSuspectJobs: infra,
      },
      byDifficulty: byDifficulty.map((d) => ({ difficulty: d.difficulty, count: d._count })),
      human: {
        hiddenAttempts: humanJobs.length,
        successRatePct: humanJobs.length ? Math.round((humanOk / humanJobs.length) * 1000) / 10 : null,
        note: "From completed hidden_test ExecutionJobs in window",
      },
      ai: {
        attempts: aiPool.length,
        successRatePct: aiPool.length ? Math.round((aiOk / aiPool.length) * 1000) / 10 : null,
        verifiedPool: verifiedAi.length > 0,
        experimentalAttempts: experimentalAi.length,
        avgRuntimeMs: avgExec,
        note: verifiedAi.length
          ? "Verified API-backed runs only"
          : "Experimental/mocked — not model capability claims",
      },
      hardest,
    });
  });
}
