import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { writeAudit } from "@/server/security/audit";

export async function startIncidentRun(params: {
  scenarioSlug: string;
  candidateId: string;
  assignmentId?: string;
}) {
  const scenario = await prisma.incidentScenario.findUnique({ where: { slug: params.scenarioSlug } });
  if (!scenario) throw new AppError("Scenario not found", 404, "NOT_FOUND");
  return prisma.incidentRun.create({
    data: {
      scenarioId: scenario.id,
      candidateId: params.candidateId,
      assignmentId: params.assignmentId,
      timeline: [{ at: new Date().toISOString(), event: "run_started" }],
    },
    include: { scenario: true },
  });
}

export async function updateIncidentRun(
  runId: string,
  candidateId: string,
  data: {
    diagnosis?: string;
    rootCauseFound?: boolean;
    fixApplied?: boolean;
    regressionTests?: boolean;
    recovered?: boolean;
    preventionDoc?: string;
    timelineEvent?: string;
  },
) {
  const run = await prisma.incidentRun.findUnique({ where: { id: runId } });
  if (!run || run.candidateId !== candidateId) throw new AppError("Not found", 404, "NOT_FOUND");
  const timeline = Array.isArray(run.timeline) ? [...(run.timeline as object[])] : [];
  if (data.timelineEvent) {
    timeline.push({ at: new Date().toISOString(), event: data.timelineEvent });
  }
  const updated = await prisma.incidentRun.update({
    where: { id: runId },
    data: {
      diagnosis: data.diagnosis,
      rootCauseFound: data.rootCauseFound,
      fixApplied: data.fixApplied,
      regressionTests: data.regressionTests,
      recovered: data.recovered,
      preventionDoc: data.preventionDoc,
      timeline,
    },
  });
  await writeAudit({
    actorId: candidateId,
    action: "incident.update",
    entityType: "IncidentRun",
    entityId: runId,
    metadata: { recovered: updated.recovered },
  });
  return updated;
}
