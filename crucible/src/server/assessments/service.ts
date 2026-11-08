import { AssessmentStatus, AssignmentStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { writeAudit } from "@/server/security/audit";
import { createWorkspaceForAssignment } from "@/server/execution/workspace";
import { weightsForTrack } from "@/server/scoring/policy";

export async function createAssessment(params: {
  title: string;
  description: string;
  challengeId: string;
  createdById: string;
  timedMinutes?: number;
  multiDay?: boolean;
  allowTeam?: boolean;
  teamSizeMin?: number;
  teamSizeMax?: number;
  progressiveDiff?: boolean;
  scoringPolicyId?: string;
}) {
  const challenge = await prisma.challenge.findUnique({ where: { id: params.challengeId } });
  if (!challenge) throw new AppError("Challenge not found", 404, "NOT_FOUND");

  let scoringPolicyId = params.scoringPolicyId;
  if (!scoringPolicyId) {
    const policy = await prisma.scoringPolicy.findFirst({
      where: { name: policyNameForTrack(challenge.track) },
    });
    scoringPolicyId = policy?.id;
  }

  const assessment = await prisma.assessment.create({
    data: {
      title: params.title,
      description: params.description,
      challengeId: params.challengeId,
      track: challenge.track,
      status: AssessmentStatus.PUBLISHED,
      timedMinutes: params.timedMinutes ?? 60,
      multiDay: params.multiDay ?? false,
      allowTeam: params.allowTeam ?? challenge.type === "TEAM_PROJECT",
      teamSizeMin: params.teamSizeMin,
      teamSizeMax: params.teamSizeMax,
      progressiveDiff: params.progressiveDiff ?? true,
      createdById: params.createdById,
      scoringPolicyId,
    },
    include: { challenge: true },
  });

  await writeAudit({
    actorId: params.createdById,
    action: "assessment.create",
    entityType: "Assessment",
    entityId: assessment.id,
    metadata: { track: assessment.track, challenge: challenge.slug },
  });

  return assessment;
}

function policyNameForTrack(track: string) {
  if (track === "CYBERSECURITY") return "Cybersecurity Elite Policy";
  if (track === "SECURE_FULL_STACK") return "Secure Full-Stack Elite Policy";
  return "Software Engineering Elite Policy";
}

export async function assignAssessment(params: {
  assessmentId: string;
  candidateId: string;
  assignedById: string;
  dueAt?: Date;
  accommodations?: string;
  language?: string;
}) {
  const assessment = await prisma.assessment.findUnique({
    where: { id: params.assessmentId },
    include: { challenge: true },
  });
  if (!assessment) throw new AppError("Assessment not found", 404, "NOT_FOUND");

  const candidate = await prisma.user.findUnique({ where: { id: params.candidateId } });
  if (!candidate || (candidate.role !== "CANDIDATE" && candidate.role !== "TEAM_MEMBER")) {
    throw new AppError("Invalid candidate", 400, "INVALID_CANDIDATE");
  }

  const timedMs = (assessment.timedMinutes ?? 60) * 60 * 1000;
  const language = params.language ?? assessment.challenge.languages[0] ?? "typescript";

  const existing = await prisma.assessmentAssignment.findUnique({
    where: {
      assessmentId_candidateId: {
        assessmentId: params.assessmentId,
        candidateId: params.candidateId,
      },
    },
    include: { workspace: true },
  });

  let assignmentId: string;
  if (existing) {
    assignmentId = existing.id;
    if (params.dueAt || params.accommodations) {
      await prisma.assessmentAssignment.update({
        where: { id: existing.id },
        data: {
          dueAt: params.dueAt ?? existing.dueAt,
          accommodations: params.accommodations ?? existing.accommodations,
        },
      });
    }
    if (!existing.workspace) {
      await createWorkspaceForAssignment({
        assignmentId: existing.id,
        challengeSlug: assessment.challenge.slug,
        language,
        track: assessment.track,
      });
    }
  } else {
    const created = await prisma.assessmentAssignment.create({
      data: {
        assessmentId: params.assessmentId,
        candidateId: params.candidateId,
        assignedById: params.assignedById,
        status: AssignmentStatus.ASSIGNED,
        dueAt: params.dueAt ?? new Date(Date.now() + timedMs),
        accommodations: params.accommodations,
      },
    });
    assignmentId = created.id;
    await createWorkspaceForAssignment({
      assignmentId: created.id,
      challengeSlug: assessment.challenge.slug,
      language,
      track: assessment.track,
    });
  }

  await writeAudit({
    actorId: params.assignedById,
    action: existing ? "assessment.assign.reuse" : "assessment.assign",
    entityType: "AssessmentAssignment",
    entityId: assignmentId,
    metadata: { candidateId: params.candidateId, track: assessment.track },
  });

  return prisma.assessmentAssignment.findUniqueOrThrow({
    where: { id: assignmentId },
    include: {
      assessment: { include: { challenge: true } },
      workspace: true,
      candidate: { select: { id: true, name: true, email: true } },
    },
  });
}

export async function startAssignment(assignmentId: string, userId: string) {
  const assignment = await prisma.assessmentAssignment.findUnique({
    where: { id: assignmentId },
    include: { assessment: true },
  });
  if (!assignment) throw new AppError("Assignment not found", 404, "NOT_FOUND");
  if (assignment.candidateId !== userId) throw new AppError("Forbidden", 403, "FORBIDDEN");
  const startedAt = assignment.startedAt ?? new Date();
  const timedMinutes = assignment.assessment.timedMinutes ?? 60;
  const dueAt =
    assignment.dueAt ?? new Date(startedAt.getTime() + timedMinutes * 60 * 1000);
  return prisma.assessmentAssignment.update({
    where: { id: assignmentId },
    data: { status: "IN_PROGRESS", startedAt, dueAt },
  });
}

export async function advanceAdaptiveLevel(assignmentId: string) {
  const assignment = await prisma.assessmentAssignment.findUnique({
    where: { id: assignmentId },
    include: {
      assessment: { include: { challenge: true } },
      submissions: { include: { testRuns: true }, orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  if (!assignment) throw new AppError("Assignment not found", 404, "NOT_FOUND");

  const latest = assignment.submissions[0]?.testRuns[0];
  if (!latest || latest.failed > 0 || latest.hiddenFailed > 0) {
    throw new AppError(
      "Adaptive difficulty increases only after verified passing results",
      400,
      "LEVEL_GATED",
    );
  }

  const track = (assignment.assessment.challenge.adaptiveTrack as { level: number }[] | null) ?? [];
  const next = Math.min(assignment.currentLevel + 1, track.length || 10);
  return prisma.assessmentAssignment.update({
    where: { id: assignmentId },
    data: {
      currentLevel: next,
      maxLevelReached: Math.max(assignment.maxLevelReached, next),
    },
  });
}

export async function listAssignmentsForUser(userId: string, role: string) {
  if (role === "CANDIDATE" || role === "TEAM_MEMBER") {
    return prisma.assessmentAssignment.findMany({
      where: { candidateId: userId },
      include: {
        assessment: { include: { challenge: true } },
        scoreReport: true,
        workspace: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }
  return prisma.assessmentAssignment.findMany({
    include: {
      assessment: { include: { challenge: true } },
      candidate: { select: { id: true, name: true, email: true } },
      scoreReport: true,
      workspace: true,
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

export async function getAssignmentDetail(id: string) {
  const assignment = await prisma.assessmentAssignment.findUnique({
    where: { id },
    include: {
      assessment: { include: { challenge: true, scoringPolicy: true } },
      candidate: { select: { id: true, name: true, email: true, role: true } },
      workspace: { include: { files: true, commits: true, pullReqs: true, jobs: { orderBy: { createdAt: "desc" }, take: 20 } } },
      submissions: { include: { testRuns: true, aiEvaluations: true }, orderBy: { createdAt: "desc" } },
      scoreReport: { include: { categories: true } },
      followUps: { include: { answers: true } },
      reviews: { include: { reviewer: { select: { id: true, name: true, role: true } } } },
      deployments: true,
    },
  });
  if (!assignment) throw new AppError("Assignment not found", 404, "NOT_FOUND");
  return {
    ...assignment,
    scoringWeights: weightsForTrack(assignment.assessment.track),
  };
}

export async function compareCandidates(candidateIds: string[]) {
  const reports = await prisma.scoreReport.findMany({
    where: { assignment: { candidateId: { in: candidateIds } } },
    include: {
      assignment: {
        include: {
          candidate: { select: { id: true, name: true, email: true } },
          assessment: { include: { challenge: true } },
        },
      },
    },
  });
  return reports;
}

export type AssessmentCreateInput = Prisma.AssessmentCreateInput;
