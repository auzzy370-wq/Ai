import { prisma } from "@/lib/db";
import { completeJson } from "./provider";
import {
  ScoreBreakdown,
  computeOverall,
  evaluateMandatory,
  DEFAULT_WEIGHTS,
  weightsForTrack,
} from "@/server/scoring/policy";
import { buildAssignmentPinpoint, persistPinpoint, type CaseResult } from "@/server/scoring/diagnostics";

export async function evaluateSubmission(submissionId: string) {
  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: {
      testRuns: true,
      assignment: {
        include: {
          assessment: { include: { challenge: true, scoringPolicy: true } },
          workspace: { include: { files: true, commits: true } },
          deployments: true,
          reviews: true,
          followUps: { include: { answers: true } },
        },
      },
    },
  });
  if (!submission) throw new Error("Submission not found");

  const testRuns = submission.testRuns;
  const latest = testRuns[testRuns.length - 1];
  const deploymentOk = submission.assignment.deployments.some((d) => d.success);
  const publicPassed = latest?.passed ?? 0;
  const publicFailed = latest?.failed ?? 0;
  const hiddenPassed = latest?.hiddenPassed ?? 0;
  const hiddenFailed = latest?.hiddenFailed ?? 0;
  const publicTotal = publicPassed + publicFailed;
  const hiddenTotal = hiddenPassed + hiddenFailed;
  const hiddenTestsOk = !!latest && hiddenFailed === 0 && hiddenPassed > 0;
  const publicPassRate = publicTotal > 0 ? publicPassed / publicTotal : 0;
  const hiddenPassRate = hiddenTotal > 0 ? hiddenPassed / hiddenTotal : 0;
  // Suites that never executed are weaker evidence than suites that ran and failed.
  const publicExecuted = publicTotal > 0;
  const hiddenExecuted = hiddenTotal > 0;
  const difficulty = Math.max(1, Math.min(10, submission.assignment.assessment.challenge.difficulty || 1));

  const fileCount = submission.assignment.workspace?.files.length ?? 0;
  const commitCount = submission.assignment.workspace?.commits.length ?? 0;
  const hasAuth = submission.assignment.workspace?.files.some((f) =>
    /auth|session|login/i.test(f.path + f.content),
  );
  const hasTests = submission.assignment.workspace?.files.some((f) =>
    /test|spec/i.test(f.path),
  );
  const hasDockerfile = submission.assignment.workspace?.files.some((f) =>
    /dockerfile|compose/i.test(f.path),
  );
  // Small content signal so near-identical starters still separate slightly without inventing passes.
  const contentBytes = (submission.assignment.workspace?.files ?? []).reduce(
    (n, f) => n + (f.content?.length ?? 0),
    0,
  );
  const contentSignal = Math.min(8, Math.floor(contentBytes / 1800));

  // Deterministic evidence-based baseline (never invents test results).
  // Mix public + hidden rates, absolute case counts, and difficulty so auto-runs don't all land on one number.
  const scores: ScoreBreakdown = {
    frontend: clamp(
      28 +
        publicPassRate * 32 +
        (publicExecuted ? Math.min(12, publicPassed * 4) : -6) +
        Math.min(8, Math.max(0, fileCount - 2) * 2) +
        contentSignal * 0.4,
    ),
    backend: clamp(
      30 +
        publicPassRate * 28 +
        hiddenPassRate * 18 +
        (hasAuth ? 10 : 0) +
        Math.min(10, publicPassed * 3) -
        Math.min(12, publicFailed * 2),
    ),
    database: clamp(
      28 +
        (hasAuth ? 12 : 0) +
        publicPassRate * 16 +
        hiddenPassRate * 14 +
        Math.min(8, hiddenPassed * 3) -
        Math.min(10, hiddenFailed * 2),
    ),
    architecture: clamp(
      30 +
        Math.min(18, Math.max(0, fileCount - 1) * 3) +
        (commitCount > 1 ? 8 : commitCount === 1 ? 3 : 0) +
        publicPassRate * 12 +
        contentSignal,
    ),
    infrastructure: clamp(
      22 +
        (hasDockerfile ? 38 : 8) +
        (deploymentOk ? 28 : 0) +
        (publicExecuted ? 4 : -4) +
        Math.min(6, difficulty),
    ),
    security: clamp(
      28 +
        (hasAuth ? 22 : 0) +
        (hiddenTestsOk ? 22 : hiddenPassRate * 16) +
        Math.min(8, hiddenPassed * 2) -
        Math.min(14, hiddenFailed * 3) +
        difficulty * 0.5,
    ),
    testing: clamp(
      (publicExecuted ? 18 : 8) +
        publicPassRate * 36 +
        hiddenPassRate * 22 +
        (hasTests ? 12 : 0) +
        (hiddenTestsOk ? 12 : 0) +
        Math.min(10, publicPassed * 2 + hiddenPassed * 2) -
        Math.min(16, publicFailed * 2 + hiddenFailed * 3) -
        (hiddenExecuted ? 0 : 6),
    ),
    problemSolving: clamp(
      22 +
        submission.assignment.currentLevel * 4 +
        publicPassRate * 18 +
        hiddenPassRate * 16 +
        difficulty * 2.2 +
        Math.min(12, publicPassed * 2 + hiddenPassed * 3) -
        Math.min(14, (publicFailed + hiddenFailed) * 2),
    ),
    performance: clamp(
      28 +
        (deploymentOk ? 18 : 0) +
        publicPassRate * 14 +
        (publicExecuted && publicFailed === 0 ? 8 : 0) +
        Math.min(8, difficulty) -
        Math.min(10, hiddenFailed * 2),
    ),
    collaboration: clamp(42 + (commitCount > 2 ? 8 : 0) + contentSignal * 0.5),
  };

  const incident = await prisma.incidentRun.findFirst({
    where: { candidateId: submission.assignment.candidateId, recovered: true },
  });
  const architecture = await prisma.architectureSubmission.findFirst({
    where: { assignmentId: submission.assignmentId },
  });
  const teamMembership = await prisma.teamMember.findFirst({
    where: { userId: submission.assignment.candidateId },
  });
  const humanApproved = submission.assignment.reviews.some((r) => r.decision === "APPROVE");

  if (teamMembership) scores.collaboration = clamp(scores.collaboration + 25);
  if (architecture) scores.architecture = clamp(Math.max(scores.architecture, architecture.score ?? 70));
  if (incident?.recovered) scores.problemSolving = clamp(scores.problemSolving + 15);

  const track = submission.assignment.assessment.track;
  const weights = weightsForTrack(track);
  // Cybersecurity track elevates security evidence signals
  if (track === "CYBERSECURITY") {
    scores.security = clamp(scores.security + (hiddenTestsOk ? 10 : 0) + (hasAuth ? 5 : 0));
  }
  const overall = computeOverall(scores, weights);
  const teamRequired = submission.assignment.assessment.allowTeam || track !== "CYBERSECURITY";
  const mandatory = evaluateMandatory({
    overall,
    scores,
    weights,
    deploymentOk,
    hiddenTestsOk,
    incidentOk: !!incident?.recovered,
    architectureOk: !!architecture,
    teamOk: teamRequired ? !!teamMembership : true,
    humanApproved,
    criticalSecurity: false,
  });

  const evidencePack = {
    verifiedFacts: {
      publicTestsPassed: latest?.passed ?? 0,
      publicTestsFailed: latest?.failed ?? 0,
      hiddenTestsPassed: latest?.hiddenPassed ?? 0,
      hiddenTestsFailed: latest?.hiddenFailed ?? 0,
      deploymentOk,
      commitCount,
      fileCount,
      humanApproved,
    },
    inferences: {
      hasAuthPatterns: !!hasAuth,
      hasTestFiles: !!hasTests,
      hasContainerization: !!hasDockerfile,
    },
    unknown: [
      "Production load behavior under real traffic",
      "Long-term maintainability without additional review",
    ],
  };

  const ai = await completeJson<{
    narrative: string;
    strengths: string[];
    weaknesses: string[];
    followUpQuestions: string[];
    categoryNotes: Record<string, string>;
  }>({
    system:
      "You are an elite engineering assessment assistant. Use only provided evidence. Distinguish facts, inferences, and unknowns. Never invent test results. Return JSON.",
    user: JSON.stringify({
      challenge: submission.assignment.assessment.challenge.title,
      scores,
      evidencePack,
      mandatory,
    }),
    fallback: {
      narrative:
        "Evidence-based automated evaluation completed. Scores derive from observed repository contents, automated test outcomes, deployment verification, and mandatory gate status. AI did not invent test execution results.",
      strengths: [
        publicPassRate > 0.7 ? "Strong automated public test pass rate" : "Submission present with measurable artifacts",
        deploymentOk ? "Deployment verification succeeded" : "Workspace contains implementable project structure",
      ],
      weaknesses: [
        !hiddenTestsOk ? "Hidden tests incomplete or failing" : "Further human review recommended",
        !humanApproved ? "Awaiting human technical reviewer approval" : "Calibrate against reference solution difficulty",
      ],
      followUpQuestions: [
        "Explain your authentication and session security model.",
        "Where could race conditions occur in your data layer?",
        "How would your system recover if the payment provider fails mid-transaction?",
        "Identify one vulnerability in your own implementation and how you would fix it.",
      ],
      categoryNotes: {
        testing: `Verified facts: passed=${latest?.passed ?? 0}, failed=${latest?.failed ?? 0}, hiddenPassed=${latest?.hiddenPassed ?? 0}, hiddenFailed=${latest?.hiddenFailed ?? 0}`,
      },
    },
  });

  await prisma.aiEvaluation.create({
    data: {
      submissionId,
      provider: ai.provider,
      model: ai.model,
      report: {
        scores,
        overall,
        mandatory,
        evidencePack,
        ai: ai.data,
        mocked: ai.mocked,
      },
      rawResponse: JSON.stringify(ai.data),
    },
  });

  const strengths = Array.isArray(ai.data?.strengths) ? ai.data.strengths : [];
  const weaknesses = Array.isArray(ai.data?.weaknesses) ? ai.data.weaknesses : [];
  const followUps = Array.isArray(ai.data?.followUpQuestions) ? ai.data.followUpQuestions : [];
  const narrative =
    typeof ai.data?.narrative === "string" && ai.data.narrative
      ? ai.data.narrative
      : "Evidence-based automated evaluation completed.";
  const categoryNotes =
    ai.data?.categoryNotes && typeof ai.data.categoryNotes === "object" ? ai.data.categoryNotes : {};

  const report = await prisma.scoreReport.upsert({
    where: { assignmentId: submission.assignmentId },
    create: {
      assignmentId: submission.assignmentId,
      overall,
      ...scores,
      qualified: mandatory.qualified,
      tier: mandatory.tier,
      mandatoryFailures: mandatory.failures,
      calibrated: true,
      categories: {
        create: Object.entries(scores).map(([criterion, score]) => ({
          criterion,
          score,
          maxScore: (weights as Record<string, number>)[criterion] ?? DEFAULT_WEIGHTS[criterion as keyof typeof DEFAULT_WEIGHTS],
          evidenceKind: "FACT" as const,
          observed: evidencePack.verifiedFacts
            ? JSON.stringify(evidencePack.verifiedFacts)
            : "See evaluation report",
          automated: categoryNotes[criterion],
          strengths: strengths.slice(0, 2),
          weaknesses: weaknesses.slice(0, 2),
          explanation: narrative,
          followUps: followUps.slice(0, 2),
        })),
      },
    },
    update: {
      overall,
      ...scores,
      qualified: mandatory.qualified,
      tier: mandatory.tier,
      mandatoryFailures: mandatory.failures,
      calibrated: true,
    },
    include: { categories: true },
  });

  // Persist follow-up questions for verification of real engineering knowledge
  for (const prompt of followUps.slice(0, 4)) {
    if (!prompt) continue;
    await prisma.followUpQuestion.create({
      data: { assignmentId: submission.assignmentId, prompt, difficulty: 3 },
    });
  }

  // Pinpoint exactly what tests prove this developer knows
  const challenge = submission.assignment.assessment.challenge;
  const cases = await collectCaseResults(
    submission.assignmentId,
    submission.assignment.workspace?.id ?? null,
  );
  const pinpoint = buildAssignmentPinpoint({
    challengeSlug: challenge.slug,
    challengeTitle: challenge.title,
    difficulty: challenge.difficulty,
    tags: challenge.tags,
    cases,
  });
  await persistPinpoint({
    assignmentId: submission.assignmentId,
    candidateId: submission.assignment.candidateId,
    pinpoint,
  });

  await prisma.scoreReport.update({
    where: { id: report.id },
    data: { diagnostics: pinpoint as object },
  });

  await prisma.assessmentAssignment.update({
    where: { id: submission.assignmentId },
    data: { status: humanApproved && mandatory.qualified ? "COMPLETED" : "UNDER_REVIEW" },
  });

  return { ...report, diagnostics: pinpoint };
}

async function collectCaseResults(assignmentId: string, workspaceId: string | null): Promise<CaseResult[]> {
  if (!workspaceId) return [];
  const jobs = await prisma.executionJob.findMany({
    where: { workspaceId, type: { in: ["test", "hidden_test"] } },
    orderBy: { createdAt: "desc" },
    take: 8,
  });
  const merged: CaseResult[] = [];
  for (const job of jobs) {
    const hidden = job.type === "hidden_test";
    for (const r of parseCases(job.stdout)) {
      const row = { ...r, hidden: r.hidden ?? hidden };
      if (!merged.find((m) => m.name === row.name && Boolean(m.hidden) === Boolean(row.hidden))) {
        merged.push(row);
      }
    }
  }
  // Also fold TestRun counters into synthetic cases when stdout missing
  const runs = await prisma.testRun.findMany({
    where: { submission: { assignmentId } },
    orderBy: { createdAt: "desc" },
    take: 2,
  });
  for (const run of runs) {
    if (!merged.length) {
      for (let i = 0; i < run.passed; i++) merged.push({ name: `public_pass_${i + 1}`, pass: true });
      for (let i = 0; i < run.failed; i++) merged.push({ name: `public_fail_${i + 1}`, pass: false });
      for (let i = 0; i < run.hiddenPassed; i++) merged.push({ name: `hidden_pass_${i + 1}`, pass: true, hidden: true });
      for (let i = 0; i < run.hiddenFailed; i++) merged.push({ name: `hidden_fail_${i + 1}`, pass: false, hidden: true });
    }
  }
  return merged;
}

function parseCases(stdout: string | null | undefined): CaseResult[] {
  if (!stdout) return [];
  try {
    const line = stdout
      .trim()
      .split("\n")
      .reverse()
      .find((l) => l.trim().startsWith("{"));
    if (!line) return [];
    const parsed = JSON.parse(line) as { results?: CaseResult[] };
    return parsed.results ?? [];
  } catch {
    return [];
  }
}

function clamp(n: number) {
  return Math.max(0, Math.min(100, Math.round(n * 10) / 10));
}
