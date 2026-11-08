import { ReviewDecisionType, SkillSource } from "@prisma/client";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { writeAudit } from "@/server/security/audit";
import { evaluateMandatory, computeOverall, weightsForTrack } from "@/server/scoring/policy";

export async function submitReview(params: {
  assignmentId: string;
  reviewerId: string;
  decision: ReviewDecisionType;
  reasoning: string;
  overridesAi?: boolean;
  verifiedSkills?: string[];
}) {
  if (!params.reasoning.trim() || params.reasoning.trim().length < 20) {
    throw new AppError("Documented reasoning is required (min 20 chars)", 400, "REASONING_REQUIRED");
  }

  const decision = await prisma.reviewDecision.create({
    data: {
      assignmentId: params.assignmentId,
      reviewerId: params.reviewerId,
      decision: params.decision,
      reasoning: params.reasoning,
      overridesAi: params.overridesAi ?? params.decision === "OVERRIDE_AI",
    },
  });

  const assignment = await prisma.assessmentAssignment.findUniqueOrThrow({
    where: { id: params.assignmentId },
    include: {
      assessment: true,
      scoreReport: true,
      deployments: true,
      submissions: { include: { testRuns: true } },
      candidate: { include: { candidateProfile: true } },
    },
  });

  if (params.verifiedSkills?.length && assignment.candidate.candidateProfile) {
    for (const name of params.verifiedSkills) {
      await prisma.skillRecord.upsert({
        where: {
          profileId_name_source: {
            profileId: assignment.candidate.candidateProfile.id,
            name,
            source: SkillSource.HUMAN_REVIEW,
          },
        },
        create: {
          profileId: assignment.candidate.candidateProfile.id,
          name,
          domain: "human-review",
          source: SkillSource.HUMAN_REVIEW,
          confidence: 0.95,
          evidence: params.reasoning.slice(0, 500),
          verifiedBy: params.reviewerId,
        },
        update: {
          confidence: 0.95,
          evidence: params.reasoning.slice(0, 500),
          verifiedBy: params.reviewerId,
        },
      });
    }
  }

  // Recompute qualification gates with human approval factored in
  if (assignment.scoreReport) {
    const r = assignment.scoreReport;
    const scores = {
      frontend: r.frontend,
      backend: r.backend,
      database: r.database,
      architecture: r.architecture,
      infrastructure: r.infrastructure,
      security: r.security,
      testing: r.testing,
      problemSolving: r.problemSolving,
      performance: r.performance,
      collaboration: r.collaboration,
    };
    const latestTests = assignment.submissions.flatMap((s) => s.testRuns);
    const last = latestTests[latestTests.length - 1];
    const incident = await prisma.incidentRun.findFirst({
      where: { candidateId: assignment.candidateId, recovered: true },
    });
    const architecture = await prisma.architectureSubmission.findFirst({
      where: { assignmentId: assignment.id },
    });
    const team = await prisma.teamMember.findFirst({ where: { userId: assignment.candidateId } });
    const weights = weightsForTrack(assignment.assessment.track);
    const overall = computeOverall(scores, weights);
    const teamRequired = assignment.assessment.allowTeam || assignment.assessment.track !== "CYBERSECURITY";
    const mandatory = evaluateMandatory({
      overall,
      scores,
      weights,
      deploymentOk: assignment.deployments.some((d) => d.success),
      hiddenTestsOk: !!last && last.hiddenFailed === 0 && last.hiddenPassed > 0,
      incidentOk: !!incident,
      architectureOk: !!architecture,
      teamOk: teamRequired ? !!team : true,
      humanApproved: params.decision === "APPROVE",
      criticalSecurity: false,
    });

    await prisma.scoreReport.update({
      where: { id: r.id },
      data: {
        overall,
        qualified: params.decision === "APPROVE" && mandatory.qualified,
        tier: params.decision === "APPROVE" && mandatory.qualified ? mandatory.tier : "NOT_QUALIFIED",
        mandatoryFailures: params.decision === "REJECT" ? ["Rejected by human reviewer", ...mandatory.failures] : mandatory.failures,
      },
    });

    await prisma.assessmentAssignment.update({
      where: { id: assignment.id },
      data: {
        status:
          params.decision === "APPROVE"
            ? "COMPLETED"
            : params.decision === "REQUEST_FOLLOW_UP"
              ? "UNDER_REVIEW"
              : params.decision === "REJECT"
                ? "FAILED"
                : "UNDER_REVIEW",
      },
    });
  }

  await writeAudit({
    actorId: params.reviewerId,
    action: "review.decision",
    entityType: "ReviewDecision",
    entityId: decision.id,
    metadata: { decision: params.decision, assignmentId: params.assignmentId },
  });

  return decision;
}

export async function addReviewNote(params: {
  assignmentId: string;
  authorId: string;
  body: string;
  path?: string;
  line?: number;
}) {
  return prisma.reviewNote.create({ data: params });
}
