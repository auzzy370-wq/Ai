import { prisma } from "@/lib/db";
import { jsonOk, withHandler } from "@/server/auth/api";
import { requireUser } from "@/server/auth/session";
import { platformAnalytics } from "@/server/analytics/service";

export async function GET() {
  return withHandler(async () => {
    await requireUser(["SUPER_ADMIN"]);
    const base = await platformAnalytics();

    const since = new Date();
    since.setDate(since.getDate() - 30);

    const [recentAssignments, recentReports, recentLogins, topChallenges, reviewDecisions] =
      await Promise.all([
        prisma.assessmentAssignment.findMany({
          where: { createdAt: { gte: since } },
          select: { createdAt: true, status: true },
          orderBy: { createdAt: "asc" },
        }),
        prisma.scoreReport.findMany({
          where: { createdAt: { gte: since } },
          select: { createdAt: true, overall: true, qualified: true, tier: true },
          orderBy: { createdAt: "asc" },
        }),
        prisma.auditLog.groupBy({
          by: ["action"],
          where: { createdAt: { gte: since }, action: { startsWith: "auth." } },
          _count: true,
        }),
        prisma.assessmentAssignment.groupBy({
          by: ["assessmentId"],
          _count: true,
          orderBy: { _count: { assessmentId: "desc" } },
          take: 8,
        }),
        prisma.reviewDecision.groupBy({ by: ["decision"], _count: true }),
      ]);

    const assessmentIds = topChallenges.map((t) => t.assessmentId);
    const assessments = assessmentIds.length
      ? await prisma.assessment.findMany({
          where: { id: { in: assessmentIds } },
          select: {
            id: true,
            title: true,
            track: true,
            challenge: { select: { slug: true, type: true } },
          },
        })
      : [];
    const assessmentMap = Object.fromEntries(assessments.map((a) => [a.id, a]));

    function bucketByDay<T extends { createdAt: Date }>(rows: T[], map: (row: T) => number) {
      const days: Record<string, number> = {};
      for (const row of rows) {
        const key = row.createdAt.toISOString().slice(0, 10);
        days[key] = (days[key] ?? 0) + map(row);
      }
      return Object.entries(days)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, value]) => ({ date, value }));
    }

    const scoreBuckets = [
      { label: "0–49", min: 0, max: 50, count: 0 },
      { label: "50–69", min: 50, max: 70, count: 0 },
      { label: "70–79", min: 70, max: 80, count: 0 },
      { label: "80–89", min: 80, max: 90, count: 0 },
      { label: "90–100", min: 90, max: 101, count: 0 },
    ];
    for (const r of recentReports) {
      const b = scoreBuckets.find((x) => r.overall >= x.min && r.overall < x.max);
      if (b) b.count += 1;
    }

    return jsonOk({
      ...base,
      windowDays: 30,
      trends: {
        assignmentsCreated: bucketByDay(recentAssignments, () => 1),
        reportsScored: bucketByDay(recentReports, () => 1),
        qualifiedPerDay: bucketByDay(
          recentReports.filter((r) => r.qualified),
          () => 1,
        ),
      },
      scoreDistribution: scoreBuckets,
      authActivity: Object.fromEntries(recentLogins.map((a) => [a.action, a._count])),
      topAssessments: topChallenges.map((t) => ({
        assessmentId: t.assessmentId,
        count: t._count,
        title: assessmentMap[t.assessmentId]?.title ?? "Unknown",
        track: assessmentMap[t.assessmentId]?.track ?? null,
        slug: assessmentMap[t.assessmentId]?.challenge.slug ?? null,
        type: assessmentMap[t.assessmentId]?.challenge.type ?? null,
      })),
      reviews: Object.fromEntries(reviewDecisions.map((d) => [d.decision, d._count])),
    });
  });
}
