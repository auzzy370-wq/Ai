import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export async function writeAudit(params: {
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
  ip?: string;
}) {
  return prisma.auditLog.create({
    data: {
      actorId: params.actorId ?? undefined,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId ?? undefined,
      metadata: params.metadata ? (params.metadata as Prisma.InputJsonValue) : undefined,
      ip: params.ip,
    },
  });
}
