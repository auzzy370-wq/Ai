import { prisma } from "@/lib/db";
import { jsonOk, withHandler } from "@/server/auth/api";
import { requireUser } from "@/server/auth/session";
import { AppError } from "@/lib/errors";
import { z } from "zod";

export async function GET(req: Request) {
  return withHandler(async () => {
    const user = await requireUser(["SUPER_ADMIN", "HIRING_MANAGER", "TECHNICAL_REVIEWER"]);
    void user;
    const url = new URL(req.url);
    const reviewed = url.searchParams.get("reviewed");
    const rows = await prisma.integrityEvent.findMany({
      where: {
        ...(reviewed === "false" ? { reviewed: false } : {}),
        ...(reviewed === "true" ? { reviewed: true } : {}),
        kind: { not: "solution_fingerprint" },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        user: { select: { id: true, name: true, email: true } },
        challenge: { select: { id: true, slug: true, title: true } },
      },
    });
    return jsonOk({
      events: rows.map((r) => ({
        id: r.id,
        kind: r.kind,
        severity: r.severity,
        score: r.score,
        reviewed: r.reviewed,
        detail: r.detail,
        createdAt: r.createdAt.toISOString(),
        user: r.user,
        challenge: r.challenge,
        assignmentId: r.assignmentId,
      })),
    });
  });
}

const patchSchema = z.object({
  id: z.string(),
  reviewed: z.boolean(),
});

export async function PATCH(req: Request) {
  return withHandler(async () => {
    await requireUser(["SUPER_ADMIN", "HIRING_MANAGER", "TECHNICAL_REVIEWER"]);
    const body = patchSchema.parse(await req.json());
    const row = await prisma.integrityEvent.update({
      where: { id: body.id },
      data: { reviewed: body.reviewed },
    });
    if (!row) throw new AppError("Not found", 404, "NOT_FOUND");
    return jsonOk({ id: row.id, reviewed: row.reviewed });
  });
}
