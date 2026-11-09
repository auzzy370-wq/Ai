import Link from "next/link";
import { ANALYTICS_ROLES } from "@/lib/access";
import { requirePageRoles } from "@/server/auth/page-guard";
import { platformAnalytics } from "@/server/analytics/service";
import { prisma } from "@/lib/db";
import { AnalyticsPanel } from "@/components/analytics/analytics-panel";
import { Badge } from "@/components/ui/badge";

export default async function AnalyticsPage() {
  const user = await requirePageRoles(ANALYTICS_ROLES);

  const since = new Date();
  since.setDate(since.getDate() - 30);

  const [base, recentAssignments, recentReports, reviewDecisions, topChallenges] = await Promise.all([
    platformAnalytics(),
    prisma.assessmentAssignment.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.scoreReport.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true, overall: true, qualified: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.reviewDecision.groupBy({ by: ["decision"], _count: true }),
    prisma.assessmentAssignment.groupBy({
      by: ["assessmentId"],
      _count: true,
      orderBy: { _count: { assessmentId: "desc" } },
      take: 8,
    }),
  ]);

  const assessments = topChallenges.length
    ? await prisma.assessment.findMany({
        where: { id: { in: topChallenges.map((t) => t.assessmentId) } },
        select: {
          id: true,
          title: true,
          track: true,
          challenge: { select: { slug: true, type: true } },
        },
      })
    : [];
  const assessmentMap = Object.fromEntries(assessments.map((a) => [a.id, a]));

  function bucketByDay(rows: { createdAt: Date }[]) {
    const days: Record<string, number> = {};
    for (const row of rows) {
      const key = row.createdAt.toISOString().slice(0, 10);
      days[key] = (days[key] ?? 0) + 1;
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

  const data = {
    ...base,
    windowDays: 30,
    trends: {
      assignmentsCreated: bucketByDay(recentAssignments),
      reportsScored: bucketByDay(recentReports),
      qualifiedPerDay: bucketByDay(recentReports.filter((r) => r.qualified)),
    },
    scoreDistribution: scoreBuckets,
    topAssessments: topChallenges.map((t) => ({
      count: t._count,
      title: assessmentMap[t.assessmentId]?.title ?? "Unknown",
      track: assessmentMap[t.assessmentId]?.track ?? null,
      slug: assessmentMap[t.assessmentId]?.challenge.slug ?? null,
      type: assessmentMap[t.assessmentId]?.challenge.type ?? null,
    })),
    reviews: Object.fromEntries(reviewDecisions.map((d) => [d.decision, d._count])),
  };

  return (
    <div className="animate-rise space-y-6">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="font-mono text-xs tracking-[0.3em] text-orange-700">HIRING ANALYTICS</p>
          <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">Evidence operations</h1>
          <p className="mt-2 max-w-3xl text-slate-600">
            Pipeline health, qualification rates, and track performance — visible to hiring roles only.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge>{user.role}</Badge>
          {user.role === "SUPER_ADMIN" && (
            <Link href="/admin" className="text-sm text-orange-700 hover:underline">
              Full control plane →
            </Link>
          )}
        </div>
      </header>
      <AnalyticsPanel data={data} />
    </div>
  );
}
