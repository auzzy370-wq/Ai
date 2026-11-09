import { prisma } from "@/lib/db";
import { jsonOk, withHandler } from "@/server/auth/api";
import { requireUser } from "@/server/auth/session";
import { platformAnalytics } from "@/server/analytics/service";

export async function GET() {
  return withHandler(async () => {
    await requireUser(["SUPER_ADMIN"]);
    const [
      analytics,
      usersByRole,
      usersByPlan,
      challengeCount,
      codingCount,
      projectCount,
      workspaceCount,
      jobStats,
      recentAudits,
      recentUsers,
      providers,
      assignmentOpen,
    ] = await Promise.all([
      platformAnalytics(),
      prisma.user.groupBy({ by: ["role"], _count: true }),
      prisma.user.groupBy({ by: ["plan"], _count: true }),
      prisma.challenge.count({ where: { isPublished: true } }),
      prisma.challenge.count({ where: { isPublished: true, type: "CODING_PROBLEM" } }),
      prisma.challenge.count({ where: { isPublished: true, NOT: { type: "CODING_PROBLEM" } } }),
      prisma.workspace.count(),
      prisma.executionJob.groupBy({ by: ["status"], _count: true }),
      prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 12,
        include: { actor: { select: { name: true, email: true, role: true } } },
      }),
      prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        select: { id: true, name: true, email: true, role: true, plan: true, createdAt: true, lastLoginAt: true },
      }),
      prisma.aiProviderConfig.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.assessmentAssignment.count({
        where: { status: { in: ["ASSIGNED", "IN_PROGRESS", "UNDER_REVIEW"] } },
      }),
    ]);

    return jsonOk({
      analytics,
      usersByRole: Object.fromEntries(usersByRole.map((r) => [r.role, r._count])),
      usersByPlan: Object.fromEntries(usersByPlan.map((r) => [r.plan, r._count])),
      library: { challenges: challengeCount, coding: codingCount, projects: projectCount },
      workspaces: workspaceCount,
      openAssignments: assignmentOpen,
      jobs: Object.fromEntries(jobStats.map((j) => [j.status, j._count])),
      recentAudits,
      recentUsers,
      providers: providers.map((p) => ({
        ...p,
        apiKeyConfigured: Boolean(process.env[p.apiKeyEnv]),
      })),
      system: {
        executionMode: process.env.EXECUTION_MODE ?? "isolated",
        aiMock: process.env.AI_FALLBACK_MOCK !== "false",
        appUrl: process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || null,
        redisConfigured: Boolean(process.env.REDIS_URL),
        databaseConfigured: Boolean(process.env.DATABASE_URL),
        stripeConfigured: Boolean(process.env.STRIPE_SECRET_KEY),
        nodeEnv: process.env.NODE_ENV ?? "development",
        vercel: process.env.VERCEL === "1" || process.env.VERCEL === "true",
      },
    });
  });
}
