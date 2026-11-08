import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonOk, withHandler } from "@/server/auth/api";
import { requireUser, canAdmin, canReview, isPremium } from "@/server/auth/session";
import { enqueueExecution } from "@/server/execution/runner";
import { AppError } from "@/lib/errors";
import { diagnoseJobResult } from "@/server/competition/diagnostics";
import { rateLimit } from "@/server/security/rate-limit";

/** Candidate-safe job types — commands are always server-authored (never client-supplied). */
const CANDIDATE_TYPES = ["test", "hidden_test", "deploy_check", "benchmark"] as const;
/** Privileged diagnostics — SUPER_ADMIN only; still no arbitrary shell. */
const ADMIN_TYPES = ["debug"] as const;

const schema = z.object({
  type: z.enum([...CANDIDATE_TYPES, ...ADMIN_TYPES]),
  customCases: z
    .array(
      z.object({
        name: z.string().max(80).optional(),
        args: z.array(z.unknown()).max(12),
        expected: z.unknown().optional(),
      }),
    )
    .max(20)
    .optional(),
});

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  return withHandler(async () => {
    const user = await requireUser();
    const { id } = await ctx.params;
    const ws = await prisma.workspace.findUnique({
      where: { id },
      include: { assignment: true },
    });
    if (!ws) throw new AppError("Not found", 404, "NOT_FOUND");
    if (ws.assignment.candidateId !== user.id && !canReview(user.role)) {
      throw new AppError("Forbidden", 403, "FORBIDDEN");
    }
    const jobs = await prisma.executionJob.findMany({
      where: { workspaceId: id },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        type: true,
        status: true,
        stdout: true,
        stderr: true,
        exitCode: true,
        createdAt: true,
        finishedAt: true,
      },
    });
    return jsonOk({
      jobs: jobs.map((j) => {
        const diagnostic = diagnoseJobResult({
          status: j.status,
          type: j.type,
          stdout: j.stdout,
          stderr: j.stderr,
          exitCode: j.exitCode,
          timedOut: j.status === "TIMEOUT",
        });
        return {
          id: j.id,
          type: j.type,
          status: j.status,
          stdout: j.stdout,
          stderr: j.stderr,
          exitCode: j.exitCode,
          createdAt: j.createdAt.toISOString(),
          finishedAt: j.finishedAt?.toISOString() ?? null,
          diagnostic,
        };
      }),
    });
  });
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return withHandler(async () => {
    const user = await requireUser();
    const { id } = await ctx.params;
    const ws = await prisma.workspace.findUnique({
      where: { id },
      include: { assignment: true },
    });
    if (!ws) throw new AppError("Not found", 404, "NOT_FOUND");
    if (ws.assignment.candidateId !== user.id && !canReview(user.role)) {
      // Pair shadow guests may view but only owner/reviewer execute — unless LIVE pair guest
      const pair = await prisma.pairSession.findFirst({
        where: { workspaceId: id, guestId: user.id, status: "LIVE" },
      });
      if (!pair || pair.guestRole === "SHADOW") {
        throw new AppError("Forbidden", 403, "FORBIDDEN");
      }
    }
    const body = schema.parse(await req.json());
    if ((ADMIN_TYPES as readonly string[]).includes(body.type) && !canAdmin(user.role)) {
      throw new AppError("Only admins can run diagnostic jobs", 403, "FORBIDDEN");
    }
    await rateLimit(`execute:${user.id}`, 30, 60_000);
    // Lightning Judge: Premium gets priority 10 (≈10× ahead of free FIFO during peak)
    const priority = isPremium(user) ? 10 : 0;
    const job = await enqueueExecution({
      workspaceId: id,
      type: body.type,
      priority,
      customCases: body.customCases,
    });
    return jsonOk({ ...job, lightning: priority >= 10, custom: Boolean(body.customCases?.length) }, { status: 202 });
  });
}
