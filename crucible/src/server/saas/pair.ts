import { nanoid } from "nanoid";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";

export async function createPairSession(params: { hostId: string; workspaceId: string; guestRole?: string }) {
  const ws = await prisma.workspace.findUnique({
    where: { id: params.workspaceId },
    include: { assignment: true },
  });
  if (!ws) throw new AppError("Workspace not found", 404, "NOT_FOUND");
  if (ws.assignment.candidateId !== params.hostId) {
    throw new AppError("Only the workspace owner can host a pair session", 403, "FORBIDDEN");
  }
  const code = nanoid(8).toUpperCase();
  return prisma.pairSession.create({
    data: {
      code,
      workspaceId: params.workspaceId,
      hostId: params.hostId,
      guestRole: params.guestRole ?? "SHADOW",
      status: "WAITING",
    },
  });
}

export async function joinPairSession(params: { code: string; guestId: string }) {
  const session = await prisma.pairSession.findUnique({ where: { code: params.code.toUpperCase() } });
  if (!session) throw new AppError("Pair code not found", 404, "NOT_FOUND");
  if (session.status === "ENDED") throw new AppError("Session ended", 410, "GONE");
  if (session.hostId === params.guestId) {
    return session;
  }
  return prisma.pairSession.update({
    where: { id: session.id },
    data: {
      guestId: params.guestId,
      status: "LIVE",
    },
  });
}

export async function getPairForWorkspace(workspaceId: string) {
  return prisma.pairSession.findFirst({
    where: { workspaceId, status: { in: ["WAITING", "LIVE"] } },
    orderBy: { createdAt: "desc" },
    include: {
      host: { select: { id: true, name: true } },
      guest: { select: { id: true, name: true } },
    },
  });
}
