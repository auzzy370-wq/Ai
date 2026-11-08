import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { writeAudit } from "@/server/security/audit";

export async function createTeam(params: {
  name: string;
  assessmentId: string;
  managerId: string;
  members: { userId: string; roleLabel: string; duties: string }[];
}) {
  if (params.members.length < 2 || params.members.length > 4) {
    throw new AppError("Team assessments require 2–4 developers", 400, "INVALID_TEAM_SIZE");
  }
  const team = await prisma.engineeringTeam.create({
    data: {
      name: params.name,
      assessmentId: params.assessmentId,
      managerId: params.managerId,
      members: { create: params.members },
      discussions: {
        create: {
          authorId: params.managerId,
          body: "Team formed. Agree on architecture and API contracts before parallel implementation.",
        },
      },
    },
    include: { members: { include: { user: { select: { id: true, name: true, email: true } } } } },
  });
  await writeAudit({
    actorId: params.managerId,
    action: "team.create",
    entityType: "EngineeringTeam",
    entityId: team.id,
  });
  return team;
}

export async function postDiscussion(teamId: string, authorId: string, body: string) {
  const member = await prisma.teamMember.findFirst({ where: { teamId, userId: authorId } });
  const team = await prisma.engineeringTeam.findUnique({ where: { id: teamId } });
  if (!team) throw new AppError("Team not found", 404, "NOT_FOUND");
  if (!member && team.managerId !== authorId) throw new AppError("Forbidden", 403, "FORBIDDEN");
  return prisma.teamDiscussion.create({ data: { teamId, authorId, body } });
}
