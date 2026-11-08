import { z } from "zod";
import { jsonOk, withHandler } from "@/server/auth/api";
import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/db";
import { seedDatabase } from "@/server/bootstrap-seed";
import { getSessionUser, canAdmin } from "@/server/auth/session";

export const runtime = "nodejs";
export const maxDuration = 60;

const schema = z.object({
  secret: z.string().min(16),
  seed: z.boolean().optional().default(true),
  includeDemoAccounts: z.boolean().optional().default(false),
});

/**
 * Bootstrap after migrations. Requires a live SUPER_ADMIN session AND SETUP_SECRET.
 * Never returns passwords or demo credentials.
 */
export async function POST(req: Request) {
  return withHandler(async () => {
    const expected = process.env.SETUP_SECRET;
    if (!expected || expected.length < 16) {
      throw new AppError("SETUP_SECRET is not configured", 503, "SETUP_DISABLED");
    }

    const user = await getSessionUser();
    if (!user || !canAdmin(user.role)) {
      throw new AppError("Super admin session required", 401, "UNAUTHORIZED");
    }

    const body = schema.parse(await req.json());
    if (body.secret !== expected) throw new AppError("Invalid setup secret", 401, "UNAUTHORIZED");

    const before = await prisma.user.count();
    const summary = body.seed
      ? await seedDatabase({ includeDemoAccounts: body.includeDemoAccounts })
      : null;
    const users = await prisma.user.count();
    const challenges = await prisma.challenge.count();

    return jsonOk({
      ok: true,
      usersBefore: before,
      users,
      challenges,
      summary: summary
        ? {
            releaseReady: summary.releaseReady,
            policies: summary.policies,
            ready: summary.ready,
            demoAccountsEnabled: summary.demoAccountsEnabled,
          }
        : null,
    });
  });
}

export async function GET() {
  return withHandler(async () => {
    // Public health only — no counts or setup flags that aid probing.
    try {
      await prisma.$queryRaw`SELECT 1`;
      return jsonOk({ databaseReachable: true });
    } catch {
      return jsonOk({ databaseReachable: false });
    }
  });
}
