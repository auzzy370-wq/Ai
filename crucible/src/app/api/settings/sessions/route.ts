import { z } from "zod";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { jsonOk, withHandler } from "@/server/auth/api";
import { SESSION_COOKIE, requireUser } from "@/server/auth/session";
import { writeAudit } from "@/server/security/audit";

const COOKIE = SESSION_COOKIE;

export async function DELETE(req: Request) {
  return withHandler(async () => {
    const user = await requireUser();
    const body = z
      .object({
        sessionId: z.string().optional(),
        allOthers: z.boolean().optional(),
      })
      .parse(await req.json().catch(() => ({})));

    const jar = await cookies();
    const token = jar.get(COOKIE)?.value;

    if (body.allOthers) {
      await prisma.session.deleteMany({
        where: {
          userId: user.id,
          ...(token ? { NOT: { token } } : {}),
        },
      });
      await writeAudit({
        action: "settings.sessions_revoke_others",
        entityType: "User",
        entityId: user.id,
        actorId: user.id,
      });
      return jsonOk({ revoked: "others" });
    }

    if (!body.sessionId) throw new AppError("sessionId required", 400, "BAD_REQUEST");
    const session = await prisma.session.findFirst({
      where: { id: body.sessionId, userId: user.id },
    });
    if (!session) throw new AppError("Session not found", 404, "NOT_FOUND");
    if (token && session.token === token) {
      throw new AppError("Cannot revoke the current session here — use Sign out", 400, "CURRENT_SESSION");
    }
    await prisma.session.delete({ where: { id: session.id } });
    await writeAudit({
      action: "settings.session_revoke",
      entityType: "Session",
      entityId: session.id,
      actorId: user.id,
    });
    return jsonOk({ revoked: session.id });
  });
}
