import { z } from "zod";
import { AssignmentStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { jsonOk, withHandler } from "@/server/auth/api";
import { requireUser } from "@/server/auth/session";
import { writeAudit } from "@/server/security/audit";

export async function GET(req: Request) {
  return withHandler(async () => {
    await requireUser(["SUPER_ADMIN"]);
    const url = new URL(req.url);
    const status = url.searchParams.get("status") || undefined;
    const q = url.searchParams.get("q")?.trim() || "";
    const take = Math.min(Number(url.searchParams.get("take") || 50), 200);

    const [assignments, byStatus] = await Promise.all([
      prisma.assessmentAssignment.findMany({
        where: {
          ...(status ? { status: status as AssignmentStatus } : {}),
          ...(q
            ? {
                OR: [
                  { candidate: { email: { contains: q, mode: "insensitive" } } },
                  { candidate: { name: { contains: q, mode: "insensitive" } } },
                  { assessment: { title: { contains: q, mode: "insensitive" } } },
                ],
              }
            : {}),
        },
        orderBy: { createdAt: "desc" },
        take,
        select: {
          id: true,
          status: true,
          dueAt: true,
          startedAt: true,
          submittedAt: true,
          createdAt: true,
          currentLevel: true,
          maxLevelReached: true,
          candidate: { select: { id: true, name: true, email: true, plan: true } },
          assignedBy: { select: { name: true, email: true } },
          assessment: {
            select: {
              id: true,
              title: true,
              track: true,
              challenge: { select: { slug: true, type: true } },
            },
          },
          scoreReport: { select: { overall: true, qualified: true, tier: true } },
          workspace: { select: { id: true } },
        },
      }),
      prisma.assessmentAssignment.groupBy({ by: ["status"], _count: true }),
    ]);

    return jsonOk({
      assignments,
      byStatus: Object.fromEntries(byStatus.map((s) => [s.status, s._count])),
    });
  });
}

const patchSchema = z.object({
  assignmentId: z.string(),
  status: z.nativeEnum(AssignmentStatus).optional(),
  dueAt: z.string().datetime().nullable().optional(),
});

export async function PATCH(req: Request) {
  return withHandler(async () => {
    const admin = await requireUser(["SUPER_ADMIN"]);
    const body = patchSchema.parse(await req.json());
    const updated = await prisma.assessmentAssignment.update({
      where: { id: body.assignmentId },
      data: {
        ...(body.status ? { status: body.status } : {}),
        ...(body.dueAt !== undefined ? { dueAt: body.dueAt ? new Date(body.dueAt) : null } : {}),
      },
      select: { id: true, status: true, dueAt: true },
    });
    await writeAudit({
      action: "admin.assignment_update",
      entityType: "AssessmentAssignment",
      entityId: updated.id,
      actorId: admin.id,
      metadata: { status: body.status, dueAt: body.dueAt },
    });
    return jsonOk(updated);
  });
}
