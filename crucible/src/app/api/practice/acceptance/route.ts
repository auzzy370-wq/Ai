import { prisma } from "@/lib/db";
import { jsonOk, withHandler } from "@/server/auth/api";
import { requireUser } from "@/server/auth/session";

/**
 * Live acceptance rates for coding problems that have hidden_test submissions.
 * Returns a map challengeId → { submissions, accepted, acceptancePct }.
 */
export async function GET() {
  return withHandler(async () => {
    await requireUser();
    const rows = await prisma.$queryRaw<
      { challengeId: string; submissions: number; accepted: number }[]
    >`
      SELECT a."challengeId" AS "challengeId",
             COUNT(*)::int AS submissions,
             COUNT(*) FILTER (
               WHERE (tr."hiddenPassed" > 0 AND tr."hiddenFailed" = 0)
                  OR (tr.failed = 0 AND tr.passed > 0)
                  OR ej.status = 'SUCCEEDED'
             )::int AS accepted
      FROM "TestRun" tr
      INNER JOIN "ExecutionJob" ej ON ej.id = tr."jobId"
      INNER JOIN "Workspace" w ON w.id = ej."workspaceId"
      INNER JOIN "AssessmentAssignment" aa ON aa.id = w."assignmentId"
      INNER JOIN "Assessment" a ON a.id = aa."assessmentId"
      WHERE ej.type = 'hidden_test'
      GROUP BY a."challengeId"
      HAVING COUNT(*) >= 3
    `;

    const byId: Record<string, { submissions: number; accepted: number; acceptancePct: number }> = {};
    for (const r of rows) {
      byId[r.challengeId] = {
        submissions: r.submissions,
        accepted: r.accepted,
        acceptancePct: Math.round((r.accepted / Math.max(1, r.submissions)) * 1000) / 10,
      };
    }
    return jsonOk({ byId, live: true, minSubmissions: 3 });
  });
}
