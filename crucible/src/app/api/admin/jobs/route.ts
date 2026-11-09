import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonOk, withHandler } from "@/server/auth/api";
import { requireUser } from "@/server/auth/session";
import { processJob } from "@/server/execution/runner";
import { writeAudit } from "@/server/security/audit";

export async function GET() {
  return withHandler(async () => {
    await requireUser(["SUPER_ADMIN"]);
    const [queued, running, recent, byStatus] = await Promise.all([
      prisma.executionJob.count({ where: { status: "QUEUED" } }),
      prisma.executionJob.count({ where: { status: "RUNNING" } }),
      prisma.executionJob.findMany({
        orderBy: { createdAt: "desc" },
        take: 40,
        select: {
          id: true,
          type: true,
          status: true,
          priority: true,
          createdAt: true,
          startedAt: true,
          finishedAt: true,
          exitCode: true,
          workspaceId: true,
          command: true,
        },
      }),
      prisma.executionJob.groupBy({ by: ["status"], _count: true }),
    ]);
    return jsonOk({
      queued,
      running,
      byStatus: Object.fromEntries(byStatus.map((j) => [j.status, j._count])),
      recent,
      executionMode: process.env.EXECUTION_MODE ?? "isolated",
    });
  });
}

export async function POST(req: Request) {
  return withHandler(async () => {
    const admin = await requireUser(["SUPER_ADMIN"]);
    const body = z
      .object({
        action: z.enum(["drain_queued", "retry_job"]),
        jobId: z.string().optional(),
        limit: z.number().int().min(1).max(50).optional(),
      })
      .parse(await req.json());

    if (body.action === "retry_job" && body.jobId) {
      await prisma.executionJob.update({
        where: { id: body.jobId },
        data: { status: "QUEUED", startedAt: null, finishedAt: null, stdout: null, stderr: null, exitCode: null },
      });
      void processJob(body.jobId);
      await writeAudit({
        action: "admin.job_retry",
        entityType: "ExecutionJob",
        entityId: body.jobId,
        actorId: admin.id,
      });
      return jsonOk({ retried: body.jobId });
    }

    const jobs = await prisma.executionJob.findMany({
      where: { status: "QUEUED" },
      orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
      take: body.limit ?? 20,
      select: { id: true },
    });
    for (const job of jobs) void processJob(job.id);
    await writeAudit({
      action: "admin.jobs_drain",
      entityType: "ExecutionJob",
      actorId: admin.id,
      metadata: { count: jobs.length },
    });
    return jsonOk({ drained: jobs.length });
  });
}
