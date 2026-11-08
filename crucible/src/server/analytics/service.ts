import { prisma } from "@/lib/db";

export async function platformAnalytics() {
  const [
    totalCandidates,
    activeAssessments,
    completedAssignments,
    eliteQualified,
    assignments,
    scoreReports,
    securityFails,
    deployments,
    byTrack,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "CANDIDATE" } }),
    prisma.assessment.count({ where: { status: "PUBLISHED" } }),
    prisma.assessmentAssignment.count({ where: { status: "COMPLETED" } }),
    prisma.scoreReport.count({ where: { qualified: true } }),
    prisma.assessmentAssignment.groupBy({ by: ["status"], _count: true }),
    prisma.scoreReport.findMany({
      select: {
        overall: true,
        frontend: true,
        backend: true,
        database: true,
        architecture: true,
        infrastructure: true,
        security: true,
        testing: true,
        problemSolving: true,
        performance: true,
        collaboration: true,
        qualified: true,
        tier: true,
        assignment: { select: { assessment: { select: { track: true } } } },
      },
    }),
    prisma.scoreReport.count({
      where: { mandatoryFailures: { has: "Unresolved critical security vulnerabilities" } },
    }),
    prisma.deploymentResult.groupBy({ by: ["success"], _count: true }),
    prisma.assessment.groupBy({ by: ["track"], _count: true }),
  ]);

  const avg = (key: keyof (typeof scoreReports)[0]) => {
    if (!scoreReports.length) return 0;
    const vals = scoreReports.map((r) => Number(r[key]) || 0);
    return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
  };

  const deployTotal = deployments.reduce((a, b) => a + b._count, 0) || 1;
  const deploySuccess = deployments.find((d) => d.success)?._count ?? 0;

  const cyberReports = scoreReports.filter((r) => r.assignment.assessment.track === "CYBERSECURITY");
  const engReports = scoreReports.filter((r) => r.assignment.assessment.track === "SOFTWARE_ENGINEERING");

  return {
    totalCandidates,
    activeAssessments,
    completedAssessments: completedAssignments,
    eliteQualified,
    failureRates: assignments.map((a) => ({ status: a.status, count: a._count })),
    averageScores: {
      overall: avg("overall"),
      frontend: avg("frontend"),
      backend: avg("backend"),
      database: avg("database"),
      architecture: avg("architecture"),
      infrastructure: avg("infrastructure"),
      security: avg("security"),
      testing: avg("testing"),
      problemSolving: avg("problemSolving"),
      performance: avg("performance"),
      collaboration: avg("collaboration"),
    },
    skillDistributions: scoreReports.slice(0, 50),
    securityFailures: securityFails,
    deploymentSuccessRate: Math.round((deploySuccess / deployTotal) * 1000) / 10,
    trackBreakdown: byTrack,
    cybersecurity: {
      reports: cyberReports.length,
      elite: cyberReports.filter((r) => r.qualified).length,
      avgSecurity: cyberReports.length
        ? Math.round((cyberReports.reduce((a, r) => a + r.security, 0) / cyberReports.length) * 10) / 10
        : 0,
    },
    softwareEngineering: {
      reports: engReports.length,
      elite: engReports.filter((r) => r.qualified).length,
    },
    tiers: {
      elite: scoreReports.filter((r) => r.tier === "ELITE").length,
      exceptional: scoreReports.filter((r) => r.tier === "EXCEPTIONAL").length,
      distinguished: scoreReports.filter((r) => r.tier === "DISTINGUISHED").length,
    },
  };
}
