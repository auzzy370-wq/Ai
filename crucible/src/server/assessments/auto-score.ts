import { prisma } from "@/lib/db";
import { enqueueExecution } from "@/server/execution/runner";
import { evaluateSubmission } from "@/server/ai/evaluate";
import { logger } from "@/lib/logger";

async function waitForJob(id: string, timeoutMs = 90_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const job = await prisma.executionJob.findUnique({
      where: { id },
      select: { status: true, exitCode: true },
    });
    if (job && (job.status === "SUCCEEDED" || job.status === "FAILED" || job.status === "TIMEOUT")) {
      return job;
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  return { status: "TIMEOUT" as const, exitCode: null };
}

export type AutoScoreRow = {
  assignmentId: string;
  assessmentTitle: string;
  candidateEmail: string;
  overall: number | null;
  qualified: boolean | null;
  tests: {
    public: "SUCCEEDED" | "FAILED" | "TIMEOUT" | "SKIPPED";
    hidden: "SUCCEEDED" | "FAILED" | "TIMEOUT" | "SKIPPED";
    deploy: "SUCCEEDED" | "FAILED" | "TIMEOUT" | "SKIPPED";
  };
  error?: string;
};

async function scoreOneAssignment(a: {
  id: string;
  submittedAt: Date | null;
  assessment: { title: string; challenge: { type: string } };
  candidate: { email: string };
  workspace: { id: string } | null;
  scoreReport: { overall: number } | null;
}): Promise<AutoScoreRow> {
  const emptyTests = {
    public: "SKIPPED" as const,
    hidden: "SKIPPED" as const,
    deploy: "SKIPPED" as const,
  };

  if (!a.workspace) {
    return {
      assignmentId: a.id,
      assessmentTitle: a.assessment.title,
      candidateEmail: a.candidate.email,
      overall: a.scoreReport?.overall ?? null,
      qualified: null,
      tests: emptyTests,
      error: "No workspace",
    };
  }

  try {
    await prisma.assessmentAssignment.update({
      where: { id: a.id },
      data: { status: "GRADING", submittedAt: a.submittedAt ?? new Date() },
    });

    const submission = await prisma.submission.create({
      data: { assignmentId: a.id, notes: "admin-auto-score" },
    });

    // Always execute the full suite — public, hidden, and deploy — then post scores.
    const testJob = await enqueueExecution({ workspaceId: a.workspace.id, type: "test" });
    const publicResult = await waitForJob(testJob.id);

    const hiddenJob = await enqueueExecution({ workspaceId: a.workspace.id, type: "hidden_test" });
    const hiddenResult = await waitForJob(hiddenJob.id);

    const deployJob = await enqueueExecution({ workspaceId: a.workspace.id, type: "deploy_check" });
    const deployResult = await waitForJob(deployJob.id);

    const report = await evaluateSubmission(submission.id);
    await prisma.assessmentAssignment.update({
      where: { id: a.id },
      data: { status: report.qualified ? "COMPLETED" : "UNDER_REVIEW" },
    });

    return {
      assignmentId: a.id,
      assessmentTitle: a.assessment.title,
      candidateEmail: a.candidate.email,
      overall: report.overall ?? null,
      qualified: report.qualified ?? null,
      tests: {
        public: publicResult.status as AutoScoreRow["tests"]["public"],
        hidden: hiddenResult.status as AutoScoreRow["tests"]["hidden"],
        deploy: deployResult.status as AutoScoreRow["tests"]["deploy"],
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.warn("auto-score failed", { assignmentId: a.id, message });
    return {
      assignmentId: a.id,
      assessmentTitle: a.assessment.title,
      candidateEmail: a.candidate.email,
      overall: a.scoreReport?.overall ?? null,
      qualified: null,
      tests: emptyTests,
      error: message.slice(0, 240),
    };
  }
}

/**
 * Admin-only: for every active assignment with a workspace, always run public +
 * hidden + deploy harnesses, then post a ScoreReport.
 */
export async function autoScoreAllAssignments(opts?: {
  limit?: number;
  concurrency?: number;
}): Promise<{
  results: AutoScoreRow[];
  summary: string;
}> {
  const limit = Math.min(opts?.limit ?? 200, 500);
  const concurrency = Math.min(Math.max(opts?.concurrency ?? 3, 1), 6);
  const assignments = await prisma.assessmentAssignment.findMany({
    where: {
      status: {
        in: ["ASSIGNED", "IN_PROGRESS", "SUBMITTED", "GRADING", "UNDER_REVIEW", "COMPLETED"],
      },
      workspace: { isNot: null },
    },
    include: {
      assessment: { select: { title: true, challenge: { select: { type: true } } } },
      candidate: { select: { email: true } },
      workspace: { select: { id: true } },
      scoreReport: { select: { overall: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: limit,
  });

  const results: AutoScoreRow[] = [];
  for (let i = 0; i < assignments.length; i += concurrency) {
    const chunk = assignments.slice(i, i + concurrency);
    const scored = await Promise.all(chunk.map((a) => scoreOneAssignment(a)));
    results.push(...scored);
  }

  const scored = results.filter((r) => r.overall != null && !r.error).length;
  const suites = results.reduce(
    (acc, r) => {
      if (r.tests.public !== "SKIPPED") acc.public += 1;
      if (r.tests.hidden !== "SKIPPED") acc.hidden += 1;
      if (r.tests.deploy !== "SKIPPED") acc.deploy += 1;
      return acc;
    },
    { public: 0, hidden: 0, deploy: 0 },
  );

  return {
    results,
    summary: `Ran full suites on ${results.length} assignments (public ${suites.public}, hidden ${suites.hidden}, deploy ${suites.deploy}) · posted ${scored} scores`,
  };
}

export type AutoScoreTarget = {
  assignmentId: string;
  assessmentTitle: string;
  candidateEmail: string;
  challengeType: string;
  status: string;
  existingScore: number | null;
};

export async function listAutoScoreTargets(opts?: { limit?: number }): Promise<AutoScoreTarget[]> {
  const limit = Math.min(opts?.limit ?? 500, 500);
  const assignments = await prisma.assessmentAssignment.findMany({
    where: {
      status: {
        in: ["ASSIGNED", "IN_PROGRESS", "SUBMITTED", "GRADING", "UNDER_REVIEW", "COMPLETED"],
      },
      workspace: { isNot: null },
    },
    include: {
      assessment: { select: { title: true, challenge: { select: { type: true } } } },
      candidate: { select: { email: true } },
      scoreReport: { select: { overall: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: limit,
  });
  return assignments.map((a) => ({
    assignmentId: a.id,
    assessmentTitle: a.assessment.title,
    candidateEmail: a.candidate.email,
    challengeType: a.assessment.challenge.type,
    status: a.status,
    existingScore: a.scoreReport?.overall ?? null,
  }));
}

export async function autoScoreOneAssignment(assignmentId: string): Promise<AutoScoreRow> {
  const a = await prisma.assessmentAssignment.findUnique({
    where: { id: assignmentId },
    include: {
      assessment: { select: { title: true, challenge: { select: { type: true } } } },
      candidate: { select: { email: true } },
      workspace: { select: { id: true } },
      scoreReport: { select: { overall: true } },
    },
  });
  if (!a) {
    return {
      assignmentId,
      assessmentTitle: "Unknown",
      candidateEmail: "",
      overall: null,
      qualified: null,
      tests: { public: "SKIPPED", hidden: "SKIPPED", deploy: "SKIPPED" },
      error: "Assignment not found",
    };
  }
  return scoreOneAssignment(a);
}
