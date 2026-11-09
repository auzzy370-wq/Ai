import { z } from "zod";
import { PlanTier, Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { jsonOk, withHandler } from "@/server/auth/api";
import { requireUser } from "@/server/auth/session";
import { writeAudit } from "@/server/security/audit";

export async function GET(req: Request) {
  return withHandler(async () => {
    await requireUser(["SUPER_ADMIN"]);
    const url = new URL(req.url);
    const q = url.searchParams.get("q")?.trim() || "";
    const role = url.searchParams.get("role") || undefined;
    const take = Math.min(Number(url.searchParams.get("take") || 50), 200);

    const users = await prisma.user.findMany({
      where: {
        ...(role ? { role: role as Role } : {}),
        ...(q
          ? {
              OR: [
                { email: { contains: q, mode: "insensitive" } },
                { name: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      take,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        plan: true,
        planExpiresAt: true,
        createdAt: true,
        lastLoginAt: true,
        githubLogin: true,
        _count: {
          select: {
            assignments: true,
            sessions: true,
            reviews: true,
          },
        },
      },
    });

    return jsonOk({ users, total: users.length });
  });
}

const patchSchema = z.object({
  userId: z.string(),
  role: z.nativeEnum(Role).optional(),
  plan: z.nativeEnum(PlanTier).optional(),
  planExpiresAt: z.string().datetime().nullable().optional(),
  name: z.string().min(2).max(80).optional(),
});

export async function PATCH(req: Request) {
  return withHandler(async () => {
    const admin = await requireUser(["SUPER_ADMIN"]);
    const body = patchSchema.parse(await req.json());
    if (body.userId === admin.id && body.role && body.role !== "SUPER_ADMIN") {
      throw new AppError("Cannot demote your own admin role", 400, "SELF_DEMOTE");
    }
    const updated = await prisma.user.update({
      where: { id: body.userId },
      data: {
        ...(body.role ? { role: body.role } : {}),
        ...(body.plan ? { plan: body.plan } : {}),
        ...(body.planExpiresAt !== undefined
          ? { planExpiresAt: body.planExpiresAt ? new Date(body.planExpiresAt) : null }
          : {}),
        ...(body.name ? { name: body.name } : {}),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        plan: true,
        planExpiresAt: true,
      },
    });
    await writeAudit({
      action: "admin.user_update",
      entityType: "User",
      entityId: updated.id,
      actorId: admin.id,
      metadata: { role: body.role, plan: body.plan },
    });
    return jsonOk(updated);
  });
}
