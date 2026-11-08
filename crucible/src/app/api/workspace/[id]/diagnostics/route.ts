import { prisma } from "@/lib/db";
import { jsonOk, withHandler } from "@/server/auth/api";
import { requireUser, canReview } from "@/server/auth/session";
import { AppError } from "@/lib/errors";
import { buildAssignmentPinpoint, persistPinpoint, type CaseResult } from "@/server/scoring/diagnostics";
import { z } from "zod";

const schema = z.object({
  results: z
    .array(
      z.object({
        name: z.string(),
        pass: z.boolean(),
        hidden: z.boolean().optional(),
      }),
    )
    .default([]),
});

/** POST case results → skill pinpoint (what this run proves the candidate knows). */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return withHandler(async () => {
    const user = await requireUser();
    const { id } = await ctx.params;
    const workspace = await prisma.workspace.findUnique({
      where: { id },
      include: {
        assignment: { include: { assessment: { include: { challenge: true } } } },
      },
    });
    if (!workspace) throw new AppError("Workspace not found", 404, "NOT_FOUND");
    if (workspace.assignment.candidateId !== user.id && !canReview(user.role)) {
      throw new AppError("Forbidden", 403, "FORBIDDEN");
    }

    const body = schema.parse(await req.json());
    // Also scrape latest job stdout if client sent empty
    const cases: CaseResult[] = body.results;
    if (!cases.length) {
      const jobs = await prisma.executionJob.findMany({
        where: { workspaceId: id, type: { in: ["test", "hidden_test"] } },
        orderBy: { createdAt: "desc" },
        take: 6,
      });
      for (const job of jobs) {
        const hidden = job.type === "hidden_test";
        const parsed = parseCases(job.stdout);
        for (const r of parsed) {
          const row = { ...r, hidden: r.hidden ?? hidden };
          if (!cases.find((m) => m.name === row.name && Boolean(m.hidden) === Boolean(row.hidden))) {
            cases.push(row);
          }
        }
      }
    }

    const challenge = workspace.assignment.assessment.challenge;
    const pinpoint = buildAssignmentPinpoint({
      challengeSlug: challenge.slug,
      challengeTitle: challenge.title,
      difficulty: challenge.difficulty,
      tags: challenge.tags,
      cases,
    });

    await persistPinpoint({
      assignmentId: workspace.assignmentId,
      candidateId: workspace.assignment.candidateId,
      pinpoint,
    });

    const profile = await prisma.candidateProfile.findUnique({
      where: { userId: workspace.assignment.candidateId },
      select: { knowledgeMap: true },
    });

    return jsonOk({ pinpoint, knowledgeMap: profile?.knowledgeMap ?? null });
  });
}

function parseCases(stdout: string | null | undefined): CaseResult[] {
  if (!stdout) return [];
  try {
    const line = stdout
      .trim()
      .split("\n")
      .reverse()
      .find((l) => l.trim().startsWith("{"));
    if (!line) return [];
    const parsed = JSON.parse(line) as { results?: CaseResult[] };
    return parsed.results ?? [];
  } catch {
    return [];
  }
}
