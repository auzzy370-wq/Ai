import { z } from "zod";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { jsonOk, withHandler } from "@/server/auth/api";
import { verifyPassword } from "@/server/auth/password";
import { createSession } from "@/server/auth/session";
import { writeAudit } from "@/server/security/audit";
import { clientIp } from "@/server/security/client-ip";
import { assertLoginAllowed, recordLoginFailure } from "@/server/security/login-guard";
import { assertSameOrigin } from "@/server/security/origin";

export const runtime = "nodejs";
export const maxDuration = 30;

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(200),
});

export async function POST(req: Request) {
  return withHandler(async () => {
    assertSameOrigin(req);
    const ip = clientIp(req);
    const body = schema.parse(await req.json());
    const email = body.email.toLowerCase().trim();
    await assertLoginAllowed(email, ip);

    let user;
    try {
      const { ensurePlatformSeeded } = await import("@/server/platform/ensure-seeded");
      await ensurePlatformSeeded();
      user = await prisma.user.findUnique({ where: { email } });
    } catch (e) {
      if (e instanceof AppError) throw e;
      throw new AppError(
        "Database is not connected yet. Publish with a Postgres database, then refresh and try again.",
        503,
        "DATABASE_UNAVAILABLE",
      );
    }

    const reject = async () => {
      await recordLoginFailure(email, ip);
      throw new AppError("Invalid credentials", 401, "INVALID_CREDENTIALS");
    };

    if (!user) await reject();
    if (!user!.passwordHash) {
      throw new AppError(
        "This account uses social sign-in. Continue with Google, GitHub, Apple, Facebook, Discord, or X.",
        401,
        "OAUTH_ONLY",
      );
    }
    if (!(await verifyPassword(body.password, user!.passwordHash))) {
      await reject();
    }
    if (!user!.emailVerifiedAt) {
      throw new AppError(
        "Verify your email before signing in. Check your inbox for the Crucible link.",
        403,
        "EMAIL_NOT_VERIFIED",
      );
    }

    const { resolveBootstrapRole } = await import("@/server/auth/admin-bootstrap");
    let account = user!;
    const role = resolveBootstrapRole({ email: account.email, current: account.role });
    if (role === "SUPER_ADMIN" && account.role !== "SUPER_ADMIN" && account.emailVerifiedAt) {
      account = await prisma.user.update({
        where: { id: account.id },
        data: { role: "SUPER_ADMIN", plan: "PREMIUM" },
      });
    }
    await createSession(account.id, { ip, userAgent: req.headers.get("user-agent") ?? undefined });
    await prisma.user.update({ where: { id: account.id }, data: { lastLoginAt: new Date() } });
    await writeAudit({
      actorId: account.id,
      action: "auth.login",
      entityType: "User",
      entityId: account.id,
      ip,
    });
    return jsonOk({
      id: account.id,
      email: account.email,
      name: account.name,
      role: account.role,
    });
  });
}
