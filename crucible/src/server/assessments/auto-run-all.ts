import { autoScoreAllAssignments, type AutoScoreRow } from "@/server/assessments/auto-score";
import { sweepAiAcrossAssessments, type SweepResult } from "@/server/competition/ai-sweep";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

export type AutoRunAllResult = {
  summary: string;
  assignmentScores: {
    summary: string;
    results: AutoScoreRow[];
    posted: number;
  };
  aiSweep: {
    summary: string;
    modelName: string;
    results: SweepResult[];
    posted: number;
    cleared: number;
  };
  totals: {
    publishedAssessments: number;
    assignmentsWithWorkspace: number;
    scoreReports: number;
    aiBenchmarkRuns: number;
  };
};

/**
 * Admin-only pipeline: run harnesses on every assignment workspace, post ScoreReports,
 * then run the preferred AI model through every judgable published assessment challenge
 * and post AiBenchmarkRun scores for the leaderboard.
 */
export async function autoRunAllAssessmentsAndPostScores(opts?: {
  aiModelId?: string;
  assignmentLimit?: number;
  aiLimit?: number;
  actorId?: string;
}): Promise<AutoRunAllResult> {
  const assignmentLimit = Math.min(opts?.assignmentLimit ?? 200, 500);
  const aiLimit = Math.min(opts?.aiLimit ?? 200, 500);

  logger.info("auto-run-all starting", { assignmentLimit, aiLimit });

  const assignmentScores = await autoScoreAllAssignments({
    limit: assignmentLimit,
    concurrency: 3,
  });
  const postedAssignments = assignmentScores.results.filter((r) => r.overall != null && !r.error).length;
  const suitesRun = assignmentScores.results.reduce(
    (n, r) => n + (r.tests.public !== "SKIPPED" ? 1 : 0) + (r.tests.hidden !== "SKIPPED" ? 1 : 0) + (r.tests.deploy !== "SKIPPED" ? 1 : 0),
    0,
  );

  // Prefer AI sweep of assessment-linked judgable challenges; keep AI limit modest for provider quotas
  const aiSweep = await sweepAiAcrossAssessments({
    aiModelId: opts?.aiModelId,
    limit: aiLimit,
    actorId: opts?.actorId,
  });
  const aiPosted = aiSweep.results.filter((r) => r.runId).length;
  const aiCleared = aiSweep.results.filter((r) => r.correct).length;

  const [publishedAssessments, assignmentsWithWorkspace, scoreReports, aiBenchmarkRuns] =
    await Promise.all([
      prisma.assessment.count({ where: { status: "PUBLISHED" } }),
      prisma.assessmentAssignment.count({ where: { workspace: { isNot: null } } }),
      prisma.scoreReport.count(),
      prisma.aiBenchmarkRun.count(),
    ]);

  const summary = [
    `Ran ${suitesRun} test jobs across ${assignmentScores.results.length} assignments`,
    `posted ${postedAssignments} scorecards`,
    `${aiPosted} AI bench runs (${aiCleared} cleared) via ${aiSweep.modelName}`,
    `${scoreReports} total score reports in DB`,
  ].join(" · ");

  return {
    summary,
    assignmentScores: {
      summary: assignmentScores.summary,
      results: assignmentScores.results,
      posted: postedAssignments,
    },
    aiSweep: {
      summary: aiSweep.summary,
      modelName: aiSweep.modelName,
      results: aiSweep.results,
      posted: aiPosted,
      cleared: aiCleared,
    },
    totals: {
      publishedAssessments,
      assignmentsWithWorkspace,
      scoreReports,
      aiBenchmarkRuns,
    },
  };
}
